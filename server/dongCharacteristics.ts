/**
 * 동별 특성 분석 데이터베이스
 * 각 동의 도시 특성, 발전 단계, 타겟 인구를 정의
 * 
 * 특성 분류:
 * - 신도시: 최근 개발, 신축, 현대적 (서울신도시, 판교 등)
 * - 구도심: 오래된 지역, 전통적, 재개발 추진 (종로, 중구 등)
 * - 상업중심: 점포/음식점 위주 (강남역, 홍대 등)
 * - 주거중심: 아파트/주택 위주 (목동, 대치 등)
 * - 관광지: 방문객 많음 (명동, 광안리 등)
 * - 산업/항만: 공장/항만 지역
 * - 교육지구: 대학교/학원 많음 (신림, 대학동 등)
 */

export type DongCharacteristicType = 
  | '신도시' 
  | '구도심' 
  | '상업중심' 
  | '주거중심' 
  | '관광지' 
  | '산업/항만' 
  | '교육지구'
  | '문화지구';


export type DevelopmentStage = 
  | '준공' 
  | '5년' 
  | '10년' 
  | '20년이상';

export type TargetDemographic = 
  | '영유아'
  | '학생'
  | '직장인'
  | '대학생'
  | '청년'
  | '가족'
  | '노년'
  | '외국인'
  | '관광객'
  | '혼합'
  | '예술가';


export interface DongCharacteristic {
  characteristics: DongCharacteristicType[];    // 동의 특성 (복수)
  development_stage: DevelopmentStage;           // 개발 단계
  target_demographics: TargetDemographic[];      // 타겟 인구 (복수)
  avg_income_level: 'low' | 'medium' | 'high';  // 소득 수준
  business_competition: 'low' | 'medium' | 'high'; // 사업 경쟁도
  confidence: 'high' | 'medium' | 'low';        // 분석 신뢰도
}

