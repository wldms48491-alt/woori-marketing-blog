/**
 * 장소 정보 추출 개선 사항 테스트
 * Phase 1-4 모두 적용된 개선 로직 검증
 */

const BASE_URL = 'http://127.0.0.1:3005';

interface TestCase {
  name: string;
  placeInfo: string;
  description: string;
  expectedCity?: string;
  expectedDistrict?: string;
  expectedMinConfidence?: 'high' | 'medium' | 'low';
  category?: 'important' | 'standard';
}

const testCases: TestCase[] = [
  // 약칭 테스트 (Phase 2 개선)
  {
    name: '【약칭-1】홍대 카페',
    placeInfo: '홍대 카페',
    description: '홍대입구역 근처 감성 있는 카페',
    expectedCity: '서울',
    expectedDistrict: '마포',
    expectedMinConfidence: 'high',
    category: 'important'
  },
  {
    name: '【약칭-2】분당 헬스장',
    placeInfo: '분당 헬스장',
    description: '경기도 성남시 분당 신도시 고급 피트니스',
    expectedCity: '경기',
    expectedDistrict: '성남',
    expectedMinConfidence: 'high',
    category: 'important'
  },
  {
    name: '【약칭-3】강남역 한식당',
    placeInfo: '강남역 한식당',
    description: '서울 강남구 강남역 근처 프리미엄 한식당',
    expectedCity: '서울',
    expectedDistrict: '강남',
    expectedMinConfidence: 'high',
    category: 'important'
  },
  {
    name: '【약칭-4】신사동 가로수길',
    placeInfo: '신사동 가로수길 레스토랑',
    description: '신사동 가로수길 프리미엄 양식당',
    expectedCity: '서울',
    expectedDistrict: '강남',
    expectedMinConfidence: 'high',
    category: 'important'
  },
  {
    name: '【약칭-5】서면 식당',
    placeInfo: '서면 음식점',
    description: '부산 부산진구 서면역 근처 고급 양식당',
    expectedCity: '부산',
    expectedDistrict: '부산진',
    expectedMinConfidence: 'high',
    category: 'important'
  },
  {
    name: '【약칭-6】여의도 오피스',
    placeInfo: '여의도 직업훈련소',
    description: '서울 영등포구 여의도 금융권',
    expectedCity: '서울',
    expectedDistrict: '영등포',
    expectedMinConfidence: 'medium',
    category: 'standard'
  },
  {
    name: '【약칭-7】명동 쇼핑',
    placeInfo: '명동 쇼핑몰',
    description: '서울 종로구 명동역 인근',
    expectedCity: '서울',
    expectedDistrict: '종로',
    expectedMinConfidence: 'medium',
    category: 'standard'
  },

  // 정규 지명 테스트 (Phase 1 개선)
  {
    name: '【정규-1】송파구 잠실',
    placeInfo: '송파구 잠실',
    description: '서울 송파구 잠실동',
    expectedCity: '서울',
    expectedDistrict: '송파',
    expectedMinConfidence: 'high',
    category: 'standard'
  },
  {
    name: '【정규-2】부산진구 서면',
    placeInfo: '부산 부산진구',
    description: '부산 부산진구 서면동',
    expectedCity: '부산',
    expectedDistrict: '부산진',
    expectedMinConfidence: 'high',
    category: 'standard'
  },
  {
    name: '【정규-3】해운대구 해변',
    placeInfo: '해운대구 카페',
    description: '부산 해운대구 해수욕장 근처',
    expectedCity: '부산',
    expectedDistrict: '해운대',
    expectedMinConfidence: 'high',
    category: 'standard'
  },

  // 복합 입력 테스트
  {
    name: '【복합-1】강릉역 커피숍',
    placeInfo: '강릉역 커피',
    description: '강원 강릉역 인근 아늑한 카페',
    expectedCity: '강원',
    expectedDistrict: '강릉',
    expectedMinConfidence: 'high',
    category: 'standard'
  },
  {
    name: '【복합-2】일산신도시',
    placeInfo: '일산 새 신도시',
    description: '경기도 고양 일산신도시 중심',
    expectedCity: '경기',
    expectedDistrict: '고양',
    expectedMinConfidence: 'high',
    category: 'standard'
  },

  // 추가 지역 테스트
  {
    name: '【추가-1】인천역',
    placeInfo: '인천역 카페',
    description: '인천 중구 인천역',
    expectedCity: '인천',
    expectedDistrict: '중구',
    expectedMinConfidence: 'medium',
    category: 'standard'
  },
  {
    name: '【추가-2】대구 동성로',
    placeInfo: '대구 동성로',
    description: '대구 중구 동성로',
    expectedCity: '대구',
    expectedDistrict: '중구',
    expectedMinConfidence: 'high',
    category: 'standard'
  }
];

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  장소 정보 추출 개선 사항 테스트                  ║');
  console.log('║  Phase 1-4 모두 적용 검증                        ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  let totalTests = 0;
  let passedTests = 0;
  let importantPassed = 0;
  let importantTotal = 0;

  for (const testCase of testCases) {
    totalTests++;
    const isImportant = testCase.category === 'important';
    if (isImportant) importantTotal++;

    try {
      const response = await fetch(`${BASE_URL}/api/ai/extract-facets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeInfo: testCase.placeInfo,
          description: testCase.description
        })
      });

      if (!response.ok) {
        console.log(`❌ ${testCase.name}`);
        console.log(`   HTTP ${response.status}: ${response.statusText}\n`);
        continue;
      }

      const result = await response.json();
      const loc = result.location || {};
      const confidence = result.location_confidence?.level || 'low';
      const source = result.location_confidence?.source || 'unknown';

      // 검증
      let passed = true;
      const details: string[] = [];

      if (testCase.expectedCity) {
        const cityMatch = loc.city === testCase.expectedCity;
        passed = passed && cityMatch;
        details.push(
          `도시: ${cityMatch ? '✓' : '✗'} (기대: ${testCase.expectedCity}, 실제: ${loc.city})`
        );
      }

      if (testCase.expectedDistrict) {
        const districtMatch = loc.district === testCase.expectedDistrict;
        passed = passed && districtMatch;
        details.push(
          `구/군: ${districtMatch ? '✓' : '✗'} (기대: ${testCase.expectedDistrict}, 실제: ${loc.district})`
        );
      }

      if (testCase.expectedMinConfidence) {
        const confidenceLevels = { high: 3, medium: 2, low: 1 };
        const expectedScore = confidenceLevels[testCase.expectedMinConfidence];
        const actualScore = confidenceLevels[confidence] || 0;
        const confidenceMatch = actualScore >= expectedScore;
        passed = passed && confidenceMatch;
        details.push(
          `신뢰도: ${confidenceMatch ? '✓' : '✗'} (기대: ${testCase.expectedMinConfidence}, 실제: ${confidence})`
        );
      }

      if (passed) {
        console.log(`✅ ${testCase.name}`);
        passedTests++;
        if (isImportant) importantPassed++;
      } else {
        console.log(`⚠️  ${testCase.name}`);
      }

      details.push(`출처: ${source}`);
      if (loc.neighborhoods?.length > 0) {
        details.push(`동/상권: ${loc.neighborhoods.join(', ')}`);
      }
      console.log(`   ${details.join(', ')}\n`);
    } catch (err: any) {
      console.log(`❌ ${testCase.name}`);
      console.log(`   오류: ${err.message}\n`);
    }

    // 너무 빠른 요청 방지
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // 결과 요약
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  테스트 결과 요약                                ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  const importantPassRate = ((importantPassed / importantTotal) * 100).toFixed(1);

  console.log(`📊 전체 통과율: ${passedTests}/${totalTests} (${passRate}%)`);
  console.log(`🔴 중요 테스트: ${importantPassed}/${importantTotal} (${importantPassRate}%)`);
  console.log(`\n목표: 85% 이상 통과`);

  if (parseFloat(passRate) >= 85) {
    console.log('✅ 목표 달성!\n');
  } else {
    console.log('⚠️  목표 미달성 - 추가 개선 필요\n');
  }

  process.exit(parseFloat(passRate) >= 85 ? 0 : 1);
}

// 테스트 시작
runTests().catch(err => {
  console.error('테스트 실행 오류:', err);
  process.exit(1);
});
