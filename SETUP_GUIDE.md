# 🚀 완전 설정 가이드

**프로젝트**: 우리의-블로그 (마케팅 대행사용)  
**최종 수정**: 2025년 11월 13일  
**상태**: ✅ 완성된 프로젝트

---

## 📋 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [필수 환경 설정](#필수-환경-설정)
3. [백엔드 설정](#백엔드-설정)
4. [프론트엔드 설정](#프론트엔드-설정)
5. [데이터베이스 설정 (Supabase)](#데이터베이스-설정-supabase)
6. [API 설정](#api-설정)
7. [개발 실행](#개발-실행)
8. [배포](#배포)
9. [트러블슈팅](#트러블슈팅)

---

## 프로젝트 개요

### 기술 스택
- **프론트엔드**: React 18 + TypeScript + Vite + Tailwind CSS
- **백엔드**: Express.js + Node.js + TypeScript
- **데이터베이스**: Supabase (PostgreSQL)
- **외부 API**: 
  - Naver Places API (업체 검색)
  - Google Gemini API (AI 분석)

### 주요 기능
- 🔍 **업체 검색**: Naver Places API를 통한 실시간 검색
- 📊 **자동 분석**: Gemini AI를 이용한 마케팅 키워드 추출
- 💾 **데이터 저장**: Supabase를 통한 분석 결과 저장
- 📈 **가이드라인 생성**: AI 기반 마케팅 가이드라인 자동 생성

---

## 필수 환경 설정

### 1. Node.js 설치
```bash
# Node.js v17.5.0 이상 필요
node --version    # v17.5.0 이상 확인
npm --version     # 8.0.0 이상 확인
```

### 2. 프로젝트 클론 및 의존성 설치
```bash
cd 우리의-블로그-(대행사용)
npm install
```

### 3. `.env.local` 파일 생성

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Gemini API (Google)
GEMINI_API_KEY=your_gemini_api_key_here

# Naver API
VITE_NAVER_CLIENT_ID=your_naver_client_id
VITE_NAVER_CLIENT_SECRET=your_naver_client_secret

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

---

## 백엔드 설정

### 1. Express 서버 구성

**파일**: `server/index.ts`

```
주요 엔드포인트:
- GET  /health                     → 헬스 체크
- GET  /api/search/places          → Naver Places 검색
- POST /api/ai/extract-facets      → AI 파셋 추출
- POST /api/ai/rank-keywords       → 키워드 순위 매기기
- POST /api/ai/generate-guideline  → 가이드라인 생성
```

### 2. 포트 설정
```bash
# 백엔드: 3005 (기본값)
npm run dev:backend

# 또는
npx tsx server/index.ts
```

### 3. 환경변수 검증

백엔드 시작 시 다음 확인:
```
🚀 서버 초기화 시작...
환경 변수 상태 체크:
네이버 클라이언트 ID: ✓ 설정됨
네이버 클라이언트 SECRET: ✓ 설정됨
Gemini API KEY: ✓ 설정됨
✅ 백엔드 서버 시작됨: http://127.0.0.1:3005
```

---

## 프론트엔드 설정

### 1. Vite 개발 서버

```bash
# 포트 3004에서 실행
npm run dev
```

**Vite 설정** (`vite.config.ts`):
```typescript
// API 요청 자동 프록시
/api/* → http://127.0.0.1:3005/api/*
```

### 2. 주요 컴포넌트
```
src/
├── components/
│   ├── InputSection.tsx      → 검색 입력 및 업체 선택
│   ├── FacetsDisplay.tsx     → 추출된 파셋 표시
│   ├── KeywordList.tsx       → 키워드 순위 표시
│   ├── GuidelinePreview.tsx  → 가이드라인 미리보기
│   ├── ProtectedRoute.tsx    → 인증 보호 라우트
│   └── Toast.tsx             → 알림 컴포넌트
├── pages/
│   ├── DashboardPage.tsx     → 메인 대시보드
│   ├── LandingPage.tsx       → 랜딩 페이지
│   ├── LoginPage.tsx         → 로그인 페이지
│   └── SettingsPage.tsx      → 설정 페이지
└── services/
    ├── supabaseService.ts    → Supabase 호출
    └── geminiService.ts      → Gemini API 호출
```

### 3. 포트 및 프록시 설정
```
프론트엔드: http://127.0.0.1:3004
백엔드 프록시: /api/* → http://127.0.0.1:3005
```

---

## 데이터베이스 설정 (Supabase)

### 1. Supabase 프로젝트 생성

[https://supabase.com](https://supabase.com) 에서:
1. 새 프로젝트 생성
2. 데이터베이스 생성 (PostgreSQL)
3. API 키 복사

### 2. 테이블 생성

**analyses 테이블**
```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  place_name TEXT NOT NULL,
  place_address TEXT,
  description TEXT,
  facets JSONB,
  keywords JSONB,
  guideline TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

**keywords 테이블**
```sql
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id),
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  difficulty INTEGER,
  ranking INTEGER,
  created_at TIMESTAMP DEFAULT now()
);
```

**guidelines 테이블**
```sql
CREATE TABLE guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id),
  guideline_text TEXT,
  tone TEXT,
  target_audience TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### 3. 환경 변수 설정

`.env.local` 파일에 추가:
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

### 4. 연결 테스트

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// 테스트
const { data, error } = await supabase.from('analyses').select('count');
console.log('Supabase 연결 성공:', data);
```

---

## API 설정

### 1. Naver Places API

**설정 절차**:
1. [Naver Developers](https://developers.naver.com) 접속
2. 애플리케이션 등록
3. Client ID와 Secret 획득

**환경 변수**:
```bash
VITE_NAVER_CLIENT_ID=your_client_id
VITE_NAVER_CLIENT_SECRET=your_client_secret
```

**사용 예**:
```typescript
// 백엔드에서 자동 처리
GET /api/search/places?query=카페&page=1

// 응답 형식:
{
  "success": true,
  "total": 12345,
  "places": [
    {
      "id": "place_id",
      "title": "카페명",
      "address": "주소",
      "phone": "전화번호",
      "url": "링크"
    }
  ],
  "hasMore": true,
  "page": 1
}
```

### 2. Google Gemini API

**설정 절차**:
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. Gemini API 활성화
3. API 키 생성

**환경 변수**:
```bash
GEMINI_API_KEY=your_gemini_api_key
```

**사용 예**:
```typescript
POST /api/ai/extract-facets

요청:
{
  "placeInfo": "강남역 카페",
  "description": "서울 강남구 감성 카페"
}

응답:
{
  "place": { "name": "카페", "address": "서울 강남구" },
  "location": { "city": "서울", "district": "강남구" },
  "category": ["카페"],
  "items": [...],
  "trade_area": [...]
}
```

---

## 개발 실행

### 1. 동시 실행 (권장)

**터미널 1 - 백엔드**:
```bash
npm run dev:backend
# 포트 3005에서 실행
```

**터미널 2 - 프론트엔드**:
```bash
npm run dev
# 포트 3004에서 실행
```

### 2. 브라우저 열기
```
http://127.0.0.1:3004
```

### 3. 개발 도구

**테스트 실행**:
```bash
# Phase A2: 주소 파싱 테스트
npx tsx test-phase-A2.ts

# Phase B2: 신뢰도 점수 테스트
npx tsx test-phase-B2.ts

# Phase C1: 상권 가중치 테스트
npx tsx test-phase-C1.ts

# 통합 테스트
npx tsx run-api-tests.ts
```

---

## 배포

### 1. 프로덕션 빌드

```bash
# 프론트엔드 빌드
npm run build

# 결과: dist/ 폴더에 빌드 파일 생성
```

### 2. 백엔드 배포

```bash
# TypeScript 컴파일
npx tsc

# 또는 tsx로 직접 실행
npx tsx server/index.ts
```

### 3. 환경 변수 관리

**프로덕션 서버**:
```bash
# 환경 변수 설정
export GEMINI_API_KEY=...
export VITE_NAVER_CLIENT_ID=...
export VITE_NAVER_CLIENT_SECRET=...
export SUPABASE_URL=...
export SUPABASE_ANON_KEY=...
export SUPABASE_SERVICE_ROLE_KEY=...

# 서버 실행
npm run dev:backend
```

---

## 트러블슈팅

### 문제: "환경 변수 미설정" 오류

**해결**:
```bash
# 1. .env.local 파일 확인
cat .env.local

# 2. 올바른 형식인지 확인 (중복 없음)
# 각 변수는 정확히 1번만 정의되어야 함

# 3. 서버 재시작
npm run dev:backend
```

### 문제: "Naver API 403 오류"

**해결**:
```bash
# 1. Client ID와 Secret 확인
# 2. .env.local에 올바르게 설정되었는지 확인
# 3. Naver Developers에서 API 활성화 확인
```

### 문제: "Supabase 연결 실패"

**해결**:
```bash
# 1. URL과 키 확인
# 2. 데이터베이스가 실행 중인지 확인
# 3. 방화벽/네트워크 설정 확인
```

### 문제: "검색 결과가 표시되지 않음"

**디버깅**:
```bash
# 1. F12 > Console에서 로그 확인
# 2. 백엔드 터미널에서 API 로그 확인
# 3. 검색어가 올바른지 확인
# 4. Naver API 호출 제한 확인 (Rate Limiting)
```

---

## 📞 추가 정보

### 문서
- `README.md` - 프로젝트 개요
- `SEARCH_DEBUG_COMPLETE.md` - 검색 기능 디버깅 가이드
- `SEARCH_DEEP_ANALYSIS.md` - 검색 심층 분석

### 테스트 파일
- `test-phase-A2.ts` - 주소 파싱 테스트
- `test-phase-B2.ts` - 신뢰도 점수 테스트
- `test-phase-C1.ts` - 상권 가중치 테스트
- `test-phase-improvements.ts` - 개선사항 검증
- `run-api-tests.ts` - 통합 API 테스트

### 명령어 참고
```bash
npm run dev           # 프론트엔드 개발
npm run dev:backend   # 백엔드 개발
npm run build         # 프로덕션 빌드
npm run type-check    # TypeScript 검사
```

---

**✅ 설정이 완료되면 `npm run dev`로 개발을 시작하세요!**
