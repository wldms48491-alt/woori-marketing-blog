/**
 * 전역 타입 정의 (실데이터 기반 LCS 시스템)
 * 모든 서비스, 컴포넌트가 이 타입을 따름
 */

// ============ 공통 =============

export interface ErrorResponse {
  code: 'NO_API_KEY' | 'UPSTREAM_FAIL' | 'RATE_LIMIT' | 'INVALID_INPUT' | 'UNKNOWN';
  message: string;
  hint?: string;
}

export type Confidence = number; // 0~1, API 신뢰도

// ============ Facet 추출 (LLM) =============

export interface Facets {
  /** 업체명 */
  name?: string;
  /** 카테고리 (배열, e.g., ["카페"], ["음식점"]) */
  category?: string[];
  /** 주소/POI */
  place?: {
    name?: string;
    address?: string;
    poi_aliases?: string[];
  };
  /** 메뉴/서비스 */
  items?: { name: string; signature?: boolean }[];
  /** 타겟 고객층 */
  audience?: string[];
  /** 주요 특징 */
  features?: string[];
  /** 분위기/바이브 */
  vibe?: string[];
  /** 편의시설 */
  amenities?: string[];
  /** 가격대 (배열, e.g., ["저가"], ["중가"]) */
  price_range?: string[];
  /** 의도 (구매/비교/정보 등) */
  intent?: string[];
  /** 차별점/USP */
  usp?: string[];
  /** 주요 혜택 */
  benefits?: string[];
  /** 계절성 */
  season?: string[];
  /** 프로모션 */
  promotion?: string[];
  /** 예약 시스템 */
  reservation_system?: string[];
  /** 주차 */
  parking?: string[];
  /** 단체 친화 */
  group_friendly?: string[];
  /** 반려동물 */
  pet_friendly?: string[];
  /** 접근성 */
  accessibility?: string[];
  /** 시그니처 메뉴 */
  signature_menu?: string[];
  /** 운영 시간 */
  operating_hours?: string[];
  /** 인근 명소 */
  nearby_attractions?: string[];
}

export interface Token {
  /** 토큰 텍스트 (e.g., "강남역", "감성", "카페") */
  text: string;
  /** 토큰 슬롯 (Location, Micro-POI, Item, Intent) */
  slot: 'Location' | 'Micro-POI' | 'Item' | 'Intent';
  /** 동의어/별칭 (e.g., ["강남역사거리", "강남역 로데오거리"]) */
  aliases?: string[];
  /** Facet에서의 소스 */
  source?: string;
}

export interface ExtractFacetsRequest {
  text: string;
  locale?: 'ko' | 'en';
  hints?: {
    category?: string[];
    region?: string[];
  };
}

export interface ExtractFacetsResponse {
  facets: Facets;
  tokens: Token[];
  rationale?: string[];
}

// ============ 키워드 메트릭 (실측치) =============

export interface KeywordMetric {
  /** 검색어/구문 */
  phrase: string;
  
  /** SV (월간 검색량) */
  sv: number | null;
  /** SV 신뢰도 (0~1) */
  sv_conf: Confidence;
  
  /** DOC^T (전체 문서 수, 블로그 검색 total) */
  doc_total: number | null;
  
  /** DOC^30 (30일 범위 문서 수) */
  doc_30d: number | null;
  
  /** SERP^d (상위 10 난이도 스코어, 0~1) */
  serp_d: number | null;
  
  /** 성분별 데이터 (캐시/추적용) */
  components?: {
    autosuggest_freq?: number;
    relkw_rank?: number;
    blog_total?: number;
    server_volume?: number; // 사내 데이터
  };
}

export interface KeywordMetricsRequest {
  phrases: string[];
  region?: string; // e.g., "서울", "강남구"
  period?: '12m' | '3m'; // 기본 12m
}

export interface KeywordMetricsResponse {
  rows: KeywordMetric[];
}

// ============ SV 계산용 (유효 검색량) =============

export interface SVVariant {
  phrase: string;
  sv: number;
  type: 'exact' | 'variant' | 'related';
}

