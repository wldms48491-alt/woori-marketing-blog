# Gemini API 통합 분석 및 개선 가이드

**작성일**: 2025년 11월 13일  
**상태**: ✅ 완료 및 검증 준비

---

## 📋 목차

1. [문제 분석](#문제-분석)
2. [개선 사항](#개선-사항)
3. [API 흐름도](#api-흐름도)
4. [사용 방법](#사용-방법)
5. [디버깅 가이드](#디버깅-가이드)
6. [성능 최적화](#성능-최적화)

---

## 🔴 문제 분석

### 이전 상태 (하드코딩)

```typescript
// ❌ 문제: 더미 데이터만 반환 (UI 테스트용)
const keywords = [
  { kw: '강남 카페', sv: 8900, ... },
  { kw: '분위기 좋은 카페', sv: 5600, ... }
];
return res.json(keywords);
```

### 문제점

1. **입력 데이터 무시**: 선택된 업체명과 설명이 전혀 반영되지 않음
2. **AI 미사용**: Gemini API 설정되어 있지만 사용하지 않음
3. **불일치한 결과**: 사용자가 입력한 내용과 추출 태그가 맞지 않음
4. **키워드 부족**: 해당 업체에 맞는 키워드 생성 안 함

---

## ✅ 개선 사항

### 1️⃣ `/api/ai/extract-facets` 엔드포인트

**이전**: 더미 데이터 + 정규표현식만 사용

**현재**: 
```
1단계: 위치 정보 추출 (locationDatabase.ts)
2단계: Gemini API 호출 - 실제 분석
   - 업체명 + 설명을 프롬프트로 전송
   - JSON 형식의 분석 결과 수신
   - 카테고리, 시그니처, 타겟, 특징 추출
3단계: 응답 구성 (Facets 타입에 맞춤)
```

**프롬프트**:
```
당신은 마케팅 분석 전문가입니다. 다음 업체 정보를 분석하세요.

【업체명】${placeInfo}
【업체 설명】${description}

JSON 형식으로 반환:
{
  "category": "카페 또는 음식점 또는 기타",
  "signature_items": ["항목1", "항목2"],
  "target_audience": ["타겟1", "타겟2"],
  "key_features": ["특징1", "특징2"],
  ...
}
```

**로그 출력 예**:
```
========== 📊 Facet 추출 시작 ==========
📥 입력 정보:
  - 업체명: 코코브루니 서현점
  - 설명 길이: 87

1️⃣ 위치 정보 추출 중...
✅ 위치 정보 완료: { city: '경기도', district: '성남시', confidence: 'high' }

2️⃣ Gemini API를 통한 AI 분석 중...
🤖 API 호출...
📝 원본 응답: {"category": "카페", "signature_items": ["크루아상 샌드", "콜드브루"], ...}
✅ Gemini 분석 완료
📊 추출 데이터: { category: '카페', signatures: 2, audience: 2, features: 3 }

3️⃣ 최종 응답 구성 중...
========== ✅ Facet 추출 완료 ==========
```

---

### 2️⃣ `/api/ai/rank-keywords` 엔드포인트

**이전**: 하드코딩된 3개 키워드만 반환

**현재**:
```
1단계: Facets 데이터 분석
   - 업체명, 카테고리, 시그니처, 타겟 고객 추출
   
2단계: Gemini API 호출 - 키워드 생성
   프롬프트: "다음 정보를 기반으로 5-8개 키워드 생성"
   - 응답: JSON 배열 형식 키워드 리스트
   - 각 키워드: sv, doc_t, lc_score, 신뢰도 포함
   
3단계: 폴백 로직
   - Gemini 실패 시 업체명 + 카테고리 + 지역 기반 자동 생성
   - 최소 5개 보장
```

**응답 예시**:
```json
[
  {
    "kw": "강남역 감성 카페",
    "sv": 3200,
    "doc_t": 3200,
    "sv_effective": 2800,
    "sv_exact": 3200,
    "lc_score": 88,
    "why": "지역 + 카테고리 + 감성 단어 조합",
    "conf": 0.92,
    "explanation": "강남역 이용객 중 감성 카페를 찾는 고객",
    "threshold_pass": true,
    "threshold_rule": "STRICT_500",
    "explanation_threshold": "월간 검색량 500 이상"
  },
  ...
]
```

---

### 3️⃣ `/api/ai/generate-guideline` 엔드포인트

**이전**: 고정된 마크다운 템플릿만 사용

**현재**:
```
1단계: 키워드 분석
   - 상위 5개 키워드 추출
   
2단계: Gemini API 호출
   프롬프트: "다음 키워드와 톤으로 마케팅 가이드라인 작성"
   
3단계: 마크다운 형식 가이드라인 반환
   - 전략 개요
   - 타겟 고객층
   - 핵심 메시지
   - 채널별 전략 (SNS, 블로그)
   - 성과 지표
```

---

## 📊 API 흐름도

```
┌─────────────────────────────────────────────────────────────┐
│                        프론트엔드                             │
│  DashboardPage.tsx                                            │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ 1. 업체명 + 설명 입력
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
   ┌──────────────────┐              ┌─────────────────────┐
   │ Facet 추출       │              │ Keyword 랭킹        │
   │ /api/ai/         │              │ /api/ai/rank-      │
   │ extract-facets   │              │ keywords            │
   └────────┬─────────┘              └──────────┬──────────┘
            │                                   │
            │ 2. 업체정보 + 설명                │
            │    (선택된 업체)                  │
            │                                  │
            ▼                                  ▼
   ┌─────────────────────────────┐   ┌────────────────┐
   │   Gemini API 호출           │   │ Gemini API     │
   │                             │   │ (키워드 생성)  │
   │ ✅ 카테고리 분석            │   │                │
   │ ✅ 시그니처 메뉴 추출       │   │ → 5-8개        │
   │ ✅ 타겟 고객층 분석         │   │ 키워드         │
   │ ✅ 주요 특징 추출           │   │                │
   │ ✅ 거래 지역 분석           │   │ → sv, score    │
   └─────────────────────────────┘   │ 포함           │
            │                         └────────────────┘
            │                                │
            │ 3. Facets JSON               │ 4. Keywords JSON
            │                                │
            ▼                                ▼
   ┌─────────────────────────────────────────────────┐
   │         Guideline 생성                          │
   │      /api/ai/generate-guideline                 │
   │                                                 │
   │  - 키워드 기반 마케팅 전략 작성                 │
   │  - Gemini API → 마크다운 생성                  │
   │  - 톤(Tone) 반영                               │
   └──────────────────┬──────────────────────────────┘
                      │
                      │ 5. Guideline 마크다운
                      │
                      ▼
            ┌──────────────────┐
            │  UI 표시         │
            │  • 자동추출 탭   │
            │  • 키워드 목록   │
            │  • 가이드라인    │
            └──────────────────┘
```

---

## 🚀 사용 방법

### 1단계: 업체 선택 및 설명 입력

```typescript
// DashboardPage.tsx 기본값
const [placeInput, setPlaceInput] = useState<string>("코코브루니 서현점");
const [userInput, setUserInput] = useState<string>(
  "분당 서현역 근처 브런치 카페. 시그니처는 크루아상 샌드와 콜드브루. 20-30대 여성 방문多."
);
```

### 2단계: 키워드 분석 버튼 클릭

```typescript
// handleAnalyze 함수 실행
const handleAnalyze = useCallback(async () => {
  // 1. Facet 추출
  const extractedFacets = await extractFacets(userInput, placeInput);
  setFacets(extractedFacets);

  // 2. 키워드 랭킹
  const ranked = await rankKeywords(extractedFacets);
  setRecommendedKeywords(ranked);
}, [userInput, placeInput]);
```

### 3단계: 결과 확인

**자동추출 탭**: extractedFacets 표시
```
【자동추출 정보】
• 카테고리: 카페
• 시그니처: 크루아상 샌드, 콜드브루
• 타겟 고객: 20-30대 여성
• 위치: 경기도 성남시
• 특징: 감성 있는 공간, 브런치 전문
```

**추천 키워드**: 키워드 목록 표시

**가이드라인**: 마케팅 전략 표시

---

## 🔍 디버깅 가이드

### 브라우저 콘솔 확인 (F12)

```javascript
// 1. API 호출 확인
console.log('📤 URL:', url);
console.log('📡 응답:', resp.status);

// 2. JSON 파싱 확인
console.log('✅ 파싱 완료');
console.log('📊 데이터:', data);
```

### 백엔드 로그 확인

**Extract Facets 로그**:
```
========== 📊 Facet 추출 시작 ==========
📥 입력 정보:
  - 업체명: [입력값]
  - 설명 길이: [길이]

1️⃣ 위치 정보 추출 중...
✅ 위치 정보 완료: { city, district, confidence }

2️⃣ Gemini API를 통한 AI 분석 중...
🤖 API 호출...
✅ Gemini 분석 완료
📊 추출 데이터: { category, signatures, audience, features }

3️⃣ 최종 응답 구성 중...
========== ✅ Facet 추출 완료 ==========
```

**Rank Keywords 로그**:
```
========== 🎯 키워드 랭킹 시작 ==========
📥 Facets 데이터 수신: { place, category, itemCount, audience }

🤖 Gemini API를 통한 키워드 분석 중...
📤 프롬프트 전송...
✅ 키워드 분석 완료: 5개

✅ 최종 키워드: [kw1, kw2, ...]
========== ✅ 키워드 랭킹 완료 ==========
```

### 오류 해결

**❌ "Gemini API 키 미설정"**
- `.env.local` 확인: `GEMINI_API_KEY` 존재 여부
- 백엔드 재시작: `npm run dev:backend`
- 값이 비어있지 않은지 확인

**❌ "JSON 파싱 실패"**
- 백엔드 로그에서 "원본 응답" 확인
- Gemini 응답이 유효한 JSON인지 확인
- 폴백 로직이 작동함 (기본값 생성)

**❌ "응답 타입 불일치"**
- `types.ts`의 Facets 인터페이스 확인
- 백엔드 응답 구조와 비교
- 필수 필드 전부 포함되는지 확인

---

## ⚡ 성능 최적화

### 1. 캐싱 전략

**프론트엔드 캐싱** (`InputSection.tsx`):
```typescript
const searchCache: SearchCache = {
  query: string;
  results: PlaceResult[];
  timestamp: number;
  hasMore: boolean;
  total: number;
}; // 5분 TTL
```

**백엔드 캐싱** (구현 권장):
```typescript
interface CachedFacets {
  placeInfo: string;
  description: string;
  result: Facets;
  timestamp: number;
}

const facetsCache = new Map<string, CachedFacets>();

const cacheKey = `${placeInfo}|${description}`;
if (facetsCache.has(cacheKey) && Date.now() - facetsCache.get(cacheKey)!.timestamp < 30 * 60 * 1000) {
  return res.json(facetsCache.get(cacheKey)!.result);
}
```

### 2. 배치 처리

```typescript
// 여러 업체 한 번에 분석
POST /api/ai/extract-facets-batch
{
  "places": [
    { placeInfo, description },
    { placeInfo, description }
  ]
}
```

### 3. 비동기 처리 개선

```typescript
// 병렬 API 호출
const [facets, keywords] = await Promise.all([
  extractFacets(userInput, placeInput),
  rankKeywords(extractedFacets) // facets 수신 후
]);
```

---

## 📈 다음 단계

### 근단기 (1-2주)

- [ ] Gemini 분석 결과 정확도 검증
- [ ] 실제 업체 데이터로 테스트
- [ ] 키워드 검색량 실제 데이터 연동
- [ ] 에러 핸들링 강화

### 중기 (1개월)

- [ ] 캐싱 시스템 구현
- [ ] 배치 분석 기능
- [ ] 분석 이력 저장 (Supabase)
- [ ] 성능 모니터링

### 장기 (3개월)

- [ ] 커스텀 Gemini 모델 학습
- [ ] Naver 크롤링 기반 실시간 데이터 연동
- [ ] 경쟁사 분석 기능
- [ ] 자동 마케팅 리포트 생성

---

## 📞 기술 지원

**문제 발생 시 확인 사항**:

1. `.env.local` 파일 확인
   - GEMINI_API_KEY 존재 여부
   - 올바른 형식인지 확인

2. 백엔드 로그 확인
   - `npm run dev:backend` 터미널에서 에러 메시지 확인

3. 네트워크 확인
   - API 엔드포인트 URL 정확성
   - 프론트엔드/백엔드 포트 (3004/3005) 확인

4. 타입 검증
   - 요청/응답 JSON 구조 확인
   - types.ts 인터페이스 확인

---

**작성**: Copilot  
**마지막 업데이트**: 2025년 11월 13일
