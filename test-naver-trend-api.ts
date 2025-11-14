#!/usr/bin/env node

/**
 * 네이버 검색 트렌드 API 테스트
 * GET /api/search/trend 엔드포인트 검증
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경변수 로드
dotenv.config({ path: path.join(__dirname, '.env.local') });

const API_URL = 'http://localhost:3005';

// 테스트용 키워드 목록
const testKeywords = [
  '카페',
  '강남역 카페',
  '세차장',
  '헬스장',
  '반려견 카페'
];

interface TrendData {
  mainKeyword: string;
  relatedKeywords: string[];
  newsCount: number;
  recentNews: Array<{
    title: string;
    link: string;
    pubDate: string;
    description: string;
  }>;
  trendAnalysis: {
    hotness: 'high' | 'medium' | 'low';
    totalSearch: number;
    relatedCount: number;
    isUrgent: boolean;
  };
}

interface ApiResponse {
  success: boolean;
  data?: TrendData;
  error?: string;
  trends?: any[];
  keywordInfo?: any;
}

async function testTrendApi() {
  console.log('====================================');
  console.log('🔍 네이버 검색 트렌드 API 테스트');
  console.log('====================================\n');

  // 환경변수 확인
  const naverIdLoaded = process.env.NAVER_CLIENT_ID ? '✓' : '✗';
  const naverSecretLoaded = process.env.NAVER_CLIENT_SECRET ? '✓' : '✗';
  
  console.log('🔐 API 자격증명 확인:');
  console.log(`  Naver ID: ${naverIdLoaded}`);
  console.log(`  Naver Secret: ${naverSecretLoaded}\n`);

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
    console.log('  ❌ 서버 연결 실패 - 서버를 먼저 시작하세요');
    console.log('     명령: npm run dev:backend\n');
    process.exit(1);
  }

  // 테스트 2-6: 각 키워드별 트렌드 조회
  for (const keyword of testKeywords) {
    console.log(`📊 [테스트] 키워드: "${keyword}"`);
    
    try {
      const response = await axios.get<ApiResponse>(`${API_URL}/api/search/trend`, {
        params: { query: keyword },
        timeout: 15000
      });

      if (response.data.success && response.data.data) {
        const trendData = response.data.data as TrendData;
        
        console.log(`  ✅ 요청 성공`);
        console.log(`     - 주요 키워드: ${trendData.mainKeyword}`);
        console.log(`     - 관련 키워드: ${trendData.relatedKeywords.join(', ')}`);
        console.log(`     - 뉴스 수: ${trendData.newsCount}건`);
        console.log(`     - 뉴스 조회됨: ${trendData.recentNews.length}건`);
        console.log(`     - 트렌드 강도: ${trendData.trendAnalysis.hotness.toUpperCase()}`);
        console.log(`     - 긴급 트렌드: ${trendData.trendAnalysis.isUrgent ? '예' : '아니오'}`);
        
        if (trendData.recentNews.length > 0) {
          console.log(`     - 최신 뉴스:`);
          trendData.recentNews.slice(0, 2).forEach((news, idx) => {
            console.log(`       ${idx + 1}. ${news.title.substring(0, 60)}...`);
          });
        }
        
        console.log();
        passedTests++;
      } else {
        console.log(`  ❌ 응답 구조 오류\n`);
        failedTests++;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(`  ❌ API 요청 실패: ${error.response?.status} ${error.response?.data?.error || error.message}`);
        console.log(`     응답: ${JSON.stringify(error.response?.data)}\n`);
      } else {
        console.log(`  ❌ 오류: ${error instanceof Error ? error.message : String(error)}\n`);
      }
      failedTests++;
    }
  }

  // 테스트 7: 빈 쿼리 처리
  console.log('📊 [테스트 7] 빈 쿼리 처리 (에러 케이스)');
  try {
    const response = await axios.get<ApiResponse>(`${API_URL}/api/search/trend`, {
      params: { query: '' },
      validateStatus: () => true // 모든 상태 코드 허용
    });

    if (response.status === 400 && response.data.error) {
      console.log(`  ✅ 올바른 에러 처리`);
      console.log(`     - 상태: ${response.status}`);
      console.log(`     - 에러 메시지: ${response.data.error}\n`);
      passedTests++;
    } else {
      console.log(`  ❌ 에러 처리 실패\n`);
      failedTests++;
    }
  } catch (error) {
    console.log(`  ❌ 요청 실패: ${error instanceof Error ? error.message : String(error)}\n`);
    failedTests++;
  }

  // 테스트 8: 응답 데이터 구조 검증
  console.log('📊 [테스트 8] 응답 데이터 구조 검증');
  try {
    const response = await axios.get<ApiResponse>(`${API_URL}/api/search/trend`, {
      params: { query: '카페' }
    });

    const data = response.data.data as TrendData;
    const hasRequiredFields = 
      data?.mainKeyword &&
      Array.isArray(data?.relatedKeywords) &&
      typeof data?.newsCount === 'number' &&
      Array.isArray(data?.recentNews) &&
      data?.trendAnalysis?.hotness &&
      typeof data?.trendAnalysis?.totalSearch === 'number' &&
      typeof data?.trendAnalysis?.isUrgent === 'boolean';

    if (hasRequiredFields) {
      console.log('  ✅ 모든 필수 필드 포함');
      console.log('     필드:');
      console.log('     - mainKeyword ✓');
      console.log('     - relatedKeywords ✓');
      console.log('     - newsCount ✓');
      console.log('     - recentNews ✓');
      console.log('     - trendAnalysis (hotness, totalSearch, isUrgent) ✓\n');
      passedTests++;
    } else {
      console.log('  ❌ 필수 필드 누락\n');
      failedTests++;
    }
  } catch (error) {
    console.log(`  ❌ 검증 실패: ${error instanceof Error ? error.message : String(error)}\n`);
    failedTests++;
  }

  // 결과 요약
  console.log('====================================');
  console.log('📈 테스트 결과 요약');
  console.log('====================================');
  console.log(`✅ 성공: ${passedTests}개`);
  console.log(`❌ 실패: ${failedTests}개`);
  console.log(`📊 성공률: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%\n`);

  if (failedTests === 0) {
    console.log('🎉 모든 테스트 통과!\n');
    console.log('📌 API 사용 예시:');
    console.log('  curl "http://localhost:3005/api/search/trend?query=카페"');
    console.log('\n📌 응답 예시:');
    console.log(JSON.stringify({
      success: true,
      data: {
        mainKeyword: '카페',
        relatedKeywords: ['카페', '문화', '음식', '음료', '서울', '커피', '매장', '지역', '관광', '방문'],
        newsCount: 45,
        recentNews: [
          {
            title: '서울 강남 카페 문화 급성장',
            link: 'https://example.com',
            pubDate: '2024-01-15',
            description: '강남 지역 카페 문화가 급속도로 성장하고 있습니다...'
          }
        ],
        trendAnalysis: {
          hotness: 'high',
          totalSearch: 45,
          relatedCount: 10,
          isUrgent: true
        }
      }
    }, null, 2));
    console.log();
  } else {
    console.log('⚠️ 일부 테스트 실패 - 위 로그를 확인하세요\n');
  }

  process.exit(failedTests > 0 ? 1 : 0);
}

// 실행
testTrendApi().catch(error => {
  console.error('💥 테스트 실행 오류:', error);
  process.exit(1);
});
