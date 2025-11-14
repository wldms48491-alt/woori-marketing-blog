import { normalizeLocationAlias } from './aliasNormalizer';

export interface ParsedAddress {
  city?: string;
  district?: string;
  neighborhood?: string;
  street?: string;
}

export interface LocationExtractionResult {
  city: string;
  district: string;
  neighborhoods: string[];
  confidence: 'high' | 'medium' | 'low';
  source: string;
  signals?: Record<string, any>;
}

export interface NearbyLocations {
  commercialAreas: string[];
  metro: string[];
  landmarks: string[];
  attractions: string[];
}

// 전국 지역 데이터베이스 (주요 도시/구/군 중심)
export const locationDatabase: { [key: string]: any } = {
  '서울': {
    '강남구': { neighborhoods: ['강남', '역삼', '신사동'], commercialAreas: ['강남역 상권'], metro: ['강남역'], landmarks: ['코엑스'], attractions: [] },
    '마포구': { neighborhoods: ['홍대', '망원동'], commercialAreas: ['홍대 상권'], metro: ['홍대입구역'], landmarks: ['홍대 거리'], attractions: [] },
    '송파구': { neighborhoods: ['잠실'], commercialAreas: ['잠실 상권'], metro: ['잠실역'], landmarks: ['올림픽공원'], attractions: [] },
    '종로구': { neighborhoods: ['명동'], commercialAreas: ['명동 상권'], metro: ['명동역'], landmarks: [], attractions: [] },
    '중구': { neighborhoods: ['명동', '충무로'], commercialAreas: ['명동 상권'], metro: ['충무로역'], landmarks: [], attractions: [] },
    '영등포구': { neighborhoods: ['여의도'], commercialAreas: ['여의도 금융권'], metro: ['여의나루역'], landmarks: ['63빌딩'], attractions: [] },
    '서초구': { neighborhoods: ['서초동'], commercialAreas: [], metro: ['서초역'], landmarks: [], attractions: [] },
    '구로구': { neighborhoods: ['신도림동'], commercialAreas: ['신도림 상권'], metro: ['신도림역'], landmarks: [], attractions: [] },
    '금천구': { neighborhoods: ['가산동'], commercialAreas: ['가산디지털단지'], metro: [], landmarks: [], attractions: [] },
    '노원구': { neighborhoods: ['상계동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '도봉구': { neighborhoods: ['창동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '강북구': { neighborhoods: ['수유동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '성북구': { neighborhoods: ['성북동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '강동구': { neighborhoods: ['천호동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '강서구': { neighborhoods: ['화곡동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '동작구': { neighborhoods: ['노량진동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '관악구': { neighborhoods: ['신림동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '서대문구': { neighborhoods: ['홍제동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '은평구': { neighborhoods: ['불광동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '양천구': { neighborhoods: ['목동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '중랑구': { neighborhoods: ['중랑동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '성동구': { neighborhoods: ['성수동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '부산': {
    '부산진구': { neighborhoods: ['서면'], commercialAreas: ['서면 상권'], metro: ['서면역'], landmarks: [], attractions: [] },
    '해운대구': { neighborhoods: ['해변'], commercialAreas: ['해운대 상권'], metro: ['해운대역'], landmarks: ['해운대 해수욕장'], attractions: [] },
    '중구': { neighborhoods: ['광복동'], commercialAreas: [], metro: ['중앙역'], landmarks: [], attractions: [] },
    '동구': { neighborhoods: ['초량동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '서구': { neighborhoods: ['부전동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '남구': { neighborhoods: ['대연동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '북구': { neighborhoods: ['구포동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '강서구': { neighborhoods: ['녹산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '영도구': { neighborhoods: ['청학동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '수영구': { neighborhoods: ['광안동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '연제구': { neighborhoods: ['연산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '금정구': { neighborhoods: ['부산대동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '사상구': { neighborhoods: ['괘법동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '사하구': { neighborhoods: ['당리동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '동래구': { neighborhoods: ['온천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '대구': {
    '중구': { neighborhoods: ['동성로'], commercialAreas: ['동성로 상권'], metro: [], landmarks: [], attractions: [] },
    '동구': { neighborhoods: ['봉무동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '서구': { neighborhoods: ['내당동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '남구': { neighborhoods: ['대명동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '북구': { neighborhoods: ['읍내동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '수성구': { neighborhoods: ['범어동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '달서구': { neighborhoods: ['월성동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '인천': {
    '중구': { neighborhoods: ['신생동'], commercialAreas: [], metro: ['인천역'], landmarks: [], attractions: [] },
    '동구': { neighborhoods: ['송현동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '남동구': { neighborhoods: ['구월동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '연수구': { neighborhoods: ['동춘동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '남구': { neighborhoods: ['숭의동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '북구': { neighborhoods: ['신한동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '강화군': { neighborhoods: ['강화읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '옹진군': { neighborhoods: ['영종면'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '광주': {
    '동구': { neighborhoods: ['동명동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '서구': { neighborhoods: ['쌍촌동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '남구': { neighborhoods: ['주월동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '북구': { neighborhoods: ['중흥동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '광산구': { neighborhoods: ['첨단동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '대전': {
    '동구': { neighborhoods: ['용전동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '중구': { neighborhoods: ['중앙동'], commercialAreas: [], metro: ['대전역'], landmarks: [], attractions: [] },
    '서구': { neighborhoods: ['둔산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '유성구': { neighborhoods: ['궁동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '대덕구': { neighborhoods: ['신대동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '울산': {
    '중구': { neighborhoods: ['성남동'], commercialAreas: [], metro: ['울산역'], landmarks: [], attractions: [] },
    '남구': { neighborhoods: ['옥동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '동구': { neighborhoods: ['전하동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '북구': { neighborhoods: ['천곡동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '울주군': { neighborhoods: ['온양읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '경기': {
    '성남': { neighborhoods: ['분당', '서현', '미금', '정자'], commercialAreas: ['분당신도시', '분당 상권', '서현역 상권', '판교 테크노밸리'], metro: ['분당역', '서현역', '판교역'], landmarks: [], attractions: [] },
    '고양': { neighborhoods: ['일산'], commercialAreas: ['일산신도시'], metro: [], landmarks: [], attractions: [] },
    '수원': { neighborhoods: ['팔달로'], commercialAreas: [], metro: ['수원역'], landmarks: [], attractions: [] },
    '안양': { neighborhoods: ['만안동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '부천': { neighborhoods: ['원미동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '광명': { neighborhoods: ['광명동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '평택': { neighborhoods: ['평택동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '동두천': { neighborhoods: ['동두천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '안산': { neighborhoods: ['시화동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '과천': { neighborhoods: ['과천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '구리': { neighborhoods: ['인창동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '남양주': { neighborhoods: ['다산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '오산': { neighborhoods: ['오산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '시흥': { neighborhoods: ['시흥동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '군포': { neighborhoods: ['산본동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '의왕': { neighborhoods: ['의왕동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '하남': { neighborhoods: ['미사동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '용인': { neighborhoods: ['수지동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '파주': { neighborhoods: ['문산읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '이천': { neighborhoods: ['이천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '안성': { neighborhoods: ['안성동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '김포': { neighborhoods: ['김포동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '화성': { neighborhoods: ['팔탄면'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '광주': { neighborhoods: ['광주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '양평': { neighborhoods: ['양평읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '포천': { neighborhoods: ['포천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '여주': { neighborhoods: ['여주읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '연천': { neighborhoods: ['연천읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '가평': { neighborhoods: ['가평읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '강원': {
    '강릉': { neighborhoods: ['강릉역'], commercialAreas: ['강릉 상권'], metro: [], landmarks: [], attractions: [] },
    '춘천': { neighborhoods: ['춘천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '원주': { neighborhoods: ['원주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '속초': { neighborhoods: ['속초동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '동해': { neighborhoods: ['동해동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '태백': { neighborhoods: ['태백동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '삼척': { neighborhoods: ['삼척동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '홍천': { neighborhoods: ['홍천읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '횡성': { neighborhoods: ['횡성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '영월': { neighborhoods: ['영월읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '평창': { neighborhoods: ['평창읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '정선': { neighborhoods: ['정선읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '철원': { neighborhoods: ['철원읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '화천': { neighborhoods: ['화천읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '양구': { neighborhoods: ['양구읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '인제': { neighborhoods: ['인제읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '고성': { neighborhoods: ['고성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '양양': { neighborhoods: ['양양읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '충북': {
    '청주': { neighborhoods: ['청주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '충주': { neighborhoods: ['충주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '제천': { neighborhoods: ['제천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '보은': { neighborhoods: ['보은읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '옥천': { neighborhoods: ['옥천읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '영동': { neighborhoods: ['영동읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '증평': { neighborhoods: ['증평읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '진천': { neighborhoods: ['진천읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '괴산': { neighborhoods: ['괴산읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '음성': { neighborhoods: ['음성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '단양': { neighborhoods: ['단양읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '충남': {
    '천안': { neighborhoods: ['천안동'], commercialAreas: [], metro: ['천안역'], landmarks: [], attractions: [] },
    '공주': { neighborhoods: ['공주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '보령': { neighborhoods: ['보령동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '아산': { neighborhoods: ['배방읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '서산': { neighborhoods: ['서산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '홍성': { neighborhoods: ['홍성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '태안': { neighborhoods: ['태안읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '당진': { neighborhoods: ['당진동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '예산': { neighborhoods: ['예산읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '서천': { neighborhoods: ['서천읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '부여': { neighborhoods: ['부여읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '논산': { neighborhoods: ['논산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '계룡': { neighborhoods: ['계룡동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '금산': { neighborhoods: ['금산읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '청양': { neighborhoods: ['청양읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '전북': {
    '전주': { neighborhoods: ['전주동'], commercialAreas: [], metro: ['전주역'], landmarks: ['한옥마을'], attractions: [] },
    '군산': { neighborhoods: ['군산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '익산': { neighborhoods: ['익산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '정읍': { neighborhoods: ['정읍동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '남원': { neighborhoods: ['남원동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '김제': { neighborhoods: ['김제동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '완주': { neighborhoods: ['완주읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '진안': { neighborhoods: ['진안읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '무주': { neighborhoods: ['무주읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '장수': { neighborhoods: ['장수읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '임실': { neighborhoods: ['임실읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '순창': { neighborhoods: ['순창읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '고창': { neighborhoods: ['고창읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '부안': { neighborhoods: ['부안읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '전남': {
    '목포': { neighborhoods: ['목포동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '여수': { neighborhoods: ['여수동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '순천': { neighborhoods: ['순천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '나주': { neighborhoods: ['나주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '광양': { neighborhoods: ['광양동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '담양': { neighborhoods: ['담양읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '곡성': { neighborhoods: ['곡성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '구례': { neighborhoods: ['구례읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '화순': { neighborhoods: ['화순읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '장흥': { neighborhoods: ['장흥읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '강진': { neighborhoods: ['강진읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '해남': { neighborhoods: ['해남읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '영암': { neighborhoods: ['영암읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '무안': { neighborhoods: ['무안읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '함평': { neighborhoods: ['함평읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '영광': { neighborhoods: ['영광읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '장성': { neighborhoods: ['장성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '완도': { neighborhoods: ['완도읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '진도': { neighborhoods: ['진도읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '신안': { neighborhoods: ['신안읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '보성': { neighborhoods: ['보성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '경북': {
    '포항': { neighborhoods: ['포항동'], commercialAreas: [], metro: ['포항역'], landmarks: [], attractions: [] },
    '경주': { neighborhoods: ['경주동'], commercialAreas: [], metro: [], landmarks: ['불국사'], attractions: [] },
    '김천': { neighborhoods: ['김천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '안동': { neighborhoods: ['안동동'], commercialAreas: [], metro: [], landmarks: ['하회마을'], attractions: [] },
    '구미': { neighborhoods: ['구미동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '영주': { neighborhoods: ['영주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '영천': { neighborhoods: ['영천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '상주': { neighborhoods: ['상주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '문경': { neighborhoods: ['문경동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '칠곡': { neighborhoods: ['칠곡읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '예천': { neighborhoods: ['예천읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '봉화': { neighborhoods: ['봉화읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '울진': { neighborhoods: ['울진읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '울릉': { neighborhoods: ['울릉읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '군위': { neighborhoods: ['군위읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '의성': { neighborhoods: ['의성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '청송': { neighborhoods: ['청송읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '영양': { neighborhoods: ['영양읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '고령': { neighborhoods: ['고령읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '성주': { neighborhoods: ['성주읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '경남': {
    '창원': { neighborhoods: ['창원동'], commercialAreas: [], metro: ['창원역'], landmarks: [], attractions: [] },
    '진주': { neighborhoods: ['진주동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '통영': { neighborhoods: ['통영동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '사천': { neighborhoods: ['사천동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '김해': { neighborhoods: ['김해동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '거제': { neighborhoods: ['거제동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '양산': { neighborhoods: ['양산동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '의령': { neighborhoods: ['의령읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '함안': { neighborhoods: ['함안읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '창녕': { neighborhoods: ['창녕읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '고성': { neighborhoods: ['고성읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '남해': { neighborhoods: ['남해읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '하동': { neighborhoods: ['하동읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '산청': { neighborhoods: ['산청읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '함양': { neighborhoods: ['함양읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '거창': { neighborhoods: ['거창읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '합천': { neighborhoods: ['합천읍'], commercialAreas: [], metro: [], landmarks: [], attractions: [] },
    '밀양': { neighborhoods: ['밀양동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  },
  '제주': {
    '제주시': { neighborhoods: ['제주동'], commercialAreas: [], metro: [], landmarks: ['한라산'], attractions: [] },
    '서귀포시': { neighborhoods: ['중문동'], commercialAreas: [], metro: [], landmarks: [], attractions: [] }
  }
};

export function parseAddress(address: string): ParsedAddress | null {
  if (!address) return null;
  
  const addressLower = address.toLowerCase();
  const parsed: ParsedAddress = {};

  // Step 1: 약칭 정규화 시도 (우선순위 높음)
  const normalized = normalizeLocationAlias(address);
  if (normalized.city) {
    parsed.city = normalized.city;
    parsed.district = normalized.district;
    parsed.neighborhood = normalized.microPoi;
    return parsed;
  }

  // Step 2: 정규식 기반 파싱
  for (const city of Object.keys(locationDatabase)) {
    if (addressLower.includes(city.toLowerCase())) {
      parsed.city = city;
      break;
    }
  }

  if (parsed.city) {
    for (const district of Object.keys(locationDatabase[parsed.city])) {
      if (addressLower.includes(district.toLowerCase())) {
        parsed.district = district;
        break;
      }
    }
  }

  return parsed;
}

export function extractLocationWithPriority(
  placeInfo: string,
  description: string
): LocationExtractionResult {
  // Step 1: 약칭 정규화 시도 (가장 높은 우선순위)
  const placeAlias = normalizeLocationAlias(placeInfo);
  const descAlias = normalizeLocationAlias(description);

  let city = '';
  let district = '';
  let neighborhoods: string[] = [];
  let source = 'default';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // 약칭 매칭: placeInfo 또는 description에서
  if (placeAlias.city) {
    city = placeAlias.city;
    district = placeAlias.district || '';
    if (placeAlias.microPoi) neighborhoods.push(placeAlias.microPoi);
    source = 'alias_placeInfo';
    confidence = district ? 'high' : 'medium';
  } else if (descAlias.city) {
    city = descAlias.city;
    district = descAlias.district || '';
    if (descAlias.microPoi) neighborhoods.push(descAlias.microPoi);
    source = 'alias_description';
    confidence = district ? 'high' : 'medium';
  } else {
    // Step 2: 정규식 기반 파싱 (더 강력한 휴리스틱)
    const descParsed = parseAddress(description);
    const placeParsed = parseAddress(placeInfo);

    if (descParsed?.city || placeParsed?.city) {
      city = descParsed?.city || placeParsed?.city || '';
      district = descParsed?.district || placeParsed?.district || '';
      source = descParsed?.city ? 'description' : 'placeInfo';
      confidence = district ? 'high' : 'medium';
    } else {
      // Step 3: 강력한 휴리스틱 기반 지역 추출
      const heuristic = extractLocationHeuristic(placeInfo, description);
      if (heuristic.city) {
        city = heuristic.city;
        district = heuristic.district || '';
        source = heuristic.source;
        confidence = district ? 'high' : 'medium';
      } else {
        // 최후의 폴백: 빈 값으로 반환 (전국 대신)
        city = '';
        district = '';
        source = 'none';
        confidence = 'low';
      }
    }
  }

  return {
    city,
    district,
    neighborhoods,
    confidence,
    source
  };
}

/**
 * 휴리스틱 기반 지역 추출 (약칭 매칭 실패 시)
 * 업체명이나 설명에서 간접적으로 지역 정보 추출
 */
function extractLocationHeuristic(placeInfo: string, description: string): { city?: string; district?: string; source: string } {
  const fullText = `${placeInfo} ${description}`.toLowerCase();
  
  // 지역 키워드 맵 (도시 > 구/군 형태)
  const locationKeywords: Record<string, Record<string, string[]>> = {
    '서울': {
      '강남구': ['강남', '역삼', '신사', '압구정', '청담', '테헤란'],
      '마포구': ['홍대', '망원', '신촌', '합정', '마포'],
      '송파구': ['잠실', '잠실동', '올림픽', '롯데월드'],
      '종로구': ['명동', '종로', '광화문', '시청', '을지로'],
      '중구': ['을지로', '충무로', '이태원', '청계'],
      '강서구': ['여의도', '영등포', '여의나루'],
      '구로구': ['신도림', '구로'],
      '성동구': ['건대', '성수', '뚝섬'],
      '강동구': ['천호', '강동'],
    },
    '경기': {
      '성남': ['분당', '서현', '판교', '미금', '정자', '성남'],
      '고양': ['일산', '고양', '일산신도시'],
      '수원': ['수원', '팔달'],
      '광주': ['광주', '경기광주'],
      '남양주': ['남양주', '다산'],
      '하남': ['미사', '하남'],
    },
    '부산': {
      '부산진구': ['서면', '부산진'],
      '해운대구': ['해운대', '해변'],
      '중구': ['광복', '부산중심'],
    },
    '대구': {
      '중구': ['동성로', '대구'],
    },
    '인천': {
      '중구': ['인천', '인천역'],
    },
    '광주': {
      '동구': ['광주', '광주시'],
    },
  };

  // 매칭 시도
  for (const [city, districts] of Object.entries(locationKeywords)) {
    for (const [district, keywords] of Object.entries(districts)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          return { city, district, source: 'heuristic' };
        }
      }
    }
  }

  // 매칭 실패: 도시 이름만이라도 추출
  const cityKeywords: Record<string, string[]> = {
    '서울': ['서울', '강남', '홍대', '명동', '신사'],
    '경기': ['경기', '분당', '일산', '수원', '고양', '판교'],
    '부산': ['부산', '서면', '해운대'],
    '대구': ['대구', '동성로'],
    '인천': ['인천'],
    '광주': ['광주'],
  };

  for (const [city, keywords] of Object.entries(cityKeywords)) {
    for (const keyword of keywords) {
      if (fullText.includes(keyword)) {
        return { city, district: '', source: 'heuristic_city' };
      }
    }
  }

  return { source: 'none' };
}

export function getNearbyLocations(city: string, district: string): NearbyLocations {
  const defaultResult: NearbyLocations = {
    commercialAreas: [],
    metro: [],
    landmarks: [],
    attractions: []
  };

  if (!city || !locationDatabase[city] || !district || !locationDatabase[city][district]) {
    return defaultResult;
  }

  const districtData = locationDatabase[city][district];
  return {
    commercialAreas: districtData.commercialAreas || [],
    metro: districtData.metro || [],
    landmarks: districtData.landmarks || [],
    attractions: districtData.attractions || []
  };
}

export function validateLocationConsistency(city: string, district: string): boolean {
  return !!(locationDatabase[city] && locationDatabase[city][district]);
}
