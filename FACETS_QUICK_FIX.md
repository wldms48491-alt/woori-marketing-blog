# ⚡ 자동 추출 태그 개선 - 빠른 시작 가이드

> **핵심 요약:** 사용자 입력이 완전히 무시되고 있어서, Gemini API를 추가로 호출하기만 하면 90% 개선됩니다.
>
> **예상 작업시간:** 1-2시간 (테스트 포함 2-3시간)
>
> **복잡도:** 낮음 (기존 코드 기반)
>
> **위험도:** 낮음 (폴백 처리)

---

## 🎯 1분 요약

| 항목 | 내용 |
|------|------|
| **문제** | 사용자가 "크루아상 샌드" 입력 → "시그니처"만 출력 |
| **원인** | `server/index.ts`에서 Gemini API 호출 안 함, 모두 하드코딩 |
| **해결** | `server/index.ts` 한 엔드포인트에 Gemini API 호출 추가 |
| **결과** | 사용자 입력 기반 정확한 태그 생성 |

---

## 📋 체크리스트

### 0️⃣ 사전 확인 (5분)

```bash
# 1. Gemini API 키 확인
cat .env | grep GEMINI_API_KEY
# → 값이 있어야 함 (sk-...로 시작)

# 2. 기존 코드 확인
ls -la server/index.ts
ls -la server/index-fixed.ts
# → 둘 다 있어야 함

# 3. 현재 상태 확인
npx tsx server/index.ts 2>&1 | head -20
# → 서버가 정상 시작되는지 확인
```

---

### 1️⃣ 현재 코드 백업 (2분)

```bash
# 현재 상태 저장 (혹시 모르니)
cp server/index.ts server/index.ts.backup-$(date +%s)
echo "✅ 백업 완료: server/index.ts.backup-*"
```

---

### 2️⃣ 코드 수정 (10분)

**파일:** `server/index.ts`  
**위치:** `/api/ai/extract-facets` 엔드포인트 (라인 153-185)

```typescript
// ============ 변경 전 (현재) ============

app.post('/api/ai/extract-facets', async (req, res) => {
  try {
    const { description, placeInfo } = req.body;

    if (!description || !placeInfo) {
      return res.status(400).json({ error: '필수 값 누락' });
    }

    const locationResult = extractLocationWithPriority(placeInfo, description);
    const nearbyLocations = getNearbyLocations(locationResult.city, locationResult.district);

    res.json({
      // ❌ 모두 하드코딩
      category: ['카페'],
      items: [{ name: '시그니처', signature: true }],
      audience: ['고객'],
      vibe: ['분위기'],
      // ...
    });
  } catch (error) {
    // ...
  }
});

// ============ 변경 후 (개선) ============

app.post('/api/ai/extract-facets', async (req, res) => {
  try {
    const { description, placeInfo } = req.body;
    console.log('[POST /api/ai/extract-facets]', {
      placeInfo,
      descriptionLength: description?.length
    });

    if (!description || !placeInfo) {
      return res.status(400).json({ error: '필수 값 누락' });
    }

    const locationResult = extractLocationWithPriority(placeInfo, description);
    const nearbyLocations = getNearbyLocations(locationResult.city, locationResult.district);
    
    // ✅ NEW: Gemini API 호출
    let geminiAnalysis = null;
    try {
      const genAI = getGenAI();
      if (genAI) {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        const prompt = `당신은 마케팅 분석 전문가입니다.

【업체명】${placeInfo}
【업체 설명】${description}

