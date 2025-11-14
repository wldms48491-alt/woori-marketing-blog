/**
 * 계절/트렌드 데이터베이스
 * 월별, 시간대별 검색량 변동을 반영하여 키워드 점수 조정
 * 
 * 규칙:
 * - 월별 트렌드: 카테고리별로 검색량이 변함 (1월~12월)
 * - 시간대별: 평일/주말, 아침/점심/저녁 등
 * - 업종별 변동성: 카테고리마다 다른 패턴
 */

export interface SeasonalTrend {
  month: number;                         // 1~12월
  demand_multiplier: number;             // 수요 배율 (1.0 = 기준)
  search_volume_adjustment: number;      // 검색량 조정값 (절대값)
  description: string;                   // 설명
}

export interface TimeBasedTrend {
  period: string;                        // '평일_아침' | '평일_점심' | '평일_저녁' | '주말_전체' 등
  demand_multiplier: number;             // 수요 배율
  description: string;
}

export interface CategorySeasonalPattern {
  category_keywords: string[];           // 해당 카테고리의 주요 키워드
  seasonal_trends: SeasonalTrend[];      // 월별 트렌드
  time_based_trends: TimeBasedTrend[];   // 시간대별 트렌드
  peak_seasons: string[];                // 성수기
  low_seasons: string[];                 // 비수기
  volatility: 'low' | 'medium' | 'high'; // 변동성
}

