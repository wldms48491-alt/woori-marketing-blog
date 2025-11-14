/**
 * 저경쟁 키워드 선정 엔드포인트 테스트
 * 
 * 테스트 시나리오:
 * 1. 자동 추출된 Facets를 입력으로 사용
 * 2. /api/ai/select-lowcomp-keywords 호출
 * 3. 50-100개 후보 생성 확인
 * 4. 평가 및 점수 산출 확인
 * 5. 최종 4개 + 대체 4개 선정 확인
 */

import axios from 'axios';

const API_URL = 'http://localhost:3005';

// 테스트용 Facets 데이터 (원스팀마스타 예제)
const testFacets = {
  place: {
    name: '원스팀마스타',
    address: '경기도 광주시 태전동 309 1층'
  },
  location: {
    city: '경기',
    district: '광주시',
    dong: '태전동',          // 동 정보 추가
    micro_area: '광주신도시', // 미시상권 정보 추가
    confidence: 'high'
  },
  category: ['자동차 세차'],
  items: [
    { name: '스팀세차', signature: true },
    { name: '광택', signature: false },
    { name: '왁싱', signature: false }
  ],
  audience: ['자동차 소유자', '직장인'],
  features: ['빠른 시공', '친환경 세제'],
  vibe: ['전문적', '신뢰'],
  price_range: ['50,000-150,000원'],
  trade_area: ['태전동', '광주 상권']
};

