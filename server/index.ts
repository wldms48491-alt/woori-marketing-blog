#!/usr/bin/env node

// 환경변수 로드 (첫 줄에서 로드 필요)
// dotenv는 기본적으로 .env 파일을 찾으므로, .env.local은 수동으로 로드
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env.local 파일 로드 (상위 디렉토리)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractLocationWithPriority, getNearbyLocations, locationDatabase } from './locationDatabase.js';
import { setupSupabaseRoutes } from './supabaseRoutes.js';
import { extractLocationFromBusinessInfo } from './advancedLocationExtractor.js';
import { getMicroArea, getAllMicroAreas } from './microAreaDatabase.js';
import { getDongCharacteristics, getCharacteristicAdjustments } from './dongCharacteristics.js';
import { getSeasonalPattern, getMonthlyTrend, generateSeasonalWarning, applySeasonalAdjustment } from './seasonalTrendData.js';

const cityLocations = locationDatabase;

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;

// Gemini AI 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

// 미들웨어
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3004', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (빌드된 React 앱)
app.use(express.static(path.join(__dirname, '..', 'dist')));

// 건강 확인
app.get('/health', (req, res) => {
  console.log('[GET /health]');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 장소 검색
app.get('/api/search/places', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: '검색어 필요' });
    }

    // 백엔드용 환경변수 (VITE_ 접두사 없음)
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    console.log(`[/api/search/places] 검색어: "${query}", 페이지: ${page}`);
    console.log(`[/api/search/places] 네이버 ID 로드: ${NAVER_CLIENT_ID ? '✓' : '✗'}`);
    console.log(`[/api/search/places] 네이버 SECRET 로드: ${NAVER_CLIENT_SECRET ? '✓' : '✗'}`);

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      console.error('[/api/search/places] ❌ 네이버 API 자격증명 미로드');
      return res.status(500).json({ 
        success: false, 
        error: '네이버 API 자격증명 설정 오류 - 관리자에게 문의하세요',
        total: 0, 
        places: [] 
      });
    }

    const pageNum = parseInt(String(page), 10) || 1;
    const start = (pageNum - 1) * 100 + 1;

    console.log(`[/api/search/places] 🌐 네이버 API 호출: query="${query}", start=${start}`);

    const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
      params: { query: query.trim(), display: 100, start, sort: 'comment' },
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      },
      timeout: 10000
    });

    console.log(`[/api/search/places] ✅ 네이버 응답: ${response.data.items?.length || 0}개 결과`);

    // HTML 엔티티 디코딩 함수
    function decodeHtmlEntities(text: string): string {
      const map: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&nbsp;': ' ',
        '&#39;': "'",
      };
      return text.replace(/&[#\w]+;/g, (entity) => map[entity] || entity);
    }

    // HTML 태그 제거 함수
    function stripHtmlTags(text: string): string {
      return text.replace(/<[^>]*>/g, '').trim();
    }

    const places = (response.data.items || []).map((item: any) => ({
      id: item.link ? item.link.split('/').pop() : Math.random().toString(),
      title: stripHtmlTags(decodeHtmlEntities(item.title || '')),
      address: decodeHtmlEntities(item.address || ''),
      phone: item.telephone || '',
      url: item.link || '',
      category: item.category || ''
    }));

    console.log(`[/api/search/places] 📦 응답 반환: ${places.length}개`);

    res.json({
      success: true,
      total: response.data.total || 0,
      places,
      hasMore: (response.data.total || 0) > pageNum * 100,
      page: pageNum
    });
  } catch (error) {
    console.error('[ERROR /api/search/places]', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('[/api/search/places] ❌ 네이버 API 인증 실패 - 자격증명 확인 필요');
        return res.status(401).json({ 
          success: false, 
          error: '네이버 API 인증 실패 - 자격증명을 확인하세요',
          total: 0, 
          places: [] 
        });
      }
      if (error.code === 'ECONNABORTED') {
        console.error('[/api/search/places] ❌ 네이버 API 타임아웃');
        return res.status(504).json({ 
          success: false, 
          error: '검색 요청 시간 초과 - 다시 시도하세요',
          total: 0, 
          places: [] 
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      total: 0, 
      places: [] 
    });
  }
});

// 검색 트렌드 (키워드)
app.get('/api/search/trend', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: '검색어 필요' });
    }

    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    console.log(`[/api/search/trend] 검색어: "${query}"`);
    console.log(`[/api/search/trend] 네이버 ID 로드: ${NAVER_CLIENT_ID ? '✓' : '✗'}`);
    console.log(`[/api/search/trend] 네이버 SECRET 로드: ${NAVER_CLIENT_SECRET ? '✓' : '✗'}`);

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      console.error('[/api/search/trend] ❌ 네이버 API 자격증명 미로드');
      return res.status(500).json({ 
        success: false, 
        error: '네이버 API 자격증명 설정 오류 - 관리자에게 문의하세요',
        trends: [],
        keywordInfo: null
      });
    }

    console.log(`[/api/search/trend] 🌐 네이버 트렌드 API 호출: query="${query}"`);

    // 네이버 검색 API로 기본 데이터 조회 (트렌드 라벨링용)
    const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: { 
        query: query.trim(), 
        display: 20,
        sort: 'date'
      },
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      },
      timeout: 10000
    });

    console.log(`[/api/search/trend] ✅ 네이버 응답: ${response.data.items?.length || 0}개 뉴스 결과`);

    // HTML 엔티티 디코딩 함수
    function decodeHtmlEntities(text: string): string {
      const map: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&apos;': "'",
        '&nbsp;': ' ',
        '&#39;': "'",
      };
      return text.replace(/&[#\w]+;/g, (entity) => map[entity] || entity);
    }

    // HTML 태그 제거 함수
    function stripHtmlTags(text: string): string {
      return text.replace(/<[^>]*>/g, '').trim();
    }

    // 관련 키워드 추출 (쿼리 + 뉴스 제목에서)
    const relatedKeywords = new Set<string>();
    
    // 기본 쿼리 추가
    relatedKeywords.add(query.trim());
    
    // 뉴스 제목에서 키워드 추출
    (response.data.items || []).forEach((item: any) => {
      const title = stripHtmlTags(decodeHtmlEntities(item.title || ''));
      
      // 제목에서 3글자 이상의 단어 추출 (간단한 토크나이제이션)
      const words = title.match(/[\w가-힣]{3,}/g) || [];
      words.forEach(word => {
        if (word.length <= 20 && !['뉴스', '기사', '관련', '최근', '전문가'].includes(word)) {
          relatedKeywords.add(word);
        }
      });
    });

    // 트렌드 데이터 생성
    const trendData = {
      mainKeyword: query.trim(),
      relatedKeywords: Array.from(relatedKeywords).slice(0, 10), // 상위 10개
      newsCount: response.data.total || 0,
      recentNews: (response.data.items || []).slice(0, 10).map((item: any) => ({
        title: stripHtmlTags(decodeHtmlEntities(item.title || '')),
        link: item.link || '',
        pubDate: item.pubDate || '',
        description: stripHtmlTags(decodeHtmlEntities(item.description || ''))
      })),
      trendAnalysis: {
        hotness: response.data.total > 100 ? 'high' : response.data.total > 20 ? 'medium' : 'low',
        totalSearch: response.data.total || 0,
        relatedCount: Math.min(relatedKeywords.size, 10),
        isUrgent: response.data.total > 200 // 검색 결과 200개 이상이면 긴급/인기 트렌드
      }
    };

    console.log(`[/api/search/trend] 📦 응답 반환: ${relatedKeywords.size}개 관련 키워드, ${trendData.recentNews.length}개 뉴스`);

    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('[ERROR /api/search/trend]', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('[/api/search/trend] ❌ 네이버 API 인증 실패 - 자격증명 확인 필요');
        return res.status(401).json({ 
          success: false, 
          error: '네이버 API 인증 실패 - 자격증명을 확인하세요',
          trends: [],
          keywordInfo: null
        });
      }
      if (error.code === 'ECONNABORTED') {
        console.error('[/api/search/trend] ❌ 네이버 API 타임아웃');
        return res.status(504).json({ 
          success: false, 
          error: '트렌드 조회 시간 초과 - 다시 시도하세요',
          trends: [],
          keywordInfo: null
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      trends: [],
      keywordInfo: null
    });
  }
});

