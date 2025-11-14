# 🔍 자동 추출 태그 문제 분석 및 개선 방안

## 📌 핵심 문제 요약

사용자가 업체를 선택하고 업체 정보를 직접 입력했을 때, **자동 추출 태그가 사용자 입력 내용과 전혀 일치하지 않는 문제**가 발생하고 있습니다.

### 현재 증상
```
사용자 입력:
  업체명: "코코브루니 서현점"
  설명: "서현역 근처 브런치 카페. 크루아상과 콜드브루 시그니처"
  
자동 추출 결과:
  ❌ 카테고리: 카페 (맞음)
  ❌ 시그니처: "시그니처" (사용자 입력 무시)
  ❌ 타겟 고객: "고객" (일반적)
  ❌ 분위기: "분위기" (일반적)
  ❌ 가격대: "중간" (가정)
  ❌ 편의시설: "편의시설" (가정)
```

---

## 🎯 근본 원인 분석

### 1️⃣ 입력 데이터가 AI에 전달되지 않음 (CRITICAL)

**파일:** `server/index.ts` (라인 153-185)

```typescript
app.post('/api/ai/extract-facets', async (req, res) => {
  const { description, placeInfo } = req.body;  // ✓ 받고 있음
  
  // ❌ 문제: Gemini API를 사용하지 않음
  // ❌ 문제: description과 placeInfo를 AI에 전달하지 않음
  
  // 대신 위치 정보만 정규식으로 추출하고 나머지는 모두 하드코딩
  res.json({
    place: { name: placeInfo.trim(), address: `${locationResult.city}...` },
    location: { ... },
    category: ['카페'],  // ← 하드코딩!
    items: [{ name: '시그니처', signature: true }],  // ← 하드코딩!
    audience: ['고객'],  // ← 하드코딩!
    vibe: ['분위기'],  // ← 하드코딩!
    price_range: ['중간'],  // ← 하드코딩!
    amenities: ['편의시설'],  // ← 하드코딩!
  });
});
```

**영향:** 사용자 입력의 90%가 무시됨

---

### 2️⃣ Gemini API가 환경 설정되어 있지만 사용 안 함

**기대값:**
- `GEMINI_API_KEY`가 `.env`에 설정되어 있음
- `server/index-fixed.ts`에서 Gemini 호출 코드가 있음 (라인 181-210)

**현실:**
- `server/index.ts`에는 Gemini API 호출 코드가 없음
- 모든 추출이 정규식 + 하드코딩으로만 진행됨

---

### 3️⃣ 데이터 흐름 미스매치

```
현재 흐름:
  User Input (description, placeInfo)
       ↓
  Backend: /api/ai/extract-facets
       ↓
  ❌ AI 분석 안 함
  ❌ 정규식만 위치 추출
  ❌ 나머지는 하드코딩 응답
       ↓
  Frontend: 일반적인 태그 표시 (업체와 무관)

필요한 흐름:
  User Input (description, placeInfo)
       ↓
  Backend: /api/ai/extract-facets
       ↓
  ✅ Gemini API에 프롬프트 전달
  ✅ 카테고리, 시그니처, 타겟, 특징 등 추출
  ✅ 구조화된 JSON 응답
       ↓
  Frontend: 추출된 정보 표시
```

---

### 4️⃣ 기술 부채 (Technical Debt)

| 파일 | 상태 | 설명 |
|------|------|------|
| `server/index.ts` | ❌ 사용 중 | Gemini API 호출 없음, 모두 하드코딩 |
| `server/index-fixed.ts` | ✅ 존재 | Gemini API 호출 코드 있음 |
| `supabase/functions/gemini-facets/index.ts` | ✅ 존재 | Edge Function용 완성 코드 |

**문제:** 수정된 코드(`index-fixed.ts`)가 사용 중인 코드(`index.ts`)로 반영되지 않음

---

## 💡 개선 방안 (3가지 레벨)

### 📊 아키텍처 이해