export const SEASONAL_TREND_DATABASE: Record<string, CategorySeasonalPattern> = {
  // ========== 카페 ==========
  'cafe|카페': {
    category_keywords: ['카페', '카페숍', '커피숍', 'cafe', 'coffee'],
    seasonal_trends: [
      { month: 1, demand_multiplier: 0.8, search_volume_adjustment: -100, description: '겨울 추위로 인한 수요↓' },
      { month: 2, demand_multiplier: 0.85, search_volume_adjustment: -80, description: '겨울 끝자락, 점진적 증가' },
      { month: 3, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '봄 시작, 기준점' },
      { month: 4, demand_multiplier: 1.15, search_volume_adjustment: 150, description: '봄 벚꽃 시즌, 야외활동 증가' },
      { month: 5, demand_multiplier: 1.2, search_volume_adjustment: 200, description: '봄 피크, 신학기' },
      { month: 6, demand_multiplier: 1.05, search_volume_adjustment: 100, description: '여름 시작, 아이스 음료 수요' },
      { month: 7, demand_multiplier: 1.1, search_volume_adjustment: 150, description: '여름 본격화, 아이스 카페 인기' },
      { month: 8, demand_multiplier: 1.15, search_volume_adjustment: 200, description: '휴가철, 여름 피크' },
      { month: 9, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '가을 시작, 정상화' },
      { month: 10, demand_multiplier: 1.2, search_volume_adjustment: 200, description: '가을 단풍, 실내 활동 증가' },
      { month: 11, demand_multiplier: 1.1, search_volume_adjustment: 150, description: '늦가을, 따뜻한 음료 인기' },
      { month: 12, demand_multiplier: 0.9, search_volume_adjustment: -50, description: '연말 바쁜 시즌, 쇼핑 우선' }
    ],
    time_based_trends: [
      { period: '평일_아침', demand_multiplier: 1.3, description: '출근길 커피 수요' },
      { period: '평일_점심', demand_multiplier: 1.5, description: '점심 카페 방문 피크' },
      { period: '평일_저녁', demand_multiplier: 1.2, description: '업무 후 카페' },
      { period: '주말_오전', demand_multiplier: 1.4, description: '주말 여유로운 아침' },
      { period: '주말_오후', demand_multiplier: 1.8, description: '주말 최고 피크' }
    ],
    peak_seasons: ['4월', '5월', '8월', '10월'],
    low_seasons: ['1월', '2월', '12월'],
    volatility: 'high'
  },

  // ========== 세차 ==========
  'wash|세차|자동차세차': {
    category_keywords: ['세차', '자동차세차', '스팀세차', '세차장'],
    seasonal_trends: [
      { month: 1, demand_multiplier: 0.7, search_volume_adjustment: -150, description: '겨울 추위, 세차 수요↓' },
      { month: 2, demand_multiplier: 0.8, search_volume_adjustment: -100, description: '겨울 지속' },
      { month: 3, demand_multiplier: 1.3, search_volume_adjustment: 250, description: '봄맞이 세차 성수기 시작' },
      { month: 4, demand_multiplier: 1.5, search_volume_adjustment: 350, description: '황사/봄날씨, 세차 성수기' },
      { month: 5, demand_multiplier: 1.2, search_volume_adjustment: 200, description: '봄 연장' },
      { month: 6, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '기준점' },
      { month: 7, demand_multiplier: 0.9, search_volume_adjustment: -100, description: '장마철, 세차 수요 감소' },
      { month: 8, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '여름 햇빛' },
      { month: 9, demand_multiplier: 1.2, search_volume_adjustment: 150, description: '가을 준비' },
      { month: 10, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '가을 정상' },
      { month: 11, demand_multiplier: 0.8, search_volume_adjustment: -100, description: '겨울 준비' },
      { month: 12, demand_multiplier: 0.6, search_volume_adjustment: -200, description: '겨울 추위' }
    ],
    time_based_trends: [
      { period: '평일_오후', demand_multiplier: 1.2, description: '퇴근길 세차' },
      { period: '주말_오후', demand_multiplier: 2.0, description: '주말 최고 성수' }
    ],
    peak_seasons: ['3월', '4월', '5월'],
    low_seasons: ['1월', '2월', '7월', '12월'],
    volatility: 'high'
  },

  // ========== 헬스장 ==========
  'gym|헬스|피트니스': {
    category_keywords: ['헬스장', '헬스', '피트니스', '헬스클럽'],
    seasonal_trends: [
      { month: 1, demand_multiplier: 2.0, search_volume_adjustment: 1000, description: '새해 결심, 최고 성수기' },
      { month: 2, demand_multiplier: 1.3, search_volume_adjustment: 300, description: '신년 열정 지속' },
      { month: 3, demand_multiplier: 0.9, search_volume_adjustment: -100, description: '기본체력 충전' },
      { month: 4, demand_multiplier: 0.8, search_volume_adjustment: -150, description: '봄나들이 우선' },
      { month: 5, demand_multiplier: 0.7, search_volume_adjustment: -200, description: '여름 준비보다 야외활동' },
      { month: 6, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '정상화' },
      { month: 7, demand_multiplier: 0.8, search_volume_adjustment: -150, description: '휴가철' },
      { month: 8, demand_multiplier: 0.9, search_volume_adjustment: -100, description: '무더위' },
      { month: 9, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '가을 시작' },
      { month: 10, demand_multiplier: 1.2, search_volume_adjustment: 150, description: '활동적인 날씨' },
      { month: 11, demand_multiplier: 1.3, search_volume_adjustment: 200, description: '겨울 준비' },
      { month: 12, demand_multiplier: 1.5, search_volume_adjustment: 400, description: '연말, 새해 준비 시작' }
    ],
    time_based_trends: [
      { period: '평일_아침', demand_multiplier: 1.3, description: '새벽 운동' },
      { period: '평일_저녁', demand_multiplier: 1.8, description: '퇴근 후 헬스, 최고 피크' },
      { period: '주말_오전', demand_multiplier: 1.4, description: '주말 아침 운동' }
    ],
    peak_seasons: ['1월', '12월'],
    low_seasons: ['5월', '7월'],
    volatility: 'high'
  },

  // ========== 식당 (음식점) ==========
  'restaurant|식당|음식점': {
    category_keywords: ['식당', '음식점', '레스토랑', '밥집'],
    seasonal_trends: [
      { month: 1, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '기준점' },
      { month: 2, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 3, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '봄 나들이' },
      { month: 4, demand_multiplier: 1.2, search_volume_adjustment: 150, description: '벚꽃 시즌' },
      { month: 5, demand_multiplier: 1.15, search_volume_adjustment: 100, description: '계속 높음' },
      { month: 6, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '기준점' },
      { month: 7, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '휴가철 음식점 찾기' },
      { month: 8, demand_multiplier: 1.15, search_volume_adjustment: 150, description: '여름 휴가' },
      { month: 9, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '정상화' },
      { month: 10, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '가을 단풍' },
      { month: 11, demand_multiplier: 1.2, search_volume_adjustment: 150, description: '나들이 계절' },
      { month: 12, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '연말 모임' }
    ],
    time_based_trends: [
      { period: '평일_점심', demand_multiplier: 2.0, description: '점심 시간대 최고 피크' },
      { period: '평일_저녁', demand_multiplier: 1.5, description: '저녁 시간대 높음' },
      { period: '주말_오후', demand_multiplier: 1.8, description: '주말 식사' }
    ],
    peak_seasons: ['4월', '5월', '7월', '8월'],
    low_seasons: ['2월'],
    volatility: 'medium'
  },

  // ========== 미용실 ==========
  'hair|미용|헤어': {
    category_keywords: ['미용실', '헤어', '헤어샵', '이발소'],
    seasonal_trends: [
      { month: 1, demand_multiplier: 1.2, search_volume_adjustment: 150, description: '신년 이미지 변화' },
      { month: 2, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '정상화' },
      { month: 3, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '봄 시즌 준비' },
      { month: 4, demand_multiplier: 1.2, search_volume_adjustment: 150, description: '봄 스타일 변경' },
      { month: 5, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '계속 높음' },
      { month: 6, demand_multiplier: 0.9, search_volume_adjustment: -100, description: '여름 준비' },
      { month: 7, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '정상' },
      { month: 8, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 9, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '가을 이미지 체인지' },
      { month: 10, demand_multiplier: 1.2, search_volume_adjustment: 150, description: '가을 스타일' },
      { month: 11, demand_multiplier: 1.1, search_volume_adjustment: 100, description: '계속 높음' },
      { month: 12, demand_multiplier: 1.3, search_volume_adjustment: 200, description: '연말 준비' }
    ],
    time_based_trends: [
      { period: '평일_저녁', demand_multiplier: 1.3, description: '퇴근 후 방문' },
      { period: '주말', demand_multiplier: 1.6, description: '주말 최고 피크' }
    ],
    peak_seasons: ['1월', '4월', '10월', '12월'],
    low_seasons: ['6월'],
    volatility: 'medium'
  },

  // ========== 치과 ==========
  'dental|치과': {
    category_keywords: ['치과', '치과의원', '치과진료'],
    seasonal_trends: [
      { month: 1, demand_multiplier: 1.2, search_volume_adjustment: 100, description: '새해 건강검진' },
      { month: 2, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '기준점' },
      { month: 3, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 4, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 5, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 6, demand_multiplier: 1.1, search_volume_adjustment: 50, description: '여름 전 치료' },
      { month: 7, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 8, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 9, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 10, demand_multiplier: 1.0, search_volume_adjustment: 0, description: '안정적' },
      { month: 11, demand_multiplier: 1.1, search_volume_adjustment: 50, description: '겨울 전 치료' },
      { month: 12, demand_multiplier: 1.2, search_volume_adjustment: 100, description: '연말 치료' }
    ],
    time_based_trends: [
      { period: '평일_점심', demand_multiplier: 1.2, description: '점심 시간 내원' },
      { period: '평일_저녁', demand_multiplier: 1.3, description: '저녁 시간 내원' }
    ],
    peak_seasons: ['1월', '12월'],
    low_seasons: [],
    volatility: 'low'
  }
};

