/**
 * 자동 추출 태그 개선 테스트
 * Gemini API 호출 검증
 */

const BASE_URL = 'http://127.0.0.1:3005';

interface TestCase {
  name: string;
  placeInfo: string;
  description: string;
  expectedCategory?: string;
  checkItems?: boolean;
  checkAudience?: boolean;
}

const testCases: TestCase[] = [
  {
    name: '테스트 1: 카페 (크루아상, 콜드브루)',
    placeInfo: '코코브루니 서현점',
    description: '서현역 근처 브런치 카페. 크루아상 샌드와 콜드브루 시그니처. 감성있는 분위기. 20-30대 여성 주 방문층',
    expectedCategory: '카페',
    checkItems: true,
    checkAudience: true
  },
  {
    name: '테스트 2: 음식점 (불고기)',
    placeInfo: '강남 한식당',
    description: '강남역 고급 한식당. 불고기와 갈비가 시그니처. 30-50대 직장인 대상',
    expectedCategory: '한식',
    checkItems: true,
    checkAudience: true
  },
  {
    name: '테스트 3: 미용 (헤어/메이크업)',
    placeInfo: '강남 뷰티샵',
    description: '강남역 프리미엄 미용실. 리본펌과 클리닉을 전문으로 함',
    expectedCategory: '미용',
    checkItems: true,
    checkAudience: false
  }
];

async function runTest(testCase: TestCase): Promise<boolean> {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`입력:`);
    console.log(`  업체명: ${testCase.placeInfo}`);
    console.log(`  설명: ${testCase.description.substring(0, 50)}...`);

    const response = await fetch(`${BASE_URL}/api/ai/extract-facets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeInfo: testCase.placeInfo,
        description: testCase.description
      })
    });

    if (!response.ok) {
      console.error(`❌ HTTP 오류: ${response.status}`);
      return false;
    }

    const result: any = await response.json();

    console.log(`\n추출 결과:`);
    console.log(`  카테고리: ${result.category?.[0] || 'N/A'}`);
    console.log(`  메뉴: ${result.items?.map((item: any) => item.name).join(', ') || '없음'}`);
    console.log(`  타겟: ${result.audience?.join(', ') || '없음'}`);
    console.log(`  분위기: ${result.vibe?.join(', ') || '없음'}`);
    console.log(`  가격: ${result.price_range?.[0] || '없음'}`);
    console.log(`  위치: ${result.location?.city} ${result.location?.district}`);

    // 검증
    let passed = true;
    const checks: string[] = [];

    // 카테고리 검증
    if (testCase.expectedCategory) {
      const catMatch = result.category?.[0]?.includes(testCase.expectedCategory.charAt(0)) ||
                       result.category?.[0]?.includes('카페') ||
                       result.category?.[0]?.includes('한식') ||
                       result.category?.[0]?.includes('미용');
      checks.push(`카테고리: ${catMatch ? '✅' : '❌'}`);
      passed = passed && catMatch;
    }

    // 메뉴 검증
    if (testCase.checkItems) {
      const hasItems = result.items && result.items.length > 0 && result.items[0]?.name !== '시그니처';
      checks.push(`메뉴 추출: ${hasItems ? '✅' : '❌'}`);
      passed = passed && hasItems;
    }

    // 타겟 검증
    if (testCase.checkAudience) {
      const hasAudience = result.audience && result.audience.length > 0 && result.audience[0] !== '고객';
      checks.push(`타겟 추출: ${hasAudience ? '✅' : '❌'}`);
      passed = passed && hasAudience;
    }

    // 분위기 검증
    const hasVibe = result.vibe && result.vibe[0] !== '분위기';
    checks.push(`분위기 추출: ${hasVibe ? '✅' : '❌'}`);
    passed = passed && hasVibe;

    console.log(`\n검증 결과:`);
    checks.forEach(check => console.log(`  ${check}`));

    console.log(`\n${passed ? '✅ 통과' : '❌ 실패'}`);

    return passed;
  } catch (error) {
    console.error(`❌ 오류: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function main() {
  console.log('\n🧪 자동 추출 태그 개선 테스트 시작\n');

  let passedCount = 0;
  let totalCount = testCases.length;

  for (const testCase of testCases) {
    const passed = await runTest(testCase);
    if (passed) passedCount++;
    
    // API 호출 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 최종 결과: ${passedCount}/${totalCount} 테스트 통과`);
  console.log(`성공률: ${Math.round((passedCount / totalCount) * 100)}%`);
  console.log(`${'='.repeat(60)}\n`);

  process.exit(passedCount === totalCount ? 0 : 1);
}

// 서버 연결 대기
console.log('⏳ 서버 연결 대기 중...');
setTimeout(main, 2000);