다음을 JSON으로 분석하세요:
{
  "category": "업종(예: 카페, 음식점, 미용)",
  "signature_items": ["메뉴/서비스1", "메뉴/서비스2"],
  "target_audience": ["타겟층1", "타겟층2"],
  "key_features": ["특징1", "특징2"],
  "vibes": ["분위기1", "분위기2"],
  "price_range": "가격대",
  "amenities": ["편의1", "편의2"]
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{[\s\S]*\}/);
        
        if (match) {
          geminiAnalysis = JSON.parse(match[0]);
          console.log('✅ Gemini 분석:', JSON.stringify(geminiAnalysis, null, 2));
        }
      }
    } catch (error) {
      console.warn('⚠️  Gemini 실패 (폴백 사용):', error.message);
    }

    // ✅ 응답 구성 (Gemini 있으면 사용, 없으면 기본값)
    const confidenceMap = { high: 0.9, medium: 0.6, low: 0.3 };
    const finalConfidence = locationResult.city && locationResult.city !== '전국' && locationResult.district ? 'high' : locationResult.city ? 'medium' : 'low';

    const response = {
      place: { 
        name: placeInfo.trim(), 
        address: `${locationResult.city} ${locationResult.district}`.trim() 
      },
      location: {
        city: locationResult.city || '전국',
        district: locationResult.district || '위치 미지정',
        neighborhoods: locationResult.neighborhoods || [],
      },
      location_confidence: {
        level: finalConfidence,
        score: confidenceMap[finalConfidence] || 0.5,
        source: locationResult.source,
      },
      // ✅ Gemini 결과 또는 기본값
      category: geminiAnalysis?.category ? [geminiAnalysis.category] : ['카페'],
      items: (geminiAnalysis?.signature_items || []).map((item) => ({
        name: item,
        signature: true
      })) || [{ name: '시그니처', signature: true }],
      audience: geminiAnalysis?.target_audience || ['고객'],
      vibe: geminiAnalysis?.vibes || ['분위기'],
      price_range: geminiAnalysis?.price_range ? [geminiAnalysis.price_range] : ['중간'],
      amenities: geminiAnalysis?.amenities || ['편의시설'],
      trade_area: nearbyLocations.metro?.slice(0, 3) || ['전국'],
    };

    res.json(response);

  } catch (error) {
    console.error('[ERROR /api/ai/extract-facets]', error);
    res.status(500).json({ error: String(error) });
  }
});
```

---

### 3️⃣ 테스트 (10-15분)

```bash
# 터미널 1: 서버 시작
cd /workspace
npx tsx server/index.ts

# 터미널 2: 테스트 요청 보내기
curl -X POST http://localhost:3005/api/ai/extract-facets \
  -H "Content-Type: application/json" \
  -d '{
    "placeInfo": "코코브루니 서현점",
    "description": "서현역 브런치 카페. 크루아상 샌드와 콜드브루 시그니처. 감성있는 분위기. 20-30대 여성 타겟"
  }' | jq .
```

**기대 출력:**
```json
{
  "place": {
    "name": "코코브루니 서현점",
    "address": "경기 성남시"
  },
  "location": {
    "city": "경기",
    "district": "성남시"
  },
  "category": ["카페"],
  "items": [
    {"name": "크루아상 샌드", "signature": true},
    {"name": "콜드브루", "signature": true}
  ],
  "audience": ["20-30대 여성"],
  "vibe": ["감성있는", "따뜻한"],
  "price_range": ["중상"],
  "amenities": ["WiFi", "주차"]
}
```

**실패 시 디버깅:**
```bash
# 로그 확인
tail -30 server-error.log

# Gemini API 키 확인
echo $GEMINI_API_KEY

# API 정상 동작 확인
curl -X POST http://localhost:3005/api/ai/extract-facets \
  -H "Content-Type: application/json" \
  -d '{"placeInfo": "카페", "description": "간단한 카페"}' 2>&1 | tee test-response.json
```

---

### 4️⃣ Frontend 확인 (5분)

```bash
# 터미널 3: Frontend 시작
npm run dev