export const DONG_CHARACTERISTICS_DATABASE: Record<string, Record<string, Record<string, DongCharacteristic>>> = {
  // ========== 서울 ==========
  '서울': {
    // 강남구
    '강남구': {
      '강남동': {
        characteristics: ['상업중심'],
        development_stage: '20년이상',
        target_demographics: ['직장인', '청년', '외국인'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      },
      '논현동': {
        characteristics: ['상업중심', '구도심'],
        development_stage: '20년이상',
        target_demographics: ['직장인', '청년'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      },
      '삼성동': {
        characteristics: ['상업중심', '관광지'],
        development_stage: '20년이상',
        target_demographics: ['직장인', '관광객'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      },
      '역삼동': {
        characteristics: ['상업중심'],
        development_stage: '20년이상',
        target_demographics: ['직장인', '청년', '학생'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      },
      '대치동': {
        characteristics: ['주거중심'],
        development_stage: '10년',
        target_demographics: ['가족', '학생'],
        avg_income_level: 'high',
        business_competition: 'medium',
        confidence: 'high'
      },
      '청담동': {
        characteristics: ['상업중심', '주거중심'],
        development_stage: '10년',
        target_demographics: ['청년', '가족'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      }
    },
    // 송파구
    '송파구': {
      '잠실동': {
        characteristics: ['신도시', '상업중심'],
        development_stage: '5년',
        target_demographics: ['가족', '관광객', '청년'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      },
      '석촌동': {
        characteristics: ['관광지', '상업중심'],
        development_stage: '10년',
        target_demographics: ['가족', '관광객'],
        avg_income_level: 'high',
        business_competition: 'medium',
        confidence: 'high'
      },
      '가락동': {
        characteristics: ['상업중심'],
        development_stage: '20년이상',
        target_demographics: ['직장인', '가족'],
        avg_income_level: 'medium',
        business_competition: 'medium',
        confidence: 'medium'
      }
    },
    // 마포구
    '마포구': {
      '홍대입구동': {
        characteristics: ['상업중심', '문화지구'],
        development_stage: '10년',
        target_demographics: ['청년', '대학생', '관광객'],
        avg_income_level: 'medium',
        business_competition: 'high',
        confidence: 'high'
      },
      '서교동': {
        characteristics: ['상업중심'],
        development_stage: '10년',
        target_demographics: ['청년', '예술가'],
        avg_income_level: 'medium',
        business_competition: 'high',
        confidence: 'high'
      }
    },
    // 중구
    '중구': {
      '명동동': {
        characteristics: ['상업중심', '관광지'],
        development_stage: '20년이상',
        target_demographics: ['관광객', '청년', '외국인'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      },
      '태평로동': {
        characteristics: ['상업중심'],
        development_stage: '20년이상',
        target_demographics: ['직장인', '관광객'],
        avg_income_level: 'medium',
        business_competition: 'high',
        confidence: 'medium'
      }
    },
    // 종로구
    '종로구': {
      '종로동': {
        characteristics: ['구도심', '관광지'],
        development_stage: '20년이상',
        target_demographics: ['관광객', '노년'],
        avg_income_level: 'low',
        business_competition: 'medium',
        confidence: 'medium'
      },
      '인사동': {
        characteristics: ['상업중심', '문화지구'],
        development_stage: '20년이상',
        target_demographics: ['관광객', '예술가'],
        avg_income_level: 'medium',
        business_competition: 'medium',
        confidence: 'high'
      }
    },
    // 용산구
    '용산구': {
      '이태원동': {
        characteristics: ['상업중심', '관광지'],
        development_stage: '10년',
        target_demographics: ['외국인', '청년', '관광객'],
        avg_income_level: 'medium',
        business_competition: 'high',
        confidence: 'high'
      }
    },
    // 성동구
    '성동구': {
      '성수동': {
        characteristics: ['상업중심', '문화지구'],
        development_stage: '10년',
        target_demographics: ['청년', '예술가'],
        avg_income_level: 'medium',
        business_competition: 'high',
        confidence: 'high'
      }
    },
    // 관악구
    '관악구': {
      '신림동': {
        characteristics: ['교육지구', '상업중심'],
        development_stage: '10년',
        target_demographics: ['대학생', '학생'],
        avg_income_level: 'low',
        business_competition: 'medium',
        confidence: 'high'
      }
    },
    // 금천구
    '금천구': {
      '가산동': {
        characteristics: ['산업/항만'],
        development_stage: '20년이상',
        target_demographics: ['직장인'],
        avg_income_level: 'medium',
        business_competition: 'low',
        confidence: 'medium'
      }
    }
  },

  // ========== 부산 ==========
  '부산': {
    '부산진구': {
      '부전동': {
        characteristics: ['상업중심'],
        development_stage: '10년',
        target_demographics: ['청년', '대학생'],
        avg_income_level: 'medium',
        business_competition: 'high',
        confidence: 'high'
      },
      '초량동': {
        characteristics: ['상업중심', '구도심'],
        development_stage: '20년이상',
        target_demographics: ['직장인'],
        avg_income_level: 'low',
        business_competition: 'medium',
        confidence: 'medium'
      }
    },
    '남구': {
      '용호동': {
        characteristics: ['관광지', '상업중심'],
        development_stage: '5년',
        target_demographics: ['관광객', '가족'],
        avg_income_level: 'medium',
        business_competition: 'high',
        confidence: 'high'
      }
    },
    '해운대구': {
      '우동': {
        characteristics: ['신도시', '상업중심'],
        development_stage: '5년',
        target_demographics: ['직장인', '가족'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      },
      '중동': {
        characteristics: ['관광지', '신도시'],
        development_stage: '10년',
        target_demographics: ['관광객', '가족'],
        avg_income_level: 'high',
        business_competition: 'high',
        confidence: 'high'
      }
    }
  },

  // ========== 인천 ==========
  '인천': {
    '중구': {
      '신포동': {
        characteristics: ['관광지', '상업중심'],
        development_stage: '10년',
        target_demographics: ['관광객', '외국인'],
        avg_income_level: 'medium',
        business_competition: 'medium',
        confidence: 'high'
      }
    },
    '연수구': {
      '송도동': {
        characteristics: ['신도시'],
        development_stage: '5년',
        target_demographics: ['직장인', '가족'],
        avg_income_level: 'high',
        business_competition: 'medium',
        confidence: 'high'
      }
    }
  },

  // ========== 대구 ==========
  '대구': {
    '중구': {
      '중앙동': {
        characteristics: ['상업중심'],
        development_stage: '10년',
        target_demographics: ['직장인', '청년'],
        avg_income_level: 'medium',
        business_competition: 'high',
        confidence: 'high'
      }
    }
  },

  // ========== 대전 ==========
  '대전': {
    '유성구': {
      '대학동': {
        characteristics: ['교육지구', '신도시'],
        development_stage: '5년',
        target_demographics: ['학생', '대학생'],
        avg_income_level: 'medium',
        business_competition: 'medium',
        confidence: 'high'
      },
      '봉명동': {
        characteristics: ['관광지'],
        development_stage: '10년',
        target_demographics: ['관광객', '가족'],
        avg_income_level: 'medium',
        business_competition: 'low',
        confidence: 'medium'
      }
    }
  },

  // ========== 광주 ==========
  '광주': {
    '동구': {
      '금남로동': {
        characteristics: ['상업중심'],
        development_stage: '10년',
        target_demographics: ['직장인', '청년'],
        avg_income_level: 'medium',
        business_competition: 'medium',
        confidence: 'high'
      }
    }
  },

  // ========== 울산 ==========
  '울산': {
    '중구': {
      '태화동': {
        characteristics: ['상업중심'],
        development_stage: '10년',
        target_demographics: ['직장인', '청년'],
        avg_income_level: 'medium',
        business_competition: 'medium',
        confidence: 'high'
      }
    }
  }
};

/**
 * 동별 특성 조회 함수
 */
export function getDongCharacteristics(
  city: string, 
  district: string, 
  dong: string | undefined
): DongCharacteristic | undefined {
  if (!dong) return undefined;

  const cityData = DONG_CHARACTERISTICS_DATABASE[city];
  if (!cityData) return undefined;

  const districtData = cityData[district];
  if (!districtData) return undefined;

  return districtData[dong];
}

/**
 * 동의 특성을 문자열로 변환
 */
export function formatCharacteristics(characteristics: DongCharacteristicType[]): string {
const desc: Record<DongCharacteristicType, string> = {
    '신도시': '최신식 신도시 - 현대적 서비스 선호',
    '구도심': '전통적 도심 - 기본 서비스 수요',
    '상업중심': '상권이 발달한 지역 - 높은 경쟁',
    '주거중심': '주거 밀집 지역 - 안정적 수요',
    '관광지': '방문객 많은 지역 - 계절 변동 큼',
    '산업/항만': '산업 지역 - 근로자 중심',
    '교육지구': '교육시설 많음 - 학생/학부모 중심',
    '문화지구': '문화·예술 특화 지역 - 트렌디 콘텐츠 수요'
  };

  return characteristics.map((c) => desc[c]).join(', ');
}

/**
 * 동의 특성에 따른 키워드 생성 보정값
 * (상대적 경쟁도, 검색량 조정)
 */
export function getCharacteristicAdjustments(
  characteristics: DongCharacteristicType[]
): { competition_adjustment: number; demand_adjustment: number } {
  // 특성별 경쟁도, 수요 보정값
  let competitionAdj = 0;  // 경쟁도: 음수일수록 경쟁 낮음
  let demandAdj = 0;       // 수요: 양수일수록 검색량 높음

  characteristics.forEach((c) => {
    switch (c) {
      case '신도시':
        competitionAdj -= 10; // 경쟁도 낮음
        demandAdj += 20;      // 수요 높음
        break;
      case '구도심':
        competitionAdj += 5;  // 경쟁도 중간
        demandAdj -= 10;      // 수요 낮음
        break;
      case '상업중심':
        competitionAdj += 20; // 경쟁도 높음
        demandAdj += 30;      // 수요 매우 높음
        break;
      case '주거중심':
        competitionAdj -= 5;  // 경쟁도 낮음
        demandAdj += 10;      // 수요 안정적
        break;
      case '관광지':
        competitionAdj += 10; // 경쟁도 중간
        demandAdj += 40;      // 수요 매우 높음 (계절)
        break;
      case '산업/항만':
        competitionAdj -= 15; // 경쟁도 낮음
        demandAdj += 5;       // 수요 낮음
        break;
      case '교육지구':
        competitionAdj -= 5;  // 경쟁도 낮음
        demandAdj += 25;      // 수요 높음 (학생)
        break;
    }
  });

  return {
    competition_adjustment: competitionAdj,
    demand_adjustment: demandAdj
  };
}
