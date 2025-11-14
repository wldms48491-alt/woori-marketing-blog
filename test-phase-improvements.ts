// Node.js 내장 fetch 사용 (v17.5.0+)
// import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3005';

interface TestCase {
  name: string;
  placeInfo: string;
  description: string;
  expectedCity?: string;
  expectedDistrict?: string;
  expectedCategory?: string;
  expectedTradeAreas?: string[];
}

const testCases: TestCase[] = [
  // Phase A1 테스트: 60+ 신규 지역 약칭 인식
  {
    name: '【A1-1】홍대입구 카페 - 약칭 인식',
    placeInfo: '홍대 카페',
    description: '홍대입구역 근처 감성 있는 카페, 홍대 문화거리',
    expectedCity: '서울',
    expectedDistrict: '마포',
    expectedCategory: '카페',
  },
  {
    name: '【A1-2】신사동 한식당 - 강남구 약칭',
    placeInfo: '신사동 한식당',
    description: '신사동 가로수길 프리미엄 한식당',
    expectedCity: '서울',
    expectedDistrict: '강남',
    expectedCategory: '음식점',
  },
  {
    name: '【A1-3】서면 양식당 - 부산 약칭',
    placeInfo: '서면 레스토랑',
    description: '부산 서면역 근처 고급 양식당',
    expectedCity: '부산',
    expectedDistrict: '부산진',
    expectedCategory: '음식점',
  },
  {
    name: '【A1-4】강릉역 음식점 - 강원 약칭',
    placeInfo: '강릉역 카페',
    description: '강릉역 인근 아늑한 감성 카페',
    expectedCity: '강원',
    expectedDistrict: '강릉',
    expectedCategory: '카페',
  },
  {
    name: '【A1-5】분당 피트니스센터 - 경기 약칭',
    placeInfo: '분당 헬스장',
    description: '경기도 성남시 분당 신도시 고급 피트니스',
    expectedCity: '경기',
    expectedDistrict: '성남',
    expectedCategory: '피트니스',
  },

  // Phase B1 테스트: 키워드 기반 카테고리 추출
  {
    name: '【B1-1】카페 - Explicit 키워드',
    placeInfo: '커피숍',
    description: '프리미엄 커피와 디저트를 제공하는 감성 카페',
    expectedCategory: '카페',
  },
  {
    name: '【B1-2】음식점 - Explicit 키워드',
    placeInfo: '한식당',
    description: '전통 한식 레스토랑',
    expectedCategory: '음식점',
  },
  {
    name: '【B1-3】세차장 - Explicit 키워드',
    placeInfo: '자동차 세차',
    description: '고급 세차 서비스',
    expectedCategory: '세차/정비',
  },
  {
    name: '【B1-4】미용실 - Explicit 키워드',
    placeInfo: '미용실',
    description: '시술 미용실, 헤어/메이크업 서비스',
    expectedCategory: '미용',
  },
  {
    name: '【B1-5】의료 - Explicit 키워드',
    placeInfo: '치과',
    description: '임플란트 시술 및 일반 진료',
    expectedCategory: '의료',
  },
  {
    name: '【B1-6】펍/술집 - Explicit 키워드',
    placeInfo: '바/펍',
    description: '칵테일과 와인을 즐기는 술집',
    expectedCategory: '펍/술집',
  },
  {
    name: '【B1-7】숙박 - Explicit 키워드',
    placeInfo: '게스트하우스',
    description: '편안한 숙박 시설',
    expectedCategory: '숙박',
  },
  {
    name: '【B1-8】쇼핑 - Explicit 키워드',
    placeInfo: '의류 전문점',
    description: '프리미엄 의류 판매',
    expectedCategory: '쇼핑',
  },

  // Phase B1 Advanced: Implicit 키워드 테스트
  {
    name: '【B1-Implicit-1】브런치 카페 - Implicit 키워드 조합',
    placeInfo: '브런치 카페',
    description: '감성 있는 브런치 카페, 에스프레소 머신',
    expectedCategory: '카페',
  },
  {
    name: '【B1-Implicit-2】라떼 커피숍 - Implicit 키워드',
    placeInfo: '커피',
    description: '맛있는 라떼와 카푸치노, 아메리카노',
    expectedCategory: '카페',
  },

  // 복합 테스트: 위치 + 카테고리 동시 추출
  {
    name: '【Complex-1】홍대 브런치 카페 - 위치+카테고리',
    placeInfo: '홍대 브런치 카페',
    description: '홍대입구역 인근 감성 있는 카페',
    expectedCity: '서울',
    expectedDistrict: '마포',
    expectedCategory: '카페',
  },
  {
    name: '【Complex-2】강남 고급 음식점 - 위치+카테고리',
    placeInfo: '강남역 레스토랑',
    description: '강남 강남역 인근 고급 프랑스 요리 레스토랑',
    expectedCity: '서울',
    expectedDistrict: '강남',
    expectedCategory: '음식점',
  },
  {
    name: '【Complex-3】부산 해운대 세차 - 위치+카테고리',
    placeInfo: '해운대 자동차 세차',
    description: '부산 해운대구 신선한 물로 고급 세차 서비스',
    expectedCity: '부산',
    expectedDistrict: '해운대',
    expectedCategory: '세차/정비',
  },
];

async function runTest(testCase: TestCase): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/ai/extract-facets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeInfo: testCase.placeInfo,
        description: testCase.description,
      }),
    });

  const result: any = await response.json();
  const loc = result.location || {};
  const cat = Array.isArray(result.category) && result.category.length > 0 ? result.category[0] : undefined;

    let passed = true;
    const details: string[] = [];

    // 도시 검증
    if (testCase.expectedCity) {
      const cityMatch = loc.city === testCase.expectedCity;
      passed = passed && cityMatch;
      details.push(
        `도시: ${cityMatch ? '✓' : '✗'} (기대: ${testCase.expectedCity}, 실제: ${loc.city})`
      );
    }

    // 구군 검증
    if (testCase.expectedDistrict) {
      const districtMatch = loc.district === testCase.expectedDistrict;
      passed = passed && districtMatch;
      details.push(
        `구군: ${districtMatch ? '✓' : '✗'} (기대: ${testCase.expectedDistrict}, 실제: ${loc.district})`
      );
    }

    // 카테고리 검증
    if (testCase.expectedCategory) {
      const categoryMatch = cat === testCase.expectedCategory;
      passed = passed && categoryMatch;
      details.push(
        `카테고리: ${categoryMatch ? '✓' : '✗'} (기대: ${testCase.expectedCategory}, 실제: ${cat})`
      );
    }

    const status = passed ? '✓ 통과' : '✗ 실패';
    console.log(`\n${testCase.name}`);
    console.log(`  ${status}`);
    details.forEach((d) => console.log(`  ${d}`));

    return passed;
  } catch (error) {
    console.log(`\n${testCase.name}`);
    console.log(`  ✗ 실패 (에러: ${error})`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('【Phase A1 & B1 개선사항 검증 테스트】');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`【최종 결과】${passed} 통과 / ${failed} 실패`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('✅ 모든 테스트를 통과했습니다!');
  }

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('테스트 실행 중 오류:', error);
  process.exit(1);
});
