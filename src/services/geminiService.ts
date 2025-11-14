/**
 * Gemini Service
 * 
 * Edge Function(`gemini-facets`)을 통해 Facet 추출 및 가이드라인 생성
 * 프론트에서 Gemini API 직접 호출 없음 (보안)
 */

import {
  ExtractFacetsRequest,
  ExtractFacetsResponse,
  ComposeGuidelineRequest,
  ComposeGuidelineResponse,
  ErrorResponse,
} from '../types';

const EDGE_BASE = import.meta.env.VITE_EDGE_BASE || 'http://localhost:54321/functions/v1';

class GeminiService {
  /**
   * Edge Function `gemini-facets`를 호출하여 Facet 추출
   */
  async extractFacets(request: ExtractFacetsRequest): Promise<ExtractFacetsResponse> {
    try {
      const response = await fetch(`${EDGE_BASE}/gemini-facets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getEdgeToken()}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const err = (await response.json()) as ErrorResponse;
        throw new Error(
          `[${err.code}] ${err.message} - ${err.hint || ''}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('[geminiService.extractFacets] error:', error);
      throw error;
    }
  }

  /**
   * Edge Function에서 가이드라인 생성
   * (현재: 로컬 LLM 호출, 향후 Edge Function으로 이동 권장)
   */
  async composeGuideline(
    request: ComposeGuidelineRequest
  ): Promise<ComposeGuidelineResponse> {
    try {
      // 임시: 로컬 Gemini API 호출 (프로덕션에서는 Edge Function 사용)
      // const response = await fetch(`${EDGE_BASE}/gemini-guideline`, { ... })

      // 여기서는 간단한 템플릿 기반 생성
      const markdown = this.generateGuidelineMarkdown(request);

      return {
        markdown,
        checklist: [
          { item: '제목에 핵심 키워드 3개 포함', done: true },
          { item: '본문에서 각 키워드 3회 이상 언급', done: true },
          { item: '1,000자 이상 작성', done: true },
          { item: '사진 8개 이상 포함', done: false },
          { item: '영상 1개 이상 포함', done: false },
        ],
      };
    } catch (error) {
      console.error('[geminiService.composeGuideline] error:', error);
      throw error;
    }
  }

  /**
   * 가이드라인 마크다운 생성 (로컬 템플릿)
   */
  private generateGuidelineMarkdown(request: ComposeGuidelineRequest): string {
    const { keywords, facets, options = {} } = request;
    const { tone = 'neutral', length = 'medium' } = options;

    const keywordStr = keywords.join(', ');
    const category = facets.category?.[0] || '업체';
    const target = facets.audience?.join(', ') || '고객';
    const signature = facets.signature_menu?.join(', ') || facets.items?.filter(i => i.signature)?.map(i => i.name)?.join(', ') || '대표 메뉴';

    const intro = `# ${facets.name || category} - ${keywords[0]}, ${keywords[1]} 완벽 가이드`;

    const content = `
## 개요
${facets.name || category}는 ${target}를 위한 ${facets.vibe?.[0] || '특별한 공간'}입니다. 
특히 **${keywords[0]}**과 **${keywords[1]}**로 검색하는 고객들 사이에서 인기가 높습니다.

## 핵심 특징
${facets.features?.map((f) => `- ${f}`).join('\n') || '- 업체만의 특별한 경험'}

## 대표 메뉴/서비스
**${signature}** 등 여러 메뉴를 직접 체험했습니다.

## 방문 팁
${facets.amenities?.map((a) => `- ${a} 완비`).join('\n') || '- 쾌적한 방문 환경'}

## 가격대
${facets.price_range?.join(', ') || '합리적인 가격대'}

## SNS 마케팅 전략
이 업체의 **${keywords[0]}**, **${keywords[1]}** 등의 키워드는 매달 검색량이 높고,
경쟁도가 낮아 SNS 마케팅에 매우 유리합니다.

### 해시태그
#${keywords[0]} #${keywords[1]} #${keywords[2] || '브런치'} #${keywords[3] || '카페'} #${category}

## 협찬 공시
본 포스트는 ${facets.name || category}과의 협찬으로 작성되었습니다.

---

마지막 업데이트: ${new Date().toLocaleDateString('ko-KR')}
`;

    return intro + content;
  }

  /**
   * Edge Token 획득 (임시: mock)
   */
  private getEdgeToken(): string {
    // 실제: Supabase Auth session에서 토큰 가져오기
    return 'mock-token';
  }
}

export default new GeminiService();
