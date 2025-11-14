# 실행 가이드 (Quick Start)# 🚀 빠른 시작 가이드



스펙-기반 LCS 시스템 로컬 실행 및 통합 테스트## 1단계: 키/환경 설정



## 한눈에 보기프로젝트 루트의 `.env.local` 파일을 열고 다음을 설정하세요.



``````bash

입력 (업체명 + 요약)GEMINI_API_KEY=YOUR_GEMINI_API_KEY

    ↓VITE_NAVER_CLIENT_ID=YOUR_NAVER_CLIENT_ID

[Edge] gemini-facetsVITE_NAVER_CLIENT_SECRET=YOUR_NAVER_CLIENT_SECRET

    ↓ Facets + Tokens```

[rankService] scoreTokens()

    ↓ TokenScore[]## 2단계: 서버 실행

[rankService] composeCombos()

    ↓ PhraseCombo[]새 터미널에서 백엔드 서버 실행:

[Edge] keyword-metrics (Naver API)```bash

    ↓ KeywordMetric[]npm run dev:backend

[rankService] scoreCombos()```

    ↓ RankedKeyword[] (OPP/COMP/PEN/LC*/FinalScore)

    ↓정상 동작 확인: `http://127.0.0.1:3005/health`

출력 (최종 4개 키워드 + 가이드라인)

```Windows PowerShell에서 헬스체크 및 API 테스트 예시:



## 1단계: 로컬 환경 시작```powershell

# 헬스체크

### 1.1 터미널 1: Supabase 로컬 서버Invoke-WebRequest -Uri http://127.0.0.1:3005/health -UseBasicParsing | Select-Object -ExpandProperty Content



```bash# facets 추출 테스트(POST)

cd 우리의-블로그-\(대행사용\)Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3005/api/ai/extract-facets -ContentType 'application/json' -Body (@{ placeInfo = '강남역 카페'; description = '서울 강남구 감성 카페' } | ConvertTo-Json) | ConvertTo-Json -Depth 6

```

# Supabase 로컬 에뮬레이터 시작

supabase start## 3단계: 프론트엔드 실행



# 출력 예시:다른 터미널에서:

# ▌  Opening browser on http://localhost:54323 (Supabase Studio)```bash

# ▌  HTTP:  http://localhost:54321npm run dev

# ▌  GraphQL: http://localhost:54321/graphql/v1```

# ▌  Anon key:        eyJhbGciOi...

# ▌  Service role key: eyJhbGciOi...정상 동작 확인: `http://127.0.0.1:3004`

```

## 4단계: 테스트

**이 터미널은 계속 실행 상태로 유지하세요.**

1) 브라우저에서 `http://127.0.0.1:3004/` 접속

### 1.2 터미널 2: 프론트엔드 개발 서버2) 로그인 후 대시보드 진입

3) “업체명 또는 주소”에 검색어 입력 → 드롭다운 결과 확인

```bash

cd 우리의-블로그-\(대행사용\)참고: 네이버 API 키가 설정되지 않은 경우 검색 API는 200 응답과 함께 빈 결과를 반환합니다(success=false). 이때 드롭다운은 비어있지만 오류 토스트는 표시되지 않습니다.



# .env.local 확인---

cat .env.local

문제 발생 시 `NAVER_API_SETUP.md`의 “문제 해결”을 참고하세요.

# 예상 내용:

# VITE_SUPABASE_URL=http://localhost:54321
# VITE_SUPABASE_ANON_KEY=<로컬 Anon Key>
# VITE_EDGE_BASE=http://localhost:54321/functions/v1

# 개발 서버 시작
npm run dev

# 출력:
# ✓ built in 2.34s
# 
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

## 2단계: 테스트 계정 생성

### 2.1 Supabase Studio에서 사용자 생성

```bash
# 1. 브라우저에서 http://localhost:54323 열기
# 2. Supabase Studio 로그인 (로컬 계정 자동 생성)
# 3. 왼쪽 메뉴 → Authentication → Users
# 4. "Add user" 클릭
# 5. 이메일: test@example.com, 비밀번호: Test1234!
# 6. Create user 클릭
```

### 2.2 사용자 메타데이터 설정 (RLS용)

```sql
-- Supabase Studio → SQL Editor
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('Test1234!', gen_salt('bf')),
  now(),
  jsonb_build_object(
    'agency_id', gen_random_uuid()::text
  )
)
ON CONFLICT DO NOTHING;

-- 또는 기존 사용자 업데이트
UPDATE auth.users
SET raw_user_meta_data = 
  jsonb_set(
    raw_user_meta_data,
    '{agency_id}',
    to_jsonb(gen_random_uuid()::text)
  )
