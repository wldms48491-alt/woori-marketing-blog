# 장소 정보 자동 추출 문제 분석 및 개선 방안

## 📋 문제 요약

자동 추출 태그에서 장소 정보(도시, 구군, 동네 등)가 제대로 추출되지 않는 문제가 발생 중입니다.

---

## 🔍 현재 시스템 분석

### 1. 장소 추출 흐름

```
사용자 입력 (placeInfo + description)
    ↓
2단계 처리:
  ① parseAddress() - 정규식 기반 파싱
  ② extractLocationWithPriority() - 우선순위 로직
    ↓
locationDatabase 검색 (수동 하드코딩)
    ↓
최종 응답: { city, district, poi, trade_area }
```

### 2. 현재 구현의 주요 문제점

#### ⚠️ 문제 1: 제한적인 위치 데이터베이스
**현황:**
```typescript
// server/locationDatabase.ts
export const locationDatabase: { [key: string]: any } = {
  '서울': {
    '강남구': {...},
    '마포구': {...}  // 겨우 2개만 등록
  },
  '제주': {
    '서귀포시': {...}  // 제주 전역 미등록
  }
};
```

**문제:**
- 전국 17개 시도, 약 250개 구군 중 **5개 정도만** 데이터베이스에 등록
- 테스트 케이스는 60개 이상의 지역을 테스트하려고 하는데 대부분 조회 실패
- 약칭(홍대, 신사동, 서면, 분당 등) 미지원

#### ⚠️ 문제 2: 약칭/마이크로 POI 인식 불가
**예시:**
```
입력: "홍대 카페" → parseAddress()는 "홍대" 인식 불가
기대: "서울" / "마포" 추출
실제: "전국" / "" 반환
```

**원인:**
- `parseAddress()`는 정규식으로 "서울", "경기도" 같은 **정확한 지명만** 매칭
- 동네 약칭(홍대, 강남역, 신사동 등) 변환 로직 부재

#### ⚠️ 문제 3: 설명과 업체명 우선순위 로직 미흡
**현황:**
```typescript
export function extractLocationWithPriority(
  placeInfo: string,
  description: string
): LocationExtractionResult {
  const descParsed = parseAddress(description);
  const placeParsed = parseAddress(placeInfo);

  // description이 첫 번째 우선순위, 없으면 placeInfo 사용
  const city = descParsed?.city || placeParsed?.city || '전국';
  const district = descParsed?.district || placeParsed?.district || '';
  // ...
}
```

**문제:**
- 둘 다 정보가 부족할 때 기본값 반환만 가능
- description과 placeInfo의 **일관성 검증** 없음
- 모순된 정보 처리 미흡 (예: 서울 강남 vs 부산 해운대)

#### ⚠️ 문제 4: Gemini API 응답과의 불일치
**현황:**
```typescript
// server/index.ts
const geminiAnalysis = {
  category: "카페",
  signature_items: [...],
  // 하지만 위치 정보는 Gemini가 추출하지 않음
}

// 최종 응답에는 parseAddress()로 얻은 location만 사용
const facetsResponse = {
  location: {
    city: locationResult.city,  // Gemini API 아님
    district: locationResult.district,
  }
  // ...
};
```

**문제:**
- Gemini API는 카테고리/특징만 추출하고 위치는 추출하지 않음
- 정규식 파싱만으로 위치를 제한적으로 추출

---

## ✅ 개선 방안

### Phase 1: 위치 데이터베이스 확장 (우선순위: 🔴 높음)

#### 1-1. 전국 전역 데이터베이스 구축

**목표:** 17개 시도 × 250개 구군 모두 커버

