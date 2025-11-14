import { extractLocationFromAddress } from './server/advancedLocationExtractor';

const testAddresses = [
  '서울 강남구 테헤란로 123',
  '경기도 광주시 태전동 309 1층',
  '서울 종로구 인사동 5길 20',
  '부산 해운대구 센텀중앙로',
  '대구 동구 동대구로',
  '경기도 수원시 팔달구',
];

console.log('🧪 주소 파싱 정확도 테스트\n');

testAddresses.forEach((address, i) => {
  const result = extractLocationFromAddress(address);
  console.log(`테스트 ${i + 1}: ${address}`);
  if (result) {
    console.log(`  ✅ city: ${result.city}, district: ${result.district}, confidence: ${result.confidence}`);
  } else {
    console.log(`  ❌ 파싱 실패`);
  }
  console.log();
});
