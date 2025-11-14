# 🔍 검색 기능 심화 분석 보고서

**작성일**: 2025년 11월 13일  
**분석 대상**: 업체명/주소 검색 기능 (InputSection.tsx + /api/search/places)

---

## 1️⃣ 발견된 주요 문제

### ❌ 문제 1: `.env.local` 파일 중복 오염
**증상**: 환경 변수가 정상 로드되지 않음  
**근본 원인**: 
```
GEMINI_API_KEY=AIzaSyB...
GEMINI_API_KEY=AIzaSyB...  ← 중복!

VITE_NAVER_CLIENT_ID=mL9o...
VITE_NAVER_CLIENT_ID=mL9o...  ← 중복!
```
- 같은 변수가 여러 번 정의됨
- dotenv 패키지는 마지막 값으로만 로드
- 백엔드 Naver API 인증 실패의 직접 원인

**해결책**: `.env.local` 파일 완전 재생성 (중복 제거)

---

## 2️⃣ 검색 흐름 분석 (8단계)

### 단계 1️⃣: 프론트엔드 입력 (InputSection.tsx)
```
사용자가 검색창 입력
    ↓
handlePlaceInputChange() 호출
    ↓
setTimeout(300ms) - 디바운싱
    ↓
fetchPlaces(query, page=1) API 호출
```

### 단계 2️⃣: API 요청 생성
```javascript
const url = `/api/search/places?query=${encodeURIComponent(query)}&page=${page}`;
console.log("🌐 API 요청 시작");
const resp = await fetch(url);
```
**확인 사항**:
- URL 인코딩: `카페` → `%EC%B9%B4%ED%8E%98` ✓
- Fetch API 정상 동작 ✓
- HTTP 상태 코드 확인 ✓

### 단계 3️⃣: 백엔드 요청 수신 (server/index.ts)
```typescript
app.get('/api/search/places', async (req, res) => {
  const { query, page = 1 } = req.query;
  console.log('🔍 [/api/search/places] 검색 요청:', { query, page });
```
**추적 포인트**:
- 쿼리 파라미터 수신 확인
- 쿼리 유효성 검증 (빈 값, Null 체크)

### 단계 4️⃣: Naver API 호출 준비
```typescript
const NAVER_CLIENT_ID = process.env.VITE_NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.VITE_NAVER_CLIENT_SECRET;

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.log('❌ Naver API 자격증명 없음');  // ← 환경변수 문제 감지
}
```
**이전 문제**: `.env.local` 중복 때문에 여기서 실패했음

### 단계 5️⃣: Naver API 실제 호출
```typescript
const response = await axios.get(
  'https://openapi.naver.com/v1/search/local.json',
  {
    params: {
      query: trimmedQuery,        // "카페"
      display: 100,              // 한 번에 100개
      start: start,              // (페이지-1)*100 + 1
      sort: 'comment'            // 댓글순
    },
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
    }
  }
);
```

### 단계 6️⃣: Naver API 응답 처리
```typescript
console.log(`✅ Naver API 응답 수신`);
console.log(`  - 전체 결과 수: ${response.data.total}`);
console.log(`  - 현재 아이템 수: ${response.data.items?.length}`);

const places = response.data.items.map(item => ({
  id: item.link.split('/').pop(),
  title: item.title.replace(/<[^>]*>/g, ''),  // HTML 태그 제거
  address: item.address,
  phone: item.telephone,
  url: item.link,
  category: item.category
}));
```

### 단계 7️⃣: 응답 반환 (프론트엔드로)
```typescript
res.json({
  success: true,
  total: response.data.total,
  places: places,                        // 변환된 데이터 배열
  hasMore: (response.data.total) > pageNum * 100,
  page: pageNum
});
```

### 단계 8️⃣: 프론트엔드 UI 렌더링
```javascript
if (data.success && Array.isArray(data.places)) {
  const results = data.places.map(p => ({
    id: p.id,
    title: p.title,
    address: p.address
  }));
  setSearchResults(results);
  setShowResults(true);
}
```

---

## 3️⃣ 잠재적 실패 지점

### 🔴 지점 1: 환경 변수 미설정
**현상**: Naver API 호출 전 실패  
**로그**: `❌ Naver API 자격증명 없음`  
**원인**: `.env.local`의 VITE_NAVER_CLIENT_ID, VITE_NAVER_CLIENT_SECRET 미설정  
**상태**: ✅ **해결됨** (`.env.local` 정리)

### 🔴 지점 2: Naver API 호출 실패
**현상**: HTTP 오류 (400, 401, 429 등)  
**로그**: 
```
❌ 네이버 API 오류: HTTP 429
또는
❌ 네이버 API 오류: HTTP 401
```
**원인**: 
- API 자격증명 오류
- API 호출 제한 초과
- 네트워크 타임아웃

### 🔴 지점 3: 응답 데이터 형식 오류
**현상**: 검색결과 표시 안됨  
**로그**: `⚠️ 응답 형식 오류`  
**원인**:
- `data.success` 값이 false
- `data.places`가 배열이 아님
- Naver API 응답 구조 변경

### 🔴 지점 4: 프론트엔드 상태 업데이트 실패
**현상**: API는 성공하지만 UI에 표시 안됨  
**원인**:
- `setSearchResults()` 호출되지 않음
- `setShowResults()` false 상태 유지
- 캐시 문제로 이전 검색어로 재검색

---

## 4️⃣ 디버깅 로그 포인트

### 📊 추가된 콘솔 로그