```typescript
// server/locationDatabase.ts - 확장

export const locationDatabase: { [key: string]: any } = {
  // 서울 (25개 구)
  '서울': {
    '강남구': { display: '강남', aliases: ['강남', '강남역', '신사동', '역삼동', '테헤란로'] },
    '마포구': { display: '마포', aliases: ['마포', '홍대', '홍대입구역', '홍대동', '합정'] },
    '송파구': { display: '송파', aliases: ['송파', '잠실', '잠실역', '올림픽공원'] },
    '강서구': { display: '강서', aliases: ['강서', '여의도'] },
    '종로구': { display: '종로', aliases: ['종로', '명동', '시청'] },
    // ... 20개 구 추가
  },
  
  // 부산 (16개 구)
  '부산': {
    '부산진구': { display: '부산진', aliases: ['부산진', '서면', '서면역', '시청광장'] },
    '해운대구': { display: '해운대', aliases: ['해운대', '해운대역', '해운대 해수욕장'] },
    // ... 14개 구 추가
  },
  
  // 경기도 (31개 시/군)
  '경기': {
    '성남': { display: '성남', aliases: ['성남', '분당', '분당신도시', '분당역', '판교'] },
    '수원': { display: '수원', aliases: ['수원', '영동'] },
    // ... 29개 시/군 추가
  },
  
  // 강원 (18개 시/군)
  '강원': {
    '강릉': { display: '강릉', aliases: ['강릉', '강릉역'] },
    // ... 17개 시/군 추가
  },
  
  // ... 나머지 시도 12개 추가 (대구, 인천, 광주, 대전, 울산, 충북, 충남, 전북, 전남, 제주, 세종, 경북, 경남)
};
```

**구현 전략:**
1. 행정안전부 공식 데이터 활용
2. Naver Places / 카카오맵 카테고리 참고
3. 실제 쇼핑몰 데이터에서 추출한 주소 패턴 분석

---

### Phase 2: 약칭/마이크로 POI 변환 시스템 (우선순위: 🔴 높음)

#### 2-1. 약칭 정규화 엔진

```typescript
// server/aliasNormalizer.ts (새 파일)

interface AliasMapping {
  aliases: string[];
  canonical: { city: string; district: string };
  microPoi?: string; // 동네 수준
}

export const aliasDatabase: AliasMapping[] = [
  // 마포구 약칭
  {
    aliases: ['홍대', '홍대입구역', '홍대입구', '홍대문화거리', '합정'],
    canonical: { city: '서울', district: '마포' },
    microPoi: '홍대동'
  },
  
  // 강남구 약칭
  {
    aliases: ['강남역', '신사동', '역삼동', '테헤란로', '가로수길'],
    canonical: { city: '서울', district: '강남' },
    microPoi: '강남역'
  },
  
  // 성남시 약칭
  {
    aliases: ['분당', '분당신도시', '분당역', '판교'],
    canonical: { city: '경기', district: '성남' },
    microPoi: '분당동'
  },
  
  // 부산진구 약칭
  {
    aliases: ['서면', '서면역', '시청광장'],
    canonical: { city: '부산', district: '부산진' },
    microPoi: '서면동'
  },
  
  // ... 100+ 더 추가
];

/**
 * 입력 텍스트에서 약칭 검색 및 정규화
 */
export function normalizeLocationAlias(
  text: string
): { city?: string; district?: string; microPoi?: string } {
  const lowerText = text.toLowerCase();
  
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
```

#### 2-2. parseAddress 개선

```typescript
// server/locationDatabase.ts - 기존 함수 개선

export function parseAddress(address: string): ParsedAddress | null {
  if (!address) return null;
  
  // Step 1: 약칭 정규화 시도 (우선순위 높음)
  const normalized = normalizeLocationAlias(address);
  if (normalized.city) {
    return {
      city: normalized.city,
      district: normalized.district,
      neighborhood: normalized.microPoi
    };
  }
  
  // Step 2: 정규식 기반 파싱 (기존 로직)
  const addressLower = address.toLowerCase();
  const parsed: ParsedAddress = {};

  // ... 기존 코드 ...
  
  return parsed;
}
```

---

### Phase 3: 신뢰도 개선 (우선순위: 🟡 중간)

#### 3-1. 위치 확신도 점수 시스템