# 브라우저에서 확인
# 1. DashboardPage 열기
# 2. 업체 선택하기 (또는 입력)
# 3. 설명 입력하기
# 4. 분석 버튼 클릭
# 5. "2. 자동 추출 태그" 섹션에서 결과 확인
```

**체크사항:**
- [ ] 메뉴/서비스에 사용자 입력 내용 포함?
- [ ] 타겟층에 구체적인 정보 포함?
- [ ] 분위기가 의미있는가?
- [ ] 기존 기능 깨진 부분 없음?

---

## ⚙️ 상세 구현 설명

### 변경점 1: Gemini API 호출 추가

```typescript
// 변경 전
res.json({ category: ['카페'], ... });

// 변경 후
const genAI = getGenAI();
if (genAI) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  geminiAnalysis = parseJSON(result.response.text());
}
```

**왜 이렇게?**
- `getGenAI()` 함수는 이미 존재 (server/index.ts에 정의됨)
- Gemini 2.0-flash는 빠르고 저렴 ($0.075/100K 입력토큰)
- JSON 파싱은 정규식으로 안전하게

---

### 변경점 2: 에러 처리 (폴백)

```typescript
try {
  // Gemini 호출
  geminiAnalysis = await callGemini();
} catch (error) {
  console.warn('⚠️  Gemini 실패:', error);
  // 계속 진행 - 기본값 사용
}

// Gemini가 없으면 기본값 사용
category: geminiAnalysis?.category || ['카페']
```

**장점:**
- Gemini API 다운 시에도 서비스 정상 작동
- 사용자가 "오류"를 보지 않음
- 기존 기능 보호

---

### 변경점 3: 응답 구조 유지

```typescript
// 기존 필드는 그대로 유지
response: {
  place: { ... },           // ← 기존
  location: { ... },        // ← 기존
  location_confidence: { }, // ← 기존
  category: [...],          // ← 개선 (값만 Gemini에서)
  items: [...],             // ← 개선 (값만 Gemini에서)
  audience: [...],          // ← 개선
  vibe: [...],              // ← 개선
  price_range: [...],       // ← 개선
  amenities: [...],         // ← 개선
  trade_area: [...]         // ← 기존
}
```

**왜?**
- Frontend가 이 구조를 기대
- 필드 순서나 이름 변경 X
- 값만 Gemini에서 생성

---

## 🧪 테스트 케이스

### TC-1: 카페 (기본)
```
입력: 
  placeInfo: "투썸플레이스"
  description: "강남역 카페. 아메리카노와 카푸치노"

기대:
  category: ["카페"]
  items: ["아메리카노", "카푸치노"]
```

### TC-2: 음식점 (카테고리 변경)
```
입력:
  placeInfo: "강남 한식당"
  description: "강남역 고급 한식당. 불고기와 갈비가 시그니처"

기대:
  category: ["한식당"] 또는 ["음식점"]
  items: ["불고기", "갈비"]
```

### TC-3: 미용 (완전히 다른 업종)
```
입력:
  placeInfo: "강남 성형외과"
  description: "강남역 성형외과. 쌍꺼풀과 코 수술 전문"

기대:
  category: ["미용"] 또는 ["의료"]
  items: ["쌍꺼풀 수술", "코 수술"]
```

### TC-4: 타겟층 추출
```
입력:
  placeInfo: "홍대 클럽"
  description: "홍대 클럽. 20대 젊은층 대상"

기대:
  audience: ["20대", "젊은층", "직장인"]