**백엔드 (server/index.ts)**
```javascript
// 진입 포인트
console.log('🔍 [/api/search/places] 검색 요청:', { query, page });

// 검증
console.log('환경 변수 체크:');
console.log('  - CLIENT_ID:', NAVER_CLIENT_ID ? '✓ 설정됨' : '✗ 미설정');
console.log('  - CLIENT_SECRET:', NAVER_CLIENT_SECRET ? '✓ 설정됨' : '✗ 미설정');

// API 호출
console.log('📌 Naver API 호출 준비');
console.log('  - 검색어:', trimmedQuery);
console.log('  - 페이지:', pageNum);
console.log('  - start:', start);

// 응답 수신
console.log(`✅ Naver API 응답 수신`);
console.log(`  - 전체 결과:', response.data.total);
console.log(`  - 현재 아이템:', response.data.items?.length);

// 결과 변환
console.log(`📦 변환된 결과:', places.length);

// 에러
console.error('❌ 네이버 API 오류:', error.message);
console.error('  HTTP 상태:', error.response?.status);
console.error('  응답 데이터:', error.response?.data);
```

**프론트엔드 (components/InputSection.tsx)**
```javascript
// 입력 감지
console.log("🔍 입력값:", value);

// API 요청
console.log("========== 🌐 API 요청 시작 ==========");
console.log("📤 URL:", url);

// 응답 수신
console.log("📡 응답:", resp.status, resp.statusText);

// 파싱
console.log("✅ 파싱 완료");

// 검증
if (data.success && Array.isArray(data.places)) {
  console.log("✅ 결과:", data.places.length);
} else {
  console.log("⚠️ 응답 형식 오류");
}

// 에러
console.error("❌ 검색 오류:", err);
```

---

## 5️⃣ 테스트 방법

### 🧪 브라우저 콘솔에서 확인하기

1. **브라우저 열기**
   ```
   http://127.0.0.1:3004
   ```

2. **개발자 도구 열기**
   - Windows/Linux: `F12`
   - Mac: `Cmd + Option + I`

3. **Console 탭 선택**

4. **검색창에 입력**
   - 예: "카페", "강남역 카페", "서울 음식점"

5. **콘솔 로그 확인**
   ```
   🔍 입력값: 카페
   🔄 검색 시작
   ========== 🌐 API 요청 시작 ==========
   📤 URL: /api/search/places?query=%EC%B9%B4%ED%8E%98&page=1
   📡 응답: 200 OK
   ✅ 파싱 완료
   ✅ 결과: 100
   ```

### 🧪 서버 콘솔에서 확인하기

터미널에서 npm run dev:backend 실행 중이면 다음 로그가 출력됨:

```
========== 🔍 API 검색 요청 시작 ==========
📥 받은 쿼리 파라미터: { query: '카페', page: '1' }
✓ 검색어 유효: "카페"
📌 Naver API 호출 준비
  - 검색어: "카페"
  - 페이지: 1
  - start 값: 1
  - display: 100

✅ Naver API 응답 수신
  - HTTP 상태: 200
  - 전체 결과 수: 1234567
  - 현재 페이지 아이템 수: 100

📦 변환된 결과 수: 100개
📤 응답 JSON 구조:
  success: true
  total: 1234567
  placesCount: 100
  hasMore: true
  page: 1

========== ✅ API 응답 완료 ==========
```

---

## 6️⃣ 문제 해결 체크리스트

- [x] `.env.local` 파일 중복 제거
- [x] 환경 변수 정확히 설정 (VITE_NAVER_CLIENT_ID, VITE_NAVER_CLIENT_SECRET)
- [x] 백엔드 서버 재시작 (환경 변수 재로드)
- [x] 프론트엔드 서버 재시작 (HMR 최신 코드 로드)
- [x] 브라우저 새로고침 (캐시 제거)
- [x] 상세 디버깅 로그 추가

---

## 7️⃣ 다음 단계

### 👉 사용자 테스트
1. 브라우저에서 `http://127.0.0.1:3004` 접속
2. 검색창에 "카페" 또는 "강남역" 입력
3. F12 > Console 확인하며 로그 추적
4. 결과가 나오지 않으면:
   - 콘솔 스크린샷 제공
   - 백엔드 터미널 로그 확인

### 🔧 만약 여전히 결과가 없다면
1. **확인 사항**:
   - Naver API 자격증명 유효성
   - 네트워크 연결 상태
   - Naver API 호출 제한 확인

2. **백엔드 로그 분석**:
   ```
   ❌ 검색어 없음        → 입력값 전달 문제
   ❌ Naver API 설정 없음 → 환경변수 로드 실패
   ❌ 네이버 API 오류     → API 인증/통신 문제
   ⚠️ 응답 형식 오류      → API 응답 구조 변경
   ```

---

## 📋 현재 상태 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| `.env.local` | ✅ 정리 완료 | 중복 제거, 환경변수 정확히 설정 |
| 백엔드 서버 | ✅ 실행 중 | 포트 3005, 상세 로그 추가 |
| 프론트엔드 서버 | ✅ 실행 중 | 포트 3004, 디버깅 로그 추가 |
| 브라우저 접속 | ✅ 가능 | http://127.0.0.1:3004 |
| 검색 로직 | ✅ 대기 중 | 사용자 테스트 필요 |

---

## 💡 핵심 포인트

**검색이 작동하지 않는 이유의 우선순위**:

1. 🔴 **환경 변수 미설정** ← **이미 해결됨**
2. 🟠 **Naver API 인증 실패**
3. 🟡 **응답 데이터 형식 오류**
4. 🟢 **프론트엔드 렌더링 문제**

현재 1번이 해결되었으므로, 2-4번을 추적하기 위해 **상세 디버깅 로그가 추가**되었습니다.

**다음: 브라우저 콘솔을 열고 검색을 시도하여 로그를 확인하세요!**
