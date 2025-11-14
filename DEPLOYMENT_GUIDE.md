# 배포 가이드

스펙-기반 실데이터 LCS 시스템 배포 절차

## 1. 환경 준비

### 1.1 Supabase 설정

```bash
# Supabase CLI 설치
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref <YOUR_PROJECT_REF>
```

### 1.2 환경 변수 설정

**`.env.local` (프론트엔드)**
```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
VITE_EDGE_BASE=http://localhost:54321/functions/v1  # 로컬 개발용
```

**Supabase 대시보드 → Settings → Edge Functions → Secrets**
```
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
NAVER_CLIENT_ID=<YOUR_NAVER_CLIENT_ID>
NAVER_CLIENT_SECRET=<YOUR_NAVER_CLIENT_SECRET>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

## 2. 데이터베이스 마이그레이션

### 2.1 스키마 생성

```bash
# 마이그레이션 파일 이미 존재: supabase/migrations/001_init_schema.sql

# 로컬 개발 환경에 적용
supabase migration up

# 프로덕션 환경에 배포 (GitHub Actions 또는 수동)
# Supabase 대시보드 → SQL Editor → 파일 내용 복사-붙여넣기 실행
```

### 2.2 RLS 확인

```sql
-- Supabase 대시보드 → SQL Editor에서 확인
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- 테이블: agencies, clients, projects, inputs, keywords, campaigns, api_cache

-- RLS 정책 확인
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

## 3. Edge Functions 배포

### 3.1 gemini-facets 배포

```bash
# 함수 코드 위치: supabase/functions/gemini-facets/index.ts

# 배포
supabase functions deploy gemini-facets --project-ref <PROJECT_REF>

# 테스트
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/gemini-facets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{
    "text": "서현역 브런치 카페, 크루아상이 시그니처. 20-30대 여성",
    "locale": "ko",
    "hints": {"region": ["서초구"]}
  }'

# 응답 예시:
# {
#   "facets": {
#     "category": "카페",
#     "signature_items": ["크루아상"],
#     "target_audience": ["20-30대 여성"],
#     ...
#   },
#   "tokens": [
#     {"text": "크루아상", "slot": "Item", "aliases": [...]},
#     ...
#   ],
#   "rationale": [...]
# }
```

### 3.2 keyword-metrics 배포

```bash
# 함수 코드 위치: supabase/functions/keyword-metrics/index.ts

# 배포
supabase functions deploy keyword-metrics --project-ref <PROJECT_REF>

# 테스트
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/keyword-metrics \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{
    "phrases": ["크루아상 카페", "브런치"],
    "region": "서울",
    "period": "12m"
  }'

# 응답 예시:
# {
#   "rows": [
#     {
#       "phrase": "크루아상 카페",
#       "sv": 3200,
#       "sv_conf": 0.6,
#       "doc_total": 50000,
#       "doc_30d": 17500,
#       "serp_d": 0.65,
#       "components": {...}
#     },
#     ...
#   ]
# }
```

### 3.3 배포 확인

```bash
# 배포된 함수 목록 확인
supabase functions list --project-ref <PROJECT_REF>

# 로그 확인
supabase functions logs gemini-facets --project-ref <PROJECT_REF> --limit 50
supabase functions logs keyword-metrics --project-ref <PROJECT_REF> --limit 50
```

## 4. 프론트엔드 통합

### 4.1 서비스 계층 활성화

**src/services/geminiService.ts**
```typescript
// Edge Function URL 설정
const EDGE_BASE = import.meta.env.VITE_EDGE_BASE || 'http://localhost:54321/functions/v1';

// 프로덕션에서는:
// VITE_EDGE_BASE=https://<PROJECT_REF>.supabase.co/functions/v1
```

**src/services/naverService.ts**
```typescript
// 동일하게 EDGE_BASE 사용
```

### 4.2 Supabase 클라이언트 초기화

**pages/DashboardPage.tsx (또는 App.tsx)**
```typescript
import { createClient } from '@supabase/supabase-js';
import supabaseService from '../services/supabaseService';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// 서비스 초기화
supabaseService.initialize(supabase);
```

## 5. 로컬 개발 환경

### 5.1 Supabase 로컬 시뮬레이터 실행

