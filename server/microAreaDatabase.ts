/**
 * 미시상권 데이터베이스
 * 주요 도시의 동별 미시상권 정보 (확장 가능)
 */

export interface MicroAreaInfo {
  micro_areas: string[];           // 미시상권 이름들
  characteristics: string[];        // 특징
  confidence: 'high' | 'medium' | 'low';
}

export const MICRO_AREA_DATABASE: Record<string, Record<string, Record<string, MicroAreaInfo>>> = {
  // ========== 경기 ==========
  '경기': {
    // 광주시 (동별 상권 명확히 분리)
    '광주시': {
      '태전동': {
        micro_areas: ['태전지구'],  // 태전동의 고유 상권만
        characteristics: ['신도시', '신축 주거지역', '주거중심'],
        confidence: 'high'
      },
      '신동': {
        micro_areas: ['광주신도시', '신도시'],  // 신도시 영역은 신동에 집중
        characteristics: ['신도시', '상업지구', '유동인구'],
        confidence: 'high'
      },
      '광주동': {
        micro_areas: ['구광주', '광주 구도심'],  // 구도심은 광주동(원래 광주)
        characteristics: ['구도심', '전통 상권', '재래시장'],
        confidence: 'high'
      },
      '경안동': {
        micro_areas: ['경안동'],
        characteristics: ['주거', '상업'],
        confidence: 'medium'
      },
      '퇴촌면': {
        micro_areas: ['남서울'],
        characteristics: ['농촌지역', '자연'],
        confidence: 'medium'
      }
    },
    // 성남시
    '성남시': {
      '분당동': {
        micro_areas: ['분당신도시', '정자역'],
        characteristics: ['신도시', '유동인구 많음'],
        confidence: 'high'
      },
      '중동': {
        micro_areas: ['일산신도시'],
        characteristics: ['신도시'],
        confidence: 'high'
      },
      '수정구': {
        micro_areas: ['수정'],
        characteristics: ['주거지역'],
        confidence: 'medium'
      }
    },
    // 용인시
    '용인시': {
      '수지구': {
        micro_areas: ['용인신도시', '신갈', '수지'],
        characteristics: ['신도시', '상업지구'],
        confidence: 'high'
      },
      '기흥구': {
        micro_areas: ['기흥'],
        characteristics: ['공업지역', '상업지구'],
        confidence: 'medium'
      }
    }
  },

  // ========== 서울 ==========
  '서울': {
    // 강남구 (종로 순 정렬, 동 병합)
    '강남구': {
      '강남동': {
        micro_areas: ['강남역', '강남 중심부'],
        characteristics: ['강남 중심', '고급 상권'],
        confidence: 'high'
      },
      '논현동': {
        micro_areas: ['강남역', '논현거리'],
        characteristics: ['상업지구', '유흥가'],
        confidence: 'high'
      },
      '삼성동': {
        micro_areas: ['코엑스', '삼성'],
        characteristics: ['업무지구', '관광지'],
        confidence: 'high'
      },
      '역삼동': {
        micro_areas: ['테헤란로', '역삼'],
        characteristics: ['IT거리', '상업지구'],
        confidence: 'high'
      },
      '개포동': {
        micro_areas: ['개포'],
        characteristics: ['주거', '교육'],
        confidence: 'medium'
      },
      '대치동': {
        micro_areas: ['대치', '압구정'],
        characteristics: ['고급주거', '교육'],
        confidence: 'high'
      },
      '청담동': {
        micro_areas: ['청담', '압구정로'],
        characteristics: ['고급상권', '명품', '가로수길'],
        confidence: 'high'
      }
    },
    // 송파구 (동 병합)
    '송파구': {
      '잠실동': {
        micro_areas: ['잠실신도시', '롯데월드'],
        characteristics: ['신도시', '관광지', '쇼핑'],
        confidence: 'high'
      },
      '석촌동': {
        micro_areas: ['롯데월드', '석촌'],
        characteristics: ['관광지', '상업지구'],
        confidence: 'high'
      },
      '가락동': {
        micro_areas: ['가락시장'],
        characteristics: ['시장', '도매'],
        confidence: 'medium'
      },
      '방이동': {
        micro_areas: ['올림픽', '스포츠'],
        characteristics: ['스포츠', '관광'],
        confidence: 'medium'
      }
    },
    // 마포구
    '마포구': {
      '홍대입구동': {
        micro_areas: ['홍대', '홍대 앞'],
        characteristics: ['예술거리', '카페거리', 'K-문화'],
        confidence: 'high'
      },
      '서교동': {
        micro_areas: ['홍대', '상수'],
        characteristics: ['문화거리', '카페'],
        confidence: 'high'
      },
      '동교동': {
        micro_areas: ['홍대', '망원'],
        characteristics: ['주거', '카페거리'],
        confidence: 'high'
      }
    },
    // 중구
    '중구': {
      '명동동': {
        micro_areas: ['명동', '명동거리'],
        characteristics: ['쇼핑', '관광', '고급상권'],
        confidence: 'high'
      },
      '태평로동': {
        micro_areas: ['서울역', '중앙'],
        characteristics: ['교통허브', '상업지구'],
        confidence: 'high'
      }
    },
    // 강서구 (공항동 추가 유지)
    '강서구': {
      '공항동': {
        micro_areas: ['김포공항', '공항'],
        characteristics: ['교통허브', '상업지구'],
        confidence: 'high'
      },
      '가양동': {
        micro_areas: ['가양'],
        characteristics: ['주거', '상업'],
        confidence: 'medium'
      },
      '화곡동': {
        micro_areas: ['화곡'],
        characteristics: ['주거'],
        confidence: 'low'
      }
    },
    // 서초구
    '서초구': {
      '서초동': {
        micro_areas: ['서초', '강남역'],
        characteristics: ['비즈니스', '업무'],
        confidence: 'high'
      },
      '방배동': {
        micro_areas: ['방배'],
        characteristics: ['주거', '상업'],
        confidence: 'medium'
      }
    },
    // 종로구
    '종로구': {
      '종로동': {
        micro_areas: ['종로', '조계사'],
        characteristics: ['전통', '관광'],
        confidence: 'high'
      },
      '인사동': {
        micro_areas: ['인사동', '낙원상가'],
        characteristics: ['문화', '예술', '골동품'],
        confidence: 'high'
      }
    },
    // 용산구
    '용산구': {
      '이태원동': {
        micro_areas: ['이태원', '한강로'],
        characteristics: ['국제상권', '외국인', '식당'],
        confidence: 'high'
      },
      '한강로동': {
        micro_areas: ['이태원'],
        characteristics: ['상업'],
        confidence: 'medium'
      }
    },
    // 성동구
    '성동구': {
      '성수동': {
        micro_areas: ['성수', '성수벽화마을'],
        characteristics: ['카페', '문화', '핸드메이드'],
        confidence: 'high'
      }
    },
    // 광진구
    '광진구': {
      '구의동': {
        micro_areas: ['구의역', '아차산'],
        characteristics: ['주거', '상업'],
        confidence: 'medium'
      }
    },
    // 동대문구
    '동대문구': {
      '청계천로동': {
        micro_areas: ['청계천', '패션거리'],
        characteristics: ['패션', '도매', '쇼핑'],
        confidence: 'high'
      }
    },
    // 중랑구
    '중랑구': {
      '망우동': {
        micro_areas: ['망우'],
        characteristics: ['주거', '상업'],
        confidence: 'medium'
      }
    },
    // 양천구
    '양천구': {
      '목동': {
        micro_areas: ['목동', '목동아파트'],
        characteristics: ['주거', '교육'],
        confidence: 'medium'
      }
    },
    // 강동구
    '강동구': {
      '성내동': {
        micro_areas: ['강동'],
        characteristics: ['주거'],
        confidence: 'low'
      }
    },
    // 관악구
    '관악구': {
      '신림동': {
        micro_areas: ['신림', '학생거리'],
        characteristics: ['학생거리', '상업'],
        confidence: 'high'
      }
    },
    // 금천구
    '금천구': {
      '가산동': {
        micro_areas: ['가산디지털단지'],
        characteristics: ['IT', '업무'],
        confidence: 'high'
      }
    },
    // 구로구
    '구로구': {
      '디지털로동': {
        micro_areas: ['구로디지털단지'],
        characteristics: ['IT', '업무'],
        confidence: 'high'
      }
    },
    // 동작구
    '동작구': {
      '흑석동': {
        micro_areas: ['중앙대학교'],
        characteristics: ['교육', '학생'],
        confidence: 'medium'
      }
    },
    // 성북구
    '성북구': {
      '성북동': {
        micro_areas: ['성북'],
        characteristics: ['주거', '상업'],
        confidence: 'medium'
      }
    },
    // 강북구
    '강북구': {
      '수유동': {
        micro_areas: ['수유'],
        characteristics: ['주거'],
        confidence: 'low'
      }
    },
    // 노원구
    '노원구': {
      '중계동': {
        micro_areas: ['중계'],
        characteristics: ['주거'],
        confidence: 'low'
      }
    },
    // 도봉구
    '도봉구': {
      '창동': {
        micro_areas: ['창동'],
        characteristics: ['주거'],
        confidence: 'low'
      }
    }
  },

  // ========== 부산 ==========
  '부산': {
    '부산진구': {
      '부전동': {
        micro_areas: ['부산진', '전포'],
        characteristics: ['상업지구', '젊은층'],
        confidence: 'high'
      },
      '동천동': {
        micro_areas: ['서면'],
        characteristics: ['상업지구'],
        confidence: 'high'
      },
      '초량동': {
        micro_areas: ['부산역', '초량'],
        characteristics: ['교통허브', '상업지구'],
        confidence: 'high'
      }
    },
    '남구': {
      '용호동': {
        micro_areas: ['광안리', '광안'],
        characteristics: ['해변', '관광지'],
        confidence: 'high'
      },
      '대연동': {
        micro_areas: ['광안리', '해변'],
        characteristics: ['해변', '관광'],
        confidence: 'high'
      }
    },
    '해운대구': {
      '우동': {
        micro_areas: ['우동', '센텀'],
        characteristics: ['신도시', '상업지구'],
        confidence: 'high'
      },
      '중동': {
        micro_areas: ['해운대', '마린시티'],
        characteristics: ['해변', '관광'],
        confidence: 'high'
      },
      '미포동': {
        micro_areas: ['미포'],
        characteristics: ['해변', '주거'],
        confidence: 'medium'
      }
    },
    '중구': {
      '대청동': {
        micro_areas: ['부산 중심', '청도'],
        characteristics: ['상업지구', '번화가'],
        confidence: 'high'
      }
    },
    '동구': {
      '좌천동': {
        micro_areas: ['범일동', '수정동'],
        characteristics: ['상업', '주거'],
        confidence: 'medium'
      }
    },
    '서구': {
      '동대신동': {
        micro_areas: ['부산항', '항만'],
        characteristics: ['항만', '상업'],
        confidence: 'medium'
      }
    },
    '금정구': {
      '부산대학교': {
        micro_areas: ['부산대학교', '대학거리'],
        characteristics: ['교육', '학생'],
        confidence: 'medium'
      }
    }
  },

  // ========== 인천 ==========
  '인천': {
    '중구': {
      '신포동': {
        micro_areas: ['차이나타운', '신포'],
        characteristics: ['관광지', '문화지구'],
        confidence: 'high'
      },
      '용동': {
        micro_areas: ['월미도', '용'],
        characteristics: ['관광지', '해변'],
        confidence: 'high'
      }
    },
    '연수구': {
      '송도동': {
        micro_areas: ['송도신도시', '송도', '센트럴파크'],
        characteristics: ['신도시', '첨단', '국제도시'],
        confidence: 'high'
      },
      '원인재동': {
        micro_areas: ['인천공항', '공항'],
        characteristics: ['교통허브', '상업지구'],
        confidence: 'high'
      }
    }
  },

  // ========== 대구 ==========
  '대구': {
    '중구': {
      '중앙동': {
        micro_areas: ['대구역', '동성로'],
        characteristics: ['상업지구', '번화가'],
        confidence: 'high'
      },
      '달성동': {
        micro_areas: ['이월드', '팔공산'],
        characteristics: ['관광지', '문화'],
        confidence: 'medium'
      }
    },
    '서구': {
      '내당동': {
        micro_areas: ['대구과학관'],
        characteristics: ['문화', '교육'],
        confidence: 'medium'
      },
      '평리동': {
        micro_areas: ['영남대학교'],
        characteristics: ['교육', '학생'],
        confidence: 'medium'
      }
    },
    '북구': {
      '침산동': {
        micro_areas: ['침산'],
        characteristics: ['상업', '주거'],
        confidence: 'medium'
      }
    },
    '달서구': {
      '두류동': {
        micro_areas: ['두류공원'],
        characteristics: ['공원', '휴양'],
        confidence: 'medium'
      }
    }
  },

  // ========== 대전 ==========
  '대전': {
    '유성구': {
      '대학동': {
        micro_areas: ['대전대학교', '과학로'],
        characteristics: ['교육지구', '상업지구'],
        confidence: 'high'
      },
      '봉명동': {
        micro_areas: ['유성온천', '온천'],
        characteristics: ['관광지', '휴양지'],
        confidence: 'high'
      },
      '노은동': {
        micro_areas: ['대덕연구단지'],
        characteristics: ['연구', '산업'],
        confidence: 'medium'
      }
    },
    '중구': {
      '중앙동': {
        micro_areas: ['대전역', '중앙로'],
        characteristics: ['상업지구', '번화가'],
        confidence: 'high'
      }
    },
    '동구': {
      '용전동': {
        micro_areas: ['용전'],
        characteristics: ['상업', '주거'],
        confidence: 'medium'
      }
    }
  },

  // ========== 광주 ==========
  '광주': {
    '동구': {
      '금남로동': {
        micro_areas: ['광주역', '금남로'],
        characteristics: ['상업지구', '번화가'],
        confidence: 'high'
      }
    },
    '북구': {
      '문흥동': {
        micro_areas: ['광주과학기술원', '과학동'],
        characteristics: ['교육지구', '신도시'],
        confidence: 'medium'
      }
    },
    '서구': {
      '광천동': {
        micro_areas: ['광천'],
        characteristics: ['상업', '주거'],
        confidence: 'medium'
      }
    }
  },

  // ========== 울산 ==========
  '울산': {
    '중구': {
      '태화동': {
        micro_areas: ['울산역', '중앙로'],
        characteristics: ['상업지구', '번화가'],
        confidence: 'high'
      },
      '성안동': {
        micro_areas: ['울산대학교'],
        characteristics: ['교육지구'],
        confidence: 'medium'
      }
    },
    '남구': {
      '삼호동': {
        micro_areas: ['울산공업'],
        characteristics: ['산업', '항만'],
        confidence: 'medium'
      }
    },
    '동구': {
      '일산동': {
        micro_areas: ['일산'],
        characteristics: ['상업', '주거'],
        confidence: 'medium'
      }
    }
  },

  // ========== 경남 (창원) ==========
  '경남': {
    '창원시': {
      '성산구': {
        micro_areas: ['창원역', '중앙동'],
        characteristics: ['상업지구', '번화가'],
        confidence: 'high'
      },
      '의창구': {
        micro_areas: ['창원'],
        characteristics: ['상업', '주거'],
        confidence: 'medium'
      }
    }
  },

  // ========== 경북 (포항) ==========
  '경북': {
    '포항시': {
      '북구': {
        micro_areas: ['포항역', '중앙로'],
        characteristics: ['상업지구', '번화가'],
        confidence: 'high'
      }
    }
  }
};

/**
 * 미시상권 조회 함수
 */
export function getMicroArea(city: string, district: string, dong: string | undefined): string | undefined {
  if (!dong) return undefined;

  const cityData = MICRO_AREA_DATABASE[city];
  if (!cityData) return undefined;

  const districtData = cityData[district];
  if (!districtData) return undefined;

  const dongData = districtData[dong];
  if (!dongData || !dongData.micro_areas || dongData.micro_areas.length === 0) return undefined;

  return dongData.micro_areas[0];
}

/**
 * 모든 미시상권 리스트 조회
 */
export function getAllMicroAreas(city: string, district: string, dong: string | undefined): string[] {
  if (!dong) return [];

  const cityData = MICRO_AREA_DATABASE[city];
  if (!cityData) return [];

  const districtData = cityData[district];
  if (!districtData) return [];

  const dongData = districtData[dong];
  if (!dongData) return [];

  return dongData.micro_areas || [];
}
