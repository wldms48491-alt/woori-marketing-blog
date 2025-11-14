/**
 * 고급 위치 추출기
 * Naver 검색 결과의 주소에서 정확하게 위치정보를 추출
 */

import { getMicroArea } from './microAreaDatabase';

export interface ExtractedLocation {
  city: string;
  district: string;
  dong?: string;           // 동(洞)/면(面) 정보
  micro_area?: string;     // 미시상권 정보
  street?: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

/**
 * 도시 정규화 맵
 * 주의: 더 긴 문자열을 먼저 매칭해야 함 (예: "경기도 광주"를 먼저 처리하기 위해)
 */
const CITY_MAP: Record<string, string> = {
  // 광역시/특별시 (우선)
  '서울시': '서울', '서울': '서울',
  '부산시': '부산', '부산': '부산',
  '대구시': '대구', '대구': '대구',
  '인천시': '인천', '인천': '인천',
  '광주시': '광주', '광주': '광주',
  '대전시': '대전', '대전': '대전',
  '울산시': '울산', '울산': '울산',
  
  // 도 (다음 우선순위)
  '경기도': '경기', '경기': '경기',
  '강원도': '강원', '강원지역': '강원', '강원': '강원',
  '충청북도': '충북', '충북': '충북',
  '충청남도': '충남', '충남': '충남',
  '전라북도': '전북', '전북': '전북',
  '전라남도': '전남', '전남': '전남',
  '경상북도': '경북', '경북': '경북',
  '경상남도': '경남', '경남': '경남',
  '제주도': '제주', '제주': '제주',
};

// 구/군 정규화 맵 (도시별)
const DISTRICT_MAP: Record<string, Record<string, string>> = {
  '서울': {
    '강남': '강남구', '강남구': '강남구',
    '강동': '강동구', '강동구': '강동구',
    '강북': '강북구', '강북구': '강북구',
    '강서': '강서구', '강서구': '강서구',
    '관악': '관악구', '관악구': '관악구',
    '광진': '광진구', '광진구': '광진구',
    '구로': '구로구', '구로구': '구로구',
    '금천': '금천구', '금천구': '금천구',
    '노원': '노원구', '노원구': '노원구',
    '도봉': '도봉구', '도봉구': '도봉구',
    '동대문': '동대문구', '동대문구': '동대문구',
    '동작': '동작구', '동작구': '동작구',
    '마포': '마포구', '마포구': '마포구',
    '서대문': '서대문구', '서대문구': '서대문구',
    '서초': '서초구', '서초구': '서초구',
    '성동': '성동구', '성동구': '성동구',
    '성북': '성북구', '성북구': '성북구',
    '송파': '송파구', '송파구': '송파구',
    '양천': '양천구', '양천구': '양천구',
    '영등포': '영등포구', '영등포구': '영등포구',
    '용산': '용산구', '용산구': '용산구',
    '은평': '은평구', '은평구': '은평구',
    '종로': '종로구', '종로구': '종로구',
    '중': '중구', '중구': '중구',
    '중랑': '중랑구', '중랑구': '중랑구',
  },
  '부산': {
    '강서': '강서구', '강서구': '강서구',
    '금정': '금정구', '금정구': '금정구',
    '남': '남구', '남구': '남구',
    '동': '동구', '동구': '동구',
    '동래': '동래구', '동래구': '동래구',
    '부산진': '부산진구', '부산진구': '부산진구',
    '북': '북구', '북구': '북구',
    '사상': '사상구', '사상구': '사상구',
    '사하': '사하구', '사하구': '사하구',
    '서': '서구', '서구': '서구',
    '수영': '수영구', '수영구': '수영구',
    '영도': '영도구', '영도구': '영도구',
    '연제': '연제구', '연제구': '연제구',
    '중': '중구', '중구': '중구',
  },
  '경기': {
    '고양': '고양시', '고양시': '고양시',
    '과천': '과천시', '과천시': '과천시',
    '광명': '광명시', '광명시': '광명시',
    '광주': '광주시', '광주시': '광주시',
    '구리': '구리시', '구리시': '구리시',
    '군포': '군포시', '군포시': '군포시',
    '김포': '김포시', '김포시': '김포시',
    '남양주': '남양주시', '남양주시': '남양주시',
    '동두천': '동두천시', '동두천시': '동두천시',
    '부천': '부천시', '부천시': '부천시',
    '성남': '성남시', '성남시': '성남시',
    '수원': '수원시', '수원시': '수원시',
    '시흥': '시흥시', '시흥시': '시흥시',
    '안산': '안산시', '안산시': '안산시',
    '안성': '안성시', '안성시': '안성시',
    '안양': '안양시', '안양시': '안양시',
    '여주': '여주시', '여주시': '여주시',
    '오산': '오산시', '오산시': '오산시',
    '용인': '용인시', '용인시': '용인시',
    '의왕': '의왕시', '의왕시': '의왕시',
    '의정부': '의정부시', '의정부시': '의정부시',
    '이천': '이천시', '이천시': '이천시',
    '파주': '파주시', '파주시': '파주시',
    '평택': '평택시', '평택시': '평택시',
    '포천': '포천시', '포천시': '포천시',
    '하남': '하남시', '하남시': '하남시',
    '화성': '화성시', '화성시': '화성시',
  },
  // ... 다른 지역은 생략 (필요시 추가)
};

/**
 * 주소 문자열에서 도시와 구/군 추출
 * 예: "경기도 광주시 태전동" -> { city: "경기", district: "광주시" }
 * 전략: 주소의 앞에서부터 순서대로 첫 번째 도시명을 찾아 사용
 */
export function extractLocationFromAddress(address: string): ExtractedLocation | null {
  if (!address || typeof address !== 'string') {
    return null;
  }

  const addressTrimmed = address.trim();
  let city = '';
  let district = '';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // Step 1: 도시 찾기
  // 전략: 주소의 맨 앞에서부터 찾으려고, 도시명들을 길이 순서대로 정렬하되
  // 주소에서의 위치를 추적
  let cityMatchIndex = -1;
  let matchedCityKey = '';

  // 더 긴 키부터 시도 (예: "경기도"가 "경기"보다 먼저 매칭되어야 함)
  const sortedCityKeys = Object.keys(CITY_MAP).sort((a, b) => {
    // 길이가 같으면 "도" 또는 "시"를 포함한 것을 우선
    if (a.length === b.length) {
      const aHasSuffix = a.includes('도') || a.includes('시');
      const bHasSuffix = b.includes('도') || b.includes('시');
      return (bHasSuffix ? 1 : 0) - (aHasSuffix ? 1 : 0);
    }
    return b.length - a.length;
  });

  for (const key of sortedCityKeys) {
    const index = addressTrimmed.indexOf(key);
    if (index !== -1) {
      // 더 앞에 있는 매칭을 우선함
      if (cityMatchIndex === -1 || index < cityMatchIndex) {
        cityMatchIndex = index;
        matchedCityKey = key;
      }
    }
  }

  if (matchedCityKey) {
    city = CITY_MAP[matchedCityKey];
  } else {
    return null; // 도시를 찾을 수 없으면 실패
  }

  // Step 2: 구/군 찾기 (더 긴 키부터 매칭)
  const districtMap = DISTRICT_MAP[city];
  if (districtMap) {
    const sortedDistrictKeys = Object.keys(districtMap).sort((a, b) => {
      // 길이가 같으면 "시" 또는 "구"를 포함한 것을 우선
      if (a.length === b.length) {
        const aHasSuffix = a.includes('시') || a.includes('구');
        const bHasSuffix = b.includes('시') || b.includes('구');
        return (bHasSuffix ? 1 : 0) - (aHasSuffix ? 1 : 0);
      }
      return b.length - a.length;
    });

    // 도시 매칭 위치 이후에서만 구/군을 찾음
    const searchStartIndex = cityMatchIndex + matchedCityKey.length;
    const remainingAddress = addressTrimmed.substring(searchStartIndex);

    for (const key of sortedDistrictKeys) {
      if (remainingAddress.includes(key)) {
        district = districtMap[key];
        confidence = 'high';
        break;
      }
    }
  }

  // 구/군을 찾지 못한 경우
  if (!district) {
    confidence = 'medium';
  }

  // Step 3: 동(洞)/면(面) 추출
  const dong = extractDongFromAddress(addressTrimmed);

  // Step 4: 미시상권 추출
  const micro_area = getMicroAreaFromDatabase(city, district, dong);

  return {
    city,
    district,
    ...(dong && { dong }),                    // dong이 있으면만 포함
    ...(micro_area && { micro_area }),        // micro_area가 있으면만 포함
    confidence,
    source: 'address_parsing'
  };
}

/**
 * 주소에서 동(洞)/면(面) 정보 추출
 * 예: "경기도 광주시 태전동" -> "태전동"
 */
function extractDongFromAddress(address: string): string | undefined {
  if (!address) return undefined;
  
  // 동(洞) 또는 면(面)으로 끝나는 단어 찾기
  const dongPattern = /([가-힣]+동|[가-힣]+면)(?=\s|$)/;
  const match = address.match(dongPattern);
  
  return match ? match[1] : undefined;
}

/**
 * 미시상권 조회 함수 (외부 데이터베이스 사용)
 */
function getMicroAreaFromDatabase(city: string, district: string, dong: string | undefined): string | undefined {
  return getMicroArea(city, district, dong);
}

/**
 * 검색 결과(Naver API 응답)에서 위치 정보 추출
 * @param searchResult - Naver 검색 API 결과 객체
 * @returns 추출된 위치 정보
 */
export function extractLocationFromSearchResult(searchResult: any): ExtractedLocation | null {
  const address = searchResult?.address || searchResult?.roadAddress || '';
  
  if (!address) {
    return null;
  }

  return extractLocationFromAddress(address);
}

/**
 * 업체명과 주소로부터 위치 정보 추출
 * @param businessName - 업체명
 * @param address - 주소
 * @returns 추출된 위치 정보
 */
export function extractLocationFromBusinessInfo(businessName: string, address: string): ExtractedLocation | null {
  // 주소가 있으면 주소에서 추출 (가장 정확)
  if (address) {
    return extractLocationFromAddress(address);
  }

  // 주소가 없으면 업체명에서 추출 시도
  return extractLocationFromAddress(businessName);
}
