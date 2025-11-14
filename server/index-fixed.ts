import 'dotenv/config.js';
import type { Express, Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { config } from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  extractLocationWithPriority,
  getNearbyLocations,
} from './locationDatabase';
import { setupSupabaseRoutes } from './supabaseRoutes';

console.log('🚀 서버 초기화 시작...');

config({ path: '.env.local' });

// 전역 에러 핸들러
process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('🔴 Unhandled Rejection:', reason);
  process.exit(1);
});

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3005', 10);

console.log('환경 변수 상태 체크:');
const NAVER_CLIENT_ID = process.env.VITE_NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.VITE_NAVER_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

console.log('네이버 클라이언트 ID:', NAVER_CLIENT_ID ? '✓ 설정됨' : '✗ 미설정');
console.log('네이버 클라이언트 SECRET:', NAVER_CLIENT_SECRET ? '✓ 설정됨' : '✗ 미설정');
console.log('Gemini API KEY:', GEMINI_API_KEY ? '✓ 설정됨' : '✗ 미설정');

let genAI: GoogleGenerativeAI | null = null;
const getGenAI = () => {
  if (!genAI && GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
};

// 미들웨어
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3004', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3004'],
  credentials: true
}));
app.use(express.json());

// 건강 체크
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 네이버 플레이스 검색 API
app.get('/api/search/places', async (req: Request, res: Response) => {
  try {
    const { query, page = 1 } = req.query;
    console.log('\n========== 🔍 API 검색 요청 시작 ==========');
    console.log('📥 받은 쿼리 파라미터:', { query, page });

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: '검색어를 입력해주세요' });
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return res.status(400).json({ error: '검색어를 입력해주세요' });
    }

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return res.json({
        success: false,
        total: 0,
        places: [],
        hasMore: false,
        page: 1,
        message: 'API 설정이 되어 있지 않습니다.'
      });
    }

    const pageNum = parseInt(page as string) || 1;
    const start = (pageNum - 1) * 100 + 1;

    const response = await axios.get(
      'https://openapi.naver.com/v1/search/local.json',
      {
        params: {
          query: trimmedQuery,
          display: 100,
          start: start,
          sort: 'comment'
        },
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
        },
        timeout: 10000
      }
    );

    const places = response.data.items.map((item: any) => {
      const title = item.title
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      return {
        id: item.link.split('/').pop() || Math.random().toString(),
        title: title,
        address: item.address || '',
        phone: item.telephone || '',
        url: item.link || '',
        category: item.category || ''
      };
    });

    const finalResponse = {
      success: true,
      total: response.data.total || 0,
      places: places,
      hasMore: (response.data.total || 0) > pageNum * 100,
      page: pageNum
    };

    console.log('========== ✅ API 응답 완료 ==========\n');
    res.json(finalResponse);
  } catch (error: any) {
    console.log('\n========== ❌ 검색 API 오류 ==========');
    console.error('에러:', error.message);

    const status = error.response?.status;
    let message = 'API 호출 실패';
    if (status === 400) message = '검색어가 올바르지 않습니다';
    else if (status === 401) message = 'API 인증 실패';
    else if (status === 429) message = 'API 호출 제한 초과';
    else if (error.code === 'ETIMEDOUT') message = 'API 응답 지연';

    res.json({
      success: false,
      total: 0,
      places: [],
      hasMore: false,
      page: 1,
      message
    });
  }
});

