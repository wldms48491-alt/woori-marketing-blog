#!/usr/bin/env node

/**
 * 단순 API 응답 검증
 */

import axios from 'axios';

const API_URL = 'http://localhost:3005';

async function testAPI() {
  console.log('🔍 API 응답 필드 검증 테스트\n');

  try {
    const response = await axios.post(`${API_URL}/api/ai/select-lowcomp-keywords`, {
      facets: {
        place: { name: '테스트 카페' },
        category: ['카페'],
        location: { city: '서울', district: '강남구' },
        items: [],
        audience: [],
        features: [],
        price_range: []
      }
    }, {
      timeout: 60000
    });

    if (response.data.recommended && response.data.recommended.length > 0) {
      const first = response.data.recommended[0];
      
      console.log('✅ 응답 성공!\n');
      console.log('첫 번째 키워드:', first.kw);
      console.log('\n응답 필드:');
      console.log('  - kw:', first.kw ? '✓' : '✗');
      console.log('  - score:', first.score ? '✓' : '✗');
      console.log('  - estimated_sv:', first.estimated_sv ? '✓' : '✗');
      console.log('  - estimated_doc_t:', first.estimated_doc_t ? '✓' : '✗');
      console.log('  - trend:', first.trend !== undefined ? '✓' : '✗');
      console.log('  - trend_hotness:', first.trend_hotness !== undefined ? '✓' : '✗');
      console.log('  - trend_bonus:', first.trend_bonus !== undefined ? '✓' : '✗');
      console.log('  - trend_warning:', first.trend_warning !== undefined ? '✓' : '✗');
      console.log('  - seasonal_warning:', first.seasonal_warning !== undefined ? '✓' : '✗');

      console.log('\n트렌드 데이터:');
      console.log('  - trend_hotness:', first.trend_hotness || 'none');
      console.log('  - trend_bonus:', first.trend_bonus || 0);
      console.log('  - trend_warning:', first.trend_warning || '(없음)');

      // 모든 필드가 있는지 확인
      const hasAllTrendFields = 
        first.trend_hotness !== undefined &&
        first.trend_bonus !== undefined &&
        first.trend_warning !== undefined;

      if (hasAllTrendFields) {
        console.log('\n🎉 트렌드 필드 완벽! 모든 필드가 응답에 포함되었습니다.');
        process.exit(0);
      } else {
        console.log('\n❌ 트렌드 필드 누락');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('❌ API 호출 실패:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

testAPI();
