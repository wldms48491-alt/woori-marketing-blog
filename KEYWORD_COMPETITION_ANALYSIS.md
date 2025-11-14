# 저경쟁 키워드 추출 로직 분석 및 개선 방안

## 현재 시스템 분석

### 🔍 경쟁도(doc_t) 계산 로직

```typescript
// 기본 계산
let doc_t = Math.max(100, sv * 0.6);

// 저경쟁 조건 (카테고리 기반)
const isLowCompetition = 
  kw.category === 'service' || 
  kw.category === 'experience' ||
  (kw.category === 'location_category' && kw.kw?.includes(district));

if (isLowCompetition) {
  doc_t = Math.max(100, sv * 0.3); // 경쟁도 30%로 낮춤
}
```

### 📊 경쟁도 레벨 분류

| 레벨 | doc_t 범위 | 의미 | 특징 |
|------|-----------|------|------|
| **very_low** 💎 | < 200 | 매우 저경쟁 | 쉽게 순위 올릴 수 있음 |
| **low** 🟢 | 200-800 | 저경쟁 | 상대적으로 기회 많음 |
| **medium** 🟡 | 800-2000 | 중경쟁 | 균형잡힌 기회 |
| **high** 🔴 | 2000+ | 고경쟁 | 어려운 시장 |

### ✅ 저경쟁 키워드 우선 조건

1. **서비스 기반 키워드** (priority 2)
   - 예: "스팀세차", "광택", "손세차"
   - 이유: 구체적이고 검색 의도가 분명함 → 경쟁 덜함

2. **경험/특징 키워드** (priority 3)
   - 예: "30년 경력 정비사", "전문적인 서비스"
   - 이유: 일반 키워드보다 구체적 → 경쟁도 낮음

3. **지역+서비스 조합**
   - 예: "광주시 스팀세차", "광주시 광택"
   - 이유: 지역성 + 서비스 구체화 → 저경쟁의 최고봉

---

## 최적 키워드 조합 4가지

### 조합 1️⃣: 저경쟁 높은검색량 (Gold Keywords) 💎
**목표**: 빠른 순위 상승과 높은 검색량의 황금 조합

```
특징:
- 저경쟁도 (< 800)
- 높은 검색량 (> 1000)
- 우선도: 높음

예시:
1. "스팀세차" (sv: 2000, doc_t: 600, 경쟁도: low)
2. "광택" (sv: 1700, doc_t: 510, 경쟁도: low)
3. "광주시 스팀세차" (sv: 1500, doc_t: 450, 경쟁도: low)

예상 결과: 빠른 순위 상승 → 빠른 트래픽 증가
```

### 조합 2️⃣: 브랜드 강화 조합
**목표**: 브랜드 인지도 강화 및 차별화

```
특징:
- 브랜드 관련 키워드
- 지역 기반 확장
- 차별화된 포지셔닝

예시:
1. "원스팀마스타" (sv: 3000, doc_t: 1800)
2. "원스팀마스타 광주" (sv: 2000, doc_t: 1200)
3. "광주시 세차장" (sv: 2500, doc_t: 1500)

예상 결과: 브랜드 신뢰도 ↑ 장기적 고객 충성도 ↑
```

### 조합 3️⃣: 검색 의도 대응 조합 (Intent-based)
**목표**: 실제 고객의 검색 의도와 완벽히 매칭

```
특징:
- 지역+카테고리 키워드 중심
- 고객 실제 검색 패턴 반영
- 높은 전환율 기대

예시:
1. "광주시 세차장" (sv: 2500, doc_t: 1500)
2. "광주 자동차 세차" (sv: 1800, doc_t: 1080)
3. "스팀세차" (sv: 2000, doc_t: 600)

예상 결과: 높은 클릭률(CTR) → 높은 전환율
```

### 조합 4️⃣: 저경쟁 쉬운승리 조합 (Easy Win)
**목표**: 빠른 매출 연결 + 초기 모멘텀 형성

```
특징:
- 매우 저경쟁 (doc_t < 500)
- 적당한 검색량 (> 500)
- 순위 올리기 쉬움

예시:
1. "광주 전문세차" (sv: 800, doc_t: 240)
2. "손세차 광주" (sv: 700, doc_t: 210)
3. "광주 가성비 세차" (sv: 650, doc_t: 195)
4. "전문 스팀세차" (sv: 900, doc_t: 270)

예상 결과: 첫 1-2주 내 Top 5 진입 → 초기 신뢰도 확보
```