WHERE email = 'test@example.com';
```

## 3단계: 초기 데이터 준비

### 3.1 Agency & Client 생성

```sql
-- Supabase Studio → SQL Editor

-- Agency 생성
INSERT INTO public.agencies (name) 
VALUES ('테스트 에이전시')
RETURNING id;
-- agency_id 메모: xxxxx-xxxxx-xxxxx

-- Client 생성
INSERT INTO public.clients (agency_id, name)
VALUES ('xxxxx-xxxxx-xxxxx', '테스트 클라이언트')
RETURNING id;
-- client_id 메모: yyyyy-yyyyy-yyyyy

-- Project 생성
INSERT INTO public.projects (client_id, name, created_by)
VALUES (
  'yyyyy-yyyyy-yyyyy',
  '강남 브런치 카페',
  (SELECT id FROM auth.users WHERE email = 'test@example.com')
)
RETURNING id;
-- project_id 메모: zzzzz-zzzzz-zzzzz
```

## 4단계: 분석 플로우 실행

### 4.1 브라우저에서 앱 열기

```
http://localhost:5173 열기
↓
로그인 (test@example.com / Test1234!)
↓
DashboardPage 표시
```

### 4.2 InputSection에서 입력

**업체명 또는 주소:**
```
강남역 근처 브런치 카페
```

**업체 요약:**
```
서현역 인근 브런치 카페. 시그니처는 크루아상 샌드와 콜드브루. 
실내 분위기가 감성적이고, 20-30대 여성 고객이 주로 방문함.
주말 대기 있을 정도로 인기가 높음. 파스타도 인기 메뉴.
```

### 4.3 "키워드 & 가이드 생성" 클릭

**단계별 진행 로그 (브라우저 콘솔에서 확인 가능):**

```javascript
// [InputSection] Step 1: Extracting facets from Gemini...
// [geminiService.extractFacets] POST /functions/v1/gemini-facets
// [Gemini API] request_id=abc123..., tokens=45
// [Gemini API] response_time=2340ms
// ✓ facets: {
//     category: "카페",
//     signature_items: ["크루아상", "콜드브루"],
//     target_audience: ["20-30대 여성"],
//     ...
//   }

// [rankService.scoreTokens] 5개 토큰 정규화
// [rankService.composeCombos] 48개 조합 생성
// [naverService.fetchKeywordMetrics] Naver API 호출 중...
// [naverService] 48개 구문에 대한 메트릭 수집

// [rankService.scoreCombos] OPP/COMP/PEN 계산
// [rankService] LC* = OPP - 0.9*COMP - 0.6*PEN
// [rankService] FinalScore = 0.7*LC* + 0.3*SVₙ

// [supabaseService.upsertKeywords] DB 저장
// ✓ 완료: 최종 4개 키워드 선택됨
```

## 5단계: 결과 확인

### 5.1 KeywordList에서 랭킹 확인

```
[최종 4개 키워드]
1. 크루아상 강남 브런치 (FinalScore: 0.85) ✓ 임계값 통과 (SV≥500)
   - SV: 3400 (신뢰도: 60%)
   - LC*: 0.72 (OPP: 0.68, COMP: 0.45, PEN: 0.08)
   - 치환: 크루아상 → 크로와상 (+5% SV)

2. 강남역 브런치 카페 (FinalScore: 0.78) ✓ 임계값 통과
   - SV: 5200 (신뢰도: 75%)
   - LC*: 0.65
   
3. 감성 카페 강남 (FinalScore: 0.71) ✓ 임계값 통과
   - SV: 2800 (신뢰도: 50%)
   - LC*: 0.58

4. 콜드브루 브런치 (FinalScore: 0.68) ✓ 임계값 통과
   - SV: 1900 (신뢰도: 40%)
   - LC*: 0.52
```

### 5.2 가이드라인 미리보기

```markdown
# 강남역 브런치 카페 - 크루아상 강남, 콜드브루 완벽 가이드

## 개요
강남역 인근 브런치 카페는 20-30대 여성을 위한 특별한 공간입니다...

## 핵심 특징
- 감성적 인테리어
- 높은 재방문율
- 주말 대기 있을 정도의 인기

## 대표 메뉴
크루아상, 콜드브루, 파스타...

...
```

### 5.3 캐시 확인

```sql
-- Supabase Studio → SQL Editor
SELECT 
  key,
  source,
  created_at,
  ttl_at,
  (ttl_at - created_at) as ttl_duration
