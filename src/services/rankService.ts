/**
 * Rank Service
 * 
 * Token normalization - Combo generation - Scoring (OPP/COMP/PEN/LC Star/FinalScore)
 */

import {
  Token,
  TokenScore,
  KeywordMetric,
  PhraseCombo,
  RankedKeyword,
  Facets,
  THRESHOLDS,
  WEIGHTS,
} from '../types';

class RankService {
  /**
   * 토큰별 점수화
   * SV/DOC 정규화 → T* (토큰 기본 점수) 계산
   */
  scoreTokens(
    tokens: Token[],
    metrics: Map<string, KeywordMetric>
  ): TokenScore[] {
    // 메트릭에서 SV/DOC의 max값 수집 (정규화용)
    const svValues = Array.from(metrics.values())
      .map((m) => m.sv || 0)
      .filter((v) => v > 0);
    const maxSV = Math.max(...svValues, 1);

    const docValues = Array.from(metrics.values())
      .map((m) => m.doc_total || 0)
      .filter((v) => v > 0);
    const maxDoc = Math.max(...docValues, 1);

    return tokens.map((token) => {
      const metric = metrics.get(token.text);

      const sv = metric?.sv || 0;
      const docTotal = metric?.doc_total || 0;

      // 0~1 정규화
      const sv_norm = Math.min(sv / maxSV, 1);
      const doc_norm = Math.min(docTotal / maxDoc, 1);

      // T* = 0.6 * sv_norm + 0.4 * doc_norm
      const t_score = 0.6 * sv_norm + 0.4 * doc_norm;

      return {
        token,
        sv: sv || null,
        doc_total: docTotal || null,
        doc_30d: metric?.doc_30d || null,
        serp_d: metric?.serp_d || null,
        sv_norm,
        doc_norm,
        t_score,
      };
    });
  }

  /**
   * 토큰 조합 생성
   * 슬롯별 토큰 → 조합 (Cartesian product with constraints)
   */
  composeCombos(
    slotted: Map<string, Token[]>,
    tokenScores: TokenScore[]
  ): PhraseCombo[] {
    const combos: PhraseCombo[] = [];

    // 슬롯 내 토큰
    const locations = slotted.get('Location') || [];
    const pois = slotted.get('Micro-POI') || [];
    const items = slotted.get('Item') || [];
    const intents = slotted.get('Intent') || [];

    // Cartesian product (최대 3개 조합까지만)
    const maxCombos = 50; // 폭발 방지

    for (const loc of locations.slice(0, 3)) {
      for (const poi of pois.length > 0 ? pois.slice(0, 2) : [null]) {
        for (const item of items.slice(0, 3)) {
          for (const intent of intents.length > 0 ? intents.slice(0, 1) : [null]) {
            if (combos.length >= maxCombos) break;

            const parts: Token[] = [];
            if (loc) parts.push(loc);
            if (poi) parts.push(poi);
            if (item) parts.push(item);
            if (intent) parts.push(intent);

            const phrase = parts.map((t) => t.text).join(' ');

            // 결속도: PMI 근사치 (슬롯 순서 + 토큰 점수 기반)
            const cohesion = this.calculateCohesion(parts, tokenScores);

            combos.push({
              phrase,
              tokens: parts,
              cohesion,
            });
          }
        }
      }
    }

    // 결속도 기준 정렬 (높을수록 먼저)
    combos.sort((a, b) => b.cohesion - a.cohesion);

    return combos.slice(0, maxCombos);
  }

