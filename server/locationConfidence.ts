/**
 * 위치 추출 신뢰도 점수 계산 시스템
 * 7가지 signal을 기반으로 0.0 ~ 1.0 범위의 신뢰도 점수 계산
 */

import { LocationExtractionResult } from './locationDatabase';
import { normalizeLocationAlias } from './aliasNormalizer';

export interface LocationConfidenceSignals {
  cityFound: boolean;
  districtFound: boolean;
  microPoiFound: boolean;
  aliasMatch: boolean;
  bothFieldsConsistent: boolean;
  sourceDescription: boolean;
}

export interface LocationConfidenceMetrics {
  score: number; // 0.0 ~ 1.0
  level: 'high' | 'medium' | 'low';
  signals: LocationConfidenceSignals;
  warnings: string[];
  details: string;
}

/**
 * 위치 추출 신뢰도 점수 계산
 * @param placeInfo 업체명/위치정보
 * @param description 업체 설명
 * @param parsed 파싱된 위치 정보
 * @returns 신뢰도 지표
 */
export function calculateLocationConfidence(
  placeInfo: string,
  description: string,
  parsed: LocationExtractionResult
): LocationConfidenceMetrics {
  const signals: LocationConfidenceSignals = {
    cityFound: !!parsed.city && parsed.city !== '전국',
    districtFound: !!parsed.district && parsed.district !== '',
    microPoiFound: (parsed.neighborhoods?.length || 0) > 0,
    aliasMatch: false,
    bothFieldsConsistent: true,
    sourceDescription: parsed.source === 'description'
  };

  // 약칭 매칭 검사
  const placeAlias = normalizeLocationAlias(placeInfo);
  const descAlias = normalizeLocationAlias(description);
  signals.aliasMatch = !!(placeAlias.city || descAlias.city);

  // 일관성 검사
  if (placeAlias.city && descAlias.city) {
    signals.bothFieldsConsistent =
      placeAlias.city === descAlias.city &&
      (placeAlias.district === descAlias.district || !descAlias.district || !placeAlias.district);
  }

  // 점수 계산 (최대 1.0)
  let score = 0;
  score += signals.cityFound ? 0.3 : 0;
  score += signals.districtFound ? 0.3 : 0;
  score += signals.microPoiFound ? 0.2 : 0;
  score += signals.aliasMatch ? 0.1 : 0;
  score += signals.bothFieldsConsistent ? 0.05 : -0.05;
  score += signals.sourceDescription ? 0.05 : 0;

  // 범위 조정 [0, 1]
  score = Math.max(0, Math.min(1, score));

  // 신뢰도 레벨 결정
  const level: 'high' | 'medium' | 'low' =
    score >= 0.75 ? 'high' : score >= 0.5 ? 'medium' : 'low';

  // 경고 메시지
  const warnings: string[] = [];
  if (!signals.cityFound) {
    warnings.push('도시 정보 미검출');
  }
  if (!signals.districtFound) {
    warnings.push('구/군 정보 미검출');
  }
  if (placeAlias.city && descAlias.city && !signals.bothFieldsConsistent) {
    warnings.push('업체명과 설명의 위치 정보 불일치');
  }
  if (!signals.aliasMatch && !signals.sourceDescription) {
    warnings.push('약칭 미지원 - 정규식으로만 파싱됨');
  }

  // 상세 설명
  const details = generateConfidenceDetails(signals, score);

  return {
    score,
    level,
    signals,
    warnings,
    details
  };
}

/**
 * 신뢰도 점수의 상세 설명 생성
 */
function generateConfidenceDetails(signals: LocationConfidenceSignals, score: number): string {
  const parts: string[] = [];

  if (signals.cityFound) {
    parts.push('✓ 도시 정보 검출됨');
  }
  if (signals.districtFound) {
    parts.push('✓ 구/군 정보 검출됨');
  }
  if (signals.microPoiFound) {
    parts.push('✓ 동/상권 정보 검출됨');
  }
  if (signals.aliasMatch) {
    parts.push('✓ 약칭 매칭됨');
  }
  if (signals.bothFieldsConsistent) {
    parts.push('✓ 정보 일관성 검증됨');
  }

  return parts.length > 0 ? parts.join(', ') : '정보 부족';
}

/**
 * 여러 위치 정보의 신뢰도를 비교
 */
export function compareCandidates(
  placeInfo: string,
  description: string,
  candidates: LocationExtractionResult[]
): {
  best: LocationExtractionResult & { confidenceMetrics: LocationConfidenceMetrics };
  candidates: Array<LocationExtractionResult & { confidenceMetrics: LocationConfidenceMetrics }>;
} {
  const scored = candidates.map(candidate => ({
    ...candidate,
    confidenceMetrics: calculateLocationConfidence(placeInfo, description, candidate)
  }));

  // 신뢰도 순으로 정렬
  scored.sort((a, b) => b.confidenceMetrics.score - a.confidenceMetrics.score);

  return {
    best: scored[0],
    candidates: scored
  };
}

export default {
  calculateLocationConfidence,
  compareCandidates
};
