#!/usr/bin/env node
/**
 * 네이버 로컬 검색 API 테스트
 * 
 * 사용법:
 * npx tsx test-search-api.ts "검색어"
 * 예: npx tsx test-search-api.ts "카페"
 */

import 'dotenv/config.js';
import axios from 'axios';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://127.0.0.1:3005';

const query = process.argv[2] || '카페';

console.log('\n═══════════════════════════════════════');
console.log('🔍 네이버 로컬 검색 API 테스트');
console.log('═══════════════════════════════════════\n');

console.log(`📝 환경변수 상태:`);
console.log(`  NAVER_CLIENT_ID: ${NAVER_CLIENT_ID ? '✓ 로드됨' : '✗ 미로드'}`);
console.log(`  NAVER_CLIENT_SECRET: ${NAVER_CLIENT_SECRET ? '✓ 로드됨' : '✗ 미로드'}`);
console.log(`  BACKEND_URL: ${BACKEND_URL}\n`);

async function testBackendAPI() {
  try {
    console.log(`📡 백엔드 API 호출: /api/search/places?query=${query}`);
    const response = await axios.get(`${BACKEND_URL}/api/search/places`, {
      params: { query, page: 1 }
    });

    console.log(`\n✅ 응답 성공! (상태: ${response.status})\n`);
    console.log(`📊 결과:`);
    console.log(`  - 총 결과: ${response.data.total}개`);
    console.log(`  - 반환된 결과: ${response.data.places?.length || 0}개`);
    console.log(`  - 추가 페이지: ${response.data.hasMore ? '있음' : '없음'}\n`);

    if (response.data.places && response.data.places.length > 0) {
      console.log(`📍 결과 샘플 (처음 3개):\n`);
      response.data.places.slice(0, 3).forEach((place: any, idx: number) => {
        console.log(`${idx + 1}. ${place.title}`);
        console.log(`   주소: ${place.address}`);
        console.log(`   전화: ${place.phone || '없음'}`);
        console.log(`   카테고리: ${place.category || '없음'}\n`);
      });
    } else {
      console.log('⚠️  검색 결과가 없습니다.\n');
    }
  } catch (error) {
    console.error(`\n❌ 오류 발생:\n`);
    if (axios.isAxiosError(error)) {
      console.error(`  상태 코드: ${error.response?.status}`);
      console.error(`  오류 메시지: ${error.response?.data?.error || error.message}`);
      if (error.response?.data) {
        console.error(`  응답:`, error.response.data);
      }
    } else if (error instanceof Error) {
      console.error(`  ${error.message}`);
    }
  }
}

async function testDirectNaverAPI() {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.log('⏭️  환경변수 미로드로 직접 API 테스트 스킵\n');
    return;
  }

  try {
    console.log(`\n🌐 네이버 API 직접 호출: /v1/search/local.json?query=${query}`);
    const response = await axios.get('https://openapi.naver.com/v1/search/local.json', {
      params: { query, display: 5, sort: 'comment' },
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      }
    });

    console.log(`\n✅ 응답 성공! (상태: ${response.status})\n`);
    console.log(`📊 결과:`);
    console.log(`  - 총 결과: ${response.data.total}개`);
    console.log(`  - 반환된 결과: ${response.data.items?.length || 0}개\n`);

    if (response.data.items && response.data.items.length > 0) {
      console.log(`📍 네이버 원본 데이터 (처음 2개):\n`);
      response.data.items.slice(0, 2).forEach((item: any, idx: number) => {
        console.log(`${idx + 1}. ${item.title}`);
        console.log(`   주소: ${item.address}`);
        console.log(`   전화: ${item.telephone || '없음'}\n`);
      });
    }
  } catch (error) {
    console.error(`\n❌ 네이버 API 오류:\n`);
    if (axios.isAxiosError(error)) {
      console.error(`  상태 코드: ${error.response?.status}`);
      console.error(`  오류: ${error.response?.statusText || error.message}`);
    } else if (error instanceof Error) {
      console.error(`  ${error.message}`);
    }
  }
}

async function runTests() {
  await testBackendAPI();
  await testDirectNaverAPI();
  
  console.log('═══════════════════════════════════════');
  console.log('테스트 완료!\n');
}

runTests();