  /**
   * 조합별 점수화
   * OPP/COMP/PEN → LC* → FinalScore
   * 임계값 검사 (SV≥500, 예외 처리)
   */
  scoreCombos(
    combos: PhraseCombo[],
    metrics: Map<string, KeywordMetric>
  ): RankedKeyword[] {
    return combos.map((combo) => {
      // 조합 자체의 메트릭 조회 (또는 토큰 메트릭으로부터 추정)
      const comboMetric = metrics.get(combo.phrase) || this.estimateComboMetric(combo, metrics);

      const sv = comboMetric.sv || 0;
      const doc30d = comboMetric.doc_30d || 0;
      const docTotal = comboMetric.doc_total || 0;
      const serpD = comboMetric.serp_d || 0;

      // 정규화 (기준: max 값)
      const svMax = 10000;
      const docMax = 100000;
      const sv_norm = Math.min(sv / svMax, 1);
      const doc_norm = Math.min(docTotal / docMax, 1);
      const serp_norm = Math.min(serpD / 1, 1);

      // ===== OPP (Opportunity) =====
      // 0.55*SVₙ + 0.15*MoMₙ + 0.10*YoYₙ + 0.10*LOCALₙ + 0.10*INTENTₙ
      // 간단화: 0.55*SVₙ + 0.45*other (MoM, YoY, LOCAL 스텁)
      const mom_norm = 0.5; // 전월 대비 (스텁)
      const yoy_norm = 0.5; // 년간 대비 (스텁)
      const local_norm = 0.7; // 로컬 부스트 (스텁)
      const intent_norm = 0.6; // 의도 매칭도 (스텁)

      const opp =
        WEIGHTS.OPP.SV * sv_norm +
        WEIGHTS.OPP.MoM * mom_norm +
        WEIGHTS.OPP.YoY * yoy_norm +
        WEIGHTS.OPP.Local * local_norm +
        WEIGHTS.OPP.Intent * intent_norm;

      // ===== COMP (Competition) =====
      // 0.50*DOCᵀₙ + 0.25*DOC³⁰ₙ + 0.25*SERPᵈₙ
      const doc_total_norm = Math.min(docTotal / docMax, 1);
      const doc_30d_norm = Math.min(doc30d / (docMax * 0.35), 1); // DOC³⁰ ≈ 35% of DOCᵀ
      const comp =
        WEIGHTS.COMP.DOCTotal * doc_total_norm +
        WEIGHTS.COMP.DOC30d * doc_30d_norm +
        WEIGHTS.COMP.SERPd * serp_norm;

      // ===== PEN (Penalty) =====
      // 0.40*AMBₙ + 0.30*RISKbrand + 0.30*RISKpolicy
      // 스텁: 기본 0.3 (낮은 페널티)
      const amb_norm = 0.2; // 모호성 (스텁)
      const risk_brand = 0.15; // 브랜드 위험 (스텁)
      const risk_policy = 0.1; // 정책 위험 (스텁)

      const pen =
        WEIGHTS.PEN.Ambiguity * amb_norm +
        WEIGHTS.PEN.BrandRisk * risk_brand +
        WEIGHTS.PEN.PolicyRisk * risk_policy;

      // ===== LC* (Low-Competition Score) =====
      // LC* = OPP - 0.9*COMP - 0.6*PEN
      const lc_star = opp - 0.9 * comp - 0.6 * pen;

      // ===== FinalScore =====
      // 0.7*LC* + 0.3*SVₙ
      const final_score = WEIGHTS.FINAL.LCStar * Math.max(lc_star, 0) + WEIGHTS.FINAL.SVNorm * sv_norm;

      // ===== 임계값 검사 =====
      const sv_effective = sv;
      const exceeds_threshold = sv_effective >= THRESHOLDS.SV_STRICT;

      // Trend 예외 (SV 300-499 + MoM ≥ 50%)
      const trend_exception =
        sv_effective >= THRESHOLDS.SV_TREND &&
        sv_effective < THRESHOLDS.SV_STRICT &&
        mom_norm >= 0.5;

      // POI 예외 (Location 슬롯 + Local boost ≥ 0.8)
      const poi_exception =
        combo.tokens.some((t) => t.slot === 'Location') &&
        local_norm >= 0.8;

      const passes_threshold = exceeds_threshold || trend_exception || poi_exception;

      // 치환 추적
      let substituted_from: string | null = null;
      let substitution_reason: { metric: string; direction: string } | null = null;

      if (combo.tokens.length > 1) {
        // 토큰별 메트릭 수집
        const tokenMetrics = combo.tokens.map((t) => ({
          token: t.text,
          metric: metrics.get(t.text),
        }));

        // 예: 강남역(5000) → 강남 로데오거리(5900)로 치환 시
        const mainToken = combo.tokens[0]; // 첫 토큰을 기준
        const mainMetric = metrics.get(mainToken.text);

        if (
          mainToken.aliases &&
          mainToken.aliases.length > 0 &&
          mainMetric &&
          mainMetric.sv
        ) {
          // 별칭 중 SV가 높은 것 있는지 확인
          const bestAlias = mainToken.aliases.reduce(
            (best, alias) => {
              const aliasMetric = metrics.get(alias);
              if (
                aliasMetric &&
                aliasMetric.sv &&
                (!best.metric || aliasMetric.sv > best.metric.sv)
              ) {
                return { alias, metric: aliasMetric };
              }
              return best;
            },
            { alias: '', metric: null as KeywordMetric | null }
          );

          if (
            bestAlias.metric &&
            bestAlias.metric.sv > mainMetric.sv * 1.1
          ) {
            const svGain =
              (((bestAlias.metric.sv - mainMetric.sv) / mainMetric.sv) * 100)
                .toFixed(1) + '%';

            substituted_from = mainToken.text;
            substitution_reason = {
              metric: 'SV',
              direction: `+${svGain}`,
            };
          }
        }
      }

      return {
        phrase: combo.phrase,
        sv_exact: sv,
        sv_variant_max: sv,
        sv_effective,
        sv_norm,
        doc_total: docTotal,
        doc_30d: doc30d,
        doc_total_norm,
        doc_30d_norm,
        serp_d: serpD,
        serp_d_norm: serp_norm,
        opp,
        comp,
        pen,
        lc_star,
        final_score,
        conf: comboMetric.sv_conf || 0.3,
        exceeds_threshold,
        threshold_rule: exceeds_threshold
          ? 'STRICT_500'
          : trend_exception
            ? 'TREND_EXEMPT'
            : poi_exception
              ? 'POI_EXEMPT'
              : undefined,
        exception_reason: trend_exception
          ? `MoM ${(mom_norm * 100).toFixed(0)}% (trend exception)`
          : poi_exception
            ? `Local boost ${(local_norm * 100).toFixed(0)}% (POI exception)`
            : undefined,
        substituted_from,
        substitution_reason,
        selected: false,
      };
    });
  }