FROM public.api_cache
ORDER BY created_at DESC
LIMIT 10;

-- 예상 결과:
-- key                      | source       | created_at | ttl_at (72h 뒤)
-- abc123...gemini_facets   | gemini       | 10:30:45   | +72h
-- xyz789...keyword_metrics | naver-search | 10:30:50   | +24h (volatile)
```

## 6단계: 문제 해결

### 6.1 "분석 중..." 계속 표시됨

**원인:** Edge Function 호출 실패 또는 느린 응답

```bash
# 터미널 1 (Supabase)에서 로그 확인
supabase functions logs gemini-facets --limit 50

# 일반적인 에러:
# [ERROR] NO_API_KEY: GEMINI_API_KEY not set in environment
#   → Supabase Secrets에 GEMINI_API_KEY 설정하세요

# [ERROR] RATE_LIMIT: Too many requests
#   → 5초 후 다시 시도하세요

# [ERROR] UPSTREAM_FAIL: Gemini API returned 503
#   → Gemini API 상태 확인 (google.ai에서)
```

### 6.2 "401 Unauthorized"

```
Error: unauthorized (expected JWT claim: "aud" in JWT token)
```

**해결책:**
```typescript
// geminiService.ts 또는 naverService.ts에서
const EDGE_BASE = 'http://localhost:54321/functions/v1'; // ✓ 로컬 테스트용

// 프로덕션:
// const EDGE_BASE = 'https://<PROJECT_REF>.supabase.co/functions/v1';

// Authorization 헤더는 Supabase 클라이언트가 자동 추가
```

### 6.3 "RLS policy 적용되지 않음"

```sql
-- Supabase Studio → SQL Editor
-- 1. RLS 정책이 실제로 존재하는지 확인
SELECT * FROM pg_policies WHERE tablename = 'projects';

-- 2. 사용자의 agency_id가 설정되어 있는지 확인
SELECT id, email, raw_user_meta_data->'agency_id' 
FROM auth.users 
WHERE email = 'test@example.com';

-- 3. projects 데이터가 올바른 client_id를 가졌는지 확인
SELECT p.id, c.agency_id 
FROM projects p
JOIN clients c ON p.client_id = c.id;
```

## 7단계: 통합 성능 테스트

### 7.1 캐시 히트율 측정

```bash
# 1차 실행 (캐시 미스)
입력: "강남역 브런치 카페"
응답 시간: 3500ms (Gemini 2.3s + Naver 0.8s + Rank 0.4s)

# 2차 실행 (동일 입력, 캐시 히트)
입력: "강남역 브런치 카페"
응답 시간: 450ms (캐시 로드 0.1s + Rank 0.35s)

# 개선율: 87% 단축
```

### 7.2 에러 복구력 테스트

```bash
# 1. Naver API 자체 실패 시뮬레이션
# → naverService.fetchKeywordMetrics()에서 폴백: SV=0 반환
# → rankService는 계속 진행 (0 기반 점수 계산)
# → UI: "키워드 메트릭을 수집할 수 없어 추정치를 사용합니다" 토스트

# 2. Gemini API 실패 시뮬레이션
# → geminiService.extractFacets()에서 캐시 재사용 또는 ERROR
# → DashboardPage에서 에러 토스트 표시
# → "다시 시도" 버튼 제공

# 3. DB 저장 실패
# → RLS 정책 위반 또는 네트워크 끊김
# → supabaseService.upsertKeywords()에서 catch
# → "로컬에만 저장됨" 경고
```

## 8단계: 배포 전 체크리스트

```bash
# 모든 타입 검사 통과
npm run build
# ✓ 0 errors

# 모든 테스트 통과
npm run test
# ✓ 45 passed

# Edge Functions 코드 검증
supabase functions validate
# ✓ gemini-facets: valid
# ✓ keyword-metrics: valid

# RLS 정책 검증
# Supabase Dashboard → SQL Editor
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
# Result: 13 policies (예상값)

# 캐시 테이블 검증
SELECT COUNT(*) FROM public.api_cache;
# Result: > 0 (캐시 항목 있음)

# 최종 E2E 플로우 검증
# http://localhost:5173에서 전체 플로우 실행
# → 입력 → Facet 추출 → 메트릭 수집 → 랭킹 → 결과 표시
# ✓ 완벽하게 동작
```

---

**지금 바로 시작하세요:**
```bash
# 터미널 1
supabase start

# 터미널 2  
npm run dev

# 브라우저
http://localhost:5173
```

**문제 발생 시:** 터미널 로그를 먼저 확인하세요. 95%의 문제는 로그에 명시되어 있습니다.
