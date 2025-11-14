#!/usr/bin/env node

/**
 * Phase 3 테스트: 계절/트렌드 반영 시스템
 */

import {
  SEASONAL_TREND_DATABASE,
  getSeasonalPattern,
  getMonthlyTrend,
  generateSeasonalWarning,
  applySeasonalAdjustment
} from './server/seasonalTrendData.js';

console.log('\n=== 📊 Phase 3: 계절/트렌드 반영 시스템 테스트 ===\n');

// 통계
const categoryCount = Object.keys(SEASONAL_TREND_DATABASE).length;
console.log(`✅ 카테고리별 계절 트렌드: ${categoryCount}개\n`);

// 카테고리별 특성 보기
console.log('📍 카테고리별 계절 패턴:');
Object.entries(SEASONAL_TREND_DATABASE).forEach(([key, pattern]) => {
  const keywords = key.split('|');
  console.log(`  🏷️  ${keywords.join(', ')}`);
  console.log(`     성수기: ${pattern.peak_seasons.join(', ')}`);
  console.log(`     비수기: ${pattern.low_seasons.length > 0 ? pattern.low_seasons.join(', ') : '없음'}`);
  console.log(`     변동성: ${pattern.volatility}`);
});

// 월별 트렌드 분석
console.log('\n\n📅 월별 트렌드 분석 (카페 예시):\n');

const cafePattern = getSeasonalPattern('카페');
if (cafePattern) {
  console.log('  카페 월별 수요 배율:');
  console.log('  ─────────────────────────');
  
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  cafePattern.seasonal_trends.forEach((trend) => {
    const multiplier = trend.demand_multiplier;
    const barLength = Math.round(multiplier * 10);
    const bar = '█'.repeat(barLength);
    
    console.log(`  ${monthNames[trend.month - 1].padEnd(4)} ${bar} ${multiplier.toFixed(2)}x  "${trend.description}"`);
  });

  console.log('  ─────────────────────────\n');
}

// 샘플 카테고리별 테스트
console.log('🔍 카테고리별 계절성 경고 테스트:\n');

const testCategories = ['cafe|카페', 'wash|세차|자동차세차', 'gym|헬스|피트니스', 'restaurant|식당|음식점'];
const months = [1, 4, 7, 10]; // 1월, 4월, 7월, 10월

testCategories.forEach((category) => {
  const pattern = getSeasonalPattern(category);
  if (!pattern) return;

  const categoryName = category.split('|')[1];
  console.log(`  📌 ${categoryName}:`);
  
  months.forEach((month) => {
    const trend = getMonthlyTrend(month, pattern);
    if (!trend) return;
    
    const monthName = ['', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'][month];
    const warning = generateSeasonalWarning(category, month);
    
    console.log(`     ${monthName}: ${trend.demand_multiplier.toFixed(2)}x`);
    if (warning) {
      console.log(`     ${warning}`);
    }
  });
  
  console.log('');
});

// 점수 조정 시뮬레이션
console.log('\n💯 점수 조정 시뮬레이션:\n');

const baseScore = 75;
const testScenarios = [
  { category: '카페', month: 5, desc: '카페 5월' },
  { category: '카페', month: 1, desc: '카페 1월' },
  { category: '세차', month: 4, desc: '세차 4월' },
  { category: '세차', month: 1, desc: '세차 1월' },
  { category: '헬스', month: 1, desc: '헬스 1월' },
  { category: '헬스', month: 7, desc: '헬스 7월' }
];

testScenarios.forEach(({ category, month, desc }) => {
  const result = applySeasonalAdjustment(baseScore, category, month);
  
  console.log(`  ${desc}`);
  console.log(`    기본 점수: ${baseScore}`);
  console.log(`    계절 배율: ${result.multiplier.toFixed(2)}x`);
  console.log(`    조정된 점수: ${result.adjusted_score}`);
  if (result.warning) {
    console.log(`    ⚠️  ${result.warning}`);
  }
  console.log('');
});

// 시간대별 트렌드 보기
console.log('\n🕐 시간대별 수요 패턴 (카페 예시):\n');

const cafeTimePatterns = cafePattern?.time_based_trends || [];
cafeTimePatterns.forEach((trend) => {
  const barLength = Math.round(trend.demand_multiplier * 8);
  const bar = '█'.repeat(barLength);
  console.log(`  ${trend.period.padEnd(15)} ${bar} ${trend.demand_multiplier.toFixed(2)}x  ${trend.description}`);
});

console.log('\n✅ Phase 3 테스트 완료!\n');
