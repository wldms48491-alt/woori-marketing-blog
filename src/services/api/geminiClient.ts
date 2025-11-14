import type { Facets, Keyword, Tone } from '../../types';

// Frontend service: call backend AI endpoints

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const withRetry = async <T>(fn: () => Promise<T>, max = 3, base = 1200): Promise<T> => {
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === max - 1) throw e;
      await delay(base * Math.pow(2, i));
    }
  }
  throw new Error('retry exceeded');
};

export const extractFacets = async (description: string, placeInfo: string, address?: string): Promise<Facets> => {
  return withRetry(async () => {
    const resp = await fetch('/api/ai/extract-facets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, placeInfo, address })
    });
    if (!resp.ok) {
      try {
        const err = await resp.json();
        throw new Error(err?.error || err?.message || 'AI 분석 실패');
      } catch (_) {
        throw new Error('AI 분석 실패');
      }
    }
    return await resp.json();
  });
};

export const rankKeywords = async (facets: Facets): Promise<any> => {
  return withRetry(async () => {
    const resp = await fetch('/api/ai/rank-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facets })
    });
    if (!resp.ok) {
      try {
        const err = await resp.json();
        throw new Error(err?.error || err?.message || '키워드 분석 실패');
      } catch (_) {
        throw new Error('키워드 분석 실패');
      }
    }
    const data = await resp.json();
    // 백엔드: { recommended_combinations, all_keywords, warning } 형태로 응답
    return data;
  });
};

export const generateGuideline = async (keywords: string[], tone: Tone): Promise<string> => {
  return withRetry(async () => {
    const resp = await fetch('/api/ai/generate-guideline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords, tone })
    });
    if (!resp.ok) {
      try {
        const err = await resp.json();
        throw new Error(err?.error || err?.message || '가이드라인 생성 실패');
      } catch (_) {
        throw new Error('가이드라인 생성 실패');
      }
    }
    const data = await resp.json();
    return data.guideline as string;
  });
};
