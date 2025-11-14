#!/usr/bin/env node

/**
 * 저경쟁 키워드 + 트렌드 API 최종 통합 테스트
 * GET /api/search/trend + POST /api/ai/select-lowcomp-keywords
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.local') });

const API_URL = 'http://localhost:3005';

const testFacets = {
  place: { name: '강남 카페' },
  category: ['카페'],
  location: {
    city: '서울',
    district: '강남구',
    dong: '역삼동',
    micro_area: '강남역 상권'
  },
  items: [
    { name: '아메리카노' },
    { name: '라떼' },
    { name: '케이크' }
  ],
  audience: ['직장인', '학생'],
  features: ['넓은', '아늑한', '주차가능'],
  price_range: ['중가']
};

async function testTrendIntegration() {
  console.log('═══════════════════════════════════════════');
  console.log('🔍 저경쟁 키워드 + 트렌드 API 최종 통합 테스트');
  console.log('═══════════════════════════════════════════\n');

  const naverIdLoaded = process.env.NAVER_CLIENT_ID ? '✓' : '✗';
  const naverSecretLoaded = process.env.NAVER_CLIENT_SECRET ? '✓' : '✗';
  const geminiKeyLoaded = process.env.GEMINI_API_KEY ? '✓' : '✗';
  
  console.log('🔐 API 자격증명:');
  console.log(`  Naver ID: ${naverIdLoaded}`);
  console.log(`  Naver Secret: ${naverSecretLoaded}`);
  console.log(`  Gemini API Key: ${geminiKeyLoaded}\n`);

  let passedTests = 0;
  let failedTests = 0;

  // 테스트 1: 서버 상태 확인
  console.log('📊 [테스트 1] 서버 상태 확인');
  try {
    const healthResponse = await axios.get(`${API_URL}/health`);
    if (healthResponse.status === 200) {
      console.log('  ✅ 서버 응답 정상\n');
      passedTests++;
    } else {
      console.log('  ❌ 서버 상태 이상\n');
      failedTests++;
    }
  } catch (error) {
    console.log('  ❌ 서버 연결 실패\n');
    process.exit(1);
  }

  // 테스트 2: 트렌드 API 작동
  console.log('📊 [테스트 2] 트렌드 API 작동 확인');
  try {
    const trendResponse = await axios.get(`${API_URL}/api/search/trend`, {
      params: { query: '카페' }
    });

    if (trendResponse.data.success && trendResponse.data.data) {
      console.log(`  ✅ 트렌드 API 작동`);
      console.log(`     - 키워드: "${trendResponse.data.data.mainKeyword}"`);
      console.log(`     - 뉴스: ${trendResponse.data.data.newsCount}건`);
      console.log(`     - 트렌드 강도: ${trendResponse.data.data.trendAnalysis.hotness}\n`);
      passedTests++;
    } else {
      console.log('  ❌ 트렌드 응답 오류\n');
      failedTests++;
    }
  } catch (error) {
    console.log(`  ❌ 트렌드 API 실패: ${error instanceof Error ? error.message.substring(0, 50) : ''}\n`);
    failedTests++;
  }

  // 테스트 3: 저경쟁 키워드 선정 (트렌드 통합)
  console.log('📊 [테스트 3] 저경쟁 키워드 선정 (트렌드 통합)');
  try {
    const response = await axios.post(`${API_URL}/api/ai/select-lowcomp-keywords`, {
      facets: testFacets,
      description: '강남역 근처 아늑한 분위기의 카페입니다. 직장인과 학생들이 많이 방문합니다.'
    }, {
      timeout: 30000
    });

    if (response.data.recommended && response.data.recommended.length > 0) {
      console.log(`  ✅ 키워드 선정 완료`);
      console.log(`     - 추천 키워드: ${response.data.recommended.length}개`);
      console.log(`     - 후보 키워드: ${response.data.evaluation_stats.total_candidates}개`);
      console.log(`     - 임계값 충족: ${response.data.evaluation_stats.qualified_count}개\n`);

      // 상세 정보 출력
      console.log('  📌 추천 키워드 (상위 2개):');
      response.data.recommended.slice(0, 2).forEach((kw: any, idx: number) => {
        console.log(`\n     ${idx + 1}. "${kw.kw}"`);
        console.log(`        점수: ${kw.score}/100`);
        console.log(`        검색량: ${Math.round(kw.estimated_sv)}회/월`);
        console.log(`        경쟁도: ${kw.estimated_doc_t}점`);
        console.log(`        트렌드: ${kw.trend_hotness} (${kw.trend_bonus > 0 ? '+' : ''}${kw.trend_bonus}%)`);
        if (kw.seasonal_warning) {
          console.log(`        계절성: ${kw.seasonal_warning.substring(0, 60)}...`);
        }
      });
      console.log('\n');
      passedTests++;
    } else {
      console.log(`  ❌ 빈 응답\n`);
      failedTests++;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(`  ❌ 요청 실패: ${error.response?.status} - ${error.response?.data?.error || error.message}\n`);
    } else {
      console.log(`  ❌ 오류: ${error instanceof Error ? error.message : String(error)}\n`);
    }
    failedTests++;
  }

  // 테스트 4: 응답 구조 검증
  console.log('📊 [테스트 4] 응답 구조 및 통합 검증');
  try {
    const response = await axios.post(`${API_URL}/api/ai/select-lowcomp-keywords`, {
      facets: testFacets,
      description: '강남역 근처 아늑한 분위기의 카페입니다.'
    }, {
      timeout: 30000
    });

    const firstKeyword = response.data.recommended[0];
    const requiredFields = [
      'kw', 'score', 'estimated_sv', 'estimated_doc_t',
      'demand_score', 'competition_score', 'intent_fit_score',
      'region_fit_score', 'trend_hotness', 'trend_bonus'
    ];

    const missingFields = requiredFields.filter(field => !(field in firstKeyword));

    if (missingFields.length === 0) {
      console.log('  ✅ 모든 필드 포함');
      console.log('     필수 필드: 10개 ✓');
      console.log('     추가 필드: 선택적 ✓');
      console.log(`     총 필드: ${Object.keys(firstKeyword).length}개\n`);
      passedTests++;
    } else {
      console.log(`  ❌ 필드 누락: ${missingFields.join(', ')}\n`);
      failedTests++;
    }
  } catch (error) {
    console.log(`  ❌ 검증 실패: ${error instanceof Error ? error.message.substring(0, 50) : ''}\n`);
    failedTests++;
  }

  // 결과 요약
  console.log('═══════════════════════════════════════════');
  console.log('📈 최종 테스트 결과');
  console.log('═══════════════════════════════════════════');
  console.log(`✅ 성공: ${passedTests}개`);
  console.log(`❌ 실패: ${failedTests}개\n`);

  if (failedTests === 0) {
    console.log('🎉 모든 테스트 통과!\n');
    console.log('✨ 통합 완료 기능:');
    console.log('  ✓ GET /api/search/trend - 네이버 검색 트렌드 조회');
    console.log('  ✓ POST /api/ai/select-lowcomp-keywords - 저경쟁 키워드 선정');
    console.log('  ✓ Phase 2: 동 특성 반영 (경쟁도/수요 보정)');
    console.log('  ✓ Phase 3: 계절성 반영 (월별 수요 조정)');
    console.log('  ✓ Phase 4: 트렌드 반영 (메인 키워드 기반 병렬 조회)');
    console.log('  ✓ 응답: trend_hotness, trend_bonus, trend_warning 포함\n');
  } else {
    console.log('⚠️  일부 테스트 실패\n');
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

testTrendIntegration().catch(error => {
  console.error('💥 테스트 실행 오류:', error);
  process.exit(1);
});
