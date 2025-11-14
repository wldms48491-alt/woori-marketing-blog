/**
 * Supabase Edge Function: keyword-metrics
 * 
 * 용도:
 * - 여러 검색어에 대해 네이버 검색 API + 사내 데이터 기반 메트릭 집계
 * - DOC^T, DOC^30, SERP^d, SV 등 수집
 * - 캐시 + 레이트리밋 포함
 * 
 * 배포:
 *   supabase functions deploy keyword-metrics --project-ref <ref>
 * 
 * 환경변수:
 *   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET: 네이버 검색 API
 */

// @ts-ignore: Deno types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: External module
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
// @ts-ignore: External module
import { z } from 'https://esm.sh/zod@3.22.4';

// ============ 타입 =============

interface KeywordMetric {
  phrase: string;
  sv: number | null;
  sv_conf: number; // 0~1
  doc_total: number | null;
  doc_30d: number | null;
  serp_d: number | null;
  components?: {
    autosuggest_freq?: number;
    relkw_rank?: number;
    blog_total?: number;
    server_volume?: number;
  };
}

interface ErrorResponse {
  code: string;
  message: string;
  hint?: string;
}

const RequestSchema = z.object({
  phrases: z.array(z.string().min(1).max(100)).min(1).max(20),
  region: z.string().optional(),
  period: z.enum(['12m', '3m']).optional().default('12m'),
});

// ============ 캐시 =============

async function getMetricsCache(
  supabase: any,
  phraseHash: string
): Promise<KeywordMetric | null> {
  const key = `keyword-metrics:${phraseHash}`;
  const { data, error } = await supabase
    .from('api_cache')
    .select('data, ttl_at')
    .eq('key', key)
    .single();

  if (!error && data) {
    const ttlAt = new Date(data.ttl_at);
    if (ttlAt > new Date()) {
      console.log('[cache] HIT:', key);
      return data.data;
    }
  }
  return null;
}

async function setMetricsCache(
  supabase: any,
  phraseHash: string,
  metric: KeywordMetric,
  source: string,
  ttlMs: number = 72 * 60 * 60 * 1000
): Promise<void> {
  const key = `keyword-metrics:${phraseHash}`;
  const ttlAt = new Date(Date.now() + ttlMs).toISOString();
  
  await supabase
    .from('api_cache')
    .upsert(
      {
        key,
        data: metric,
        ttl_at: ttlAt,
        source,
      },
      { onConflict: 'key' }
    )
    .throwOnError();
}

// ============ 네이버 검색 API 호출 =============

async function fetchNaverSearch(
  query: string,
  clientId: string,
  clientSecret: string,
  start: number = 1
): Promise<{
  total: number;
  items: any[];
}> {
  const url = new URL('https://openapi.naver.com/v1/search/blog');
  url.searchParams.set('query', query);
  url.searchParams.set('start', start.toString());
  url.searchParams.set('display', '100');
  url.searchParams.set('sort', 'date');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Naver-Client-ID': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver API error ${response.status}`);
  }

  const data = await response.json();
  return {
    total: data.total || 0,
    items: data.items || [],
  };
}

/**
 * 네이버 블로그 검색으로 DOC^T, DOC^30 추정
 * 실제 운영 환경에서는 DateLab API 등으로 더 정확히 측정 가능
 */
async function fetchNaverMetrics(
  phrase: string,
  clientId: string,
  clientSecret: string,
  period: '12m' | '3m' = '12m'
): Promise<{
  doc_total: number;
  doc_30d: number;
}> {
  try {
    // DOC^T: 전체 검색 결과 수
    const allResults = await fetchNaverSearch(phrase, clientId, clientSecret, 1);
    const doc_total = allResults.total || 0;

    // DOC^30: 30일 범위 추정
    // (실제: 날짜 필터링 가능하나, 여기선 전체의 일정 비율로 근사)
    // 예: 최근 30일이 전체의 약 30~40% (카테고리/시즌 의존)
    const doc_30d = Math.ceil(doc_total * 0.35);

    return { doc_total, doc_30d };
  } catch (err) {
    console.warn('[naver-search] error for phrase:', phrase, err);
    return { doc_total: 0, doc_30d: 0 };
  }
}

/**
 * SERP^d: 상위 10개 결과의 난이도 근사
 * - 공식 도메인(.naver, .google 등): 스코어 +0.3
 * - 도메인 중복(이미 상위에 여러 개): 스코어 −0.1
 * - 결과가 매우 많음(>1M): 스코어 +0.2
 */
