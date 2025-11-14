# 업체명/주소 검색 기능 분석 보고서

## 🔍 현황 분석

### 1. 검색 구조 (정상)
- **프론트엔드**: `InputSection.tsx` - 검색 입력 및 자동완성 UI
- **백엔드 API**: `/api/search/places` - 네이버 로컬 검색 API 호출
- **네이버 API**: 자격증명 설정됨 (CLIENT_ID, SECRET 확인함)

### 2. 코드 흐름 분석

#### 프론트엔드 (`InputSection.tsx`)
```
사용자 입력 → handlePlaceInputChange
  ↓
300ms 디바운스 후 fetchPlaces() 호출
  ↓
GET /api/search/places?query={검색어}&page={페이지}
  ↓
응답 처리 및 결과 표시
```

**현재 구현된 기능:**
- ✅ 검색 입력 필드
- ✅ 300ms 디바운스 (중복 요청 방지)
- ✅ 캐시 기능 (5분 유효)
- ✅ 페이지네이션 (100개씩)
- ✅ 상세 콘솔 로깅

#### 백엔드 (`server/index.ts`)
```
GET /api/search/places
  ↓
쿼리 검증 (필수값 확인)
  ↓
Naver API 호출 (네이버 클라이언트 ID/SECRET 사용)
  ↓
응답 포맷팅:
  - id: 링크에서 추출
  - title: HTML 태그 제거
  - address: 주소
  - phone: 전화번호
  - url: 링크
  - category: 카테고리
  ↓
JSON 반환
```

**환경변수 상태:**
```
VITE_NAVER_CLIENT_ID=mL9oHmG_vjlkuPw99wYd ✓
VITE_NAVER_CLIENT_SECRET=WkLRVe99Dk ✓
```

### 3. 잠재적 문제점

#### 🔴 **문제 1: 환경변수 접근 경로**
- `server/index.ts`에서 환경변수 읽기:
  ```typescript
  const NAVER_CLIENT_ID = process.env.VITE_NAVER_CLIENT_ID;
  const NAVER_CLIENT_SECRET = process.env.VITE_NAVER_CLIENT_SECRET;
  ```
- **문제**: `VITE_` 접두사는 프론트엔드 전용
- **해결**: 백엔드용 환경변수 이름 변경 필요

#### 🔴 **문제 2: 백엔드에서 `VITE_` 변수 인식 불가**
- `.env.local`은 Vite 개발 서버에 의해서만 처리됨
- `tsx` 직접 실행 시 `process.env`에서 변수를 찾을 수 없음
- `dotenv` 패키지가 있지만 경로 지정이 필요할 수 있음

#### 🟡 **문제 3: 네이버 API 응답 처리**
- HTML 태그 제거 정규식: `/<[^>]*>/g` (기본적)
- HTML 엔티티 처리: `/&([a-z]+);/g` (일부만 처리)
- 더 강화된 처리 필요할 수 있음

#### 🟡 **문제 4: 오류 처리 미흡**
- API 401/403 오류 시 "빈 결과" 반환
  ```typescript
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return res.json({ success: false, total: 0, places: [] });
  }
  ```
- 사용자는 오류 원인을 알 수 없음

---

## 🛠️ 해결 방안

### Step 1: 환경변수 재정의
`/.env.local` 수정:
```dotenv
# 백엔드용 네이버 API
NAVER_CLIENT_ID=mL9oHmG_vjlkuPw99wYd
NAVER_CLIENT_SECRET=WkLRVe99Dk

# 프론트엔드용 (필요시)
VITE_API_BASE_URL=http://127.0.0.1:3005
```

### Step 2: 백엔드 환경변수 로드 확인
```typescript
// server/index.ts 최상단에 추가
import 'dotenv/config.js'; // 이미 있음 ✓

// 디버깅 로그
console.log('Naver Client ID:', process.env.NAVER_CLIENT_ID ? '✓ 로드됨' : '✗ 미로드');
console.log('Naver Secret:', process.env.NAVER_CLIENT_SECRET ? '✓ 로드됨' : '✗ 미로드');
```

### Step 3: HTML 디코딩 강화
```typescript
function decodeHtmlEntities(text: string) {
  const map = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
    '&nbsp;': ' ', '&ldquo;': '"', '&rdquo;': '"', '&lsquo;': "'", '&rsquo;': "'"
  };
  return text.replace(/&[#\w]+;/g, (entity) => map[entity] || entity);
}
```

### Step 4: 디버깅 개선
- API 호출 시 성공/실패 로그 출력
- 클라이언트에 오류 메시지 전달
- 네이버 API 응답 구조 로깅

---

## 📊 테스트 결과

### 검사 항목
- [x] 환경변수 파일 확인: `.env.local` 존재, 자격증명 설정됨
- [x] 백엔드 서버 상태: 실행 중 (포트 3005)
- [x] 프론트엔드 UI: 검색 입력 필드 있음
- [x] 백엔드 API 응답 구조: 정상
- [ ] 네이버 API 실제 호출: **미확인 (환경변수 로드 의심)**

---

## ✅ 권장 조치

1. **우선순위 높음**: 백엔드에서 환경변수 정상 로드 확인
2. **우선순위 높음**: `/api/search/places` API 응답 테스트
3. **우선순위 중간**: 오류 처리 및 디버깅 메시지 개선
4. **우선순위 낮음**: HTML 디코딩 강화 (필요시)

