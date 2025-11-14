#!/usr/bin/env node

/**
 * Phase 1 테스트: 확장된 미시상권 데이터베이스
 */

import { MICRO_AREA_DATABASE, getMicroArea, getAllMicroAreas } from './server/microAreaDatabase.js';

console.log('\n=== 📊 Phase 1: 미시상권 데이터베이스 확장 테스트 ===\n');

// 통계
let totalCities = 0;
let totalDistricts = 0;
let totalDongs = 0;
let totalMicroAreas = 0;

const cityList: string[] = [];
const districtsByCity: Record<string, string[]> = {};

// 데이터베이스 통계
Object.entries(MICRO_AREA_DATABASE).forEach(([city, districts]) => {
  totalCities++;
  cityList.push(city);
  districtsByCity[city] = [];

  Object.entries(districts).forEach(([district, dongs]) => {
    totalDistricts++;
    districtsByCity[city].push(district);

    Object.entries(dongs).forEach(([dong, info]) => {
      totalDongs++;
      totalMicroAreas += info.micro_areas.length;
    });
  });
});

console.log(`✅ 도시: ${totalCities}개`);
console.log(`✅ 구/시: ${totalDistricts}개`);
console.log(`✅ 동: ${totalDongs}개`);
console.log(`✅ 상권: ${totalMicroAreas}개\n`);

// 도시별 상세 통계
console.log('📍 도시별 상권 분포:');
Object.entries(districtsByCity).forEach(([city, districts]) => {
  let dongCount = 0;
  let microAreaCount = 0;

  districts.forEach((district) => {
    const dongs = MICRO_AREA_DATABASE[city][district];
    Object.values(dongs).forEach((info) => {
      dongCount++;
      microAreaCount += info.micro_areas.length;
    });
  });

  console.log(`  🏙️  ${city}: ${districts.length}개 구/시, ${dongCount}개 동, ${microAreaCount}개 상권`);
});

// 샘플 조회 테스트
console.log('\n🔍 샘플 조회 테스트:\n');

const testCases = [
  { city: '서울', district: '강남구', dong: '강남동', desc: '강남역' },
  { city: '서울', district: '마포구', dong: '홍대입구동', desc: '홍대' },
  { city: '부산', district: '해운대구', dong: '우동', desc: '센텀' },
  { city: '대전', district: '유성구', dong: '봉명동', desc: '유성온천' },
  { city: '인천', district: '연수구', dong: '송도동', desc: '송도신도시' }
];

testCases.forEach(({ city, district, dong, desc }) => {
  const microArea = getMicroArea(city, district, dong);
  const allAreas = getAllMicroAreas(city, district, dong);

  console.log(`  📌 ${city} ${district} ${dong} (${desc})`);
  console.log(`     주 상권: ${microArea || '없음'}`);
  console.log(`     모든 상권: ${allAreas.join(', ') || '없음'}`);
  console.log('');
});

// 새로 추가된 도시 확인
console.log('\n✨ Phase 1에서 새로 추가된 도시:');
const newCities = ['대구', '대전', '광주', '울산', '경남', '경북'];
newCities.forEach((city) => {
  if (MICRO_AREA_DATABASE[city]) {
    const districtCount = Object.keys(MICRO_AREA_DATABASE[city]).length;
    let dongCount = 0;
    let areaCount = 0;

    Object.values(MICRO_AREA_DATABASE[city]).forEach((dongs) => {
      Object.values(dongs).forEach((info) => {
        dongCount++;
        areaCount += info.micro_areas.length;
      });
    });

    console.log(`  ✅ ${city}: ${districtCount}개 구/시, ${dongCount}개 동, ${areaCount}개 상권`);
  }
});

console.log('\n✅ Phase 1 테스트 완료!\n');
