import axios from 'axios';

const API_BASE = 'http://localhost:3001';

async function runTest() {
  try {
    console.log('\n=== 트렌드 API 디버그 테스트 ===\n');

    // 1. 서버 건강 체크
    console.log('1️⃣ 서버 건강 체크...');
    const healthRes = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ 서버 정상:', healthRes.data);

    // 2. 트렌드 API 직접 테스트
    console.log('\n2️⃣ 트렌드 API 테스트 (1개 키워드)...');
    console.time('트렌드 API');
    const trendRes = await axios.get(`${API_BASE}/api/search/trend`, {
      params: { keyword: '카페' },
      timeout: 10000
    });
    console.timeEnd('트렌드 API');
    console.log('📊 응답:', {
      total: trendRes.data.total,
      hotness: trendRes.data.hotness,
      isUrgent: trendRes.data.isUrgent,
      relatedKeywordsCount: trendRes.data.relatedKeywords?.length || 0
    });

    // 3. 저경쟁 키워드 선택 (간단한 요청)
    console.log('\n3️⃣ 저경쟁 키워드 선택 테스트...');
    console.time('키워드 선택');
    const selectRes = await axios.post(
      `${API_BASE}/api/ai/select-lowcomp-keywords`,
      {
        category: '카페',
        cityName: '강남',
        traits: ['휴식', '업무'],
        items: ['아메리카노'],
        audiences: [['직장인', '학생']]
      },
      { timeout: 15000 }
    );
    console.timeEnd('키워드 선택');

    const keywords = selectRes.data.recommendedKeywords || [];
    console.log(`\n📋 추천 키워드: ${keywords.length}개`);

    if (keywords.length > 0) {
      const sample = keywords[0];
      console.log('\n첫 번째 키워드 상세:');
      console.log({
        keyword: sample.keyword,
        searchVolume: sample.searchVolume,
        competition: sample.competition,
        score: sample.score,
        trend_hotness: sample.trend_hotness,
        trend_bonus: sample.trend_bonus,
        trend_warning: sample.trend_warning
      });

      // trend_hotness 값 확인
      if (sample.trend_hotness === undefined) {
        console.log('\n⚠️ trend_hotness가 undefined입니다!');
      } else {
        console.log(`\n✅ trend_hotness: ${sample.trend_hotness}`);
      }
    }

    console.log('\n✅ 모든 테스트 완료\n');

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ 오류:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    } else {
      console.error('❌ 오류:', error);
    }
    process.exit(1);
  }
}

runTest();