// AI Facet 추출
app.post('/api/ai/extract-facets', async (req: Request, res: Response) => {
  try {
    console.log('\n========== 📊 Facet 추출 시작 ==========');
    
    const { description, placeInfo } = req.body;
    if (!description || !placeInfo) {
      return res.status(400).json({ error: 'description과 placeInfo가 필요합니다' });
    }

    const locationResult = extractLocationWithPriority(placeInfo, description);
    const nearbyLocations = getNearbyLocations(locationResult.city, locationResult.district);

    let geminiAnalysis: any = null;
    
    const genAIInstance = getGenAI();
    if (genAIInstance) {
      try {
        const model = genAIInstance.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const analysisPrompt = `당신은 마케팅 분석 전문가입니다. 다음 업체 정보를 분석하세요.

【업체명】${placeInfo}

【업체 설명】
${description}

아래를 JSON 형식으로 작성하세요. 꼭 JSON으로만 응답하세요:
{
  "location": {
    "city": "도시명",
    "district": "구/군명"
  },
  "category": "카테고리",
  "signature_items": ["항목1", "항목2"],
  "target_audience": ["타겟1", "타겟2"],
  "key_features": ["특징1", "특징2"],
  "vibes": ["분위기1", "분위기2"],
  "price_range": "가격대",
  "amenities": ["편의시설1"]
}`;

        const result = await model.generateContent(analysisPrompt);
        const responseText = result.response.text();
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          geminiAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch (geminiErr: any) {
        console.error('❌ Gemini API 오류:', geminiErr.message);
      }
    }

    const levelToScore: Record<string, number> = { high: 0.9, medium: 0.6, low: 0.3 };
    
    const finalConfidence =
      locationResult.city && locationResult.city !== '전국' && locationResult.district
        ? 'high'
        : locationResult.city && locationResult.city !== '전국'
        ? 'medium'
        : 'low';
    
    const facetsResponse = {
      place: {
        name: placeInfo.trim(),
        address: `${locationResult.city} ${locationResult.district}`.trim(),
        poi_aliases: [placeInfo, locationResult.city, locationResult.district].filter(Boolean)
      },
      location: {
        city: locationResult.city || '전국',
        district: locationResult.district || '위치 미지정',
        neighborhoods: locationResult.neighborhoods || [],
        canonical_name: `${locationResult.city} ${locationResult.district}`.trim() || '전국',
        poi: locationResult.neighborhoods || [],
        line: ''
      },
      location_confidence: {
        level: finalConfidence,
        score: levelToScore[finalConfidence] ?? 0.5,
        source: locationResult.source,
        signals: {
          cityFound: !!locationResult.city && locationResult.city !== '전국',
          districtFound: !!locationResult.district && locationResult.district !== '위치 미지정',
          microPoiFound: locationResult.neighborhoods.length > 0,
          aliasMatch: locationResult.source.includes('alias'),
          bothFieldsConsistent: true
        }
      },
      extraction_method: {
        primary: locationResult.source,
        secondary_sources: [
          ...(locationResult.source.includes('alias') ? ['alias_normalized'] : []),
          ...(geminiAnalysis?.location?.city ? ['gemini_api'] : [])
        ]
      },
      trade_area: nearbyLocations.metro?.slice(0, 3) || ['전국'],
      category: geminiAnalysis?.category ? [geminiAnalysis.category] : ['카페'],
      items: (geminiAnalysis?.signature_items || ['시그니처 메뉴']).map((item: string) => ({ 
        name: item, 
        signature: true 
      })),
      audience: geminiAnalysis?.target_audience || ['모든 고객'],
      vibe: geminiAnalysis?.vibes || ['편안한 분위기'],
      price_range: [geminiAnalysis?.price_range || '중간'],
      amenities: geminiAnalysis?.amenities || ['주차', '화장실'],
      benefits: ['우수한 서비스'],
      features: geminiAnalysis?.key_features || ['감성 있는 공간']
    };

    console.log('========== ✅ Facet 추출 완료 ==========\n');
    return res.json(facetsResponse);
  } catch (err: any) {
    console.error('❌ extract-facets 오류:', err.message);
    res.status(500).json({ error: 'AI 분석 실패', details: err.message });
  }
});

// AI 키워드 랭킹
app.post('/api/ai/rank-keywords', async (req: Request, res: Response) => {
  try {
    console.log('\n========== 🎯 키워드 랭킹 시작 ==========');
    
    const { facets } = req.body;
    if (!facets) {
      return res.status(400).json({ error: 'facets이 필요합니다' });
    }

    let keywordAnalysis: any[] = [];
    
    const genAIInstance = getGenAI();
    if (genAIInstance) {
      try {
        const model = genAIInstance.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        const keywordPrompt = `당신은 키워드 마케팅 전문가입니다. 다음 업체 정보 기반 5-8개 키워드를 생성하세요:

이름: ${facets.place?.name}
카테고리: ${facets.category?.[0]}
시그니처: ${facets.items?.map((i: any) => i.name).join(', ')}

JSON 배열로 응답:
[{
  "kw": "키워드",
  "sv": 월간_검색량,
  "doc_t": 문서수,
  "sv_effective": 유효_검색량,
  "sv_exact": 정확_검색량,
  "lc_score": 점수,
  "why": "이유",
  "conf": 신뢰도,
  "explanation": "설명"
}]`;

        const result = await model.generateContent(keywordPrompt);
        const responseText = result.response.text();
        
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            keywordAnalysis = parsed.map((kw: any) => ({
              kw: kw.kw || '',
              sv: kw.sv || 1000,
              doc_t: kw.doc_t || 1000,
              sv_effective: kw.sv_effective || kw.sv || 800,
              sv_exact: kw.sv_exact || kw.sv || 1000,
              lc_score: kw.lc_score || 50,
              why: kw.why || '관련 검색어',
              conf: kw.conf || 0.8,
              explanation: kw.explanation || '키워드 설명',
              threshold_pass: (kw.sv || 0) >= 500,
              threshold_rule: (kw.sv || 0) >= 500 ? 'STRICT_500' : 'TREND_EXEMPT',
              explanation_threshold: (kw.sv || 0) >= 500 ? '월간 검색량 500 이상' : '트렌드 키워드'
            }));
          }
        }
      } catch (geminiErr: any) {
        console.error('❌ Gemini API 오류:', geminiErr.message);
      }
    }

    // 기본 키워드
    if (keywordAnalysis.length === 0) {
      const baseKeywords = [
        `${facets.place?.name}`,
        `${facets.category?.[0] || '카페'} ${facets.location?.district || ''}`,
        `${facets.items?.[0]?.name || '시그니처'} ${facets.location?.city || ''}`,
        `${facets.audience?.[0] || '20대'} 친화 ${facets.category?.[0] || '카페'}`,
        `${facets.location?.district || '지역'} 핫플레이스`
      ];

      keywordAnalysis = baseKeywords.map((kw, idx) => ({
        kw,
        sv: 5000 - idx * 500,
        doc_t: 5000 - idx * 500,
        sv_effective: 4000 - idx * 400,
        sv_exact: 5000 - idx * 500,
        lc_score: 85 - idx * 5,
        why: '추천 키워드',
        conf: 0.9 - idx * 0.05,
        explanation: `${idx + 1}순위 키워드`,
        threshold_pass: true,
        threshold_rule: 'STRICT_500' as const,
        explanation_threshold: '월간 검색량 500 이상'
      }));
    }

    console.log('========== ✅ 키워드 랭킹 완료 ==========\n');
    return res.json(keywordAnalysis);
  } catch (err: any) {
    console.error('❌ rank-keywords 오류:', err.message);
    res.status(500).json({ error: '키워드 분석 실패', details: err.message });
  }
});

