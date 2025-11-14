/**
 * 경쟁 업체 분석 시스템
 * 같은 상권의 경쟁 업체를 분석하여 상대적 경쟁력 파악
 * 
 * 기능:
 * 1. Naver Places API로 주변 업체 조회
 * 2. 각 업체의 경쟁도 계산
 * 3. 상권 평균 경쟁도 산출
 * 4. 우리 업체의 상대적 위치 파악
 */

export interface CompetitorInfo {
  title: string;                        // 업체명
  address: string;                      // 주소
  phone?: string;                       // 전화번호
  category: string;                     // 카테고리
  rating?: number;                      // 평점 (1.0~5.0)
  review_count?: number;               // 리뷰 수
}

export interface CompetitionAnalysis {
  micro_area: string;                   // 미시상권
  category: string;                     // 카테고리
  total_competitors: number;            // 전체 경쟁 업체 수
  analyzed_competitors: number;         // 분석된 업체 수
  avg_competition_score: number;        // 평균 경쟁도 (0~1000)
  min_competition_score: number;        // 최저 경쟁도
  max_competition_score: number;        // 최고 경쟁도
  competition_level: 'low' | 'medium' | 'high'; // 상권 경쟁도 수준
  top_competitors: CompetitorInfo[];    // 상위 경쟁업체
  our_position: {
    our_competition_score: number;      // 우리 경쟁도 점수
    percentile: number;                 // 상위 백분위수 (0~100, 낮을수록 경쟁도 낮음)
    advantage: string;                  // 경쟁력 평가
  };
  recommendation: string[];             // 추천사항
}

/**
 * Naver Places API 응답에서 경쟁도 계산
 * (실제로는 Naver API에서 광고/순위 정보를 기반으로 계산)
 */
export function calculateCompetitionScore(competitor: CompetitorInfo, rank: number): number {
  // 경쟁도 계산 규칙:
  // - 순위(rank): 낮을수록 경쟁도 높음
  // - 리뷰 수: 많을수록 경쟁도 높음
  // - 평점: 높을수록 경쟁도 높음
  
  let score = 500; // 기본값

  // 순위에 따른 조정 (top 10은 경쟁도 높음)
  score += Math.max(0, (10 - rank) * 30);

  // 리뷰 수에 따른 조정
  const reviewCount = competitor.review_count || 0;
  if (reviewCount > 100) score += 150;
  else if (reviewCount > 50) score += 100;
  else if (reviewCount > 20) score += 50;

  // 평점에 따른 조정
  const rating = competitor.rating || 3.5;
  score += (rating - 2.5) * 50; // 2.5 기준으로 상하 조정

  return Math.min(1000, Math.max(100, score)); // 100~1000 범위
}

/**
 * 상권별 경쟁 분석
 */
export function analyzeCompetition(
  micro_area: string,
  category: string,
  competitors: CompetitorInfo[],
  our_score?: number
): CompetitionAnalysis {
  const competitionScores = competitors.map((comp, idx) => 
    calculateCompetitionScore(comp, idx + 1)
  );

  const total = competitionScores.length;
  const avg = total > 0 ? competitionScores.reduce((a, b) => a + b, 0) / total : 0;
  const min = total > 0 ? Math.min(...competitionScores) : 0;
  const max = total > 0 ? Math.max(...competitionScores) : 0;

  // 경쟁도 수준 판단
  let competitionLevel: 'low' | 'medium' | 'high' = 'medium';
  if (avg < 400) competitionLevel = 'low';
  else if (avg > 650) competitionLevel = 'high';

  // 우리 경쟁도 점수 (기본값 제공 또는 입력값 사용)
  const ourCompScore = our_score || Math.round(avg * 0.8); // 평균의 80%로 가정

  // 백분위수 계산 (낮을수록 경쟁도 낮음 = 유리함)
  const sortedScores = [...competitionScores].sort((a, b) => a - b);
  const percentile = total > 0 
    ? (sortedScores.filter(s => s <= ourCompScore).length / total) * 100
    : 50;

  // 경쟁력 평가
  let advantage = '';
  if (percentile < 30) {
    advantage = '✅ 매우 유리한 위치 - 경쟁이 적은 상권입니다. 적극적인 마케팅 권장';
  } else if (percentile < 50) {
    advantage = '⭕ 다소 유리한 위치 - 평균보다 경쟁도가 낮습니다';
  } else if (percentile < 70) {
    advantage = '⭕ 중간 수준 - 평균 수준의 경쟁도입니다';
  } else {
    advantage = '⚠️ 고경쟁 상황 - 상권 내 경쟁이 높습니다. 차별화 전략 필요';
  }

  // 추천사항
  const recommendations: string[] = [];
  if (competitionLevel === 'low') {
    recommendations.push('경쟁도가 낮아 신규 진입에 유리합니다');
    recommendations.push('기본 키워드부터 적극적으로 타겟팅 가능');
    recommendations.push('상권 모든 고객층을 대상으로 마케팅 전개');
  } else if (competitionLevel === 'medium') {
    recommendations.push('동 + 서비스 조합 키워드에 집중');
    recommendations.push('상권 + 의도 키워드로 니치 공략');
    recommendations.push('리뷰와 평점 개선를 통한 경쟁력 강화');
  } else {
    recommendations.push('매우 세밀한 키워드 타겟팅 필요');
    recommendations.push('브랜드 + 지역 키워드로 포지셔닝');
    recommendations.push('특화 서비스나 프로모션으로 차별화');
    recommendations.push('상위권 경쟁사 분석 및 벤치마킹 권장');
  }

  return {
    micro_area,
    category,
    total_competitors: competitors.length,
    analyzed_competitors: competitors.length,
    avg_competition_score: Math.round(avg),
    min_competition_score: Math.round(min),
    max_competition_score: Math.round(max),
    competition_level: competitionLevel,
    top_competitors: competitors.slice(0, 5),
    our_position: {
      our_competition_score: ourCompScore,
      percentile: Math.round(percentile),
      advantage
    },
    recommendation: recommendations
  };
}

