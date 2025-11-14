# 우리의-블로그 마케팅 대행사용

**AI 기반 마케팅 분석 및 가이드라인 자동 생성 플랫폼**

---

## 🎯 프로젝트 개요

이 프로젝트는 마케팅 대행사가 클라이언트 업체의 마케팅 전략을 빠르게 분석하고 최적화된 가이드라인을 생성할 수 있도록 도와주는 웹 애플리케이션입니다.

### ✨ 핵심 기능

- 🔍 **실시간 업체 검색**: Naver Places API를 통한 정확한 업체 정보 검색
- 🤖 **AI 자동 분석**: Google Gemini를 이용한 마케팅 키워드 및 상권 분석
- 📊 **데이터 관리**: Supabase를 통한 분석 결과 저장 및 관리
- 📈 **가이드라인 생성**: AI 기반 마케팅 전략 및 가이드라인 자동 생성
- 💾 **분석 이력 관리**: 과거 분석 결과 조회 및 재활용

---

## 🛠 기술 스택

| 레이어 | 기술 |
|--------|------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Express.js, Node.js, TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **External APIs** | Naver Places API, Google Gemini API |

---

## 📋 설치 및 실행

### 빠른 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.local 파일 생성)
# GEMINI_API_KEY, NAVER_CLIENT_ID 등 설정 필요
# 자세한 내용은 SETUP_GUIDE.md 참고

# 3. 백엔드 시작 (터미널 1)
npm run dev:backend

# 4. 프론트엔드 시작 (터미널 2)
npm run dev

# 5. 브라우저에서 열기
# http://127.0.0.1:3004
```

### 상세 설정 가이드

**전체 설정 방법**: [SETUP_GUIDE.md](./SETUP_GUIDE.md) 참고

**포함 내용**:
- Node.js 설정
- 환경 변수 구성
- API 키 발급 방법
- Supabase 데이터베이스 설정
- 포트 및 프록시 설정

---

## 📁 프로젝트 구조

```
우리의-블로그-(대행사용)/
├── src/
│   ├── components/        # React 컴포넌트
│   │   ├── InputSection.tsx      (업체 검색)
│   │   ├── FacetsDisplay.tsx     (파셋 표시)
│   │   ├── KeywordList.tsx       (키워드 순위)
│   │   └── GuidelinePreview.tsx  (가이드라인)
│   ├── pages/            # 페이지
│   │   ├── DashboardPage.tsx     (메인)
│   │   ├── LoginPage.tsx         (로그인)
│   │   └── SettingsPage.tsx      (설정)
│   ├── services/         # API 서비스
│   │   ├── supabaseService.ts
│   │   └── geminiService.ts
│   └── contexts/         # React Context
│       └── AuthContext.tsx
├── server/
│   ├── index.ts          # Express 서버
│   ├── locationDatabase.ts  # 지역 데이터베이스
│   ├── supabaseClient.ts    # Supabase 클라이언트
│   └── supabaseRoutes.ts    # Supabase 라우트
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.local            # 환경 변수 (로컬만)
```

---

## 🧪 테스트 실행

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

## 🚀 주요 API 엔드포인트

### 검색
```
GET /api/search/places?query=카페&page=1
→ Naver Places에서 업체 검색
```

### AI 분석
```
POST /api/ai/extract-facets
→ 마케팅 파셋 추출 (위치, 카테고리, 상권 등)

POST /api/ai/rank-keywords
→ 키워드 순위 매기기

POST /api/ai/generate-guideline
→ 마케팅 가이드라인 생성
```

---

## 📚 문서

| 문서 | 설명 |
|------|------|
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | 완전 설정 및 배포 가이드 |
| [SEARCH_DEBUG_COMPLETE.md](./SEARCH_DEBUG_COMPLETE.md) | 검색 기능 디버깅 가이드 |
| [SEARCH_DEEP_ANALYSIS.md](./SEARCH_DEEP_ANALYSIS.md) | 검색 심층 분석 |
| [PROJECT_CLEANUP_ANALYSIS.md](./PROJECT_CLEANUP_ANALYSIS.md) | 파일 정리 분석 |

---

## 🐛 트러블슈팅

### "환경 변수 미설정" 오류
→ `.env.local` 파일 확인 및 필수 변수 설정 필요 ([SETUP_GUIDE.md](./SETUP_GUIDE.md) 참고)

### 검색 결과 표시 안 됨
→ F12 > Console에서 로그 확인 ([SEARCH_DEBUG_COMPLETE.md](./SEARCH_DEBUG_COMPLETE.md) 참고)

### API 호출 실패
→ Naver/Gemini API 키 유효성 및 Rate Limiting 확인

자세한 내용은 [SETUP_GUIDE.md](./SETUP_GUIDE.md)의 "트러블슈팅" 섹션 참고

---

## 💡 개발 팁

- **Hot Module Replacement**: Vite의 HMR을 사용하여 변경 사항 자동 반영
- **TypeScript**: 전체 타입 체크로 안정성 보장
- **Tailwind CSS**: 유틸리티 기반 스타일링으로 빠른 UI 개발
- **Supabase RLS**: 행 기반 보안 정책으로 데이터 보호

---

## 📞 연락처 및 지원

프로젝트 관련 문의는 [SETUP_GUIDE.md](./SETUP_GUIDE.md)의 추가 정보 섹션 참고

---

**✅ 완성된 프로젝트 | 최종 수정: 2025년 11월 13일**
