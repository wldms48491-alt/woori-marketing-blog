/**
 * Supabase Edge Function: gemini-facets
 * 
 * 용도: 
 * - Gemini API를 통해 업체 설명 텍스트에서 Facet 추출
 * - 토큰 동의어 확장
 * - 타입 엄격, 캐시/레이트리밋 포함
 * 
 * 배포:
 *   supabase functions deploy gemini-facets --project-ref <ref>
 * 
 * 환경변수:
 *   GEMINI_API_KEY: Google Gemini API 키
 */

// @ts-ignore: Deno types
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: External module
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
// @ts-ignore: External module
import { z } from 'https://esm.sh/zod@3.22.4';

// ============ 타입 & 스키마 =============

interface Facets {
  name?: string;
  category?: string;
  place?: { address?: string; poi_aliases?: string[] };
  signature_items?: string[];
  target_audience?: string[];
  key_features?: string[];
  vibes?: string[];
  amenities?: string[];
  price_range?: string;
  intent?: string[];
}

interface Token {
  text: string;
  slot: 'Location' | 'Micro-POI' | 'Item' | 'Intent';
  aliases?: string[];
  source?: string;
}

interface ErrorResponse {
  code: string;
  message: string;
  hint?: string;
}

const RequestSchema = z.object({
  text: z.string().min(10).max(5000),
  locale: z.enum(['ko', 'en']).optional().default('ko'),
  hints: z.object({
    category: z.array(z.string()).optional(),
    region: z.array(z.string()).optional(),
  }).optional(),
});

// ============ 캐시 유틸 =============