// sv_effective = max(sv_exact, ...sv_variant)
export interface SVCalculation {
  phrase_exact: string;
  sv_exact: number | null;
  variants: SVVariant[]; // 전체 변형
  sv_variant_max: number | null;
  sv_effective: number | null;
}

// ============ 점수 계산 =============

/** 토큰 점수화 */
export interface TokenScore {
  token: Token;
  sv: number | null;
  doc_total: number | null;
  doc_30d: number | null;
  serp_d: number | null;
  
  // 정규화 (0~1)
  sv_norm: number;
  doc_norm: number;
  
  /** T* (토큰 기본 점수) */
  t_score: number;
}

/** 토큰 조합 (PMI/결속도 반영) */
export interface PhraseCombo {
  phrase: string;
  tokens: Token[]; // 구성 토큰
  
  // 결속도 (PMI, 공출현율)
  cohesion: number; // 0~1
  
  // 페널티
  similarity_penalty?: number; // 유사 조합과의 거리
  duplication_penalty?: number; // 중복 검색어 페널티
}

/** 최종 랭킹 키워드 */
export interface RankedKeyword {
  // 기본
  id?: string;
  phrase: string;
  
  // 메트릭
  sv_exact: number | null;
  sv_variant_max: number | null;
  sv_effective: number | null;
  doc_total: number | null;
  doc_30d: number | null;
  serp_d: number | null;
  
  // 정규화된 값 (0~1)
  sv_norm: number;
  doc_total_norm: number;
  doc_30d_norm: number;
  serp_d_norm: number;
  
  // OPP, COMP, PEN 점수
  opp: number; // Opportunity
  comp: number; // Competition
  pen: number; // Penalty
  lc_star: number; // LC* = OPP - 0.9*COMP - 0.6*PEN
  final_score: number; // 0.7*LC* + 0.3*SVn
  
  // 임계값 관련
  exceeds_threshold: boolean; // sv_effective >= 500
  threshold_rule?: 'STRICT_500' | 'TREND_EXEMPT' | 'POI_EXEMPT' | 'SUBSTITUTE';
  exception_reason?: string; // e.g., "MoM 50%+, trend exception"
  
  // 치환 정보
  substituted_from?: string; // "서현역" → "서현 로데오거리"로 치환된 경우
  substitution_reason?: {
    metric: string; // "SV", "DOC", "SERP"
    direction: string; // "+18%", "−12%"
  };
  
  // 신뢰도
  conf: Confidence;
  
  // 선택 여부
  selected?: boolean;
}

// ============ 가이드라인 생성 =============

export interface ComposeGuidelineRequest {
  keywords: string[]; // 최종 4개
  facets: Facets;
  place?: {
    name?: string;
    address?: string;
  };
  options?: {
    tone?: 'neutral' | 'emotional' | 'professional';
    length?: 'short' | 'medium' | 'long'; // 기본 medium
    channels?: ('blog' | 'sns' | 'email')[];
  };
}

export interface ComposeGuidelineResponse {
  markdown: string;
  checklist?: {
    item: string;
    done: boolean;
  }[];
}

// ============ Supabase DB =============

export interface DBProject {
  id: string;
  client_id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface DBInput {
  id: string;
  project_id: string;
  raw_text: string;
  facets: Facets | null;
  place: any | null;
  created_at: string;
}

export interface DBKeyword {
  id: string;
  project_id: string;
  phrase: string;
  sv_exact: number | null;
  sv_variant_max: number | null;
  sv_effective: number | null;
  doc_total: number | null;
  doc_30d: number | null;
  serp_d: number | null;
  lc_score: number | null;
  final_score: number | null;
  conf: number;
  rationale: any; // {opp, comp, pen, ...}
  cluster_id?: string;
  substituted_from?: string;
  selected: boolean;
  created_at: string;
}

export interface DBCampaign {
  id: string;
  project_id: string;
  main4: string[];
  backup4?: string[];
  tone?: string;
  deadline?: string;
  status: 'draft' | 'approved' | 'published';
  created_at: string;
}

export interface APICache {
  key: string; // hash(params)
  data: any;
  ttl_at: string;
  source: string; // 'naver-search', 'gemini', 'server-volume'
  created_at: string;
}

// ============ 프론트 상태 =============

export interface AppState {
  // 프로젝트
  project: DBProject | null;
  