```typescript
// server/locationConfidence.ts (새 파일)

export interface LocationConfidenceMetrics {
  score: number;           // 0.0 ~ 1.0
  level: 'high' | 'medium' | 'low';
  signals: {
    cityFound: boolean;
    districtFound: boolean;
    microPoiFound: boolean;
    aliasMatch: boolean;    // 약칭 매칭 여부
    bothFieldsConsistent: boolean;  // placeInfo와 description 일관성
  };
  warnings: string[];
}

export function calculateLocationConfidence(
  placeInfo: string,
  description: string,
  parsed: LocationExtractionResult
): LocationConfidenceMetrics {
  const signals = {
    cityFound: !!parsed.city && parsed.city !== '전국',
    districtFound: !!parsed.district,
    microPoiFound: (parsed.neighborhoods?.length || 0) > 0,
    aliasMatch: false,
    bothFieldsConsistent: true
  };
  
  // 약칭 매칭 검사
  const placeAlias = normalizeLocationAlias(placeInfo);
  const descAlias = normalizeLocationAlias(description);
  signals.aliasMatch = !!(placeAlias.city || descAlias.city);
  
  // 일관성 검사
  if (placeAlias.city && descAlias.city) {
    signals.bothFieldsConsistent = 
      placeAlias.city === descAlias.city &&
      placeAlias.district === descAlias.district;
  }
  
  // 점수 계산
  let score = 0;
  score += signals.cityFound ? 0.3 : 0;
  score += signals.districtFound ? 0.3 : 0;
  score += signals.microPoiFound ? 0.2 : 0;
  score += signals.aliasMatch ? 0.1 : 0;
  score += signals.bothFieldsConsistent ? 0.1 : -0.1;
  
  score = Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
  
  const level: 'high' | 'medium' | 'low' = 
    score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low';
  
  const warnings: string[] = [];
  if (!signals.cityFound) warnings.push('도시 정보 미검출');
  if (!signals.districtFound) warnings.push('구/군 정보 미검출');
  if (!signals.bothFieldsConsistent && placeAlias.city && descAlias.city) {
    warnings.push('업체명과 설명의 위치 정보 불일치');
  }
  
  return { score, level, signals, warnings };
}
```

#### 3-2. Gemini API를 통한 위치 추출 강화

```typescript
// server/index.ts - extract-facets 엔드포인트 개선

// Gemini 프롬프트에 위치 추출 추가
const analysisPrompt = `당신은 마케팅 분석 전문가입니다. 다음 업체 정보를 분석하세요.

【업체명】${placeInfo}
【업체 설명】${description}

아래를 JSON 형식으로 작성하세요. 꼭 JSON으로만 응답하세요:
{
  "location": {
    "city": "도시명 (예: 서울, 부산, 경기 등)",
    "district": "구/군명 (예: 강남, 마포 등)",
    "micro_poi": "동네/상권 (예: 강남역, 홍대입구역 등)"
  },
  "category": "카페 또는 음식점 또는 기타 (1개)",
  "signature_items": ["시그니처1", "시그니처2"],
  "target_audience": ["타겟1", "타겟2"],
  "key_features": ["특징1", "특징2", "특징3"],
  "vibes": ["분위기1", "분위기2"],
  "price_range": "가격대",
  "amenities": ["편의시설1", "편의시설2"]
}`;
```

---

### Phase 4: 응답 구조 개선 (우선순위: 🟡 중간)

#### 4-1. 더 상세한 위치 정보 반환

```typescript
// 응답에서 다층 위치 정보 제공

const facetsResponse = {
  location: {
    // 기본 정보
    city: locationResult.city,
    district: locationResult.district,
    
    // 추가 정보
    neighborhoods: locationResult.neighborhoods,
    canonical_name: `${locationResult.city} ${locationResult.district}`,
    
    // 신뢰도
    confidence: {
      level: confidenceMetrics.level,
      score: confidenceMetrics.score,
      signals: confidenceMetrics.signals
    }
  },
  
  // 추출 방법 추적
  extraction_method: {
    primary: locationResult.source,  // 'description' | 'placeInfo' | 'gemini_api' | 'alias'
    secondary_sources: [
      ...(!normalizeLocationAlias(placeInfo).city ? [] : ['placeInfo_alias']),
      ...(!normalizeLocationAlias(description).city ? [] : ['description_alias']),
    ]
  },
  
  // ... 기타 필드 ...
};
```

