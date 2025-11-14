# 구현 체크리스트

스펙-기반 LCS 시스템 완성도 추적

## Phase 1: 타입 및 기초 구조 ✅

- [x] `src/types/index.ts` 생성
  - [x] Facets, Token, KeywordMetric, RankedKeyword
  - [x] ErrorResponse, ExtractFacetsRequest/Response
  - [x] DBProject, DBInput, DBKeyword, DBCampaign
  - [x] THRESHOLDS, WEIGHTS, CACHE_TTL, RATE_LIMIT 상수
  - [x] Service 인터페이스 정의

## Phase 2: Edge Functions ✅

### gemini-facets
- [x] 파일 생성: `supabase/functions/gemini-facets/index.ts`
- [x] Zod 요청 검증
- [x] Gemini API 호출 (system + user prompt)
- [x] JSON 파싱 (regex)
- [x] 캐시 레이어 (SHA-256 hash, 72h TTL)
- [x] 에러 처리 (NO_API_KEY, UPSTREAM_FAIL, INVALID_INPUT)
- [x] CORS 헤더 추가
- [x] 레이트 리밋 스텁

### keyword-metrics
- [x] 파일 생성: `supabase/functions/keyword-metrics/index.ts`
- [x] Zod 요청 검증
- [x] Naver Blog Search API 호출
- [x] DOC^T, DOC^30 (추정) 추출
- [x] SERP^d 점수 계산
- [x] SV 추정 (회귀 공식)
- [x] sv_conf 계산 (0.3 → 0.6 → 0.75)
- [x] 캐시 전략 (가변 TTL: 72h/24h)
- [x] 에러 처리 및 폴백

## Phase 3: 서비스 계층 ✅

### geminiService
- [x] 파일 생성: `src/services/geminiService.ts`
- [x] extractFacets() 구현 (Edge 호출)
- [x] composeGuideline() 구현 (템플릿 기반)
- [x] 에러 핸들링

### naverService
- [x] 파일 생성: `src/services/naverService.ts`
- [x] fetchKeywordMetrics() 구현 (Edge 호출)
- [x] 타입 호환성 검사 (KeywordMetric 구조)
- [x] 폴백 로직 (0 메트릭 반환)

### rankService
- [x] 파일 생성: `src/services/rankService.ts`
- [x] scoreTokens() 구현
  - [x] SV/DOC 정규화
  - [x] T* 점수 계산
- [x] composeCombos() 구현
  - [x] Cartesian product (슬롯별)
  - [x] 결속도 계산 (PMI 근사)
  - [x] 최대 50개 조합 제한
- [x] scoreCombos() 구현
  - [x] OPP 계산 (0.55*SV + 0.15*MoM + ...)
  - [x] COMP 계산 (0.50*DOC_T + 0.25*DOC_30 + 0.25*SERP_d)
  - [x] PEN 계산 (0.40*Amb + 0.30*BrandRisk + 0.30*PolicyRisk)
  - [x] LC* = OPP - 0.9*COMP - 0.6*PEN
  - [x] FinalScore = 0.7*LC* + 0.3*SV_n
  - [x] 임계값 검사 (SV≥500 + 예외 처리)
  - [x] 치환 추적 (alias SV 향상 감지)
- [x] 타입 호환성 모든 검사 통과

### supabaseService
- [x] 파일 생성: `src/services/supabaseService.ts`
- [x] initialize() 구현
- [x] getCurrentAgencyId() 구현 (JWT 기반)
- [x] getProject() 구현
- [x] upsertInput() 구현
- [x] upsertKeywords() 구현
- [x] listKeywords() 구현
- [x] getCampaign() 구현
- [x] saveCampaign() 구현
- [x] getCachedData() 구현
- [x] setCacheData() 구현

## Phase 4: 데이터베이스 ✅

### 마이그레이션
- [x] 파일 생성: `supabase/migrations/001_init_schema.sql`
- [x] agencies 테이블
- [x] clients 테이블
- [x] projects 테이블
- [x] inputs 테이블
- [x] keywords 테이블
- [x] campaigns 테이블
- [x] api_cache 테이블
- [x] 인덱스 생성 (client_id, project_id, final_score, ttl_at)

### RLS 정책
- [x] projects RLS (SELECT, INSERT)
- [x] inputs RLS (SELECT, INSERT, UPDATE)
- [x] keywords RLS (SELECT, INSERT, UPDATE)
- [x] campaigns RLS (SELECT, INSERT, UPDATE)
- [x] api_cache: RLS 비활성화 (Service Role only)

## Phase 5: 문서 ✅

- [x] DEPLOYMENT_GUIDE.md
  - [x] 환경 설정
  - [x] Edge Functions 배포 절차
  - [x] 로컬 개발 환경
  - [x] 성능 모니터링
  - [x] 트러블슈팅

- [x] QUICK_START.md
  - [x] 한눈에 보기 (flowchart)
  - [x] 로컬 시작 단계
  - [x] 테스트 계정 생성
  - [x] 분석 플로우 실행
  - [x] 결과 확인
  - [x] 문제 해결

- [x] ARCHITECTURE.md
  - [x] 전체 아키텍처 (diagram)
  - [x] 데이터 흐름 상세
  - [x] 서비스 계층 API
  - [x] DB 스키마
  - [x] Edge Functions 계약
  - [x] 타입 시스템
  - [x] RLS 설명
  - [x] 성능 고려사항
  - [x] 향후 확장