// Facet 추출
app.post('/api/ai/extract-facets', async (req, res) => {
  try {
    const { description, placeInfo, address } = req.body;
    console.log('[POST /api/ai/extract-facets]', { 
      placeInfo, 
      description: description ? description.substring(0, 50) : 'N/A',
      address: address || '(없음)'
    });

    if (!description || !placeInfo) {
      return res.status(400).json({ error: '필수 값 누락' });
    }

    // Step 0: address가 없으면 Naver 검색으로 자동 조회
    let finalAddress = address;
    if (!finalAddress) {
      console.log('📍 주소 정보 없음. Naver 검색으로 조회 중...');
      try {
        const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
        const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
        
        if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
          const searchResponse = await axios.get('https://openapi.naver.com/v1/search/local.json', {
            params: { query: placeInfo.trim(), display: 1 },
            headers: {
              'X-Naver-Client-Id': NAVER_CLIENT_ID,
              'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
            },
            timeout: 5000
          });
          
          if (searchResponse.data.items?.length > 0) {
            const firstResult = searchResponse.data.items[0];
            finalAddress = firstResult.address || firstResult.roadAddress;
            console.log(`✅ Naver 검색으로 주소 획득: ${finalAddress}`);
          }
        }
      } catch (e) {
        console.warn('⚠️ Naver 자동 검색 실패:', e instanceof Error ? e.message : String(e));
      }
    }

    const locationResult = extractLocationWithPriority(placeInfo, description);

    // 📍 상세 상권 정보 추출 함수
    function buildTradeAreaDetails(city: string, district: string): Array<{name: string; type: 'commercial' | 'metro' | 'landmark' | 'attraction'; base: number; bonus: number; score: number}> {
      const details: Array<{name: string; type: 'commercial' | 'metro' | 'landmark' | 'attraction'; base: number; bonus: number; score: number}> = [];
      
      // 데이터베이스에서 상권 정보 조회
      try {
        const locationInfo = (require('./locationDatabase').locationDatabase || {})[city]?.[district];
        if (locationInfo) {
          // 상업지구
          if (locationInfo.commercialAreas && Array.isArray(locationInfo.commercialAreas)) {
            locationInfo.commercialAreas.forEach((area: string) => {
              details.push({
                name: area,
                type: 'commercial',
                base: 100,
                bonus: 20,
                score: 120
              });
            });
          }
          
          // 지하철역
          if (locationInfo.metro && Array.isArray(locationInfo.metro)) {
            locationInfo.metro.forEach((station: string) => {
              details.push({
                name: station,
                type: 'metro',
                base: 80,
                bonus: 15,
                score: 95
              });
            });
          }
          
          // 랜드마크
          if (locationInfo.landmarks && Array.isArray(locationInfo.landmarks)) {
            locationInfo.landmarks.forEach((landmark: string) => {
              details.push({
                name: landmark,
                type: 'landmark',
                base: 60,
                bonus: 10,
                score: 70
              });
            });
          }
          
          // 관광지
          if (locationInfo.attractions && Array.isArray(locationInfo.attractions)) {
            locationInfo.attractions.forEach((attraction: string) => {
              details.push({
                name: attraction,
                type: 'attraction',
                base: 50,
                bonus: 5,
                score: 55
              });
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ 상권 정보 조회 실패:', e instanceof Error ? e.message : String(e));
      }
      
      return details;
    }

    // ✅ Gemini API로 구체적으로 분석
    let geminiAnalysis = null;
    let geminiSuccess = false;
    let extractedLocation = null; // 고급 주소 파싱으로 추출한 위치 정보
    
    try {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        // Step 1: 일반 Facet 추출
        const analysisPrompt = `당신은 마케팅 & SEO 분석 전문가입니다. 다음 업체 정보를 정확하게 분석하세요.

업체명: ${placeInfo}

업체 설명:
${description}

다음 JSON만 응답하세요 (추가 설명 금지):
{
  "categories": ["카테고리1", "카테고리2"],
  "items": [{"name": "메뉴/서비스명1", "signature": true}, {"name": "메뉴/서비스명2", "signature": false}],
  "audience": ["타겟층1", "타겟층2"],
  "features": ["특징1", "특징2"],
  "vibe": ["분위기1", "분위기2"],
  "price_range": "저가",
  "amenities": ["편의시설1", "편의시설2"],
  "intent": ["방문의도1", "방문의도2"]
}

추출 규칙:
- categories: 배열. 주 카테고리 1-3개. 명시된 것만
- price_range: "저가", "중가", "고가", "프리미엄" 중 1개. 없으면 빈 문자열 ""
- items: 배열. 실제 메뉴/서비스만. 각 항목은 {name, signature}
- 나머지 필드: 배열. 명시되지 않은 필드는 빈 배열 []
- 빈 값이나 추측 금지. 명확한 정보만`;

        console.log('📥 Gemini 입력:', { placeInfo, descriptionLength: description.length });
        
        const result = await model.generateContent(analysisPrompt);
        const responseText = result.response.text();
        
        console.log('🤖 Gemini 응답 원본:', responseText.substring(0, 500));
        
        // JSON 추출 - 더 강력한 파싱
        let jsonStr = responseText;
        
        // 1단계: ```json ... ``` 형식 처리
        const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
          jsonStr = jsonBlockMatch[1].trim();
        }
        
        // 2단계: JSON 객체 추출
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            geminiAnalysis = parsed;
            geminiSuccess = true;
            console.log('✅ Gemini 분석 성공');
            console.log('  - categories:', parsed.categories?.slice(0, 3));
            console.log('  - items:', parsed.items?.length || 0, '개');
            console.log('  - audience:', parsed.audience?.length || 0, '개');
            console.log('  - price_range:', parsed.price_range);
          } catch (e) {
            console.warn('⚠️ JSON 파싱 실패:', e instanceof Error ? e.message : String(e));
            geminiAnalysis = null;
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Gemini API 호출 실패:', error instanceof Error ? error.message : String(error));
    }

    // 폴백: Gemini 실패 시 기본 휴리스틱 기반 추출
    if (!geminiSuccess || !geminiAnalysis) {
      console.log('🔄 폴백: 기본 휴리스틱 사용');
      geminiAnalysis = extractFacetsHeuristic(placeInfo, description);
    }

    // 📍 안전한 데이터 변환 함수
    function safeToArray(value: any): any[] {
      if (Array.isArray(value)) return value.filter(v => v);  // null/undefined 제거
      if (value && typeof value === 'string') return [value];
      return [];
    }

    function safeToString(value: any): string {
      if (typeof value === 'string') return value;
      return '';
    }

    // Gemini 응답을 표준 형식으로 정규화
    const normalizedAnalysis = {
      categories: safeToArray(geminiAnalysis?.categories || geminiAnalysis?.category),
      items: Array.isArray(geminiAnalysis?.items) 
        ? geminiAnalysis.items.filter((i: any) => i && (typeof i === 'string' ? i : i.name))
                             .map((i: any) => typeof i === 'string' ? { name: i, signature: false } : i)
        : [],
      audience: safeToArray(geminiAnalysis?.audience),
      features: safeToArray(geminiAnalysis?.features),
      vibe: safeToArray(geminiAnalysis?.vibe),
      price_range: safeToString(geminiAnalysis?.price_range),
      amenities: safeToArray(geminiAnalysis?.amenities),
      intent: safeToArray(geminiAnalysis?.intent)
    };

    console.log('📊 정규화된 분석 결과:', {
      categories: normalizedAnalysis.categories.length,
      items: normalizedAnalysis.items.length,
      audience: normalizedAnalysis.audience.length,
      features: normalizedAnalysis.features.length,
      vibe: normalizedAnalysis.vibe.length,
      amenities: normalizedAnalysis.amenities.length,
      intent: normalizedAnalysis.intent.length
    });

    // 📍 위치 정보 추출 (우선순위: Naver 주소 > 설명 > 기본 휴리스틱)
    // 1단계: Naver 주소가 있으면 그것 사용 (가장 신뢰도 높음)
    if (finalAddress) {
      extractedLocation = extractLocationFromBusinessInfo(placeInfo, finalAddress);
      console.log('✅ Naver 주소에서 위치 추출:', extractedLocation);
    }
    
    // 2단계: 설명에서 주소 찾아보기 (동/미시상권 포함)
    if (!extractedLocation || !extractedLocation.dong) {
      const descriptionLocation = extractLocationFromBusinessInfo(placeInfo, description);
      if (descriptionLocation?.city) {
        // 도시/구군이 없으면 설명에서 추출한 정보 사용
        if (!extractedLocation) {
          extractedLocation = descriptionLocation;
          console.log('✅ 설명에서 위치 추출:', extractedLocation);
        } else if (!extractedLocation.dong && descriptionLocation.dong) {
          // 도시/구군은 있지만 동 정보가 없으면 설명에서 동 추출
          extractedLocation = {
            ...extractedLocation,
            dong: descriptionLocation.dong,
            micro_area: descriptionLocation.micro_area
          };
          console.log('✅ 설명에서 동/미시상권 추출:', { dong: descriptionLocation.dong, micro_area: descriptionLocation.micro_area });
        }
      }
    }
    
    // 3단계: 폴백으로 기존 locationResult 사용하되, 동/미시상권은 반드시 시도
    const finalCity = extractedLocation?.city || locationResult.city || '';
    const finalDistrict = extractedLocation?.district || locationResult.district || '';
    let finalDong = extractedLocation?.dong;
    let finalMicroArea: string | undefined = undefined;  // 초기값을 undefined로 명시
    const locationConfidence = extractedLocation?.confidence || locationResult.confidence || 'low';

    // 동/미시상권이 없으면 cityLocations에서 추가 추출 시도
    if (!finalDong && finalCity && finalDistrict && cityLocations[finalCity]) {
      const districtLocations = cityLocations[finalCity][finalDistrict];
      if (districtLocations && Array.isArray(districtLocations) && districtLocations.length > 0) {
        // 첫 번째 위치에서 동 정보 추출 시도
        const firstLocation = districtLocations[0];
        if (typeof firstLocation === 'string' && firstLocation.includes('동')) {
          finalDong = firstLocation.match(/([가-힣]+동)/)?.[1];
        }
      }
    }

    // ⚠️ 중요: 미시상권은 '확실한' 동 정보가 있을 때만 추가
    // extractedLocation에서 직접 추출한 동이거나, 높은 신뢰도의 동정보일 때만
    if (finalDong && extractedLocation?.confidence === 'high') {
      // 주소 파싱으로 추출된 높은 신뢰도의 동 정보일 때만 미시상권 포함
      finalMicroArea = getMicroArea(finalCity, finalDistrict, finalDong);
      console.log('✅ 동/미시상권 추출 (높은 신뢰도):', { dong: finalDong, micro_area: finalMicroArea });
    } else if (finalDong && locationConfidence === 'high') {
      // 또는 전체 위치 신뢰도가 높을 때
      finalMicroArea = getMicroArea(finalCity, finalDistrict, finalDong);
      console.log('✅ 동/미시상권 추출 (위치 신뢰도 높음):', { dong: finalDong, micro_area: finalMicroArea });
    }

    console.log('📍 최종 위치 추출 결과:', { 
      city: finalCity, 
      district: finalDistrict,
      dong: finalDong,
      micro_area: finalMicroArea,
      confidence: locationConfidence,
      extraction_confidence: extractedLocation?.confidence,
      source: extractedLocation?.source || 'heuristic'
    });

    // 상권 후보 추출 (사용자가 선택할 수 있도록)
    let microAreaCandidates: string[] = [];
    if (finalDong && finalCity && finalDistrict) {
      try {
        microAreaCandidates = getAllMicroAreas(finalCity, finalDistrict, finalDong)
          .filter(area => area !== finalMicroArea);  // 이미 선택된 상권은 제외
        console.log('🔄 상권 후보:', microAreaCandidates);
      } catch (e) {
        console.debug('⚠️ 상권 후보 추출 실패:', e instanceof Error ? e.message : String(e));
      }
    }

    // 응답 구성 - 동/미시상권 정보 반드시 포함
    const tradeAreaDetails = buildTradeAreaDetails(finalCity, finalDistrict);
    
    const facets = {
      place: { 
        name: placeInfo.trim(), 
        address: [finalCity, finalDistrict].filter(Boolean).join(' ') || '위치 미확인'
      },
      location: {
        city: finalCity || undefined,
        district: finalDistrict || undefined,
        ...(finalDong && { dong: finalDong }),                           // 동 정보 필수 포함
        ...(finalMicroArea && { micro_area: finalMicroArea }),           // 미시상권 정보 필수 포함
        ...(microAreaCandidates.length > 0 && { micro_area_candidates: microAreaCandidates }),  // 대안 상권 제공
        micro_area_confidence: extractedLocation?.confidence === 'high' ? 'high' : 'medium',  // 상권 신뢰도
        confidence: locationConfidence,
        poi: locationResult.neighborhoods || [],
      },
      // 정규화된 분석 결과 사용
      category: normalizedAnalysis.categories,  // 배열로 반환
      items: normalizedAnalysis.items,
      audience: normalizedAnalysis.audience,
      vibe: normalizedAnalysis.vibe,
      price_range: normalizedAnalysis.price_range ? [normalizedAnalysis.price_range] : [],
      amenities: normalizedAnalysis.amenities,
      features: normalizedAnalysis.features,
      intent: normalizedAnalysis.intent,
      // trade_area: 동과 미시상권만 포함 (도시/구군은 location에서 관리)
      trade_area: [finalDong, finalMicroArea].filter(Boolean),
      ...(tradeAreaDetails.length > 0 && { trade_area_details: tradeAreaDetails }), // 상세 상권 정보 추가
    };

    res.json(facets);
  } catch (error) {
    console.error('[ERROR /api/ai/extract-facets]', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * 휴리스틱 기반 Facet 추출 (Gemini 실패 시 폴백)
 */
function extractFacetsHeuristic(placeInfo: string, description: string): any {
  const text = `${placeInfo} ${description}`.toLowerCase();
  
  // 카테고리 추론 (여러 개 가능)
  const categories: string[] = [];
  const categoryMap: Record<string, string> = {
    '카페|커피|브런치|아메리카노|라떼|에스프레소': '카페',
    '음식점|식당|라면|국수|밥|육회|회|초밥|스시|피자|햄버거|치킨': '음식점',
    '세차|자동차|세차장|차량|스팀|광택|손세차': '세차장',
    '헬스|체육|운동|피트니스|요가|필라테스|짐': '헬스',
    '미용|머리|헤어|매니큐어|페디큐어|피부|에스테틱': '미용',
    '술|주점|호프|펍|클럽|바|칵테일': '주점',
    '숙박|호텔|모텔|에어비앤비|게스트하우스|펜션': '숙박',
    '병원|의원|클리닉|치과|한의원|약국': '의료',
    '학원|어학|영어|수학|과외|교육': '학원',
  };

  for (const [keywords, cat] of Object.entries(categoryMap)) {
    if (new RegExp(keywords).test(text)) {
      categories.push(cat);
    }
  }

  // 가격대 추론
  let price_range = '';
  if (/저가|저렴|싸|가성비|저가격|천원|이천|삼천/.test(text)) {
    price_range = '저가';
  } else if (/중가|중간|보통|5천|만원|2만|3만/.test(text)) {
    price_range = '중가';
  } else if (/고가|비싼|고급|프리미엄|5만|10만|20만/.test(text)) {
    price_range = '고가';
  }

  // 주요 메뉴/서비스 추출
  const items: any[] = [];
  const menuKeywords = [
    { keyword: '아메리카노|라떼|카페라떼', name: '커피' },
    { keyword: '파스타|리소또', name: '이탈리안' },
    { keyword: '스테이크|구이|육수', name: '고기' },
    { keyword: '회|초밥|오마카세', name: '일식' },
  ];

  for (const { keyword, name } of menuKeywords) {
    if (new RegExp(keyword).test(text)) {
      items.push({ name, signature: true });
    }
  }

  return {
    categories: categories.length > 0 ? categories : ['기타'],
    price_range,
    items,
    audience: [],
    features: [],
    vibe: [],
    amenities: [],
    intent: [],
  };
}

// 키워드 랭킹
app.post('/api/ai/rank-keywords', async (req, res) => {
  try {
    const { facets } = req.body;
    console.log('[POST /api/ai/rank-keywords]', { 
      placeName: facets?.place?.name,
      category: facets?.category?.[0],
      location: `${facets?.location?.city || ''} ${facets?.location?.district || ''}`
    });

    if (!facets) return res.status(400).json({ error: 'facets 필요' });

    // Step 1: Facets 데이터 구조화
    const placeName = facets.place?.name || '업체';
    const category = facets.category?.[0] || '가게';
    const city = facets.location?.city || '';
    const district = facets.location?.district || '';
    const items = (Array.isArray(facets.items) ? facets.items : [])
      .filter((item: any) => item?.name)
      .map((item: any) => item.name);
    const audience = Array.isArray(facets.audience) ? facets.audience : [];
    const features = Array.isArray(facets.features) ? facets.features : [];
    const vibe = Array.isArray(facets.vibe) ? facets.vibe : [];
    const priceRange = facets.price_range?.[0] || '';

    console.log('📊 Facets 분석 데이터:', { 
      placeName, 
      category, 
      location: `${city} ${district}`,
      items: items.slice(0, 3),
      audience: audience.slice(0, 2),
      features: features.slice(0, 2),
      vibe
    });

    // Step 2: Gemini를 통한 지능형 키워드 생성
    let generatedKeywords = [];
    try {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const keywordPrompt = `당신은 SEO 전문가 & 마케팅 컨설턴트입니다. 
다음 비즈니스 정보를 바탕으로 핵심 키워드를 생성하세요.

【비즈니스 정보】
이름: ${placeName}
카테고리: ${category}
지역: ${city || '전국'} ${district}
주요 서비스: ${items.length > 0 ? items.join(', ') : category}
타겟층: ${audience.length > 0 ? audience.join(', ') : '일반인'}
특징: ${features.length > 0 ? features.join(', ') : '없음'}
분위기: ${vibe.length > 0 ? vibe.join(', ') : '없음'}
가격대: ${priceRange}

【키워드 생성 규칙】
다음 카테고리별로 총 40-50개의 키워드를 JSON 배열로만 응답:

{
  "keywords": [
    {
      "kw": "키워드",
      "category": "brand|location_category|service|experience|general",
      "priority": 1-5,
      "sv_estimate": 100-5000,
      "reasoning": "선택 이유"
    }
  ]
}

【키워드 카테고리】
- brand: 브랜드명, 브랜드+지역, 브랜드+서비스
- location_category: 지역+카테고리 조합
- service: 구체적인 서비스/메뉴명
- experience: 경험/특징 기반 키워드
- general: 일반 카테고리 키워드

【우선순위】
1 = 가장 중요 (브랜드, 지역+카테고리)
2 = 매우 중요 (서비스명)
3 = 중요 (경험/특징)
4 = 참고 (일반)
5 = 보조 (장기 전략)

【규칙】
- 중복 금지
- 검색 가능한 실제 키워드만
- 지역은 "시" 또는 "구" 수준 포함
- 각 키워드의 예상 검색량(sv_estimate) 포함
- 추측이나 없는 정보 금지`;

        console.log('🔍 Gemini 키워드 생성 중...');
        const result = await model.generateContent(keywordPrompt);
        const responseText = result.response.text();

        console.log('📝 Gemini 응답 길이:', responseText.length);

        // JSON 추출
        let jsonStr = responseText;
        const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
          jsonStr = jsonBlockMatch[1].trim();
        }

        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            generatedKeywords = parsed.keywords || [];
            console.log(`✅ Gemini 키워드 생성 성공: ${generatedKeywords.length}개`);
          } catch (e) {
            console.warn('⚠️ Gemini 키워드 JSON 파싱 실패');
            generatedKeywords = [];
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Gemini 키워드 생성 실패:', error instanceof Error ? error.message : String(error));
    }

    // Step 3: 폴백 키워드 생성 (Gemini 실패 시)
    if (generatedKeywords.length === 0) {
      console.log('🔄 폴백: 규칙 기반 키워드 생성');
      generatedKeywords = generateKeywordsFallback({
        placeName,
        category,
        city,
        district,
        items,
        audience,
        features,
        vibe,
        priceRange
      });
    }

    // Step 4: 상세 점수 산출
    const detailedKeywords = generatedKeywords.map((kw: any) => {
      const priority = kw.priority || 3;
      const sv = kw.sv_estimate || 1500;
      
      // 경쟁도 계산: 서비스/특징 키워드는 경쟁이 낮음 (점수가 높음)
      const isLowCompetition = 
        kw.category === 'service' || 
        kw.category === 'experience' ||
        (kw.category === 'location_category' && kw.kw?.includes(district));
      
      // doc_t (경쟁도): 낮을수록 좋음
      // 저경쟁: 200-800, 중경쟁: 800-2000, 고경쟁: 2000+
      let doc_t = Math.max(100, sv * 0.6);
      if (isLowCompetition) {
        doc_t = Math.max(100, sv * 0.3); // 경쟁도 더 낮춤
      }

      // 지역 관련 점수
      const hasLocation = (city || district) && kw.kw?.includes(district || city);
      const lc_score = hasLocation ? 95 : (district ? 70 : 50);

      // 신뢰도
      const baseConfidence = 0.95 - (priority - 1) * 0.1;

      return {
        kw: kw.kw,
        category: kw.category || 'general',
        priority: priority,
        sv: sv,
        doc_t: Math.round(doc_t),
        sv_effective: Math.round(sv * 0.8),
        sv_exact: sv,
        lc_score: lc_score,
        is_low_competition: doc_t < 800, // 저경쟁 여부
        competition_level: doc_t < 200 ? 'very_low' : doc_t < 800 ? 'low' : doc_t < 2000 ? 'medium' : 'high',
        why: kw.reasoning || '자동 분석',
        conf: Math.max(0.3, baseConfidence),
        explanation: `[${kw.category}] ${kw.reasoning || '키워드'}`
      };
    });

    // Step 5: 최적 키워드 조합 4가지 추출
    // 전략: 저경쟁 + 높은 검색량 조합, 브랜드, 지역+카테고리, 서비스 조합
    const optimalCombinations = extractOptimalCombinations(detailedKeywords, {
      placeName,
      category,
      city,
      district
    });

    console.log(`📤 최적 조합: ${optimalCombinations.length}개, 상세 키워드: ${detailedKeywords.length}개`);
    
    // 🆕 경고 메시지 생성 (효율성 기반)
    // 4개 조합만 추출 (없으면 적은 개수)
    const selectedCombinations = optimalCombinations.slice(0, 4);
    
    let warningMessage = '';
    if (selectedCombinations.length === 0) {
      warningMessage = '효율성 기반 최적 키워드를 찾지 못했습니다. 다른 조건으로 다시 시도해주세요.';
    } else if (selectedCombinations.length < 4) {
      warningMessage = `업체 최적화를 위한 키워드 ${selectedCombinations.length}가지 조합을 추출했습니다.`;
    } else {
      warningMessage = `업체 최적화를 위한 키워드 4가지 조합을 추출했습니다.`;
    }
    
    res.json({
      recommended_combinations: selectedCombinations,
      all_keywords: detailedKeywords.sort((a: any, b: any) => {
        // 우선순위 낮은 순, 같으면 sv 높은 순
        const priorityDiff = a.priority - b.priority;
        if (priorityDiff !== 0) return priorityDiff;
        return b.sv - a.sv;
      }).slice(0, 50),
      warning: warningMessage
    });
  } catch (error) {
    console.error('[ERROR /api/ai/rank-keywords]', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * 저경쟁 키워드 후보 생성 (폴백: Gemini 실패 시)
 */
function generateKeywordCandidatesFallback(context: any): any[] {
  const { placeName, category, city, district, dong, micro_area, items, audience, features, priceRange } = context;
  const candidates = [];

  // 1. [광역지역]+[카테고리] (Tier 1)
  if (city) candidates.push({ kw: `${city} ${category}`, types: ['location_category'], estimated_sv: 1500, reasoning: '광역+카테고리' });
  
  // 2. [시/구]+[카테고리] (Tier 2)
  if (district) candidates.push({ kw: `${district} ${category}`, types: ['location_category'], estimated_sv: 1200, reasoning: '시/구+카테고리' });

  // 3. [동]+[카테고리] (Tier 3 - 신규)
  if (dong) candidates.push({ kw: `${dong} ${category}`, types: ['dong_category'], estimated_sv: 600, reasoning: '동+카테고리' });

  // 4. [미시상권]+[카테고리] (Tier 4 - 신규)
  if (micro_area) candidates.push({ kw: `${micro_area} ${category}`, types: ['micro_area_category'], estimated_sv: 700, reasoning: '상권+카테고리' });

  // 5. [광역지역]+[메뉴]
  items.forEach((item: string, idx: number) => {
    if (idx < 3) {
      if (city) candidates.push({ kw: `${city} ${item}`, types: ['location_service'], estimated_sv: 900 - idx * 100, reasoning: '광역+서비스' });
    }
  });

  // 6. [시/구]+[메뉴]
  items.forEach((item: string, idx: number) => {
    if (idx < 3) {
      if (district) candidates.push({ kw: `${district} ${item}`, types: ['location_service'], estimated_sv: 800 - idx * 100, reasoning: '시/구+서비스' });
    }
  });

  // 7. [동]+[메뉴] (신규)
  items.forEach((item: string, idx: number) => {
    if (idx < 3 && dong) {
      candidates.push({ kw: `${dong} ${item}`, types: ['dong_service'], estimated_sv: 400 - idx * 50, reasoning: '동+서비스' });
    }
  });

  // 8. [미시상권]+[메뉴] (신규)
  items.forEach((item: string, idx: number) => {
    if (idx < 2 && micro_area) {
      candidates.push({ kw: `${micro_area} ${item}`, types: ['micro_area_service'], estimated_sv: 500 - idx * 50, reasoning: '상권+서비스' });
    }
  });

  // 9. [메뉴]+[의도]
  const intents = ['추천', '예약', '주차', '빠른'];
  items.forEach((item: string) => {
    intents.forEach((intent, idx) => {
      if (idx < 2) candidates.push({ kw: `${item} ${intent}`, types: ['service_intent'], estimated_sv: 700 - idx * 100, reasoning: '서비스+의도' });
    });
  });

  // 10. [동]+[메뉴]+[의도] (신규)
  intents.forEach((intent, idx) => {
    if (idx < 2 && items.length > 0 && dong) {
      candidates.push({ kw: `${dong} ${items[0]} ${intent}`, types: ['dong_service_intent'], estimated_sv: 300 - idx * 50, reasoning: '동+서비스+의도' });
    }
  });

  // 11. [미시상권]+[메뉴]+[의도] (신규)
  intents.forEach((intent, idx) => {
    if (idx < 2 && items.length > 0 && micro_area) {
      candidates.push({ kw: `${micro_area} ${items[0]} ${intent}`, types: ['micro_area_service_intent'], estimated_sv: 350 - idx * 50, reasoning: '상권+서비스+의도' });
    }
  });

  // 12. [시/구]+[메뉴]+[의도]
  intents.forEach((intent, idx) => {
    if (idx < 2 && items.length > 0 && district) {
      candidates.push({ kw: `${district} ${items[0]} ${intent}`, types: ['location_service_intent'], estimated_sv: 500 - idx * 100, reasoning: '시/구+서비스+의도' });
    }
  });

  // 13. [특징]+[카테고리]
  features.forEach((feat: string, idx: number) => {
    if (idx < 2 && feat.length < 15) {
      candidates.push({ kw: `${feat} ${category}`, types: ['feature_category'], estimated_sv: 700 - idx * 100, reasoning: '특징+카테고리' });
    }
  });

  // 14. 브랜드명
  if (placeName) {
    candidates.push({ kw: placeName, types: ['brand'], estimated_sv: 500, reasoning: '브랜드명' });
    if (dong) candidates.push({ kw: `${placeName} ${dong}`, types: ['brand'], estimated_sv: 300, reasoning: '브랜드+동' });
    if (district) candidates.push({ kw: `${placeName} ${district}`, types: ['brand'], estimated_sv: 400, reasoning: '브랜드+시/구' });
  }

  return candidates.length > 0 ? candidates : [
    { kw: `${category}`, types: ['category'], estimated_sv: 1000, reasoning: '기본 카테고리' }
  ];
}

/**
 * 트렌드 데이터 캐시 (API 호출 최소화, LRU 방식으로 메모리 관리)
 */
interface TrendCache {
  mainKeyword: string;
  hotness: 'high' | 'medium' | 'low';
  isUrgent: boolean;
  relatedKeywords: string[];
  timestamp: number;
}

// LRU 캐시 구현 (최대 100개 항목만 유지)
class LRUTrendCache {
  private cache: Map<string, TrendCache> = new Map();
  private maxSize = 100;

  get(key: string): TrendCache | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // 1시간 이내면 반환, 아니면 제거
    if (Date.now() - item.timestamp < 3600000) {
      // LRU: 최근 사용으로 표시
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }
    
    // 만료된 항목 제거
    this.cache.delete(key);
    return null;
  }

  set(key: string, value: TrendCache): void {
    // 이미 존재하면 제거 (최근 사용으로 갱신)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    this.cache.set(key, value);
    
    // 크기 초과 시 가장 오래된 항목 제거
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

const trendDataCache = new LRUTrendCache();

/**
 * 키워드 트렌드 정보 조회 (캐시 활용, 타임아웃 처리 강화)
 */
async function getKeywordTrendInfo(keyword: string): Promise<TrendCache | null> {
  try {
    // 캐시 확인
    const cached = trendDataCache.get(keyword);
    if (cached) {
      return cached;
    }

    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
      return null;
    }

    // 타임아웃을 2.5초로 설정 (5개 병렬 = 최대 2.5초)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
        params: { 
          query: keyword.trim(), 
          display: 5, // 최소한으로 줄임 (더 빠른 응답)
          sort: 'date'
        },
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
        },
        timeout: 2500 // 2.5초 타임아웃
      });

      const totalResults = response.data.total || 0;
      const hotness = totalResults > 100 ? 'high' : totalResults > 20 ? 'medium' : 'low';
      const isUrgent = totalResults > 200;

      const trendInfo: TrendCache = {
        mainKeyword: keyword,
        hotness,
        isUrgent,
        relatedKeywords: [],
        timestamp: Date.now()
      };

      // 관련 키워드 추출 (뉴스 제목에서)
      const relatedSet = new Set<string>();
      (response.data.items || []).slice(0, 3).forEach((item: any) => {
        const title = (item.title || '').replace(/<[^>]*>/g, '').trim();
        const words = title.match(/[\w가-힣]{3,}/g) || [];
        words.slice(0, 1).forEach((word: string) => {
          if (word.length <= 20 && !['뉴스', '기사', '관련', '최근', '전문가'].includes(word)) {
            relatedSet.add(word);
          }
        });
      });

      trendInfo.relatedKeywords = Array.from(relatedSet).slice(0, 2);
      
      // 캐시에 저장
      trendDataCache.set(keyword, trendInfo);

      return trendInfo;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    // 타임아웃이나 API 에러는 조용히 처리 (기본값 null 반환)
    if (axios.isAxiosError(error) && error.code !== 'ECONNABORTED') {
      console.debug(`[트렌드 API 디버그] ${keyword} 조회 시도했으나 스킵`);
    }
    return null;
  }
}

/**
 * 지역 기반 동적 임계값 계산 (Phase 1: 지역 규모 파악)
 * 소도시와 대도시의 검색량 차이를 보정
 * 저경쟁 키워드는 절대적으로 낮은 검색량을 가지므로 관대한 기준 적용
 */
function getDynamicThreshold(city: string): number {
  const thresholds: Record<string, number> = {
    // 대도시 (인구 300만 이상) - 저경쟁이라도 최소 200
    '서울': 200,
    '부산': 150,
    '대구': 150,
    
    // 중규모 (인구 100-300만) - 저경쟁 150 이상
    '경기': 150,
    '인천': 150,
    '광주': 100,
    '대전': 100,
    
    // 소도시 (인구 100만 이하) - 저경쟁 100 이상 (매우 낮음)
    '울산': 80,
    '세종': 80,
    '강원': 80,
    '전북': 80,
    '전남': 80,
    '경북': 80,
    '경남': 80,
    '제주': 80
  };
  
  return thresholds[city] || 100;  // 기본값 100 (훨씬 낮춤)
}

/**
 * 후보 키워드 평가 및 점수 산출 (Phase 2: 동 특성, Phase 3: 계절성, Phase 4: 트렌드 반영)
 */
async function evaluateKeywordCandidates(candidates: any[], context: any): Promise<any[]> {
  const { category, city, district, dong, micro_area, items, audience, features } = context;
  
  // 지역 기반 동적 임계값 계산
  const dynamicThreshold = getDynamicThreshold(city);
  console.log(`[동적 임계값] ${city} = ${dynamicThreshold}회`);

  // ===== 강화된 미시상권 필터링 함수 =====
  // 동일 지명이지만 다른 상권을 제외하는 엄격한 로직
  function isValidMicroAreaKeyword(keyword: string, targetDong: string | undefined, targetMicroArea: string | undefined): boolean {
    // 1. 동 정보가 없으면 필터링 안 함
    if (!targetDong) return true;
    
    // 2. 목표 상권이 명확하면 엄격한 필터링 적용
    if (targetMicroArea) {
      // 2-1. 해당 지역(city, district)의 모든 동과 그들의 상권 확인
      try {
        const cityData = require('./microAreaDatabase').MICRO_AREA_DATABASE[city];
        if (cityData) {
          const districtData = cityData[district];
          if (districtData) {
            // 모든 동을 순회하면서 다른 동의 상권이 포함되는지 확인
            for (const [otherDong, otherDongData] of Object.entries(districtData)) {
              // 같은 동이면 스킵
              if (otherDong === targetDong) continue;
              
              // 다른 동의 상권들 확인
              const otherMicroAreas = (otherDongData as any)?.micro_areas || [];
              for (const otherArea of otherMicroAreas) {
                // 다른 동의 상권이 키워드에 포함되면 제외 (같은 지명이지만 다른 상권)
                if (keyword.includes(otherArea) && otherArea !== targetMicroArea) {
                  console.log(`  ❌ 제외: "${keyword}" (다른 상권: ${otherArea} in ${otherDong} / 대상: ${targetMicroArea} in ${targetDong})`);
                  return false;
                }
              }
            }
          }
        }
      } catch (e) {
        console.debug('[필터링] 데이터베이스 로드 실패, 기본 필터링 적용');
      }
      
      // 2-2. 목표 상권이 키워드에 포함되지 않으면서 상권명이 필요한 경우는 제외
      // (예: "태전동 카페"는 OK, 하지만 다른 상권명이 섞여있으면 제외)
      return true;
    }
    
    // 3. 상권 정보가 없는 경우 (동 정보만 있음)
    // - 동 이름 검증: 키워드에 포함된 상권이 실제로 그 동에 속하는지 확인
    const allMicroAreasForDong = getAllMicroAreas(city, district, targetDong);
    
    // 키워드에 포함된 상권들을 검증
    for (const microArea of allMicroAreasForDong) {
      if (keyword.includes(microArea)) {
        // 이 상권이 다른 동에도 속하는지 확인 (잘못된 연결 가능성)
        try {
          const cityData = require('./microAreaDatabase').MICRO_AREA_DATABASE[city];
          if (cityData) {
            const districtData = cityData[district];
            if (districtData) {
              let appearCount = 0;
              let otherDongs: string[] = [];
              
              for (const [otherDong, otherDongData] of Object.entries(districtData)) {
                const otherMicroAreas = (otherDongData as any)?.micro_areas || [];
                if (otherMicroAreas.includes(microArea)) {
                  appearCount++;
                  if (otherDong !== targetDong) {
                    otherDongs.push(otherDong);
                  }
                }
              }
              
              // 같은 상권이 여러 동에 나타나면 주의
              if (appearCount > 1 && otherDongs.length > 0) {
                console.log(`  ⚠️  주의: "${microArea}"는 여러 동에 포함됨 (${[targetDong, ...otherDongs].join(', ')})`);
                // 다른 동이 우선적으로 그 상권을 소유하면 제외
                if (otherDongs.length > 0 && microArea.includes('신도시')) {
                  // 신도시 같은 상권은 실제로 신동이나 지정된 동에만 속해야 함
                  return false;
                }
              }
            }
          }
        } catch (e) {
          console.debug('[필터링] 중복 확인 실패');
        }
      }
    }
    
    return true;
  }

  // Phase 2: 동 특성 조회 및 보정값 적용
  const dongCharacteristics = dong ? getDongCharacteristics(city, district, dong) : null;
  const characteristicAdjustments = dongCharacteristics 
    ? getCharacteristicAdjustments(dongCharacteristics.characteristics)
    : { competition_adjustment: 0, demand_adjustment: 0 };

  // Phase 4: 성능 최적화 - 상위 10개 메인 키워드만 트렌드 조회 (병렬 처리)
  // 빠른 응답 + 충분한 트렌드 데이터 커버
  const mainKeywords = [
    category,
    `${city} ${category}`,
    `${district} ${category}`,
    `${category} 추천`,
    dong ? `${dong} ${category}` : null,
    micro_area ? `${micro_area} ${category}` : null,
    `${city} ${category} 추천`,
    `${district} 카페` === category ? `${district} 강남역` : null, // 특화 키워드
    items?.[0] ? `${category} ${items[0]}` : null,
    features?.[0] ? `${features[0]} ${category}` : null
  ]
    .filter((kw): kw is string => kw !== null && kw.length > 0)
    .filter((kw, idx, arr) => idx === arr.indexOf(kw)) // 중복 제거
    .slice(0, 8); // 최대 8개만 (응답 시간 2초 내)

  const trendCache: Map<string, TrendCache | null> = new Map();
  
  // 트렌드 병렬 조회 - Promise.allSettled로 안전하게 처리
  if (mainKeywords.length > 0) {
    const trendPromises = mainKeywords.map(kw => 
      getKeywordTrendInfo(kw)
        .then(result => ({ kw, result }))
        .catch(() => ({ kw, result: null }))
    );
    
    try {
      const trendResults = await Promise.allSettled(trendPromises);
      trendResults.forEach((settlement) => {
        if (settlement.status === 'fulfilled') {
          const { kw, result } = settlement.value;
          trendCache.set(kw, result);
        }
      });
    } catch (error) {
      console.debug('[트렌드 병렬 조회] 부분 실패 (계속 진행):', error instanceof Error ? error.message : '');
    }
  }

  const evaluatedResults: any[] = [];

  for (const cand of candidates) {
    const { kw, estimated_sv = 500, types = [] } = cand;

    // ===== 신규: 미시상권 필터링 적용 =====
    if (!isValidMicroAreaKeyword(kw, dong, micro_area)) {
      console.log(`  ⏭️  스킵: "${kw}"`);
      continue;
    }

    // 검색량 조정: Gemini 추정값이 보수적이므로 보정 (실제 수요 반영)
    // 동/상권 기반 키워드는 더 적극적인 보정
    let adjustedSv = estimated_sv;
    if (types && types.includes('location_service')) adjustedSv = Math.max(estimated_sv, estimated_sv * 1.5);
    if (types && types.includes('location_category')) adjustedSv = Math.max(estimated_sv, estimated_sv * 1.3);
    if (types && types.includes('dong_service')) adjustedSv = Math.max(estimated_sv, 450);  // 동 기반은 최소 450
    if (types && types.includes('micro_area_service')) adjustedSv = Math.max(estimated_sv, 500);  // 상권 기반은 최소 500
    if (kw.includes('스팀세차') || kw.includes('세차')) adjustedSv = Math.max(adjustedSv, 800);
    if (kw.includes('광택')) adjustedSv = Math.max(adjustedSv, 700);

    // Phase 2: 동 특성 기반 검색량 보정
    // 예: 신도시 특성이면 신식 서비스 수요↑
    if (dongCharacteristics && types.some(t => t.includes('service'))) {
      adjustedSv += adjustedSv * (characteristicAdjustments.demand_adjustment / 100);
    }

    // Phase 4: 트렌드 정보 조회 (캐시된 데이터 사용)
    let trendInfo: TrendCache | null = null;
    let trendBonus = 0;
    let trendWarning = '';
    
    // 메인 키워드를 포함하면 트렌드 정보 조회
    for (const mainKw of mainKeywords) {
      if (kw.includes(mainKw) && trendCache.has(mainKw)) {
        trendInfo = trendCache.get(mainKw) || null;
        break;
      }
    }

    if (trendInfo) {
      // 트렌드 강도별 수요 보정
      if (trendInfo.hotness === 'high') {
        trendBonus = 15; // +15% 검색량 증가
        adjustedSv *= 1.15;
      } else if (trendInfo.hotness === 'medium') {
        trendBonus = 5;  // +5% 검색량 증가
        adjustedSv *= 1.05;
      }

      // 긴급/인기 트렌드 경고
      if (trendInfo.isUrgent) {
        trendWarning = '🔥 현재 핫한 트렌드 키워드입니다. 지금이 기회!';
      }
    }

    // 수요 점수 (검색량): 0-100
    const demandScore = Math.min(100, (adjustedSv || 500) / 10);

    // 경쟁도 점수 (doc_t 예상값 기반)
    // 규칙: 동/상권 단위가 더 낮은 경쟁도 → [동]+[의도](200-300) → [동]+[서비스](300-450) → [지역]+[의도](300-400)
    let estimatedDocT = 800;
    if (types.includes('dong_service_intent')) estimatedDocT = 250;
    else if (types.includes('micro_area_service_intent')) estimatedDocT = 280;
    else if (types.includes('dong_service')) estimatedDocT = 350;
    else if (types.includes('micro_area_service')) estimatedDocT = 380;
    else if (types.includes('dong_category')) estimatedDocT = 400;
    else if (types.includes('micro_area_category')) estimatedDocT = 420;
    else if (types.includes('location_service_intent')) estimatedDocT = 300;
    else if (types.includes('location_category_intent')) estimatedDocT = 350;
    else if (types.includes('location_category')) estimatedDocT = 500;
    else if (types.includes('location_service')) estimatedDocT = 450;
    else if (types.includes('service_intent')) estimatedDocT = 650;
    else if (types.includes('brand')) estimatedDocT = 200;

    // Phase 2: 동 특성 기반 경쟁도 보정
    // 예: 신도시는 경쟁도 낮음(-10), 상업중심은 경쟁도 높음(+20)
    if (dongCharacteristics) {
      estimatedDocT += characteristicAdjustments.competition_adjustment;
      estimatedDocT = Math.max(100, estimatedDocT); // 최소값 100
    }

    // Phase 4: 트렌드 정보에 따른 경쟁도 조정
    // 트렌드가 높을수록 경쟁이 많아질 가능성이 높음
    if (trendInfo) {
      if (trendInfo.hotness === 'high') {
        estimatedDocT += 50; // 경쟁도 +50 (핫한 키워드는 경쟁이 심함)
      } else if (trendInfo.hotness === 'medium') {
        estimatedDocT += 20; // 경쟁도 +20
      }
    }

    const competitionScore = Math.max(0, 100 - (estimatedDocT / 30));

    // 의도 부합도 (0-100)
    let intentFitScore = 30;
    if (kw.includes(category)) intentFitScore += 40;
    items.forEach((item: string) => {
      if (kw.toLowerCase().includes(item.toLowerCase())) intentFitScore += 20;
    });
    if (types.some(t => t.includes('intent'))) intentFitScore += 10;

    // Phase 2: 동 특성과 타겟 인구 일치도 가산
    if (dongCharacteristics && audience && Array.isArray(audience) && audience.length > 0) {
      // 동의 타겟 인구와 입력된 audience가 일치하면 가점
      const audienceMatches = audience.filter((aud: string) =>
        typeof aud === 'string' && dongCharacteristics.target_demographics.some(t => 
          aud.toLowerCase().includes(t.toLowerCase()) || t.includes(aud)
        )
      ).length;
      
      if (audienceMatches > 0) {
        intentFitScore += 15;
      }

      // 동의 특성이 카테고리와 일치하면 가점
      if (dongCharacteristics.characteristics.includes('교육지구') && category.includes('학원')) {
        intentFitScore += 10;
      }
      if (dongCharacteristics.characteristics.includes('관광지') && category.includes('카페')) {
        intentFitScore += 10;
      }
    }

    // Phase 4: 트렌드 관련 키워드와의 일치도 가산
    if (trendInfo && trendInfo.relatedKeywords.length > 0) {
      const relatedMatches = trendInfo.relatedKeywords.filter(rk => kw.includes(rk)).length;
      intentFitScore += relatedMatches * 5; // 관련 키워드당 +5점
    }

    // 지역 부합도 (0-100)
    // 동과 상권이 있으면 이들을 포함한 키워드를 최고 평가
    let regionFitScore = 30;
    if (kw.includes(city) || kw.includes(district)) regionFitScore += 50;
    if (dong && kw.includes(dong)) regionFitScore += 30;      // 동 포함 시 +30점
    if (micro_area && kw.includes(micro_area)) regionFitScore += 25;  // 상권 포함 시 +25점
    if (types.includes('location_category') || types.includes('location_service')) regionFitScore += 20;

    // 위험도 (0-100, 낮을수록 좋음)
    let riskScore = 10;
    const dangerKeywords = ['불법', '위조', '가짜', '약물', '성인'];
    if (dangerKeywords.some(d => kw.includes(d))) riskScore = 90;

    // 트렌드 점수 (기본값: 50 = 안정적, Phase 3에서 계절성 추가 예정)
    let trendScore = 50;

    // Phase 4: 트렌드 기반 트렌드 점수 추가 보정
    if (trendInfo) {
      if (trendInfo.hotness === 'high') {
        trendScore = 75; // 높은 트렌드: 75점
      } else if (trendInfo.hotness === 'medium') {
        trendScore = 60; // 중간 트렌드: 60점
      }
    }

    // 최종 점수: 수요(25%) + 경쟁(35%) + 의도(20%) + 지역(15%) - 위험(5%)
    let finalScore = 
      demandScore * 0.25 +
      competitionScore * 0.35 +
      intentFitScore * 0.20 +
      regionFitScore * 0.15 -
      riskScore * 0.05;

    // Phase 3: 계절성 보정 (현재 월 기준)
    const currentMonth = new Date().getMonth() + 1; // 1~12
    const seasonalPattern = getSeasonalPattern(category);
    let seasonalWarning = '';
    let seasonalAdjustment = 0;
    
    if (seasonalPattern) {
      const monthlyTrend = getMonthlyTrend(currentMonth, seasonalPattern);
      if (monthlyTrend) {
        seasonalWarning = generateSeasonalWarning(category, currentMonth);
        // 트렌드 점수에 계절 배율 반영
        seasonalAdjustment = Math.round(((monthlyTrend.demand_multiplier - 1) * 50)); // -50~50 범위
      }
    }

    const trend_with_seasonal = trendScore + seasonalAdjustment;

    // Phase 4: 트렌드 가산 (최종 점수 최대 5% 가산)
    if (trendInfo && trendInfo.hotness === 'high') {
      finalScore *= 1.05; // 핫한 트렌드는 최종 점수 5% 가산
    }

    // 임계값 충족 여부 (지역 기반 동적 임계값)
    const meets_threshold = adjustedSv >= dynamicThreshold;

    evaluatedResults.push({
      kw,
      types: types.join(', '),
      estimated_sv: adjustedSv, // 조정된 값 사용
      estimated_doc_t: estimatedDocT,
      demand_score: Math.round(demandScore),
      competition_score: Math.round(competitionScore),
      intent_fit_score: Math.round(intentFitScore),
      region_fit_score: Math.round(regionFitScore),
      risk_score: Math.round(riskScore),
      trend_score: trendScore,
      trend_score_with_seasonal: trend_with_seasonal,
      seasonal_warning: seasonalWarning || null,
      trend_warning: trendWarning || null,
      trend_hotness: trendInfo?.hotness || 'none',
      trend_bonus: trendBonus,
      score: Math.round(finalScore * 100) / 100,
      // 🆕 효율성 스코어: 검색량 / 경쟁도 (높을수록 좋음)
      // 예: 검색량 500, 경쟁도 100 → 효율성 5.0 (매우 좋음)
      // 예: 검색량 300, 경쟁도 1000 → 효율성 0.3 (나쁨)
      efficiency_score: estimatedDocT > 0 ? Math.round((adjustedSv / estimatedDocT) * 100) / 100 : 0,
      meets_threshold,
      dong_characteristics: dongCharacteristics ? {
        characteristics: dongCharacteristics.characteristics.join(', '),
        development_stage: dongCharacteristics.development_stage,
        target_demographics: dongCharacteristics.target_demographics.join(', ')
      } : null,
      explanation: generateKeywordExplanationDetail({
        kw, estimated_sv: adjustedSv, estimatedDocT, intentFitScore, regionFitScore, riskScore, types
      })
    });
  }

  return evaluatedResults.sort((a: any, b: any) => b.score - a.score);
}

/**
 * 키워드별 상세 설명 생성
 */
function generateKeywordExplanationDetail(data: any): string {
  const { kw, estimated_sv, estimatedDocT, intentFitScore, regionFitScore, riskScore, types } = data;
  const parts = [];

  if (intentFitScore > 70) parts.push('✅ 의도 완벽 대응');
  else if (intentFitScore > 50) parts.push('⭕ 의도 적절');

  if (regionFitScore > 70) parts.push('✅ 지역 최적');
  else if (regionFitScore > 50) parts.push('⭕ 지역 양호');

  if (estimatedDocT < 300) parts.push('🟢 매우 저경쟁');
  else if (estimatedDocT < 600) parts.push('🟡 저경쟁');
  else if (estimatedDocT < 1000) parts.push('🟠 중경쟁');
  else parts.push('🔴 고경쟁');

  if (estimated_sv > 1500) parts.push('💰 높은 수요');
  else if (estimated_sv > 800) parts.push('⚡ 적절한 수요');

  return parts.join(' | ') || '기본';
}

/**
 * 최종 4개 키워드 선정 (다양성 고려)
 */
/**
 * 최종 4개 키워드 선정 (효율성 기반)
 * 전략: 검색량 대비 경쟁도 비율(efficiency_score)가 높은 키워드 우선
 * 예: "태전동"(SV 100, Doc 500) vs "태전지구"(SV 200, Doc 300)
 *     → "태전지구" 선택 (효율성: 0.67 > 0.2)
 */
function selectFinalKeywords(evaluatedKeywords: any[], dynamicThreshold?: number): any[] {
  const selected = [];
  const usedKeywords = new Set<string>();

  // 효율성 스코어 기준으로 정렬 (높을수록 좋음)
  const sortedByEfficiency = [...evaluatedKeywords].sort((a: any, b: any) => {
    // 1순위: 효율성 스코어 (검색량 / 경쟁도)
    const effDiff = (b.efficiency_score || 0) - (a.efficiency_score || 0);
    if (effDiff !== 0) return effDiff;
    
    // 2순위: 최종 점수 (fallback)
    return (b.score || 0) - (a.score || 0);
  });

  console.log(`\n📊 [효율성 기반 키워드 선정]`);
  console.log(`상위 10개 효율성 점수:`);
  sortedByEfficiency.slice(0, 10).forEach((k: any, i: number) => {
    console.log(`  ${i + 1}. "${k.kw}" | 효율성: ${k.efficiency_score} (SV: ${k.estimated_sv}, 경쟁도: ${k.estimated_doc_t})`);
  });

  // Phase 1: 기본 임계값으로 선정 (효율성 순)
  console.log(`\n📊 [키워드 선정] Phase 1 - 효율성 기반 선정 (임계값: ${dynamicThreshold}회)`);
  for (const keyword of sortedByEfficiency) {
    if (selected.length >= 3) break;

    if (usedKeywords.has(keyword.kw)) continue;

    if (keyword.meets_threshold) {
      selected.push(createKeywordResponse(keyword));
      usedKeywords.add(keyword.kw);
      console.log(`  ✅ "${keyword.kw}" | 효율성: ${keyword.efficiency_score} (SV: ${keyword.estimated_sv}, 경쟁도: ${keyword.estimated_doc_t})`);
    }
  }

  // Phase 2: 4개 미만이면 50% 완화 (1단계) - 여전히 효율성 순
  if (selected.length < 4) {
    const relaxedThreshold1 = dynamicThreshold ? dynamicThreshold * 0.5 : 50;
    console.log(`📊 [키워드 선정] Phase 2 - 1단계 완화(${Math.round(relaxedThreshold1)}회 이상, 효율성 순)`);
    
    for (const keyword of sortedByEfficiency) {
      if (selected.length >= 4) break;
      if (usedKeywords.has(keyword.kw)) continue;
      
      if (keyword.estimated_sv >= relaxedThreshold1) {
        selected.push(createKeywordResponse(keyword));
        usedKeywords.add(keyword.kw);
        console.log(`  ⭐ "${keyword.kw}" | 효율성: ${keyword.efficiency_score} (SV: ${keyword.estimated_sv}, 경쟁도: ${keyword.estimated_doc_t})`);
      }
    }
  }

  // Phase 3: 3개 미만이면 75% 완화 (2단계 - 더 공격적)
  if (selected.length < 3) {
    const relaxedThreshold2 = dynamicThreshold ? dynamicThreshold * 0.25 : 25;
    console.log(`📊 [키워드 선정] Phase 3 - 2단계 완화(${Math.round(relaxedThreshold2)}회 이상, 효율성 순)`);
    
    for (const keyword of sortedByEfficiency) {
      if (selected.length >= 4) break;
      if (usedKeywords.has(keyword.kw)) continue;
      
      if (keyword.estimated_sv >= relaxedThreshold2) {
        selected.push(createKeywordResponse(keyword));
        usedKeywords.add(keyword.kw);
        console.log(`  🔥 "${keyword.kw}" | 효율성: ${keyword.efficiency_score} (SV: ${keyword.estimated_sv}, 경쟁도: ${keyword.estimated_doc_t})`);
      }
    }
  }

  // Phase 4: 2개 미만이면 모든 유효한 키워드 포함 (최후의 수단)
  if (selected.length < 2) {
    console.log(`📊 [키워드 선정] Phase 4 - 모든 후보 포함 모드 (효율성 순)`);
    
    for (const keyword of sortedByEfficiency) {
      if (selected.length >= 4) break;
      if (usedKeywords.has(keyword.kw)) continue;
      
      // 위험 점수가 10 미만인 키워드만 포함
      if (keyword.risk_score < 10) {
        selected.push(createKeywordResponse(keyword));
        usedKeywords.add(keyword.kw);
        console.log(`  🎯 "${keyword.kw}" | 효율성: ${keyword.efficiency_score} (SV: ${keyword.estimated_sv}, 경쟁도: ${keyword.estimated_doc_t})`);
      }
    }
  }

  return selected;
}

/**
 * 키워드 응답 객체 생성
 */
function createKeywordResponse(keyword: any): any {
  return {
    kw: keyword.kw,
    estimated_sv: keyword.estimated_sv,
    estimated_doc_t: keyword.estimated_doc_t,
    competition_level: 
      keyword.estimated_doc_t < 300 ? 'very_low' : 
      keyword.estimated_doc_t < 600 ? 'low' : 
      keyword.estimated_doc_t < 1000 ? 'medium' : 'high',
    intent_fit: keyword.intent_fit_score,
    region_fit: keyword.region_fit_score,
    risk: keyword.risk_score,
    trend: keyword.trend_score,
    trend_hotness: keyword.trend_hotness || 'none',
    trend_bonus: keyword.trend_bonus || 0,
    trend_warning: keyword.trend_warning || '',
    seasonal_warning: keyword.seasonal_warning || '',
    types: keyword.types,
    score: keyword.score,
    // 🆕 효율성 스코어: 검색량 대비 경쟁도 비율
    efficiency_score: keyword.efficiency_score,
    efficiency_rating: keyword.efficiency_score >= 1.0 ? '최고' : 
                       keyword.efficiency_score >= 0.7 ? '우수' :
                       keyword.efficiency_score >= 0.4 ? '양호' : '일반',
    explanation: keyword.explanation,
    meets_threshold: keyword.meets_threshold,
    data_confidence: keyword.estimated_sv >= 1000 ? 'high' : keyword.estimated_sv >= 500 ? 'medium' : 'low'
  };
}

/**
 * 규칙 기반 키워드 생성 (폴백)
 */
function generateKeywordsFallback(data: any): any[] {
  const { placeName, category, city, district, items, audience, features, vibe, priceRange } = data;
  
  const keywords: any[] = [];
  let priority = 1;

  // 1. 브랜드 키워드 (priority 1)
  keywords.push({
    kw: placeName,
    category: 'brand',
    priority: 1,
    sv_estimate: 3000,
    reasoning: '브랜드 이름'
  });

  if (district) {
    keywords.push({
      kw: `${placeName} ${district}`,
      category: 'brand',
      priority: 1,
      sv_estimate: 2000,
      reasoning: '브랜드 + 지역'
    });
  }

  // 2. 지역 + 카테고리 (priority 2)
  if (district) {
    keywords.push({
      kw: `${district} ${category}`,
      category: 'location_category',
      priority: 2,
      sv_estimate: 2500,
      reasoning: '지역 + 카테고리'
    });
  }

  if (city && district) {
    keywords.push({
      kw: `${city} ${district} ${category}`,
      category: 'location_category',
      priority: 2,
      sv_estimate: 1800,
      reasoning: '도시 + 지역 + 카테고리'
    });
  }

  // 3. 서비스 키워드 (priority 2)
  items.forEach((item: string, idx: number) => {
    keywords.push({
      kw: item,
      category: 'service',
      priority: 2,
      sv_estimate: 2000 - idx * 300,
      reasoning: `주요 서비스: ${item}`
    });

    if (district) {
      keywords.push({
        kw: `${district} ${item}`,
        category: 'service',
        priority: 2,
        sv_estimate: 1500 - idx * 200,
        reasoning: `지역 + 서비스: ${item}`
      });
    }
  });

  // 4. 특징/경험 키워드 (priority 3)
  features.forEach((feature: string, idx: number) => {
    if (feature.length < 20 && !keywords.some(k => k.kw === feature)) {
      keywords.push({
        kw: feature,
        category: 'experience',
        priority: 3,
        sv_estimate: 1500 - idx * 200,
        reasoning: `특징: ${feature}`
      });
    }
  });

  // 5. 가격대 기반 (priority 3)
  if (priceRange) {
    keywords.push({
      kw: `${priceRange} ${category}`,
      category: 'experience',
      priority: 3,
      sv_estimate: 1200,
      reasoning: `가격대 + 카테고리`
    });
  }

  // 6. 일반 검색 (priority 4)
  keywords.push({
    kw: `${category} 추천`,
    category: 'general',
    priority: 4,
    sv_estimate: 1000,
    reasoning: '일반 검색'
  });

  if (district) {
    keywords.push({
      kw: `${district} 추천 ${category}`,
      category: 'general',
      priority: 4,
      sv_estimate: 800,
      reasoning: '지역별 추천'
    });
  }

  // 중복 제거
  const seen = new Set<string>();
  return keywords.filter(k => {
    if (seen.has(k.kw)) return false;
    seen.add(k.kw);
    return true;
  });
}

// 가이드라인 생성 (템플릿 기반 - Gemini API 속도 제한 회피)
function generateGuidelineTemplate(keywords: string[], tone: string): string {
  const mainKeyword = keywords[0] || '검색';
  const secondaryKeywords = keywords.slice(1);

  // 톤별 스타일 정의
  const toneStyles: Record<string, { intro: string; style: string; tips: string[]; examples: string[] }> = {
    '실사 리뷰 톤': {
      intro: `"${mainKeyword}"로 검색하는 사용자는 실제 경험과 정직한 평가를 원합니다.`,
      style: '구체적인 경험, 장단점 균형, 신뢰도 높은 표현',
      tips: [
        '방문 전 기대와 실제 경험의 차이점 언급',
        '가격대비 가치에 대한 객관적 평가',
        '재방문 의사 표현 및 추천 대상 명시',
        '구체적인 제품명/메뉴명/서비스명 기재',
        '사진 첨부로 신뢰도 높이기'
      ],
      examples: [
        `"${mainKeyword}는 예상과 다르게 매우 만족스러웠다"`,
        `"${mainKeyword}를 추천하는 이유는 무엇보다 [구체적 이유] 때문이다"`,
        `"${mainKeyword}의 단점은 [솔직한 평가]이지만, 이 정도는 감수할 만하다"`
      ]
    },
    '전문가 톤': {
      intro: `"${mainKeyword}"에 대한 전문적이고 깊이 있는 분석을 제시합니다.`,
      style: '업계 지식, 비교 분석, 전문용어 활용, 데이터 기반 평가',
      tips: [
        '비슷한 경쟁사와의 차별점 분석',
        '품질/서비스 수준에 대한 객관적 평가',
        '트렌드와의 연관성 분석',
        '개선점 및 시사점 제시',
        '산업 전체 맥락에서의 위치 파악'
      ],
      examples: [
        `"${mainKeyword}는 시장에서 [포지셔닝]을 차지하고 있다"`,
        `"${mainKeyword}의 경쟁력은 [구체적 이유]에 있다"`,
        `"${mainKeyword}는 다음과 같은 측면에서 개선이 필요하다"`
      ]
    },
    '친근한 톤': {
      intro: `"${mainKeyword}"에 대해 친근하고 따뜻하게 이야기합니다.`,
      style: '감정 표현, 공감, 쉬운 설명, 유머 포함',
      tips: [
        '개인적 경험과 감정 솔직히 나누기',
        '공감할 수 있는 상황 묘사',
        '방문객층/타겟 설정 및 추천',
        '직관적이고 따뜻한 표현 사용',
        '일상의 소소한 재미 강조'
      ],
      examples: [
        `"${mainKeyword}에 가면 정말 좋은 점이 있어요"`,
        `"${mainKeyword}는 [감정표현]한 경험이었어요"`,
        `"${mainKeyword}를 놓치면 정말 아깝다고 생각해요"`
      ]
    },
    '데이터 톤': {
      intro: `"${mainKeyword}"에 대한 객관적 데이터와 수치를 바탕으로 분석합니다.`,
      style: '수치화, 통계, 비교표, 객관성 강조',
      tips: [
        '구체적인 수치와 통계 제시',
        '비용 대비 효과 계산',
        '방문객 수, 만족도 등 정량 평가',
        '시간대/계절별 변화 분석',
        '객관적 지표로 순위 매기기'
      ],
      examples: [
        `"${mainKeyword}의 평균 평점은 [수치]로 [해석]",`,
        `"${mainKeyword} 방문객은 주로 [데이터]로 집계된다"`,
        `"${mainKeyword}의 가성비는 동급사 대비 [비교]"`
      ]
    }
  };

  const style = toneStyles[tone] || toneStyles['실사 리뷰 톤'];

  const guideline = `## 📝 가이드라인 소개
${style.intro}

주요 키워드: ${[mainKeyword, ...secondaryKeywords].join(', ')}

---

## 🎯 검색 의도 분석
사용자가 "${mainKeyword}"로 검색할 때 알고 싶은 것:
- 실제 경험담과 솔직한 평가
- 다른 유사 서비스와의 차이점
- 자신에게 맞는지 여부
- 방문/이용할 가치가 있는지 판단 자료

---

## 💡 콘텐츠 작성 팁
**톤**: ${tone}
**스타일**: ${style.style}

다음 요소들을 포함해주세요:
${style.tips.map((tip, idx) => `${idx + 1}. ${tip}`).join('\n')}

---

## ✅ 작성 체크리스트
- [ ] 방문/이용 시간 및 계절 명시
- [ ] 주요 메뉴/서비스 3가지 이상 구체적 언급
- [ ] 가격대 명시 (예: 1인 기준 ~원)
- [ ] 주차, 예약, 운영시간 등 실용 정보
- [ ] 대상 고객층 명확히 설정
- [ ] 장점 3가지 이상 구체적 설명
- [ ] 단점이나 개선점도 균형있게 언급
- [ ] 마지막에 재방문/추천 의사 표현
- [ ] 사진 또는 영상 첨부 (신뢰도↑)
- [ ] 타이틀에 핵심 정보 포함

---

## 🎨 표현 예시
다음과 같은 표현을 활용해보세요:

${style.examples.map((example, idx) => `${idx + 1}. ${example}`).join('\n')}

좀 더 구체적인 표현:
- "실제로 ${mainKeyword} 방문 후 느낀 점은..."
- "${mainKeyword}가 다른 곳과 다른 이유는..."
- "${mainKeyword}를 추천하는 사람들의 이유는..."
- "${mainKeyword}의 숨은 매력은..."

---

## 🚀 블로그 SEO 최적화 팁
- 제목에 "${mainKeyword}" 반드시 포함
- 본문에 관련 키워드 자연스럽게 3-5회 언급
- 소제목(H2, H3)으로 구조화
- 단락은 3-4문장 이하로 간결하게
- 강조가 필요한 부분은 **굵게** 표시
- 리스트나 표로 정보 시각화`;

  return guideline;
}

app.post('/api/ai/generate-guideline', async (req, res) => {
  try {
    const { keywords, tone } = req.body;
    console.log('[POST /api/ai/generate-guideline]', { 
      keywordCount: keywords?.length, 
      tone,
      keywords: keywords 
    });

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: '키워드 배열이 필요합니다.' });
    }
    if (!tone) {
      return res.status(400).json({ error: '톤 정보가 필요합니다.' });
    }

    // 템플릿 기반 가이드라인 생성 (Gemini API 속도 제한 회피)
    const guideline = generateGuidelineTemplate(keywords, tone);
    
    console.log('[✅ generate-guideline 완료]', guideline.length + ' 글자');
    res.json({ guideline });
  } catch (error) {
    console.error('[ERROR /api/ai/generate-guideline]', error);
    res.status(500).json({ error: error instanceof Error ? error.message : '알 수 없는 오류 발생' });
  }
});

// Supabase 라우트
try {
  console.log('[INIT] Supabase 라우트 설정 중...');
  setupSupabaseRoutes(app);
  console.log('[OK] Supabase 라우트 설정 완료');
} catch (error) {
  console.warn('[WARN] Supabase 라우트 설정 실패:', error.message);
}

// 기본 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: '서버 오류' });
});

/**
 * 최적 키워드 조합 4가지 추출
 * 전략: 
 * 1. 저경쟁+높은검색량 조합 (골드 키워드)
 * 2. 브랜드+지역 조합 (강력한 차별화)
 * 3. 지역+카테고리+서비스 조합 (실제 의도)
 * 4. 저경쟁 장꼬리 조합 (쉬운 승리)
 */
function extractOptimalCombinations(keywords: any[], data: any): any[] {
  const { placeName, category, city, district } = data;

  // 조합 생성 함수
  function createCombination(
    name: string,
    strategy: string,
    selectedKeywords: any[]
  ) {
    return {
      name,
      strategy,
      keywords: selectedKeywords.map(k => ({
        kw: k.kw,
        sv: k.sv,
        doc_t: k.doc_t,
        competition_level: k.competition_level,
        explanation: k.explanation
      })),
      total_sv: selectedKeywords.reduce((sum: number, k: any) => sum + k.sv, 0),
      avg_competition: Math.round(
        selectedKeywords.reduce((sum: number, k: any) => sum + k.doc_t, 0) / 
        selectedKeywords.length
      ),
      recommendation: generateRecommendation(selectedKeywords, strategy)
    };
  }

  function generateRecommendation(kws: any[], strategy: string): string {
    const avgComp = Math.round(kws.reduce((s: number, k: any) => s + k.doc_t, 0) / kws.length);
    const avgSv = Math.round(kws.reduce((s: number, k: any) => s + k.sv, 0) / kws.length);

    if (strategy === 'gold') {
      return `저경쟁(${avgComp}) 높은검색량(${avgSv}) 조합 - 빠른 순위 상승 기대`;
    } else if (strategy === 'brand') {
      return `브랜드 강화 조합 - 차별화된 포지셔닝`;
    } else if (strategy === 'intent') {
      return `검색 의도 완벽 대응 - 실제 고객의 검색어`;
    } else {
      return `쉬운 승리 조합 - 저경쟁 키워드로 빠른 매출 연결`;
    }
  }

  const combinations = [];

  // 조합 1: 저경쟁 + 높은 검색량 (Gold Keywords)
  const lowCompHighSv = keywords
    .filter(k => k.is_low_competition && k.sv > 1000)
    .sort((a: any, b: any) => (b.sv - b.doc_t) - (a.sv - a.doc_t))
    .slice(0, 3);
  
  if (lowCompHighSv.length > 0) {
    combinations.push(createCombination(
      '저경쟁 높은검색량 조합',
      'gold',
      lowCompHighSv
    ));
  }

  // 조합 2: 브랜드 강화 조합
  const brandKeywords = keywords
    .filter(k => k.category === 'brand')
    .sort((a: any, b: any) => b.sv - a.sv)
    .slice(0, 3);
  
  if (brandKeywords.length > 0) {
    // 지역+서비스 추가
    const supplementary = keywords
      .filter(k => k.category === 'location_category' && k.sv > 1500)
      .slice(0, 1);
    
    combinations.push(createCombination(
      '브랜드 강화 조합',
      'brand',
      [...brandKeywords, ...supplementary]
    ));
  }

  // 조합 3: 검색 의도 대응 조합 (지역+카테고리+서비스)
  const intentKeywords = keywords
    .filter(k => ['location_category', 'service'].includes(k.category))
    .sort((a: any, b: any) => {
      // 지역+카테고리 우선, 그 다음 서비스
      const aScore = a.category === 'location_category' ? 1000 : 0;
      const bScore = b.category === 'location_category' ? 1000 : 0;
      return (b.sv + bScore) - (a.sv + aScore);
    })
    .slice(0, 3);
  
  if (intentKeywords.length > 0) {
    combinations.push(createCombination(
      '검색 의도 대응 조합',
      'intent',
      intentKeywords
    ));
  }

  // 조합 4: 저경쟁 장꼬리 조합 (쉬운 승리)
  const easyWin = keywords
    .filter(k => k.doc_t < 500 && k.sv > 500)
    .sort((a: any, b: any) => b.sv - a.sv)
    .slice(0, 4);
  
  if (easyWin.length > 0) {
    combinations.push(createCombination(
      '저경쟁 쉬운승리 조합',
      'easy_win',
      easyWin
    ));
  }

  // 최소 1개, 최대 4개 조합만 반환
  return combinations.slice(0, 4);
}

// 서버 시작
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ 서버 시작됨: http://127.0.0.1:${PORT}`);
  
  // 환경변수 로드 상태 확인
  const naverIdLoaded = process.env.NAVER_CLIENT_ID ? '✓' : '✗';
  const naverSecretLoaded = process.env.NAVER_CLIENT_SECRET ? '✓' : '✗';
  const geminiKeyLoaded = process.env.GEMINI_API_KEY ? '✓' : '✗';
  
  console.log('\n🔐 API 자격증명 상태:');
  console.log(`  Naver Client ID: ${naverIdLoaded}`);
  console.log(`  Naver Secret: ${naverSecretLoaded}`);
  console.log(`  Gemini API Key: ${geminiKeyLoaded}`);
  
  console.log('\n📍 라우트:');
  console.log('  GET /health');
  console.log('  GET /api/search/places');
  console.log('  GET /api/search/trend (신규: 검색 트렌드/키워드)');
  console.log('  POST /api/ai/extract-facets');
  console.log('  POST /api/ai/rank-keywords');
  console.log('  POST /api/ai/generate-guideline');
  console.log('  POST /api/ai/select-lowcomp-keywords (신규: 전문가 수준 저경쟁 키워드)');
  console.log('  + Supabase 라우트\n');
});