  /**
   * 결속도 계산 (PMI 근사)
   * 슬롯 순서 + 토큰 점수 기반
   */
  private calculateCohesion(
    tokens: Token[],
    tokenScores: TokenScore[]
  ): number {
    if (tokens.length < 2) return 0.5; // 단일 토큰: 중간 점수

    // 슬롯 순서: Location → Micro-POI → Item → Intent
    const slotOrder: Record<string, number> = {
      Location: 0,
      'Micro-POI': 1,
      Item: 2,
      Intent: 3,
    };

    // 슬롯 순서가 올바른지 확인
    let isOrderCorrect = true;
    let prevOrder = -1;
    for (const token of tokens) {
      const currentOrder = slotOrder[token.slot] || 999;
      if (currentOrder <= prevOrder) {
        isOrderCorrect = false;
        break;
      }
      prevOrder = currentOrder;
    }

    const orderBonus = isOrderCorrect ? 0.2 : 0;

    // 토큰별 T* 평균
    const tokenScoreMap = new Map(
      tokenScores.map((ts) => [ts.token.text, ts.t_score])
    );
    const avgTScore =
      tokens.reduce((sum, t) => sum + (tokenScoreMap.get(t.text) || 0.5), 0) /
      tokens.length;

    // 결속도 = 0.6 * order_bonus + 0.4 * avg_t_score
    const cohesion = Math.min(
      0.6 * (orderBonus / 0.2) + 0.4 * avgTScore,
      1
    );

    return cohesion;
  }

  /**
   * 조합 메트릭 추정
   * 개별 토큰 메트릭으로부터 조합 메트릭 추정
   */
  private estimateComboMetric(
    combo: PhraseCombo,
    metrics: Map<string, KeywordMetric>
  ): KeywordMetric {
    const tokenMetrics = combo.tokens
      .map((t) => metrics.get(t.text))
      .filter((m) => m !== undefined) as KeywordMetric[];

    if (tokenMetrics.length === 0) {
      return {
        phrase: combo.phrase,
        sv: null,
        sv_conf: 0,
        doc_total: null,
        doc_30d: null,
        serp_d: null,
      };
    }

    // SV: 최대값 사용 (또는 곱셈)
    const sv = Math.max(
      ...tokenMetrics
        .map((m) => m.sv || 0)
        .filter((v) => v > 0)
    );

    // DOC: 합산 또는 가중치
    const docTotal = tokenMetrics.reduce((sum, m) => sum + (m.doc_total || 0), 0) / 2;
    const doc30d = tokenMetrics.reduce((sum, m) => sum + (m.doc_30d || 0), 0) / 2;

    // SERP^d: 평균
    const serpD =
      tokenMetrics.reduce((sum, m) => sum + (m.serp_d || 0), 0) /
      tokenMetrics.length;

    // 신뢰도: 최소값 사용 (보수적)
    const sv_conf = Math.min(...tokenMetrics.map((m) => m.sv_conf || 0.3));

    return {
      phrase: combo.phrase,
      sv: sv > 0 ? sv : null,
      sv_conf,
      doc_total: docTotal > 0 ? docTotal : null,
      doc_30d: doc30d > 0 ? doc30d : null,
      serp_d: serpD > 0 ? serpD : null,
    };
  }
}

export default new RankService();