/**
 * 경쟁 분석 결과를 키워드 선정에 반영
 * (경쟁도 점수 조정)
 */
export function adjustKeywordScoreByCompetition(
  baseScore: number,
  analysis: CompetitionAnalysis
): { adjusted_score: number; adjustment_factor: number; reasoning: string } {
  const our = analysis.our_position.our_competition_score;
  const avg = analysis.avg_competition_score;

  // 우리 경쟁도가 평균보다 낮으면 보너스, 높으면 페널티
  const adjustmentFactor = 1 + ((avg - our) / avg) * 0.3; // ±30% 범위

  const adjustedScore = Math.round(baseScore * adjustmentFactor * 100) / 100;

  let reasoning = '';
  if (adjustmentFactor > 1.1) {
    reasoning = `이 상권은 평균 경쟁도 ${avg}인데, 우리는 ${our}으로 더 유리합니다. 키워드 점수 ${Math.round((adjustmentFactor - 1) * 100)}% 상향`;
  } else if (adjustmentFactor < 0.9) {
    reasoning = `이 상권은 평균 경쟁도 ${avg}인데, 우리는 ${our}으로 다소 불리합니다. 키워드 점수 ${Math.round((1 - adjustmentFactor) * 100)}% 하향`;
  } else {
    reasoning = '상권 내 경쟁도가 평균 수준입니다';
  }

  return {
    adjusted_score: adjustedScore,
    adjustment_factor: adjustmentFactor,
    reasoning
  };
}

/**
 * 상권별 경쟁 프로필 생성
 * (저장용 데이터 구조)
 */
export interface CompetitionProfile {
  micro_area: string;
  category: string;
  analysis_date: string;
  analysis: CompetitionAnalysis;
}

/**
 * 경쟁 프로필 저장소 (메모리 기반, 실제는 DB 사용)
 */
export const COMPETITION_PROFILES: Record<string, CompetitionProfile> = {};

/**
 * 경쟁 프로필 저장
 */
export function saveCompetitionProfile(profile: CompetitionProfile): void {
  const key = `${profile.micro_area}|${profile.category}`;
  COMPETITION_PROFILES[key] = profile;
}

/**
 * 경쟁 프로필 조회
 */
export function getCompetitionProfile(micro_area: string, category: string): CompetitionProfile | undefined {
  const key = `${micro_area}|${category}`;
  return COMPETITION_PROFILES[key];
}

/**
 * 경쟁 분석 결과 요약
 */
export function summarizeCompetition(analysis: CompetitionAnalysis): string {
  const lines = [
    `상권: ${analysis.micro_area}`,
    `카테고리: ${analysis.category}`,
    `상권 내 경쟁도: ${analysis.competition_level.toUpperCase()} (평균 ${analysis.avg_competition_score})`,
    `우리 위치: ${analysis.our_position.percentile}%ile (${analysis.our_position.our_competition_score}점)`,
    `${analysis.our_position.advantage}`
  ];

  return lines.join('\n');
}