/**
 * 카테고리 키워드로부터 계절 트렌드 조회
 */
export function getSeasonalPattern(category: string | undefined): CategorySeasonalPattern | undefined {
  if (!category) return undefined;

  const lowerCategory = category.toLowerCase();
  
  for (const [key, pattern] of Object.entries(SEASONAL_TREND_DATABASE)) {
    const keywords = key.split('|').map(k => k.toLowerCase());
    if (keywords.some(k => lowerCategory.includes(k) || k.includes(lowerCategory))) {
      return pattern;
    }
  }

  return undefined;
}

/**
 * 특정 월의 계절 트렌드 조회
 */
export function getMonthlyTrend(month: number, pattern: CategorySeasonalPattern): SeasonalTrend | undefined {
  if (month < 1 || month > 12) return undefined;
  return pattern.seasonal_trends.find(t => t.month === month);
}

/**
 * 현재 월 기준 경고문 생성
 */
export function generateSeasonalWarning(category: string | undefined, month: number): string {
  const pattern = getSeasonalPattern(category);
  if (!pattern) return '';

  const trend = getMonthlyTrend(month, pattern);
  if (!trend) return '';

  if (trend.demand_multiplier > 1.3) {
    return `✨ ${month}월은 이 업종의 성수기입니다! 검색량이 ${Math.round((trend.demand_multiplier - 1) * 100)}% 증가합니다. (${trend.description})`;
  }
  if (trend.demand_multiplier < 0.8) {
    return `⚠️ ${month}월은 이 업종의 비수기입니다. 검색량이 ${Math.round((1 - trend.demand_multiplier) * 100)}% 감소합니다. (${trend.description})`;
  }

  return '';
}

/**
 * 키워드 점수에 계절 보정 적용
 */
export function applySeasonalAdjustment(
  baseScore: number,
  category: string | undefined,
  month: number
): { adjusted_score: number; multiplier: number; warning: string } {
  const pattern = getSeasonalPattern(category);
  if (!pattern) {
    return { adjusted_score: baseScore, multiplier: 1.0, warning: '' };
  }

  const trend = getMonthlyTrend(month, pattern);
  if (!trend) {
    return { adjusted_score: baseScore, multiplier: 1.0, warning: '' };
  }

  const adjustedScore = baseScore * trend.demand_multiplier;
  const warning = generateSeasonalWarning(category, month);

  return {
    adjusted_score: Math.round(adjustedScore * 100) / 100,
    multiplier: trend.demand_multiplier,
    warning
  };
}