// 저경쟁 키워드 선정 엔드포인트 (전문가 수준)
app.post('/api/ai/select-lowcomp-keywords', async (req, res) => {
  try {
    const { facets, description } = req.body;
    console.log('[POST /api/ai/select-lowcomp-keywords]', {
      placeName: facets?.place?.name,
      category: facets?.category?.[0],
      location: `${facets?.location?.city || ''} ${facets?.location?.district || ''}`
    });

    if (!facets) return res.status(400).json({ error: 'facets 필요' });

    // Step 1: 요소 추출
    const placeName = facets.place?.name || '업체';
    const category = facets.category?.[0] || '업체';
    const city = facets.location?.city || '';
    const district = facets.location?.district || '';
    const dong = facets.location?.dong || undefined;          // 동 정보
    const micro_area = facets.location?.micro_area || undefined;  // 미시상권 정보
    const items = (Array.isArray(facets.items) ? facets.items : [])
      .filter((item: any) => item?.name)
      .map((item: any) => item.name);
    const audience = Array.isArray(facets.audience) ? facets.audience : [];
    const features = Array.isArray(facets.features) ? facets.features : [];
    const priceRange = facets.price_range?.[0] || '';

    console.log('📋 요소 추출:', {
      placeName, category, location: `${city} ${district}${dong ? ' ' + dong : ''}${micro_area ? ' (' + micro_area + ')' : ''}`,
      items: items.slice(0, 2), audience: audience.slice(0, 2), features: features.slice(0, 2)
    });

    // Step 2: Gemini로 후보 키워드 50-100개 생성 (다양한 형태)
    let candidateKeywords = [];
    try {
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (GEMINI_API_KEY) {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const candidatePrompt = `당신은 SEO 키워드 리서처입니다.

【업체 정보】
이름: ${placeName}
카테고리: ${category}
지역: ${city} ${district}${dong ? ` > ${dong}` : ''}${micro_area ? ` (${micro_area})` : ''}
메뉴/서비스: ${items.join(', ')}
타겟: ${audience.join(', ')}
특징: ${features.join(', ')}
가격대: ${priceRange}

【상권 위치 명시】
- 광역: ${city} (${district})
- 동/구역: ${dong || '미지정'}
- 미시상권: ${micro_area || '미지정'}

【중요한 필터링 규칙】
⚠️  다음 경우는 키워드에서 제외하세요:
1. 동/지명과 상권명이 동일하면서 다른 상권을 포함하는 경우
   예: "경기 광주"를 검색할 때 "광주신도시" 제외 (다른 상권이므로)
   예: "강남역"을 검색할 때 다른 강남 상권(코엑스, 압구정) 제외
2. 지명이 도시명과 중복되는 경우 (예: 광주시를 검색할 때 광주광역시 포함 금지)
3. 완전히 다른 상권이 섞이지 않도록

【요구사항】
수요가 높지만 경쟁이 낮은 저경쟁 키워드 50-80개를 생성하세요.

반드시 다양한 형태를 포함하세요:
1. [광역지역]+[카테고리] (예: "경기 광주 카페", "강남구 카페")
2. [광역지역]+[메뉴/서비스] (예: "경기 광주 맛집", "강남구 세차")
3. [동]+[카테고리] (예: "태전동 카페", "강남동 맛집") - ※${dong ? `${dong}의 키워드만` : '동 정보 없음'}
4. [상권]+[카테고리] (예: "${micro_area ? `${micro_area} 카페` : '상권명 카페'}") - ※${micro_area ? `${micro_area}만` : '상권 정보 없음'}
5. [메뉴/서비스]+[의도] (예: "카페 주차", "세차 빠른")
6. [지역]+[의도] (예: "경기 광주 카페 추천", "강남 카페 조용한")
7. [지역]+[메뉴/서비스]+[의도] (예: "경기 광주 아메리카노 가성비", "강남 세차 예약")
8. 동의어/표기변형 (예: "테이크아웃" vs "포장", "주차" vs "주차가능")

응답 형식:
\`\`\`json
{
  "keywords": [
    {
      "kw": "키워드 문구",
      "types": ["location_category", "service_intent"],
      "estimated_sv": 1500,
      "reasoning": "선택 이유 간단히"
    }
  ]
}
\`\`\`

규칙:
- 우리 업체(${dong || micro_area || '지역'}의 ${category})와 실제로 의도·지역이 맞는 것만
- 다른 상권/지역을 섞지 말 것 (예: 광주신도시와 구광주는 다른 상권)
- 모호함이나 규제 위험이 없는 것
- 자연스러운 한국어 표현
- 중복 제외`;

        console.log('🔍 Gemini 후보 생성 중...');
        const result = await model.generateContent(candidatePrompt);
        const responseText = result.response.text();

        // JSON 추출
        let jsonStr = responseText;
        const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
          jsonStr = jsonBlockMatch[1].trim();
        }

        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            candidateKeywords = parsed.keywords || [];
            console.log(`✅ 후보 생성: ${candidateKeywords.length}개`);
          } catch (e) {
            console.warn('⚠️ 후보 JSON 파싱 실패');
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Gemini 후보 생성 실패:', error instanceof Error ? error.message : String(error));
    }

    // Step 3: 폴백 후보 생성
    if (candidateKeywords.length === 0) {
      console.log('🔄 폴백: 규칙 기반 후보 생성');
      candidateKeywords = generateKeywordCandidatesFallback({
        placeName, category, city, district, dong, micro_area, items, audience, features, priceRange
      });
    }

    // Step 4: 각 후보 평가 및 점수 산출
    const evaluatedKeywords = await evaluateKeywordCandidates(candidateKeywords, {
      category, city, district, dong, micro_area, items, audience, features
    });

    // 후보 키워드 출력 (디버깅용)
    console.log(`\n📊 평가된 후보 (상위 15개):`);
    evaluatedKeywords.slice(0, 15).forEach((k: any, i: number) => {
      console.log(`  ${i + 1}. "${k.kw}" | 검색량: ${k.estimated_sv} | 경쟁도: ${k.estimated_doc_t} | 점수: ${k.score} | 트렌드: ${k.trend_hotness}`);
    });
    console.log();

    // Step 5: 최종 4개 선정 (다양성 고려 + 동적 임계값)
    const dynamicThreshold = getDynamicThreshold(city);
    const finalKeywords = selectFinalKeywords(evaluatedKeywords, dynamicThreshold);
    
    const qualifiedCount = evaluatedKeywords.filter((k: any) => k.meets_threshold).length;
    console.log(`📤 최종 선정: ${finalKeywords.length}개 (효율성 기반)`);
    
    // 🆕 효율성 기반 메시지 (고정 검색량 기준 제거)
    let warningMessage = '';
    
    if (finalKeywords.length > 0) {
      // 최고 효율성 키워드 찾기
      const bestKeyword = finalKeywords[0];
      const avgEfficiency = finalKeywords.reduce((sum: number, k: any) => sum + (k.efficiency_score || 0), 0) / finalKeywords.length;
      
      const efficiencyEmoji = avgEfficiency >= 1.0 ? '🟢' : avgEfficiency >= 0.7 ? '🟡' : '🔵';
      const efficiencyText = avgEfficiency >= 1.0 ? '최고' : avgEfficiency >= 0.7 ? '우수' : avgEfficiency >= 0.4 ? '양호' : '일반';
      
      warningMessage = `${efficiencyEmoji} 효율성 기반 최적 키워드 ${finalKeywords.length}개 추출 완료!\n\n📈 분석 결과:\n- 평균 효율성: ${efficiencyText} (${avgEfficiency.toFixed(2)})\n- 최고 효율성: "${bestKeyword.kw}" (${bestKeyword.efficiency_score})\n- 경쟁도: 낮음 (대비 검색수 많음)\n\n💡 특징:\n✓ 검색량 대비 경쟁도가 낮은 키워드 우선\n✓ 실제 검색 의도를 반영한 키워드 조합\n✓ 빠른 순위 상승 기대 (3-6개월)\n✓ 높은 전환율 예상 (타겟 고객 중심)\n\n🚀 추천 전략:\n1️⃣ 추천된 키워드를 제목/본문에 자연스럽게 배치\n2️⃣ 각 키워드별 세부 콘텐츠 작성\n3️⃣ 지역 특성과 실제 경험 반영\n4️⃣ 3개월 후 검색 순위 모니터링`;
    } else {
      warningMessage = `ℹ️ 키워드 분석 완료\n\n📊 현황:\n- 분석 대상: ${evaluatedKeywords.length}개 후보\n- 효율성 평가 완료\n- 최적 키워드 추출 중\n\n💡 안내:\n추천된 키워드들은 검색량 대비 경쟁도가 낮아\n빠른 순위 상승을 기대할 수 있습니다.`;
    }
    
    res.json({
      recommended: finalKeywords,
      alternatives: evaluatedKeywords
        .filter((k: any) => !finalKeywords.some((f: any) => f.kw === k.kw))
        .sort((a: any, b: any) => (b.efficiency_score || 0) - (a.efficiency_score || 0))  // 효율성순 정렬
        .slice(0, 10),  // 상위 10개 대안 제공
      evaluation_stats: {
        total_candidates: candidateKeywords.length,
        qualified_count: qualifiedCount,
        final_count: finalKeywords.length,
        found_low_competition: finalKeywords.length >= 1,
        dynamic_threshold: dynamicThreshold,
        recommended_action: finalKeywords.length >= 2 ? 'proceed' : (finalKeywords.length === 1 ? 'focus' : 'research'),
        threshold_reason: `효율성 기반 최적 키워드 추출 - 검색량 대비 경쟁도 비율 우선`,
        efficiency_note: '고정 검색량 조건 제거 - 효율성(SV/경쟁도) 기준으로 최적 조합 추출'
      },
      warning: warningMessage ? warningMessage : null
    });
  } catch (error) {
    console.error('[ERROR /api/ai/select-lowcomp-keywords]', error);
    res.status(500).json({ error: String(error) });
  }
});

server.on('error', (err) => {
  console.error('❌ 서버 에러:', err.message);
  process.exit(1);
});

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 신호 받음 - 무시 중...');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 서버 종료 신호 받음 - 무시 중...');
});

// 미처리 예외 처리
process.on('uncaughtException', (err) => {
  console.error('💥 미처리 예외:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 미처리 거부:', reason);
});