```bash
supabase start

# 출력 예시:
# Started supabase local development setup.
# API URL: http://localhost:54321
# Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5.2 프론트엔드 개발 서버 실행

```bash
npm run dev

# Vite dev server 시작: http://localhost:5173
```

### 5.3 통합 테스트

```bash
# 1. 로그인 (테스트 계정)
# Supabase 대시보드 → Authentication → Add user
# 또는 Auth context에서 자동 생성

# 2. 프로젝트 생성
# DashboardPage에서 "새 프로젝트" 버튼

# 3. 분석 실행
# InputSection에 업체명 + 요약 입력
# "키워드 & 가이드 생성" 클릭
#   → Edge Function (gemini-facets) 호출
#   → Facet 추출 및 토큰 생성
#   → rankService로 점수 계산
#   → Supabase에 저장

# 4. 결과 확인
# KeywordList에서 최종 4개 키워드 확인
# - SV, DOC^T, SERP^d, LC*, FinalScore
# - CONF 뱃지 (신뢰도)
# - 치환 이유 (있을 경우)
# - FinalScore 기준 정렬
```

## 6. 성능 모니터링

### 6.1 Edge Function 성능

```bash
# 응답 시간 모니터링
supabase functions logs gemini-facets --project-ref <PROJECT_REF> --limit 100

# 로그 출력 예시:
# 2024-01-15T10:30:45.123Z gemini-facets[deno] [INFO] Cache hit: true, key=abc123...
# 2024-01-15T10:30:45.456Z gemini-facets[deno] [INFO] Gemini API call completed: 245ms
# 2024-01-15T10:30:45.789Z gemini-facets[deno] [INFO] Response sent: 310ms total
```

### 6.2 캐시 효율

```sql
-- Supabase 대시보드 → SQL Editor
SELECT
  source,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (ttl_at - created_at))) / 3600 as ttl_hours
FROM api_cache
GROUP BY source;

-- 예상 결과:
-- source      | count | ttl_hours
-- gemini      | 145   | 72.0
-- naver-search| 89    | 24.0 (volatile) 또는 72.0
```

### 6.3 DB 쿼리 성능

```sql
-- 인덱스 효율 확인
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 7. 트러블슈팅

### 7.1 Edge Function 403 권한 오류

```
Error: unauthorized (expected JWT claim: "aud" in JWT token)
```

**해결책:**
- Authorization 헤더 확인: `Bearer <ANON_KEY_OR_SESSION_TOKEN>`
- CORS 설정 확인 (Edge Function 내 CORS 헤더)

### 7.2 Naver API 429 Rate Limit

```
Error: Too many requests (10 requests/second limit)
```

**해결책:**
- RATE_LIMIT 상수 조정 (src/types/index.ts)
- 캐시 TTL 증가 (CACHE_TTL.DEFAULT)
- 배치 요청 구간 처리

### 7.3 Gemini API 503 Upstream Fail

```
Error: Service temporarily unavailable
```

**해결책:**
- 요청 재시도 로직 추가 (geminiService)
- Fallback: 캐시된 응답 사용
- Notification: 사용자에게 "오류, 잠시 후 다시 시도" 표시

## 8. 프로덕션 배포 체크리스트

- [ ] Supabase 프로젝트 생성 및 링크 (`supabase link`)
- [ ] DB 마이그레이션 실행 (`supabase migration up`)
- [ ] RLS 정책 확인 (모든 테이블)
- [ ] Edge Function 배포 (gemini-facets, keyword-metrics)
- [ ] 환경 변수 설정 (Supabase Secrets)
- [ ] `.env.local` 프로덕션 URL로 업데이트
- [ ] VITE_EDGE_BASE를 Supabase 프로덕션 URL로 변경
- [ ] 엔드-투-엔드 플로우 테스트
- [ ] 에러 핸들링 & 폴백 검증
- [ ] 성능 모니터링 대시보드 설정
- [ ] 문서 최종 검토 및 팀 공유

## 9. 추가 리소스

- [Supabase 공식 가이드](https://supabase.com/docs)
- [Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [RLS 정책 설정](https://supabase.com/docs/guides/auth/row-level-security)
- [Gemini API 문서](https://ai.google.dev/docs)
- [Naver 검색 API](https://developers.naver.com/docs/serviceapi/search/blog/blog.md)

---

작성: 2024-01-15  
마지막 업데이트: 시스템 최종 구현 후
