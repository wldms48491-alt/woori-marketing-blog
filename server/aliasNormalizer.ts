/**
 * 위치 약칭 정규화 엔진
 * "홍대", "분당", "강남역" 등의 약칭을 정규 지명으로 변환
 */

export interface AliasMappingItem {
  aliases: string[];
  canonical: {
    city: string;
    district: string;
  };
  microPoi?: string;
}

/**
 * 100+ 약칭 매핑 테이블
 * 서울, 부산, 경기도 중심으로 구성
 */
export const aliasDatabase: AliasMappingItem[] = [
  // 서울 - 마포구
  {
    aliases: ['홍대', '홍대입구', '홍대입구역', '홍대동', '홍대문화거리', '합정', '합정역'],
    canonical: { city: '서울', district: '마포' },
    microPoi: '홍대동'
  },
  {
    aliases: ['망원', '망원동', '망원역'],
    canonical: { city: '서울', district: '마포' },
    microPoi: '망원동'
  },

  // 서울 - 강남구
  {
    aliases: ['강남역', '강남역사거리', '강남역 로데오', '신사동', '신사동 가로수길', '가로수길'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '강남역'
  },
  {
    aliases: ['역삼', '역삼동', '테헤란로'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '역삼동'
  },

  // 서울 - 송파구
  {
    aliases: ['잠실', '잠실동', '잠실역', '올림픽공원'],
    canonical: { city: '서울', district: '송파' },
    microPoi: '잠실동'
  },

  // 서울 - 종로구
  {
    aliases: ['명동', '명동역', '명동성당'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '명동'
  },

  // 서울 - 중구
  {
    aliases: ['충무로', '충무로역', '을지로'],
    canonical: { city: '서울', district: '중구' },
    microPoi: '충무로'
  },

  // 서울 - 영등포구
  {
    aliases: ['여의도', '여의동', '여의나루역'],
    canonical: { city: '서울', district: '영등포' },
    microPoi: '여의동'
  },

  // 서울 - 서초구
  {
    aliases: ['서초', '서초동', '서초역'],
    canonical: { city: '서울', district: '서초' },
    microPoi: '서초동'
  },

  // 서울 - 구로구
  {
    aliases: ['신도림', '신도림역', '구로동'],
    canonical: { city: '서울', district: '구로' },
    microPoi: '신도림동'
  },

  // 서울 - 종로구
  {
    aliases: ['시청', '시청역'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '시청동'
  },

  // 부산 - 부산진구
  {
    aliases: ['서면', '서면역', '시청광장'],
    canonical: { city: '부산', district: '부산진' },
    microPoi: '서면동'
  },

  // 부산 - 해운대구
  {
    aliases: ['해운대', '해운대역', '해운대해수욕장'],
    canonical: { city: '부산', district: '해운대' },
    microPoi: '해운대동'
  },

  // 부산 - 중구
  {
    aliases: ['부산중심', '부산 중심'],
    canonical: { city: '부산', district: '중구' },
    microPoi: '광복동'
  },

  // 경기 - 성남 (분당)
  {
    aliases: ['분당', '분당동', '분당신도시', '분당역', '판교', '판교역', '판교테크노밸리', '서현', '서현역', '서현동', '분당 서현', '서현 역'],
    canonical: { city: '경기', district: '성남' },
    microPoi: '분당동'
  },

  // 경기 - 수원
  {
    aliases: ['수원', '수원역', '수원 중심'],
    canonical: { city: '경기', district: '수원' },
    microPoi: '영동'
  },

  // 경기 - 고양 (일산)
  {
    aliases: ['일산', '일산역', '일산신도시'],
    canonical: { city: '경기', district: '고양' },
    microPoi: '일산동'
  },

  // 경기 - 안양
  {
    aliases: ['안양', '안양역'],
    canonical: { city: '경기', district: '안양' },
    microPoi: '만안구'
  },

  // 경기 - 부천
  {
    aliases: ['부천', '부천역'],
    canonical: { city: '경기', district: '부천' },
    microPoi: '소사구'
  },

  // 경기 - 의정부
  {
    aliases: ['의정부', '의정부역'],
    canonical: { city: '경기', district: '의정부' },
    microPoi: '의정부동'
  },

  // 경기 - 하남 (미사)
  {
    aliases: ['미사', '미사신도시', '미사역'],
    canonical: { city: '경기', district: '하남' },
    microPoi: '미사동'
  },

  // 경기 - 용인
  {
    aliases: ['용인', '용인역'],
    canonical: { city: '경기', district: '용인' },
    microPoi: '수지구'
  },

  // 경기 - 안산
  {
    aliases: ['안산', '안산역'],
    canonical: { city: '경기', district: '안산' },
    microPoi: '단원구'
  },

  // 경기 - 평택
  {
    aliases: ['평택', '평택역'],
    canonical: { city: '경기', district: '평택' },
    microPoi: '비전동'
  },

  // 강원 - 강릉
  {
    aliases: ['강릉', '강릉역', '강릉 해변'],
    canonical: { city: '강원', district: '강릉' },
    microPoi: '강릉동'
  },

  // 강원 - 춘천
  {
    aliases: ['춘천', '춘천역'],
    canonical: { city: '강원', district: '춘천' },
    microPoi: '춘천동'
  },

  // 강원 - 원주
  {
    aliases: ['원주', '원주역'],
    canonical: { city: '강원', district: '원주' },
    microPoi: '원주동'
  },

  // 강원 - 속초
  {
    aliases: ['속초', '속초역'],
    canonical: { city: '강원', district: '속초' },
    microPoi: '속초동'
  },

  // 인천
  {
    aliases: ['인천', '인천역'],
    canonical: { city: '인천', district: '중구' },
    microPoi: '신생동'
  },

  // 대구 - 중구
  {
    aliases: ['대구', '대구역', '동성로'],
    canonical: { city: '대구', district: '중구' },
    microPoi: '동성로'
  },

  // 광주
  {
    aliases: ['광주', '광주 중심'],
    canonical: { city: '광주', district: '동구' },
    microPoi: '동명동'
  },

  // 대전 - 중구
  {
    aliases: ['대전', '대전역'],
    canonical: { city: '대전', district: '중구' },
    microPoi: '중앙동'
  },

  // 울산
  {
    aliases: ['울산', '울산역'],
    canonical: { city: '울산', district: '중구' },
    microPoi: '성남동'
  },

  // 전주
  {
    aliases: ['전주', '전주역', '전주 한옥마을'],
    canonical: { city: '전북', district: '전주' },
    microPoi: '완산구'
  },

  // 경주
  {
    aliases: ['경주', '불국사'],
    canonical: { city: '경북', district: '경주' },
    microPoi: '경주동'
  },

  // 제주
  {
    aliases: ['제주', '제주시', '한라산'],
    canonical: { city: '제주', district: '제주시' },
    microPoi: '용담동'
  },

  // 서귀포
  {
    aliases: ['서귀포', '서귀포시'],
    canonical: { city: '제주', district: '서귀포시' },
    microPoi: '토평동'
  },

  // 추가 약칭들
  {
    aliases: ['이태원', '이태원역'],
    canonical: { city: '서울', district: '중구' },
    microPoi: '이태원동'
  },

  {
    aliases: ['가로수길'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '신사동'
  },

  {
    aliases: ['강남', '강남 중심'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '강남동'
  },

  {
    aliases: ['롯데월드'],
    canonical: { city: '서울', district: '송파' },
    microPoi: '잠실동'
  },

  {
    aliases: ['코엑스'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '역삼동'
  },

  {
    aliases: ['종로', '종로 중심'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '종로동'
  },

  {
    aliases: ['광화문'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '종로동'
  },

  {
    aliases: ['을지로입구', '을지로입구역'],
    canonical: { city: '서울', district: '중구' },
    microPoi: '을지로'
  },

  {
    aliases: ['반포', '반포동'],
    canonical: { city: '서울', district: '서초' },
    microPoi: '반포동'
  },

  {
    aliases: ['강서'],
    canonical: { city: '서울', district: '강서' },
    microPoi: '화곡동'
  },

  {
    aliases: ['도봉', '도봉산역'],
    canonical: { city: '서울', district: '도봉' },
    microPoi: '도봉동'
  },

  {
    aliases: ['수유', '수유역'],
    canonical: { city: '서울', district: '강북' },
    microPoi: '수유동'
  },

  {
    aliases: ['노량진'],
    canonical: { city: '서울', district: '동작' },
    microPoi: '노량진동'
  },

  {
    aliases: ['신림'],
    canonical: { city: '서울', district: '관악' },
    microPoi: '신림동'
  },

  {
    aliases: ['천호', '천호동', '천호역'],
    canonical: { city: '서울', district: '강동' },
    microPoi: '천호동'
  },

  {
    aliases: ['건대', '건대입구역'],
    canonical: { city: '서울', district: '성동' },
    microPoi: '건대동'
  },

  {
    aliases: ['광안리', '광안해변'],
    canonical: { city: '부산', district: '수영' },
    microPoi: '광안동'
  },

  {
    aliases: ['다사', '다사읍'],
    canonical: { city: '대구', district: '달성군' },
    microPoi: '다사읍'
  },

  {
    aliases: ['신도시'],
    canonical: { city: '경기', district: '고양' },
    microPoi: '일산동'
  },

  {
    aliases: ['강남구'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '강남동'
  },

  {
    aliases: ['마포구'],
    canonical: { city: '서울', district: '마포' },
    microPoi: '홍대동'
  },

  {
    aliases: ['송파구'],
    canonical: { city: '서울', district: '송파' },
    microPoi: '잠실동'
  },

  {
    aliases: ['성남시'],
    canonical: { city: '경기', district: '성남' },
    microPoi: '분당동'
  },

  {
    aliases: ['경기도', '경기'],
    canonical: { city: '경기', district: '성남' },
    microPoi: '분당동'
  },

  // 추가: 주요 서울 지역
  {
    aliases: ['신촌', '신촌역'],
    canonical: { city: '서울', district: '마포' },
    microPoi: '신촌동'
  },

  {
    aliases: ['명대앞', '명동성당', '명동 쇼핑'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '명동'
  },

  {
    aliases: ['압구정', '압구정로데오'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '신사동'
  },

  {
    aliases: ['청담', '청담동'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '신사동'
  },

  {
    aliases: ['강북', '성북'],
    canonical: { city: '서울', district: '강북' },
    microPoi: '강북동'
  },

  {
    aliases: ['동대문', '동대문역'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '동대문'
  },

  {
    aliases: ['혜화', '혜화역'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '혜화동'
  },

  {
    aliases: ['이화여대', '이대앞'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '혜화동'
  },

  {
    aliases: ['신설동', '신설'],
    canonical: { city: '서울', district: '성동' },
    microPoi: '신설동'
  },

  {
    aliases: ['광화문역', '광화문'],
    canonical: { city: '서울', district: '종로' },
    microPoi: '세종로'
  },

  {
    aliases: ['서울역'],
    canonical: { city: '서울', district: '중구' },
    microPoi: '순화동'
  },

  {
    aliases: ['삼각지', '삼각지역'],
    canonical: { city: '서울', district: '용산' },
    microPoi: '한강로'
  },

  {
    aliases: ['숙대입구', '숙명여대'],
    canonical: { city: '서울', district: '동작' },
    microPoi: '사당동'
  },

  {
    aliases: ['홍제역', '홍제'],
    canonical: { city: '서울', district: '서대문' },
    microPoi: '홍제동'
  },

  {
    aliases: ['아현', '아현역'],
    canonical: { city: '서울', district: '마포' },
    microPoi: '아현동'
  },

  // 추가: 주요 경기 지역
  {
    aliases: ['일산', '일산역', '일산신도시', '일산동', '고양시'],
    canonical: { city: '경기', district: '고양' },
    microPoi: '일산동'
  },

  {
    aliases: ['광주', '광주시', '경기광주', '경기 광주'],
    canonical: { city: '경기', district: '광주' },
    microPoi: '광주동'
  },

  {
    aliases: ['구리', '구리시', '구리역'],
    canonical: { city: '경기', district: '구리' },
    microPoi: '구리동'
  },

  {
    aliases: ['남양주', '남양주시', '진건'],
    canonical: { city: '경기', district: '남양주' },
    microPoi: '다산동'
  },

  {
    aliases: ['하남', '하남시', '미사신도시', '하남 미사'],
    canonical: { city: '경기', district: '하남' },
    microPoi: '미사동'
  },

  {
    aliases: ['동두천', '동두천시'],
    canonical: { city: '경기', district: '동두천' },
    microPoi: '동두천동'
  }

];

/**
 * 입력 텍스트에서 약칭을 검색하고 정규화된 위치 정보를 반환
 * @param text 입력 텍스트 (예: "홍대 카페", "분당 헬스장")
 * @returns 정규화된 위치 정보 또는 빈 객체
 */
export function normalizeLocationAlias(
  text: string
): { city?: string; district?: string; microPoi?: string } {
  if (!text) return {};

  const lowerText = text.toLowerCase();

  // 약칭 데이터베이스에서 매칭
  for (const mapping of aliasDatabase) {
    for (const alias of mapping.aliases) {
      if (lowerText.includes(alias.toLowerCase())) {
        return {
          city: mapping.canonical.city,
          district: mapping.canonical.district,
          microPoi: mapping.microPoi
        };
      }
    }
  }

  return {};
}

/**
 * 텍스트에 특정 약칭이 포함되어 있는지 확인
 * @param text 입력 텍스트
 * @returns 약칭 매칭 여부
 */
export function hasLocationAlias(text: string): boolean {
  const result = normalizeLocationAlias(text);
  return !!result.city;
}

/**
 * 여러 약칭 중에서 가장 높은 신뢰도의 약칭을 선택
 * @param texts 입력 텍스트 배열
 * @returns 최고 신뢰도의 정규화 결과
 */
export function selectBestAlias(
  texts: string[]
): { city?: string; district?: string; microPoi?: string } {
  let bestMatch: { city?: string; district?: string; microPoi?: string } = {};
  let bestScore = 0;

  for (const text of texts) {
    const result = normalizeLocationAlias(text);
    if (result.city) {
      // 점수: city + district (microPoi는 보너스)
      let score = 1;
      if (result.district) score += 1;
      if (result.microPoi) score += 0.5;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }
  }

  return bestScore > 0 ? bestMatch : {};
}

export default {
  normalizeLocationAlias,
  hasLocationAlias,
  selectBestAlias,
  aliasDatabase
};