```

---

## 📊 예상 개선 효과

| 항목 | 현재 | 개선 후 | 향상도 |
|------|------|--------|--------|
| 입력 반영도 | 0% | 85-95% | ↑ 무한 |
| 응답 속도 | 200ms | 2-3초 | ↓ 10배 |
| 사용자 만족도 | 낮음 | 높음 | ↑ 큼 |
| API 비용 | $0 | $5-20/월 | 새 비용 |
| 코드 복잡도 | 낮음 | 중간 | ↑ 약간 |

---

## 🚨 주의사항

### ❌ 하지 말아야 할 것

1. **기존 위치 추출 로직 변경 금지**
   ```typescript
   // ❌ 이렇게 하지 마세요
   const locationResult = callGeminiForLocation(placeInfo);
   
   // ✅ 이렇게 하세요
   const locationResult = extractLocationWithPriority(...); // 기존 유지
   ```

2. **응답 구조 변경 금지**
   ```typescript
   // ❌ 이렇게 하지 마세요
   response: { facets: { category: "..." } };
   
   // ✅ 이렇게 하세요
   response: { category: [...] };  // 기존 구조
   ```

3. **예외 발생 금지**
   ```typescript
   // ❌ 이렇게 하지 마세요
   const result = await model.generateContent();
   const json = JSON.parse(result);  // 실패 시 에러 발생
   
   // ✅ 이렇게 하세요
   try { /* ... */ } catch (error) { /* 폴백 */ }
   ```

### ✅ 해야 할 것

1. **로깅 추가** (디버깅 용이)
   ```typescript
   console.log('📥 입력:', { placeInfo, descriptionLength });
   console.log('🤖 Gemini:', geminiAnalysis);
   ```

2. **타입 안전성** (TypeScript)
   ```typescript
   const facets: Facets = {
     category: [...],
     // 모든 필드 명시
   };
   ```

3. **에러 로깅**
   ```typescript
   console.error('❌ Gemini 실패:', error.message);
   // 사용자는 기본값으로 계속 진행
   ```

---

## 🎯 다음 단계 (선택사항)

### Phase 2: 신뢰도 점수 추가 (1-2시간)

```typescript
// 신뢰도 계산
const confidence = calculateConfidence(
  description,
  geminiAnalysis
);

response.confidence = confidence;  // 추가
```

**이점:** 사용자에게 "얼마나 정확한지" 표시

---

### Phase 3: 캐싱 (2-3시간)

```typescript
// 같은 입력에 대해 API 호출 안 함
const cacheKey = hash(`${description}|${placeInfo}`);
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

**이점:** 응답 속도 2-3초 → 100ms

---

## 📞 문제 해결

### Q: "Gemini API 키가 없어요"
**A:** `.env` 파일에 `GEMINI_API_KEY=...` 추가 후 서버 재시작

### Q: "응답이 너무 느려요"
**A:** Gemini API 응답 지연 (정상, 2-3초). Phase 3에서 캐싱 추가 가능

### Q: "JSON 파싱 에러"
**A:** Gemini가 JSON 아닌 것을 응답. 프롬프트 강화 또는 정규식 개선

### Q: "기존 기능이 깨졌어요"
**A:** Gemini 폴백으로 기본값 사용. 기존 기능은 그대로 작동

### Q: "다른 업종에서도 작동하나요?"
**A:** 네, Gemini는 카페/음식점/미용/헬스 등 모든 업종 지원

---

## ✅ 완료 체크리스트

```bash
# 수정 완료
- [ ] server/index.ts 수정됨
- [ ] Gemini API 호출 코드 추가됨
- [ ] 폴백 처리됨
- [ ] 로깅 추가됨

# 테스트 완료
- [ ] curl 테스트 통과
- [ ] 3개 이상 테스트 케이스 통과
- [ ] 에러 상황 처리 확인
- [ ] 응답 속도 측정됨

# 배포 준비
- [ ] 백업 저장됨 (server/index.ts.backup-*)
- [ ] 빌드 성공 (no TypeScript errors)
- [ ] Frontend 호환성 확인됨
- [ ] 최종 QA 완료

# 배포
- [ ] server/index.ts 반영됨
- [ ] 프로덕션 환경 배포됨
- [ ] 모니터링 설정됨
```

---

## 💡 팁

1. **점진적 배포:** 5-10% 사용자부터 시작 후 점차 확대
2. **모니터링:** Gemini API 비용 및 응답 시간 모니터링
3. **A/B 테스트:** 이전 vs 이후 비교 가능
4. **사용자 피드백:** "이 태그가 맞나요?" 버튼 추가 고려

