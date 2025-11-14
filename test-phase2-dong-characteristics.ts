#!/usr/bin/env node

/**
 * Phase 2 테스트: 동별 세부 특성 분석
 */

import { 
  DONG_CHARACTERISTICS_DATABASE, 
  getDongCharacteristics, 
  getCharacteristicAdjustments,
  formatCharacteristics 
} from './server/dongCharacteristics.js';

console.log('\n=== 📊 Phase 2: 동별 세부 특성 분석 테스트 ===\n');

// 통계
let totalCities = 0;
let totalDistricts = 0;
let totalDongs = 0;

const cityList: string[] = [];

// 데이터베이스 통계
Object.entries(DONG_CHARACTERISTICS_DATABASE).forEach(([city, districts]) => {
  totalCities++;
  cityList.push(city);

  Object.entries(districts).forEach(([district, dongs]) => {
    totalDistricts++;
    totalDongs += Object.keys(dongs).length;
  });
});

console.log(`✅ 동 특성 데이터: ${totalCities}개 도시, ${totalDistricts}개 구/시, ${totalDongs}개 동\n`);

// 도시별 상세 보기
console.log('📍 도시별 동 특성 분포:');
Object.entries(DONG_CHARACTERISTICS_DATABASE).forEach(([city, districts]) => {
  let dongCount = 0;
  Object.values(districts).forEach((dongs) => {
    dongCount += Object.keys(dongs).length;
  });
  console.log(`  🏙️  ${city}: ${Object.keys(districts).length}개 구/시, ${dongCount}개 동`);
});

// 샘플 조회 및 보정값 테스트
console.log('\n🔍 샘플 조회 테스트 (동 특성 + 보정값):\n');

const testCases = [
  { city: '서울', district: '강남구', dong: '강남동', desc: '강남역 (상업중심)' },
  { city: '서울', district: '마포구', dong: '홍대입구동', desc: '홍대 (문화 상업)' },
  { city: '부산', district: '해운대구', dong: '우동', desc: '센텀 (신도시)' },
  { city: '서울', district: '관악구', dong: '신림동', desc: '신림 (교육지구)' },
  { city: '부산', district: '남구', dong: '용호동', desc: '광안리 (관광지)' }
];

testCases.forEach(({ city, district, dong, desc }) => {
  const characteristics = getDongCharacteristics(city, district, dong);
  
  console.log(`  📌 ${city} ${district} ${dong} (${desc})`);
  
  if (characteristics) {
    console.log(`     특성: ${characteristics.characteristics.join(', ')}`);
    console.log(`     설명: ${formatCharacteristics(characteristics.characteristics)}`);
    console.log(`     개발단계: ${characteristics.development_stage}`);
    console.log(`     타겟: ${characteristics.target_demographics.join(', ')}`);
    console.log(`     소득수준: ${characteristics.avg_income_level}`);
    console.log(`     경쟁도: ${characteristics.business_competition}`);
    
    // 보정값 계산
    const adjustments = getCharacteristicAdjustments(characteristics.characteristics);
    console.log(`     🔧 경쟁도 보정: ${adjustments.competition_adjustment > 0 ? '+' : ''}${adjustments.competition_adjustment}`);
    console.log(`     🔧 수요 보정: ${adjustments.demand_adjustment > 0 ? '+' : ''}${adjustments.demand_adjustment}%`);
  } else {
    console.log(`     ⚠️  특성 데이터 없음`);
  }
  console.log('');
});

// 특성별 분류
console.log('\n🏷️  특성별 동 분류:\n');

const characteristicMap: Record<string, { city: string; district: string; dong: string }[]> = {};

Object.entries(DONG_CHARACTERISTICS_DATABASE).forEach(([city, districts]) => {
  Object.entries(districts).forEach(([district, dongs]) => {
    Object.entries(dongs).forEach(([dong, info]) => {
      info.characteristics.forEach((char) => {
        if (!characteristicMap[char]) {
          characteristicMap[char] = [];
        }
        characteristicMap[char].push({ city, district, dong });
      });
    });
  });
});

Object.entries(characteristicMap).forEach(([characteristic, locations]) => {
  console.log(`  ${characteristic}: ${locations.length}개 동`);
  locations.slice(0, 3).forEach(({ city, district, dong }) => {
    console.log(`    - ${city} ${district} ${dong}`);
  });
  if (locations.length > 3) {
    console.log(`    ... 외 ${locations.length - 3}개`);
  }
});

// 보정값 예시
console.log('\n🔧 보정값 적용 예시:\n');

const adjustmentExamples = [
  {
    chars: ['신도시'],
    desc: '신도시 특성 동'
  },
  {
    chars: ['상업중심'],
    desc: '상업중심 특성 동'
  },
  {
    chars: ['관광지'],
    desc: '관광지 특성 동'
  },
  {
    chars: ['교육지구'],
    desc: '교육지구 특성 동'
  }
];

adjustmentExamples.forEach(({ chars, desc }) => {
  const adjustments = getCharacteristicAdjustments(chars as any);
  console.log(`  ${desc}:`);
  console.log(`    경쟁도 보정: ${adjustments.competition_adjustment > 0 ? '+' : ''}${adjustments.competition_adjustment}`);
  console.log(`    수요 보정: ${adjustments.demand_adjustment > 0 ? '+' : ''}${adjustments.demand_adjustment}%`);
  console.log('');
});

console.log('\n✅ Phase 2 테스트 완료!\n');