## Phase 6: UI 컴포넌트 (부분)

- [x] InputSection
  - [x] 기본 기능 유지
  - [x] Gemini/Naver 서비스 import 제거 (현재는 부모 컴포넌트에서 호출)

- [ ] KeywordList (계획)
  - [ ] RankedKeyword 카드 표시
  - [ ] FinalScore 기준 정렬
  - [ ] CONF 뱃지 (0-100%)
  - [ ] 치환 이유 툴팁
  - [ ] SV≥500 필터 토글

- [ ] GuidelinePreview (계획)
  - [ ] 마크다운 실시간 렌더링
  - [ ] 최종 4개 키워드 업데이트 시 자동 재생성

- [ ] DashboardPage (통합)
  - [ ] InputSection → geminiService.extractFacets()
  - [ ] Token 목록 → naverService.fetchKeywordMetrics()
  - [ ] 메트릭 → rankService.scoreTokens/composeCombos/scoreCombos()
  - [ ] 결과 → supabaseService.upsertKeywords()

## Phase 7: Edge Functions 배포 (예정)

- [ ] Supabase 프로젝트 생성
- [ ] gemini-facets 배포
  ```bash
  supabase functions deploy gemini-facets --project-ref <REF>
  ```
- [ ] keyword-metrics 배포
  ```bash
  supabase functions deploy keyword-metrics --project-ref <REF>
  ```
- [ ] 환경 변수 설정 (Secrets)
  - [ ] GEMINI_API_KEY
  - [ ] NAVER_CLIENT_ID
  - [ ] NAVER_CLIENT_SECRET
  - [ ] SUPABASE_SERVICE_ROLE_KEY

## Phase 8: 통합 테스트 (예정)

- [ ] 로컬 개발 환경
  - [ ] supabase start 확인
  - [ ] npm run dev 확인
  - [ ] http://localhost:5173 접근 가능

- [ ] E2E 플로우
  - [ ] 로그인 → 프로젝트 생성
  - [ ] InputSection 입력 → Analyze 클릭
  - [ ] gemini-facets 호출 확인
  - [ ] keyword-metrics 호출 확인
  - [ ] rankService 점수 계산 확인
  - [ ] 최종 4개 키워드 표시
  - [ ] 가이드라인 생성

- [ ] 캐시 동작
  - [ ] 1차 요청: 캐시 미스
  - [ ] 2차 요청 (동일 입력): 캐시 히트
  - [ ] 응답 시간 87% 단축 확인

- [ ] 에러 폴백
  - [ ] Gemini API 다운 → 캐시 사용
  - [ ] Naver API 다운 → 0 메트릭 + 계속 진행
  - [ ] DB 다운 → 로컬 상태 유지

- [ ] 성능 메트릭
  - [ ] Gemini 응답 시간 < 3s
  - [ ] Naver 응답 시간 < 1s
  - [ ] 랭킹 계산 < 0.5s

## Phase 9: 프로덕션 준비 (예정)

- [ ] 환경 변수 업데이트
  - [ ] VITE_SUPABASE_URL (프로덕션)
  - [ ] VITE_EDGE_BASE (프로덕션)

- [ ] 성능 최적화
  - [ ] 번들 크기 검토
  - [ ] 이미지 최적화
  - [ ] 캐시 전략 조정

- [ ] 보안 검수
  - [ ] RLS 정책 재확인
  - [ ] API Key 노출 여부 검사
  - [ ] 입력 검증 강화 (Zod)

- [ ] 모니터링 설정
  - [ ] Edge Function 로그 수집
  - [ ] DB 성능 모니터링
  - [ ] 에러 레이트 추적

- [ ] 문서 최종화
  - [ ] 팀용 배포 가이드
  - [ ] 운영 매뉴얼
  - [ ] 트러블슈팅 FAQ

## 완료도 분석

```
Phase 1 (타입):          100% ✅
Phase 2 (Edge):          100% ✅
Phase 3 (서비스):        100% ✅
Phase 4 (DB):            100% ✅
Phase 5 (문서):          100% ✅
Phase 6 (UI):            10%  🔄 (InputSection만 유지)
Phase 7 (배포):          0%   ⬜ (배포 전 로컬 테스트 필요)
Phase 8 (테스트):        0%   ⬜ (통합 테스트 수행 필요)
Phase 9 (프로덕션):      0%   ⬜ (최종 검수 후)

전체 완료도: 60%
```

## 다음 단계

1. **로컬 통합 테스트** (1-2시간)
   - Supabase 로컬 서버 시작
   - 프론트엔드 개발 서버 시작
   - E2E 플로우 실행 및 검증

2. **Edge Functions 배포** (30분)
   - Supabase 프로젝트 생성/링크
   - gemini-facets 배포
   - keyword-metrics 배포
   - 환경 변수 설정

3. **UI 컴포넌트 강화** (2-3시간)
   - KeywordList: CONF 뱃지, 치환 툴팁
   - GuidelinePreview: 실시간 마크다운
   - DashboardPage: 통합 로직

4. **프로덕션 배포** (1시간)
   - 환경 변수 업데이트
   - 성능 최적화
   - 모니터링 설정

---

**현재 상태:** 모든 백엔드 및 타입 기초 완성. 로컬 테스트 후 배포 준비 완료.

**예상 완료:** 추가 4-5시간으로 전체 프로덕션 배포 가능.