```
┌─────────────────────────────────────┐
│ Frontend (React)                    │
│  - DashboardPage.tsx                │
│  - InputSection (업체선택 + 입력)  │
│  - FacetsDisplay (결과 표시)       │
└────────────┬────────────────────────┘
             │ POST /api/ai/extract-facets
             │ { description, placeInfo }
             ↓
┌─────────────────────────────────────┐
│ Backend (Express)                   │
│  - server/index.ts [현재 문제]      │
│    ❌ 입력 무시                     │
│    ❌ 하드코딩 응답                 │
└─────────────────────────────────────┘
```

---

## 🔧 개선 옵션별 비교

### 옵션 A: 최소 변경 (1-2시간)
**목표:** 기존 기능은 그대로 두고, Gemini API 추가

```typescript
// server/index.ts 수정
app.post('/api/ai/extract-facets', async (req, res) => {
  const { description, placeInfo } = req.body;
  
  try {
    // 1단계: 위치 추출 (기존 유지)
    const locationResult = extractLocationWithPriority(placeInfo, description);
    
    // 2단계: Gemini API로 나머지 추출 (신규)
    const genAI = getGenAI();
    if (!genAI) {
      // Gemini 불가 시 폴백 (기존대로)
      return res.json({ ...defaultResponse });
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `업체명: ${placeInfo}\n설명: ${description}\n\nJSON으로 추출...`;
    const result = await model.generateContent(prompt);
    const analysis = extractJSON(result.response.text());
    
    // 3단계: 위치 + Gemini 결과 병합
    res.json({
      place: { ... },
      location: { ... },
      category: analysis.category || ['카페'],
      items: (analysis.signature_items || []).map(name => ({name, signature: true})),
      audience: analysis.target_audience || [],
      vibe: analysis.vibes || [],
      price_range: [analysis.price_range] || [],
      amenities: analysis.amenities || [],
    });
  } catch (error) {
    // 에러 시 기본값으로 폴백
    res.json({ ...defaultResponse });
  }
});
```

**장점:**
- ✅ 기존 기능 유지 (위치 추출)
- ✅ 안정성: Gemini 오류 시 폴백
- ✅ 최소 코드 변경
- ✅ 즉시 개선 가능

**단점:**
- ❌ API 비용 증가
- ❌ 응답 시간 증가 (2-3초)

---

### 옵션 B: 코드 정리 (3-4시간)
**목표:** `index-fixed.ts` 코드를 `index.ts`에 반영, 완전한 Gemini 통합

```typescript
// server/index.ts를 index-fixed.ts 기반으로 재작성

class FacetsExtractor {
  async extract(description: string, placeInfo: string) {
    // 1. 위치 추출
    const location = this.extractLocation(placeInfo, description);
    
    // 2. Gemini 분석
    const geminiAnalysis = await this.analyzeWithGemini(
      placeInfo, 
      description
    );
    
    // 3. 신뢰도 계산
    const confidence = this.calculateConfidence(
      placeInfo, 
      description, 
      location
    );
    
    // 4. 근처 장소 조회
    const nearby = this.getNearbyLocations(location);
    
    // 5. 응답 구성
    return this.composeResponse({
      location,
      geminiAnalysis,
      confidence,
      nearby
    });
  }
  
  private async analyzeWithGemini(placeInfo: string, description: string) {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `마케팅 분석 전문가입니다.
【업체명】${placeInfo}
【업체 설명】${description}

JSON으로만 응답:
{
  "category": "...",
  "signature_items": [...],
  "target_audience": [...],
  "key_features": [...],
  "vibes": [...],
  "price_range": "...",
  "amenities": [...]
}`;
    
    const result = await model.generateContent(prompt);
    return this.extractJSON(result.response.text());
  }
}
```

**장점:**
- ✅ 코드 정리: 타입 안전, 구조화
- ✅ 유지보수성 향상
- ✅ 테스트 가능한 구조
- ✅ 확장성 (향후 더 많은 기능 추가 용이)

**단점:**
- ❌ 리팩토링 필요
- ❌ 테스트 필요

---

### 옵션 C: 캐싱 + 최적화 (5-6시간)
**목표:** 옵션 B + 응답 캐싱 + 병렬 처리 + 프롬프트 최적화

