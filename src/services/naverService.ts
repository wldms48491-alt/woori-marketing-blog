/**
 * Naver Service
 * 
 * Edge Function(`keyword-metrics`)을 통해 키워드 검색량/경쟁도 조회
 * 프론트에서 Naver API 직접 호출 없음 (보안)
 */

import {
  KeywordMetric,
  ErrorResponse,
} from '../types';

const EDGE_BASE = import.meta.env.VITE_EDGE_BASE || 'http://localhost:54321/functions/v1';

interface KeywordMetricsRequest {
  phrases: string[];
  region?: string;
  period?: '12m' | '3m';
}

class NaverService {
  /**
   * Edge Function `keyword-metrics`를 호출하여 키워드별 검색량/경쟁도 조회
   */
  async fetchKeywordMetrics(
    phrases: string[],
    options: { region?: string; period?: '12m' | '3m' } = {}
  ): Promise<KeywordMetric[]> {
    try {
      const request: KeywordMetricsRequest = {
        phrases,
        region: options.region,
        period: options.period || '12m',
      };

      const response = await fetch(`${EDGE_BASE}/keyword-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getEdgeToken()}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const err = (await response.json()) as ErrorResponse;
        console.error('[naverService] error:', err);
        
        // 폴백: 빈 메트릭 반환 (UI는 계속 진행, 0값 표시)
        return phrases.map((phrase) => ({
          phrase,
          sv: null,
          sv_conf: 0,
          doc_total: null,
          doc_30d: null,
          serp_d: null,
          components: {
            autosuggest_freq: 0,
            blog_total: 0,
          },
        }));
      }

      const data = await response.json();
      return data.rows || [];
    } catch (error) {
      console.error('[naverService.fetchKeywordMetrics] error:', error);
      
      // 네트워크 오류 폴백
      return phrases.map((phrase) => ({
        phrase,
        sv: null,
        sv_conf: 0,
        doc_total: null,
        doc_30d: null,
        serp_d: null,
        components: {
          autosuggest_freq: 0,
          blog_total: 0,
        },
      }));
    }
  }

  /**
   * 단일 키워드 메트릭 조회
   */
  async getMetric(phrase: string): Promise<KeywordMetric | null> {
    const results = await this.fetchKeywordMetrics([phrase]);
    return results[0] || null;
  }

  /**
   * Edge Token 획득 (임시: mock)
   */
  private getEdgeToken(): string {
    // 실제: Supabase Auth session에서 토큰 가져오기
    return 'mock-token';
  }
}

export default new NaverService();
