import axios from 'axios';

const API_BASE = 'http://localhost:3005';

async function testKeywordRanking() {
  try {
    console.log('🔍 키워드 랭킹 개선 테스트\n');

    // Step 1: 먼저 facets 추출
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 1: Facets 추출');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const facetsResponse = await axios.post(`${API_BASE}/api/ai/extract-facets`, {
      description: '30년 경력의 정비사가 직접 운영하는 스팀세차장, 광택과 손세차. 가성비 좋고 전문적인 서비스.',
      placeInfo: '원스팀마스타'
    });

    const facets = facetsResponse.data;
    console.log('✅ Facets 추출 완료:');
    console.log('  Category:', facets.category[0]);
    console.log('  Items:', facets.items.map((i: any) => i.name).join(', '));
    console.log('  Location:', `${facets.location.city} ${facets.location.district}`);
    console.log('\n');

    // Step 2: 키워드 랭킹
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 2: 최적 키워드 조합 분석');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const keywordsResponse = await axios.post(`${API_BASE}/api/ai/rank-keywords`, {
      facets: facets
    });

    const { recommended_combinations, all_keywords } = keywordsResponse.data;

    // 추천 조합 표시
    console.log(`🎯 추천 키워드 조합: ${recommended_combinations.length}가지\n`);

    recommended_combinations.forEach((combo: any, idx: number) => {
      console.log(`📌 조합 ${idx + 1}: ${combo.name}`);
      console.log(`   전략: ${combo.strategy}`);
      console.log(`   추천: ${combo.recommendation}`);
      console.log(`   평균 경쟁도: ${combo.avg_competition}`);
      console.log(`   총 검색량: ${combo.total_sv}`);
      console.log(`   구성 키워드:`);
      
      combo.keywords.forEach((kw: any, kidx: number) => {
        console.log(`     ${kidx + 1}. "${kw.kw}"`);
        console.log(`        └─ sv: ${kw.sv}, doc_t: ${kw.doc_t}, 경쟁도: ${kw.competition_level}`);
      });
      console.log();
    });

    // Step 3: 저경쟁 키워드 분석
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 3: 저경쟁 키워드 분석');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const veryLow = all_keywords.filter((k: any) => k.competition_level === 'very_low');
    const low = all_keywords.filter((k: any) => k.competition_level === 'low');
    const medium = all_keywords.filter((k: any) => k.competition_level === 'medium');
    const high = all_keywords.filter((k: any) => k.competition_level === 'high');

    console.log(`📊 경쟁도 분포:`);
    console.log(`  🟢 매우 저경쟁 (doc_t < 200): ${veryLow.length}개`);
    console.log(`  🟡 저경쟁 (200-800): ${low.length}개`);
    console.log(`  🟠 중경쟁 (800-2000): ${medium.length}개`);
    console.log(`  🔴 고경쟁 (2000+): ${high.length}개\n`);

    if (veryLow.length > 0) {
      console.log('💎 매우 저경쟁 키워드 TOP 5:');
      veryLow.slice(0, 5).forEach((kw, idx) => {
        console.log(`  ${idx + 1}. "${kw.kw}"`);
        console.log(`     └─ sv: ${kw.sv}, doc_t: ${kw.doc_t}, 신뢰도: ${(kw.conf * 100).toFixed(0)}%`);
      });
      console.log();
    }

    // 전체 상위 키워드
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('전체 키워드 TOP 10');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    all_keywords.slice(0, 10).forEach((kw: any, idx: number) => {
      const icon = 
        kw.competition_level === 'very_low' ? '💎' :
        kw.competition_level === 'low' ? '🟢' :
        kw.competition_level === 'medium' ? '🟡' : '🔴';
      
      console.log(`${idx + 1}. ${icon} "${kw.kw}"`);
      console.log(`   카테고리: ${kw.category}, 우선도: ${kw.priority}`);
      console.log(`   검색량: ${kw.sv}, 경쟁도: ${kw.doc_t}, 신뢰도: ${(kw.conf * 100).toFixed(0)}%`);
      console.log();
    });

    console.log('✅ 테스트 완료!');

  } catch (error: any) {
    console.error('❌ 오류 발생:');
    if (error.response) {
      console.error('상태:', error.response.status);
      console.error('데이터:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testKeywordRanking();