---

### Phase 5: 검증 및 테스트 (우선순위: 🟢 낮음)

#### 5-1. 단위 테스트 확장

```typescript
// test-phase-full-coverage.ts

interface LocationTestCase {
  name: string;
  placeInfo: string;
  description: string;
  expected: {
    city: string;
    district: string;
    microPoi?: string;
    confidence: 'high' | 'medium' | 'low';
  };
}

const testCases: LocationTestCase[] = [
  // 약칭 테스트
  {
    name: '약칭-1: 홍대 카페',
    placeInfo: '홍대 카페',
    description: '홍대입구역 감성 카페',
    expected: {
      city: '서울',
      district: '마포',
      microPoi: '홍대동',
      confidence: 'high'
    }
  },
  
  // 정규 지명 테스트
  {
    name: '정규-1: 경기도 성남시 분당',
    placeInfo: '분당 카페',
    description: '경기도 성남시 분당신도시',
    expected: {
      city: '경기',
      district: '성남',
      microPoi: '분당동',
      confidence: 'high'
    }
  },
  
  // 모순 처리 테스트
  {
    name: '모순-1: 서울 vs 부산',
    placeInfo: '서울 강남역 카페',
    description: '부산 해운대 카페',
    expected: {
      city: '부산',  // description 우선
      district: '해운대',
      confidence: 'low'  // 경고 발생
    }
  },
  
  // ... 100+ 테스트 케이스
];
```

---

## 📊 개선 효과 예상

| 지표 | 현재 | 개선 후 | 향상도 |
|------|------|--------|--------|
| 인식 가능 지역 수 | 5개 | 250+ 개 | 5000% |
| 약칭 인식률 | 0% | ~90% | - |
| 평균 신뢰도 | ~0.4 | ~0.8 | +100% |
| 테스트 통과율 | 10-20% | 85-95% | +400-475% |
| API 응답 시간 | ~3s | ~3.5s | +16% (허용 범위) |

---

## 🚀 구현 우선순위 로드맵

### 1단계: 기초 (1-2주)
- [ ] Phase 1-1: locationDatabase 전국 확장
- [ ] Phase 2-1: 약칭 정규화 엔진 구축
- [ ] Phase 2-2: parseAddress 개선

### 2단계: 정교화 (1주)
- [ ] Phase 3-1: 신뢰도 점수 시스템
- [ ] Phase 3-2: Gemini API 프롬프트 개선

### 3단계: 최적화 (1주)
- [ ] Phase 4-1: 응답 구조 개선
- [ ] Phase 5-1: 전수 테스트 실행

### 4단계: 배포 (3일)
- [ ] 성능 테스트
- [ ] 실시간 모니터링
- [ ] 프로덕션 롤아웃

---

## 💡 추가 개선 사항

### A. 사용자 피드백 루프
```typescript
// 사용자가 자동 추출된 위치가 잘못되었을 때
POST /api/feedback/location
{
  input: { placeInfo, description },
  extracted: { city, district },
  corrected: { city, district },
  timestamp: 1234567890
}

// 피드백 수집 → 모델 재학습에 활용
```

### B. 지역 권위자 통합
- Naver API: Places Search로 정확한 주소 확인
- Kakao API: 좌표 기반 행정구역 역검색
- 네이버 블로그/카페: 해당 지역 콘텐츠 크롤링

### C. 머신러닝 기반 개선 (장기)
- 수집된 피드백 데이터로 NER(Named Entity Recognition) 모델 학습
- 약칭→정규지명 변환을 위한 seq2seq 모델
- Confidence 예측을 위한 분류 모델

---

## 📝 요약

**핵심 문제:** 장소 데이터베이스 부족 + 약칭 미지원

**해결책:**
1. **데이터 확충**: 5개 → 250+ 지역 (5000% 확대)
2. **약칭 엔진**: 마이크로 POI 자동 정규화
3. **신뢰도 시스템**: 추출 품질 정량화
4. **Gemini 강화**: 위치 정보도 AI가 추출

**기대 효과:** 테스트 통과율 10-20% → 85-95%로 개선