```typescript
// 1. 캐싱 레이어 추가
const cache = new Map<string, CacheEntry>();

async function extractFacetsWithCache(
  description: string, 
  placeInfo: string
) {
  const cacheKey = hash(`${description}|${placeInfo}`);
  
  // 캐시 확인
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.value;
  }
  
  // 병렬 처리: 위치 + Gemini 동시 실행
  const [location, geminiAnalysis] = await Promise.all([
    extractLocationAsync(description, placeInfo),
    analyzeWithGeminiAsync(description, placeInfo)
  ]);
  
  const result = { location, geminiAnalysis, ... };
  
  // 캐시 저장
  cache.set(cacheKey, { value: result, timestamp: Date.now() });
  
  return result;
}

// 2. 프롬프트 최적화 (가능한 한 간결하게)
const optimizedPrompt = `업체: ${placeInfo}
${description}

JSON:
{"category":"","items":[],"audience":[],"features":[],"vibes":[],"price":"","amenities":[]}`;

// 3. 스트리밍 응답 (선택사항)
model.generateContentStream(prompt).on('content', (chunk) => {
  // 실시간으로 부분 결과 전송
});
```

**장점:**
- ✅ 성능: 응답 속도 2-3배 향상
- ✅ 비용 절감: 캐싱으로 API 호출 감소
- ✅ 사용자 경험: 더 빠른 응답
- ✅ 확장성: 많은 요청 처리 가능

**단점:**
- ❌ 복잡도 증가
- ❌ 캐시 관리 필요
- ❌ 테스트 복잡도 증가

---

## 📋 상세 개선 단계

### Phase 1: Gemini API 통합 (필수)

**1-1. 환경 설정 확인**
```bash
# .env 파일 확인
GEMINI_API_KEY=sk-... # ← 이 값이 있어야 함
```

**1-2. 프롬프트 설계**
```
구조: 업체명 + 설명 → 카테고리 + 시그니처 + 타겟 + 특징 등

입력 예:
  업체명: "코코브루니 서현점"
  설명: "서현역 브런치 카페. 크루아상과 콜드브루 시그니처. 20-30대 여성"

출력 예:
  {
    "category": "카페",
    "signature_items": ["크루아상 샌드", "콜드브루"],
    "target_audience": ["20-30대 여성", "직장인"],
    "key_features": ["브런치 전문", "감성"],
    "vibes": ["편안한", "트렌디"],
    "price_range": "중상",
    "amenities": ["WiFi", "주차", "화장실"]
  }
```

**1-3. 코드 구현**
```typescript
// server/index.ts 수정
async function extractFacetsWithGemini(
  description: string,
  placeInfo: string
): Promise<Facets> {
  const genAI = getGenAI();
  
  if (!genAI) {
    console.warn('Gemini API 미설정, 기본값 반환');
    return getDefaultFacets();
  }
  
  try {
    const model = genAI.getGenerativeModel({model: 'gemini-2.0-flash'});
    
    const prompt = `...`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // JSON 추출
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON 파싱 실패');
    
    return JSON.parse(match[0]);
  } catch (error) {
    console.error('Gemini 분석 실패:', error);
    return getDefaultFacets();  // 폴백
  }
}
```

---

### Phase 2: 신뢰도 점수 추가 (권장)

```typescript
interface FacetsWithConfidence {
  facets: Facets;
  confidence: {
    overall: number;  // 0-1
    byField: {
      category: number;
      items: number;
      audience: number;
      // ...
    };
    explanation: string;
  };
}

// 신뢰도 계산 로직
function calculateConfidence(
  input: { description: string, placeInfo: string },
  extracted: Facets
): number {
  let score = 0;
  
  // 입력 텍스트가 추출된 항목을 포함하는지 확인
  const text = `${input.description}|${input.placeInfo}`.toLowerCase();
  
  if (extracted.category && text.includes(extracted.category)) score += 0.15;
  if (extracted.signature_items?.some(item => text.includes(item))) score += 0.25;
  if (extracted.target_audience?.some(aud => text.includes(aud))) score += 0.2;
  if (extracted.key_features?.some(feat => text.includes(feat))) score += 0.2;
  
  // 최소값 (기본 신뢰도)
  if (score === 0) score = 0.5;
  
  return Math.min(score, 1);
}
```

