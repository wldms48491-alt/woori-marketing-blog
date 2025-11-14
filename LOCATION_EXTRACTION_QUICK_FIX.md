# 장소 정보 추출 문제 - 빠른 진단

## 🔴 핵심 문제 3가지

### 1️⃣ 위치 데이터베이스가 너무 작음
```
현재: 5개 지역만 등록
  ├─ 서울 (강남구, 마포구)
  ├─ 제주 (서귀포시)
  └─ 기타 ~2개

필요: 250+ 지역 (전국 모든 구/군)
  ├─ 서울 25개 구
  ├─ 부산 16개 구
  ├─ 경기 31개 시군
  ├─ 강원 18개 시군
  └─ ... 나머지 12개 시도
```

**결과:** 테스트 케이스 중 95%가 "전국" 또는 위치 미지정으로 반환

---

### 2️⃣ 약칭을 인식하지 못함
```
입력: "홍대 카페" 또는 "분당 헬스장"

현재 처리:
  "홍대" → 데이터베이스에서 검색 → 없음 → "전국"
  "분당" → 데이터베이스에서 검색 → 없음 → "전국"

필요: 약칭 매핑 테이블
  "홍대" → { city: "서울", district: "마포", microPoi: "홍대동" }
  "분당" → { city: "경기", district: "성남", microPoi: "분당동" }
  "강남역" → { city: "서울", district: "강남" }
  ... 100+ 약칭
```

**결과:** 약칭 포함 입력의 90%가 실패

---

### 3️⃣ Gemini API가 위치를 추출하지 않음
```
현재:
  ✅ Gemini API: 카테고리, 시그니처, 타겟 고객 추출
  ❌ 위치 정보: 정규식만으로 추출 (제한적)

필요:
  ✅ Gemini API: 카테고리 + 위치 동시 추출
  
분석 프롬프트 개선:
  "업체명: {placeInfo}"
  "설명: {description}"
  
  → JSON으로 반환:
  {
    "location": {
      "city": "서울",
      "district": "강남",
      "micro_poi": "강남역"
    },
    "category": "카페",
    ... 기타
  }
```

**결과:** 구조적 정보 부족으로 신뢰도 低

---

## ✅ 단기 해결책 (1주일)

### Step 1: 약칭 정규화 시스템 추가 (2일)

**파일:** `server/aliasNormalizer.ts` (신규)

```typescript
const aliasDatabase = [
  { aliases: ['홍대', '홍대입구', '홍대동'], city: '서울', district: '마포' },
  { aliases: ['강남역', '신사동', '역삼동'], city: '서울', district: '강남' },
  { aliases: ['분당', '분당신도시'], city: '경기', district: '성남' },
  // ... 100+ 약칭
];

function normalizeLocationAlias(text: string) {
  // "홍대 카페" → { city: '서울', district: '마포' }
}
```

**효과:** 약칭 인식률 0% → ~80%

---

### Step 2: locationDatabase 확장 (2일)

**파일:** `server/locationDatabase.ts` 수정

```typescript
export const locationDatabase = {
  '서울': { 
    '강남구': {...}, '마포구': {...}, 
    '송파구': {...}, '종로구': {...},
    // ... 21개 더 추가
  },
  '부산': { 
    '부산진구': {...}, '해운대구': {...},
    // ... 14개 더
  },
  // ... 15개 시도 전부 추가
};
```

**효과:** 인식 가능 지역 5개 → 250+ 개

---

### Step 3: parseAddress 개선 (1일)

```typescript
export function parseAddress(address: string): ParsedAddress | null {
  // Step 1: 약칭 먼저 확인
  const alias = normalizeLocationAlias(address);
  if (alias.city) return alias;
  
  // Step 2: 정규식 파싱 (기존 로직)
  // ...
}
```

**효과:** 정확도 향상

---

### Step 4: Gemini 프롬프트 개선 (1일)

**파일:** `server/index.ts` - POST `/api/ai/extract-facets`

```typescript
const analysisPrompt = `...
반드시 다음 JSON 형식으로만 응답:
{
  "location": {
    "city": "도시",
    "district": "구/군",
    "micro_poi": "동/상권"
  },
  "category": "카테고리",
  ...
}`;

// JSON 파싱
geminiAnalysis.location → facetsResponse.location에 통합
```

**효과:** Gemini도 위치 추출 가능

---

## 📊 개선 전후 비교

### 테스트 케이스: "분당 피트니스센터"

#### 현재 (개선 전)
```
입력:
  placeInfo: "분당 헬스장"
  description: "경기도 성남시 분당 신도시 고급 피트니스"

출력:
  city: "경기"  (description에서 "경기도" 파싱)
  district: ""  (구/군 미검출)
  confidence: "medium"
  
❌ 실패 (기대: 경기 / 성남)
```

#### 개선 후
```
입력: (동일)

출력:
  city: "경기"
  district: "성남"  ✅ 약칭 "분당"으로 "성남" 추출
  micro_poi: "분당동"
  confidence: "high"
  extraction_method: "alias"  (약칭으로 추출됨)

✅ 통과
```

---

## 🎯 예상 개선율

| 메트릭 | 현재 | 개선 후 | 향상 |
|--------|------|--------|------|
| 약칭 인식 가능 개수 | 0개 | 100+ | ∞ |
| 전국 지역 커버율 | 2% | 95%+ | 47배 |
| 테스트 통과율 | 15% | 85%+ | 5.7배 |
| 평균 신뢰도 점수 | 0.4 | 0.8 | 2배 |

---

## 🚀 구현 체크리스트

- [ ] `server/aliasNormalizer.ts` 생성 (100+ 약칭)
- [ ] `server/locationDatabase.ts` 확장 (250+ 지역)
- [ ] `parseAddress()` 수정 (약칭 우선 처리)
- [ ] Gemini 프롬프트 개선 (location 필드 추가)
- [ ] `location_confidence.ts` 생성 (신뢰도 점수)
- [ ] 응답 스키마 수정 (`extraction_method` 추가)
- [ ] 테스트 케이스 확장 (60개 → 150개)
- [ ] `test-phase-improvements.ts` 실행 및 검증

---

## 💡 추가 고려사항

### A. 성능 영향
- 약칭 매칭: O(n) → O(1) with hashmap
- 전체 API 응답 시간: ~3초 (무시할 수 있는 수준)

### B. 유지보수
- 약칭 DB: 분기별 업데이트 (신규 상권 추가)
- 테스트: 매 배포마다 전수 실행

### C. 확장성
- 향후 Supabase에 위치 DB 마이그레이션 고려
- 사용자 피드백으로 약칭 자동 학습

---

## 📌 다음 단계

**지금 바로:**
1. `LOCATION_EXTRACTION_ANALYSIS.md` 상세 분석 검토
2. Phase 1-4 구현 스케줄 수립
3. 개발 시작

**1주일 후:**
- 테스트 통과율 85%+ 달성
- 약칭 100+ 지원

**1개월 후:**
- Supabase 마이그레이션
- 사용자 피드백 시스템 구축