---

## 저경쟁 키워드 추출 로직 개선 방안

### 현재 문제점

1. **카테고리만으로 판단**
   - service, experience는 자동으로 저경쟁으로 분류
   - 실제 검색량을 고려하지 않음

2. **절대값 기반만 사용**
   - doc_t < 800이면 저경쟁으로 분류
   - 맥락을 고려한 상대적 평가 부족

3. **키워드 조합이 없음**
   - 단일 키워드만 제공
   - SEO 전략으로 사용할 조합 부재

### ✨ 개선 방안

#### 1. 다층 경쟁도 분석

```typescript
function calculateCompetitionScore(keyword: any): number {
  let score = 0;

  // 1. 기본 경쟁도 (40점)
  const docScore = keyword.doc_t < 200 ? 40 : 
                   keyword.doc_t < 800 ? 35 : 
                   keyword.doc_t < 2000 ? 25 : 10;

  // 2. 검색량 고려 (30점)
  const svScore = keyword.sv > 3000 ? 30 :
                  keyword.sv > 1500 ? 25 :
                  keyword.sv > 800 ? 20 : 10;

  // 3. 특성 기반 (30점)
  let characterScore = 10;
  if (keyword.category === 'service') characterScore = 30;
  if (keyword.category === 'experience') characterScore = 25;
  if (keyword.category === 'location_category' && keyword.lc_score > 80) characterScore = 22;

  return docScore + svScore + characterScore;
}
```

#### 2. 의도 기반 필터링

```typescript
// 고객 검색 의도 분석
function analyzeIntent(keyword: string): string {
  if (keyword.includes('저가') || keyword.includes('싼') || keyword.includes('가성비')) 
    return 'price_sensitive';
  if (keyword.includes('추천') || keyword.includes('best') || keyword.includes('최고'))
    return 'recommendation';
  if (keyword.includes('전문') || keyword.includes('프로') || keyword.includes('경력'))
    return 'expertise';
  return 'general';
}
```

#### 3. ROI 기반 순위 지정

```typescript
// 검색량 대비 경쟁도 = ROI
function calculateROI(keyword: any): number {
  return keyword.sv / (keyword.doc_t + 1);
}

// 높은 ROI = 빠른 순위 상승 가능성 높음
// ROI > 5: 매우 효율적
// ROI 3-5: 효율적
// ROI < 3: 보통
```

---

## 구현 결과

### 응답 구조

```json
{
  "recommended_combinations": [
    {
      "name": "저경쟁 높은검색량 조합",
      "strategy": "gold",
      "keywords": [
        {
          "kw": "스팀세차",
          "sv": 2000,
          "doc_t": 600,
          "competition_level": "low"
        }
      ],
      "total_sv": 5500,
      "avg_competition": 550,
      "recommendation": "저경쟁(550) 높은검색량(1833) 조합 - 빠른 순위 상승 기대"
    }
  ],
  "all_keywords": [
    {
      "kw": "스팀세차",
      "category": "service",
      "priority": 2,
      "sv": 2000,
      "doc_t": 600,
      "is_low_competition": true,
      "competition_level": "low"
    }
  ]
}
```

---

## 사용 가이드

### 전략별 사용 시점

| 상황 | 추천 조합 | 이유 |
|------|---------|------|
| 🚀 빠른 순위 필요 | Gold (1번) | 저경쟁+높은 검색량 = 빠른 효과 |
| 🎯 브랜드 구축 | Brand (2번) | 브랜드 인지도 강화 |
| 💰 매출 연결 | Intent (3번) | 고객 의도 대응 = 높은 전환 |
| 🎪 초기 신뢰 | Easy Win (4번) | 빠른 성공 사례 = 신뢰도 확보 |

### 블로그 포스팅 전략

1. **Gold 조합** (1주: 우선)
   - 각 키워드별 1-2개 포스팅
   - 총 3-4개 포스팅
   - 목표: 빠른 순위 상승

2. **Intent 조합** (2주)
   - 키워드별 심층 포스팅
   - 총 3개 포스팅
   - 목표: 높은 클릭 전환

3. **Easy Win 조합** (3주)
   - 실제 이용 후기 포스팅
   - 총 4개 포스팅
   - 목표: 신뢰도 + 초기 매출

4. **Brand 조합** (진행 중)
   - 브랜드 스토리 포스팅
   - 월 2개 정도
   - 목표: 장기 고객 충성도