---

### Phase 3: 사용자 피드백 루프 (장기)

```typescript
interface UserFeedback {
  extractedFacets: Facets;
  userCorrections: {
    field: string;
    original: string;
    corrected: string;
  }[];
  isAccurate: boolean;
}

// 피드백 저장 (Supabase)
await saveUserFeedback(feedback);

// 정기적으로: 피드백 분석 → 프롬프트 개선
// "사용자가 자주 수정하는 필드?" → 프롬프트 강조
```

---

## 🚨 주의사항 (기존 기능 보호)

### ❌ 해서는 안 될 것들

1. **위치 추출 로직 변경 금지**
   - 현재 `extractLocationWithPriority()` 안 건드리기
   - 위치 신뢰도 점수 시스템 유지

2. **기본값 제거 금지**
   - Gemini API 실패 시 기본값 반환
   - 사용자에게 "오류" 표시 X

3. **응답 구조 변경 금지**
   - Frontend에서 기대하는 필드 구조 유지
   - 새 필드는 추가만 가능 (제거 X)

### ✅ 해야 할 것들

1. **에러 처리 강화**
   ```typescript
   try {
     // Gemini 호출
   } catch (error) {
     console.error(error);
     res.json({ ...defaultFacets });  // 폴백
   }
   ```

2. **로깅 추가**
   ```typescript
   console.log('📥 입력:', { description, placeInfo });
   console.log('🤖 Gemini 응답:', extracted);
   console.log('📤 최종 응답:', facets);
   ```

3. **타입 안전성 유지**
   ```typescript
   const facets: Facets = {
     category: extracted.category || [],
     items: extracted.signature_items?.map(name => ({
       name,
       signature: true
     })) || [],
     // ... 모든 필드 명시적으로
   };
   ```

---

## 📊 개선 효과 예상

| 항목 | 현재 | 개선 후 |
|------|------|--------|
| 입력 반영도 | 0% | 85-95% |
| 사용자 만족도 | 낮음 | 높음 |
| 응답 시간 | 200ms | 2-3초 |
| API 비용 | 거의 0 | 월 $5-20 |
| 안정성 | 높음 | 높음 (폴백) |

---

## 🎯 추천 실행 순서

### 1단계 (필수, 1-2시간)
- [ ] Gemini API 통합 (옵션 A)
- [ ] 테스트 및 검증
- [ ] 배포

### 2단계 (권장, 2-3시간)
- [ ] 신뢰도 점수 추가
- [ ] 로깅 개선
- [ ] 사용자 테스트

### 3단계 (선택, 4-5시간)
- [ ] 캐싱 구현
- [ ] 프롬프트 최적화
- [ ] 성능 테스트

---

## 📁 관련 파일 맵

```
✅ 이미 구현된 것:
  - server/index-fixed.ts (Gemini API 호출 코드)
  - supabase/functions/gemini-facets/index.ts (Edge Function)
  - server/locationConfidence.ts (신뢰도 계산)
  
❌ 현재 문제:
  - server/index.ts (사용 중이지만 Gemini API 미사용)
  
🔄 수정 필요:
  - server/index.ts: /api/ai/extract-facets 엔드포인트
  - 테스트 파일들: test-phase-improvements.ts 등으로 검증
```

---

## 💬 FAQ

**Q: 기존 기능에 영향을 줄까?**
A: 아니오. 폴백 처리로 Gemini API 실패 시 기존 동작 유지.

**Q: 왜 아직 index-fixed.ts를 사용 중이 아닌가?**
A: 파일은 있지만 배포되지 않았음. index.ts가 여전히 사용 중.

**Q: API 비용이 많이 들까?**
A: Gemini 2.0-flash 기준 매월 $0.01-20 정도 (사용량에 따라).

**Q: 언제 개선하면 좋을까?**
A: 기존 기능 영향 없으므로 언제든 가능. 1-2주 내에 권장.

