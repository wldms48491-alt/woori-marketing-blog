#!/usr/bin/env node

/**
 * Phase 4 테스트: 경쟁 업체 분석 시스템
 */

import {
  CompetitorInfo,
  calculateCompetitionScore,
  analyzeCompetition,
  adjustKeywordScoreByCompetition,
  summarizeCompetition
} from './server/competitorAnalysis.js';

console.log('\n=== 📊 Phase 4: 경쟁 업체 분석 시스템 테스트 ===\n');

// 샘플 경쟁사 데이터
const sampleCompetitors: CompetitorInfo[] = [
  {
    title: '강남역 프리미엄 카페',
    address: '서울 강남구 강남동',
    phone: '02-1234-5678',
    category: '카페',
    rating: 4.8,
    review_count: 320
  },
  {
    title: '강남역 커피숍',
    address: '서울 강남구 강남동',
    phone: '02-2345-6789',
    category: '카페',
    rating: 4.6,
    review_count: 210
  },
  {
    title: '강남역 앞 카페',
    address: '서울 강남구 강남동',
    category: '카페',
    rating: 4.3,
    review_count: 85
  },
  {
    title: '강남 일반 카페',
    address: '서울 강남구 강남동',
    category: '카페',
    rating: 3.9,
    review_count: 42
  },
  {
    title: '강남 학생 카페',
    address: '서울 강남구 강남동',
    category: '카페',
    rating: 3.5,
    review_count: 15
  },
  {
    title: '강남 편의점 카페',
    address: '서울 강남구 강남동',
    category: '카페',
    rating: 3.2,
    review_count: 8
  }
];

console.log('📌 샘플 데이터: 강남역 인근 카페 6개\n');

// 각 업체별 경쟁도 계산
console.log('💯 각 업체별 경쟁도 점수:\n');
const competitionScores = sampleCompetitors.map((competitor, idx) => {
  const score = calculateCompetitionScore(competitor, idx + 1);
  const barLength = Math.round(score / 50);
  const bar = '█'.repeat(barLength);
  
  console.log(`  ${(idx + 1).toString().padEnd(2)} ${competitor.title.padEnd(20)} ${bar} ${score}점`);
  console.log(`     평점: ${(competitor.rating || 0).toFixed(1)}, 리뷰: ${competitor.review_count || 0}개\n`);
  
  return score;
});

// 상권 경쟁 분석
console.log('\n📊 상권 경쟁 분석:\n');

const competitionAnalysis = analyzeCompetition(
  '강남역',
  '카페',
  sampleCompetitors,
  480 // 우리 경쟁도 점수 (평균보다 낮음)
);

console.log(`  상권: ${competitionAnalysis.micro_area}`);
console.log(`  카테고리: ${competitionAnalysis.category}`);
console.log(`  분석 업체: ${competitionAnalysis.analyzed_competitors}개\n`);

console.log(`  경쟁도 분포:`);
console.log(`    최저: ${competitionAnalysis.min_competition_score}점`);
console.log(`    평균: ${competitionAnalysis.avg_competition_score}점`);
console.log(`    최고: ${competitionAnalysis.max_competition_score}점`);
console.log(`    수준: ${competitionAnalysis.competition_level.toUpperCase()}\n`);

console.log(`  우리 위치:`);
console.log(`    경쟁도: ${competitionAnalysis.our_position.our_competition_score}점`);
console.log(`    상위: ${competitionAnalysis.our_position.percentile}%ile`);
console.log(`    평가: ${competitionAnalysis.our_position.advantage}\n`);

// 추천사항
console.log(`  📈 추천 전략:`);
competitionAnalysis.recommendation.forEach((rec, idx) => {
  console.log(`    ${idx + 1}. ${rec}`);
});

// 키워드 점수 조정
console.log('\n\n💡 경쟁 분석에 따른 키워드 점수 조정:\n');

const testScores = [
  { base: 75, desc: '일반 키워드' },
  { base: 85, desc: '특화 키워드' },
  { base: 65, desc: '기본 키워드' }
];

testScores.forEach(({ base, desc }) => {
  const adjustment = adjustKeywordScoreByCompetition(base, competitionAnalysis);
  
  console.log(`  ${desc}:`);
  console.log(`    기본 점수: ${base}`);
  console.log(`    조정 계수: ${adjustment.adjustment_factor.toFixed(3)}x`);
  console.log(`    조정 점수: ${adjustment.adjusted_score}`);
  console.log(`    사유: ${adjustment.reasoning}\n`);
});

// 상권별 분석 요약
console.log('\n📋 상권 분석 요약:\n');
console.log(summarizeCompetition(competitionAnalysis));

// 다른 상권 비교
console.log('\n\n🏙️  다양한 상권 경쟁도 비교:\n');

const competitorsByArea = {
  '홍대': 5,
  '강남역': 6,
  '신림': 3,
  '명동': 8,
  '광안리': 2
};

console.log('  상권별 경쟁 업체 수와 예상 경쟁도:');
console.log('  ─────────────────────────────');

Object.entries(competitorsByArea).forEach(([area, count]) => {
  // 업체 수에 따른 경쟁도 예상
  let estimatedCompetition = 'low';
  let estimatedScore = 350;
  
  if (count < 3) {
    estimatedCompetition = 'low';
    estimatedScore = 320;
  } else if (count < 5) {
    estimatedCompetition = 'medium';
    estimatedScore = 520;
  } else if (count < 7) {
    estimatedCompetition = 'high';
    estimatedScore = 680;
  } else {
    estimatedCompetition = 'very_high';
    estimatedScore = 800;
  }

  const barLength = Math.round(estimatedScore / 50);
  const bar = '█'.repeat(barLength);

  console.log(`  ${area.padEnd(12)} (${count}개) ${bar} ${estimatedScore}점 (${estimatedCompetition})`);
});

console.log('  ─────────────────────────────');

console.log('\n\n✨ 경쟁사 분석 통계:\n');

const avgCompetitors = Object.values(competitorsByArea).reduce((a, b) => a + b) / Object.keys(competitorsByArea).length;
console.log(`  평균 경쟁업체 수: ${avgCompetitors.toFixed(1)}개`);
console.log(`  경쟁이 가장 적은 상권: ${Object.entries(competitorsByArea).sort((a, b) => a[1] - b[1])[0][0]}`);
console.log(`  경쟁이 가장 많은 상권: ${Object.entries(competitorsByArea).sort((a, b) => b[1] - a[1])[0][0]}`);

console.log('\n✅ Phase 4 테스트 완료!\n');