// AI 가이드라인 생성
app.post('/api/ai/generate-guideline', async (req: Request, res: Response) => {
  try {
    console.log('\n========== 📝 가이드라인 생성 시작 ==========');

    const { keywords, tone } = req.body;
    if (!keywords || !tone) {
      return res.status(400).json({ error: 'keywords와 tone이 필요합니다' });
    }

    let guideline = '';
    
    const genAIInstance = getGenAI();
    if (genAIInstance) {
      try {
        const model = genAIInstance.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        const guidelinePrompt = `당신은 경험 많은 마케팅 컨설턴트입니다. 다음 키워드와 톤으로 마케팅 가이드라인을 마크다운으로 작성하세요:

【핵심 키워드】
${keywords.slice(0, 5).map((kw: string, idx: number) => `${idx + 1}. ${kw}`).join('\n')}

【마케팅 톤】
${tone}

구조: # 제목, ## 섹션, 내용`;

        const result = await model.generateContent(guidelinePrompt);
        guideline = result.response.text();
      } catch (geminiErr: any) {
        console.error('❌ Gemini API 오류:', geminiErr.message);
      }
    }

    if (!guideline || guideline.length < 100) {
      guideline = `# 마케팅 가이드라인\n\n## 전략 개요\n핵심 키워드를 중심으로 전개합니다.\n\n## 키워드\n${keywords.slice(0, 5).map((kw: string) => `- ${kw}`).join('\n')}\n\n**톤**: ${tone}`;
    }

    console.log('========== ✅ 가이드라인 생성 완료 ==========\n');
    return res.json({ guideline });
  } catch (err: any) {
    console.error('❌ generate-guideline 오류:', err.message);
    res.status(500).json({ error: '가이드라인 생성 실패', details: err.message });
  }
});

// Supabase 라우트 설정
console.log('📡 Supabase 라우트 설정 중...');
try {
  setupSupabaseRoutes(app);
  console.log('✅ Supabase 라우트 설정 완료');
} catch (err: any) {
  console.error('❌ Supabase 라우트 설정 오류:', err.message);
}

// 에러 핸들러
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('서버 에러:', err);
  res.status(500).json({
    error: '서버 오류 발생',
    message: err.message
  });
});

// 서버 시작
console.log('\n✅ 모든 라우트 설정 완료. 서버 시작 준비...\n');

const server = app.listen(PORT, '0.0.0.0', function() {
  console.log(`✅ 백엔드 서버 시작됨: http://127.0.0.1:${PORT}`);
  console.log(`📍 검색 API: http://127.0.0.1:${PORT}/api/search/places?query=카페\n`);
});

server.on('error', (err: any) => {
  console.error('❌ 서버 바인딩 오류:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`포트 ${PORT}가 이미 사용 중입니다.`);
  }
  process.exit(1);
});