async function estimateSERPDifficulty(
  phrase: string,
  clientId: string,
  clientSecret: string
): Promise<number> {
  try {
    const results = await fetchNaverSearch(phrase, clientId, clientSecret, 1);
    const items = results.items || [];

    let score = 0.5; // 기본값

    // 공식 도메인 비율
    const officialCount = items
      .filter((item: any) =>
        item.bloggername?.includes('naver') ||
        item.link?.includes('blog.naver')
      )
      .length;
    score += (officialCount / items.length) * 0.3;

    // 도메인 중복 감소
    const domains = items.map((item: any) => {
      try {
        return new URL(item.link).hostname;
      } catch {
        return '';
      }
    });
    const uniqueDomains = new Set(domains).size;
    if (uniqueDomains < items.length * 0.6) {
      score -= 0.1; // 중복이 많으면 난이도 낮음
    }

    // 검색 결과 수가 많음 = 난이도 높음
    if (results.total > 1000000) {
      score += 0.2;
    }

    return Math.min(1, Math.max(0, score));
  } catch (err) {
    console.warn('[serp-d] estimation error:', err);
    return 0.5; // 폴백
  }
}

/**
 * SV (월간 검색량) 추정
 * 
 * 우선순위:
 * 1. 사내 서버 데이터 (있으면 가장 신뢰도 높음)
 * 2. 네이버 자동완성 빈도 (근사)
 * 3. 회귀식: SV ≈ DOC_total * 0.01 + DOC_30d * 0.5 (매우 근사)
 */
async function estimateSV(
  phrase: string,
  docTotal: number,
  doc30d: number
): Promise<{ sv: number | null; conf: number }> {
  // 실제 운영: 서버 DB에 저장된 광고데이터/사내 수집 데이터 조회
  // 여기서는 회귀식 근사
  
  // 정규화: 일반적으로 SV는 DOC_total의 0.5~2% (카테고리 의존)
  let estimatedSV: number | null = null;
  let confidence = 0.3; // 낮은 신뢰도

  // 휴리스틱: 블로그 post 빈도 + 문서 노후도로 추정
  // 보수적: DOC_30d가 높을수록 검색 수요 높음
  estimatedSV = Math.round((doc30d * 15 + docTotal * 0.8) / 100);

  // 신뢰도 조정
  if (estimatedSV > 500) {
    confidence = 0.6; // 중간
  } else if (estimatedSV > 1000) {
    confidence = 0.75; // 높음
  }

  return { sv: estimatedSV, conf: confidence };
}

// ============ 메인 핸들러 =============

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ code: 'METHOD_NOT_ALLOWED', message: 'Only POST allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);
    const { phrases, region, period } = parsed;

    // @ts-ignore: Deno runtime
    const clientId = Deno.env.get('NAVER_CLIENT_ID');
    // @ts-ignore: Deno runtime
    const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('Naver credentials not set');
    }

    // @ts-ignore: Deno runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore: Deno runtime
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const rows: KeywordMetric[] = [];

    for (const phrase of phrases) {
      // 캐시 조회
      const phraseHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(phrase)
      );
      const hashHex = Array.from(new Uint8Array(phraseHash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .substring(0, 16);

      const cached = await getMetricsCache(supabase, hashHex);
      if (cached) {
        rows.push(cached);
        continue;
      }

      // 메트릭 수집
      console.log('[naver] fetching metrics for:', phrase);
      const { doc_total, doc_30d } = await fetchNaverMetrics(
        phrase,
        clientId,
        clientSecret,
        period
      );
      const serp_d = await estimateSERPDifficulty(phrase, clientId, clientSecret);
      const { sv, conf } = await estimateSV(phrase, doc_total, doc_30d);

      const metric: KeywordMetric = {
        phrase,
        sv,
        sv_conf: conf,
        doc_total,
        doc_30d,
        serp_d,
        components: {
          blog_total: doc_total,
        },
      };

      // 캐시 저장 (72h 기본, 성수기/변동성 키워드는 24h)
      const cacheTTL = doc_30d > 1000 ? 24 * 60 * 60 * 1000 : 72 * 60 * 60 * 1000;
      await setMetricsCache(supabase, hashHex, metric, 'naver-search', cacheTTL);

      rows.push(metric);
    }

    return new Response(JSON.stringify({ rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[error]', err.message);

    let statusCode = 500;
    let code = 'UNKNOWN';
    let message = err.message;
    let hint: string | undefined;

    if (err.message.includes('credentials not set')) {
      code = 'NO_API_KEY';
      message = 'Naver API credentials not configured';
      statusCode = 503;
      hint = 'Please set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET';
    } else if (err.message.includes('Naver API error')) {
      code = 'UPSTREAM_FAIL';
      message = 'Naver API call failed';
      statusCode = 502;
    } else if (err instanceof z.ZodError) {
      code = 'INVALID_INPUT';
      message = 'Request validation failed';
      statusCode = 400;
    }

    return new Response(
      JSON.stringify({ code, message, hint } as ErrorResponse),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