async function getCachedFacets(
  supabase: any,
  textHash: string
): Promise<{ facets: Facets; tokens: Token[] } | null> {
  const key = `gemini-facets:${textHash}`;
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

async function setCachedFacets(
  supabase: any,
  textHash: string,
  result: { facets: Facets; tokens: Token[] },
  ttlMs: number = 72 * 60 * 60 * 1000
): Promise<void> {
  const key = `gemini-facets:${textHash}`;
  const ttlAt = new Date(Date.now() + ttlMs).toISOString();
  
  await supabase
    .from('api_cache')
    .upsert(
      {
        key,
        data: result,
        ttl_at: ttlAt,
        source: 'gemini',
      },
      { onConflict: 'key' }
    )
    .throwOnError();
}

// ============ Gemini 호출 =============

async function callGeminiAPI(
  text: string,
  locale: string,
  hints?: any
): Promise<{ facets: Facets; tokens: Token[] }> {
  // @ts-ignore: Deno runtime
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const systemPrompt = locale === 'ko'
    ? `당신은 마케팅 & SEO 분석 전문가입니다. 주어진 업체 설명에서 다음을 정확하게 추출하여 JSON으로 응답하세요:

## facets 추출 규칙:
- **category** (배열): 메인 카테고리 (예: ["카페"], ["음식점"], ["뷰티"], ["숙박"], ["액티비티"]) - 1-2개만
- **price_range** (배열): 가격 수준 (예: ["저가"], ["중가"], ["고가"], ["프리미엄"]) - 구체적 언급 있을 때만
- **items** (배열): { name, signature } - 메뉴/서비스 목록. signature: true이면 시그니처
- **audience** (배열): 타겟 고객층 (예: ["20대 여성"], ["직장인"], ["가족"], ["데이트 코플"])
- **amenities** (배열): 편의시설/특징 (예: ["WiFi 완비"], ["넓은 좌석"], ["주차 가능"])
- **vibe** (배열): 분위기/감성 (예: ["세련된"], ["편안한"], ["감성적"], ["활기찬"])
- **intent** (배열): 방문 의도/이유 (예: ["브런치"], ["회의"], ["데이트"], ["휴식"])
- **features** (배열): 주요 특징/강점 (예: ["신선한 재료"], ["프리미엄 서빙"], ["빠른 배송"])
- **amenities** 불필요시 제거, 신뢰도 정보 포함 금지

## tokens 추출:
[Location, Micro-POI, Item, Intent] 슬롯별 키워드
- Location: 도시, 구, 동 (예: "서울", "분당", "강남역")
- Micro-POI: 건물명, 역명, 지역명 (예: "서현역", "판교")
- Item: 메뉴명, 상품명 (예: "크루아상 샌드")
- Intent: 방문 목적 (예: "브런치")

응답은 ONLY 이 JSON 구조:
{
  "facets": {
    "category": ["카테고리"],
    "price_range": ["가격대"],
    "items": [{"name": "메뉴", "signature": false}],
    "audience": ["타겟"],
    "vibe": ["분위기"],
    "intent": ["의도"],
    "features": ["특징"],
    "amenities": ["편의"]
  },
  "tokens": [
    {"text": "강남역", "slot": "Location", "aliases": ["강남역사거리"]},
    ...
  ]
}`
    : `You are a marketing & SEO analysis expert. Extract from the given business description:

## facets extraction rules:
- **category**: Main business categories (e.g., ["Cafe"], ["Restaurant"]) - 1-2 items only
- **price_range**: Price levels (e.g., ["Budget"], ["Mid-range"], ["Premium"]) - only if mentioned
- **items**: Array of {name, signature} - menus/services
- **audience**: Target customer segments (e.g., ["Young professionals"], ["Families"])
- **amenities**: Facilities/features (e.g., ["WiFi"], ["Parking"])
- **vibe**: Atmosphere/mood (e.g., ["Sophisticated"], ["Cozy"])
- **intent**: Visit purpose/reason (e.g., ["Brunch"], ["Business meeting"])
- **features**: Key strengths (e.g., ["Fresh ingredients"], ["Fast service"])

Return ONLY JSON:
{
  "facets": {...},
  "tokens": [...]
}`;

  const userPrompt = `
## 업체 설명 분석 대상:
${text}

${hints?.category ? `\n📌 예상 카테고리: ${hints.category.join(', ')}` : ''}
${hints?.region ? `\n📍 지역/위치: ${hints.region.join(', ')}` : ''}

## 주의사항:
- 구체적인 값만 추출 (예: "전국" 같은 모호한 값 금지)
- 명시되지 않은 필드는 제외
- price_range는 구체적 언급(예: "2만원대", "저가") 있을 때만
- items는 실제 메뉴/서비스만 (모호한 것 제외)
`;

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt + '\n\n' + userPrompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3, // 낮음: 일관성
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(
      `Gemini API error ${response.status}: ${errData.error?.message || 'unknown'}`
    );
  }

  const data = await response.json();
  const text_ = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text_) {
    throw new Error('No content from Gemini');
  }

  // JSON 추출
  const jsonMatch = text_.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid JSON in Gemini response');
  }

  const result = JSON.parse(jsonMatch[0]);
  
  // 검증
  if (!result.facets || !Array.isArray(result.tokens)) {
    throw new Error('Invalid response structure');
  }

  return result;
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
    const { text, locale, hints } = parsed;

    // Supabase 클라이언트 (캐시 용도)
    // @ts-ignore: Deno runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore: Deno runtime
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // 캐시 키 생성 (text hash)
    const textHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(text)
    );
    const hashHex = Array.from(new Uint8Array(textHash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 16);

    // 캐시 조회
    const cached = await getCachedFacets(supabase, hashHex);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
      });
    }

    // Gemini 호출
    console.log('[gemini] calling API for text length:', text.length);
    const result = await callGeminiAPI(text, locale, hints);

    // 캐시 저장 (72h)
    await setCachedFacets(supabase, hashHex, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (err: any) {
    console.error('[error]', err.message);

    let statusCode = 500;
    let code = 'UNKNOWN';
    let message = err.message;
    let hint: string | undefined;

    if (err.message.includes('GEMINI_API_KEY')) {
      code = 'NO_API_KEY';
      message = 'Gemini API key not configured';
      statusCode = 503;
      hint = 'Please set GEMINI_API_KEY environment variable';
    } else if (err.message.includes('Gemini API error')) {
      code = 'UPSTREAM_FAIL';
      message = 'Gemini API call failed';
      statusCode = 502;
      hint = 'Upstream service error, try again later';
    } else if (err instanceof z.ZodError) {
      code = 'INVALID_INPUT';
      message = 'Request validation failed: ' + err.errors[0]?.message;
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