  // 입력
  rawInput: string;
  facets: Facets | null;
  tokens: Token[] | null;
  
  // 메트릭
  metrics: KeywordMetric[] | null;
  
  // 랭킹
  rankedKeywords: RankedKeyword[];
  selectedKeywords: RankedKeyword[];
  
  // 가이드
  guideline: string | null;
  
  // 로딩/에러
  isLoading: boolean;
  error: ErrorResponse | null;
  
  // UI
  showTokens: boolean;
  showMetrics: boolean;
  placeToggle: boolean; // POI 활성화 여부
}

// ============ 서비스 계층 인터페이스 =============

export interface IGeminiService {
  extractFacets(request: ExtractFacetsRequest): Promise<ExtractFacetsResponse>;
  composeGuideline(request: ComposeGuidelineRequest): Promise<ComposeGuidelineResponse>;
}

export interface INaverService {
  fetchKeywordMetrics(request: KeywordMetricsRequest): Promise<KeywordMetricsResponse>;
}

export interface IRankService {
  scoreTokens(tokens: Token[], metrics: Map<string, KeywordMetric>): TokenScore[];
  composeCombos(slotted: Map<string, Token[]>, scores: TokenScore[]): PhraseCombo[];
  scoreCombos(combos: PhraseCombo[], metrics: Map<string, KeywordMetric>): RankedKeyword[];
}

export interface ISupabaseService {
  upsertInput(projectId: string, raw: string, facets: Facets, place: any): Promise<DBInput>;
  upsertKeywords(projectId: string, keywords: RankedKeyword[]): Promise<DBKeyword[]>;
  listKeywords(projectId: string): Promise<DBKeyword[]>;
  getCampaign(projectId: string): Promise<DBCampaign | null>;
  saveCampaign(projectId: string, main4: string[], opts: any): Promise<DBCampaign>;
}

// ============ 임계값 & 상수 =============

export const THRESHOLDS = {
  SV_STRICT: 500, // 기본 임계
  SV_TREND: 300, // 트렌드 예외 하한
  DOC_30D_NORM_THRESHOLD: 0.3, // 트렌드 예외 조건
  MOM_TREND_THRESHOLD: 0.5, // 50% 이상
  LOCAL_BOOST_THRESHOLD: 0.8, // POI 예외
  SERP_D_THRESHOLD: 0.4, // POI 예외
};

export const WEIGHTS = {
  OPP: {
    SV: 0.55,
    MoM: 0.15,
    YoY: 0.1,
    Local: 0.1,
    Intent: 0.1,
  },
  COMP: {
    DOCTotal: 0.5,
    DOC30d: 0.25,
    SERPd: 0.25,
  },
  PEN: {
    Ambiguity: 0.4,
    BrandRisk: 0.3,
    PolicyRisk: 0.3,
  },
  FINAL: {
    LCStar: 0.7,
    SVNorm: 0.3,
  },
};

export const CACHE_TTL = {
  DEFAULT: 72 * 60 * 60 * 1000, // 72h
  PEAK_SEASON: 24 * 60 * 60 * 1000, // 24h
  VOLATILE: 6 * 60 * 60 * 1000, // 6h
};

export const RATE_LIMIT = {
  // IP 기준: 분당 10 요청
  IP_PER_MINUTE: 10,
  // 유저 기준: 시간당 100 요청
  USER_PER_HOUR: 100,
};

// ============ Legacy Front UI Types (compat) =============

// 기존 프론트 컴포넌트/서비스에서 사용하던 간단한 타입들을 호환 목적으로 유지

export interface Keyword {
  kw: string;
  sv: number; // Represents doc_t now, will be mapped from doc_t for display
  doc_t: number;
  lc_score: number;
  why: string;
  conf?: number;
  explanation?: string;
  sv_effective: number;
  sv_exact: number;
  threshold_pass: boolean;
  threshold_rule: 'STRICT_500' | 'TREND_EXEMPT' | 'POI_EXEMPT';
  explanation_threshold: string;
}

export interface LoadingState {
  active: boolean;
  message: string;
}

export type Tone = '실사 리뷰 톤' | '미니멀 정보 톤' | '감성 에세이 톤';