async function testSelectLowCompKeywords() {
  try {
    console.log('🔍 저경쟁 키워드 선정 엔드포인트 테스트\n');
    console.log('📋 입력 Facets:');
    console.log(`  업체명: ${testFacets.place.name}`);
    console.log(`  주소: ${testFacets.place.address}`);
    console.log(`  지역: ${testFacets.location.city} ${testFacets.location.district}${testFacets.location.dong ? ' ' + testFacets.location.dong : ''}${testFacets.location.micro_area ? ' (' + testFacets.location.micro_area + ')' : ''}`);
    console.log(`  카테고리: ${testFacets.category[0]}`);
    console.log(`  서비스: ${testFacets.items.map(i => i.name).join(', ')}`);
    console.log(`  타겟: ${testFacets.audience.join(', ')}`);
    console.log(`  특징: ${testFacets.features.join(', ')}\n`);

    console.log('⏳ /api/ai/select-lowcomp-keywords 호출 중...\n');
    
    const response = await axios.post(`${API_URL}/api/ai/select-lowcomp-keywords`, {
      facets: testFacets
    });

    const { recommended, alternatives, evaluation_stats } = response.data;

    // 1️⃣ 후보 생성 결과
    console.log('📊 후보 생성 결과:');
    console.log(`  ✓ 총 후보: ${evaluation_stats.total_candidates}개`);
    console.log(`  ✓ 임계값 충족: ${evaluation_stats.qualified_count}개`);
    console.log(`  ✓ 최종 선정: ${evaluation_stats.final_count}개`);
    if (evaluation_stats.expansion_suggested) {
      console.log(`  ⚠️  확장 제안: 4개 미만으로 범위 확대 권장\n`);
    } else {
      console.log(`  ✅ 충분한 후보 확보\n`);
    }

    // 2️⃣ 추천 키워드 상세 분석
    console.log('🎯 추천 키워드 (Primary):\n');
    recommended.forEach((kw: any, idx: number) => {
      console.log(`  ${idx + 1}️⃣  "${kw.kw}"`);
      console.log(`      유형: ${kw.types}`);
      console.log(`      월간 검색량: ${kw.estimated_sv}회`);
      console.log(`      예상 경쟁도: ${kw.estimated_doc_t}개 (${kw.competition_level})`);
      console.log(`      점수: ${kw.score}/100`);
      console.log(`      의도 부합: ${kw.intent_fit}점 | 지역 부합: ${kw.region_fit}점`);
      console.log(`      위험도: ${kw.risk}점 | 신뢰도: ${kw.data_confidence}`);
      console.log(`      설명: ${kw.explanation}`);
      if (!kw.meets_threshold) {
        console.log(`      ⚠️  임계값 미충족 (500회 이상 권장)`);
      }
      console.log();
    });

    // 3️⃣ 대체 키워드 (Backup)
    console.log('🔄 대체 키워드 (Backup):\n');
    alternatives.forEach((kw: any, idx: number) => {
      console.log(`  ${idx + 1}️⃣  "${kw.kw}"`);
      console.log(`      유형: ${kw.types}`);
      console.log(`      월간 검색량: ${kw.estimated_sv}회`);
      console.log(`      점수: ${kw.score}/100`);
      console.log(`      설명: ${kw.explanation}`);
      console.log();
    });

    // 4️⃣ 모든 후보 키워드 (참고)
    console.log('\n📚 전체 후보 키워드 (상위 10개):\n');
    const allCandidates = [...recommended, ...alternatives];
    allCandidates.slice(0, 10).forEach((kw: any, idx: number) => {
      console.log(`  ${idx + 1}. "${kw.kw}" (검색량: ${kw.estimated_sv}, 점수: ${kw.score}, 유형: ${kw.types})`);
    });

    // 4️⃣ 선정 요약
    console.log('📈 선정 요약:\n');
    
    const primaryCompAvg = (recommended.reduce((sum: number, k: any) => sum + k.estimated_doc_t, 0) / recommended.length).toFixed(0);
    const primarySvTotal = recommended.reduce((sum: number, k: any) => sum + k.estimated_sv, 0);
    const primaryScoreAvg = (recommended.reduce((sum: number, k: any) => sum + k.score, 0) / recommended.length).toFixed(2);

    console.log(`  추천 키워드 조합:`);
    console.log(`    - 키워드: ${recommended.map((k: any) => `"${k.kw}"`).join(', ')}`);
    console.log(`    - 평균 경쟁도: ${primaryCompAvg} (저경쟁)`);
    console.log(`    - 총 검색량: ${primarySvTotal}회/월`);
    console.log(`    - 평균 점수: ${primaryScoreAvg}/100`);
    console.log();

    const thresholdMet = recommended.filter((k: any) => k.meets_threshold).length;
    const exceptions = recommended.filter((k: any) => !k.meets_threshold).length;
    
    console.log(`  임계값 분석:`);
    console.log(`    - 충족 (500회+): ${thresholdMet}개`);
    console.log(`    - 예외 (미만): ${exceptions}개`);
    console.log();

    // 5️⃣ 경쟁도 분포
    const competitionDistribution = {
      very_low: recommended.filter((k: any) => k.competition_level === 'very_low').length,
      low: recommended.filter((k: any) => k.competition_level === 'low').length,
      medium: recommended.filter((k: any) => k.competition_level === 'medium').length,
      high: recommended.filter((k: any) => k.competition_level === 'high').length
    };

    console.log(`📊 경쟁도 분포:`);
    console.log(`    🟢 매우 저경쟁: ${competitionDistribution.very_low}개`);
    console.log(`    🟡 저경쟁: ${competitionDistribution.low}개`);
    console.log(`    🟠 중경쟁: ${competitionDistribution.medium}개`);
    console.log(`    🔴 고경쟁: ${competitionDistribution.high}개`);
    console.log();

    // 6️⃣ 의도 부합도 및 지역 부합도
    console.log(`💡 의도 부합도 분석:`);
    recommended.forEach((kw: any) => {
      const fitStatus = kw.intent_fit > 70 ? '✅ 완벽' : kw.intent_fit > 50 ? '⭕ 양호' : '❌ 낮음';
      console.log(`    "${kw.kw}": ${fitStatus} (${kw.intent_fit}점)`);
    });
    console.log();

    console.log(`🗺️  지역 부합도 분석:`);
    recommended.forEach((kw: any) => {
      const fitStatus = kw.region_fit > 70 ? '✅ 완벽' : kw.region_fit > 50 ? '⭕ 양호' : '❌ 낮음';
      console.log(`    "${kw.kw}": ${fitStatus} (${kw.region_fit}점)`);
    });
    console.log();

    // 7️⃣ SEO 전략 추천
    console.log('🎯 권장 SEO 전략:\n');
    console.log(`  1️⃣  우선순위 (금주)`);
    console.log(`      → "${recommended[0]?.kw}" 콘텐츠 제작`);
    console.log(`         (월간 ${recommended[0]?.estimated_sv}회 검색, 저경쟁)\n`);
    
    console.log(`  2️⃣  병행 (금월)`);
    console.log(`      → "${recommended[1]?.kw}" 관련 최적화`);
    console.log(`      → "${recommended[2]?.kw}" 관련 최적화\n`);
    
    console.log(`  3️⃣  예비 (차월)`);
    console.log(`      → "${recommended[3]?.kw}" 콘텐츠`);
    console.log(`      → 대체 키워드: ${alternatives.slice(0, 2).map((k: any) => `"${k.kw}"`).join(', ')}\n`);

    console.log(`✅ 테스트 완료!\n`);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ API 오류:');
      console.error(`   상태: ${error.response?.status}`);
      console.error(`   메시지: ${error.response?.data?.error || error.message}`);
    } else {
      console.error('❌ 오류:', error);
    }
    process.exit(1);
  }
}

// 실행
testSelectLowCompKeywords();
