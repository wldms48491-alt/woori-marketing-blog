import type { Facets, Keyword } from '../../types';
import { getApiUrl } from '../../../services/apiConfig';

/**
 * 분석 결과를 Supabase에 저장 (백엔드 HTTP API 경유)
 */
export async function saveAnalysisToSupabase(
  userId: string,
  placeName: string,
  description: string,
  facets: Facets,
  keywords: Keyword[],
  guideline: string
) {
  try {
    const resp = await fetch(getApiUrl('/supabase/save-analysis'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        placeName,
        description,
        facets,
        keywords,
        guideline
      })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err?.error || '분석 저장 실패');
    }

    return await resp.json();
  } catch (err: any) {
    console.error('❌ 분석 저장 오류:', err.message);
    throw err;
  }
}

export async function getUserAnalyses(userId: string) {
  try {
    const resp = await fetch(getApiUrl(`/supabase/analyses/${userId}`));

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err?.error || '분석 목록 조회 실패');
    }

    return await resp.json();
  } catch (err: any) {
    console.error('❌ 분석 목록 조회 오류:', err.message);
    throw err;
  }
}

export async function getAnalysisDetail(analysisId: string) {
  try {
    const resp = await fetch(getApiUrl(`/supabase/analysis/${analysisId}`));

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err?.error || '분석 상세 조회 실패');
    }

    return await resp.json();
  } catch (err: any) {
    console.error('❌ 분석 상세 조회 오류:', err.message);
    throw err;
  }
}

export async function updateAnalysis(
  analysisId: string,
  updates: Record<string, any>
) {
  try {
    const resp = await fetch(getApiUrl(`/supabase/analysis/${analysisId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err?.error || '분석 업데이트 실패');
    }

    return await resp.json();
  } catch (err: any) {
    console.error('❌ 분석 업데이트 오류:', err.message);
    throw err;
  }
}

export async function deleteAnalysis(analysisId: string) {
  try {
    const resp = await fetch(getApiUrl(`/supabase/analysis/${analysisId}`), {
      method: 'DELETE'
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err?.error || '분석 삭제 실패');
    }

    return await resp.json();
  } catch (err: any) {
    console.error('❌ 분석 삭제 오류:', err.message);
    throw err;
  }
}

export async function saveKeywordsToSupabase(keywords: Keyword[]) {
  try {
    const resp = await fetch(getApiUrl('/supabase/save-keywords'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err?.error || '키워드 저장 실패');
    }

    return await resp.json();
  } catch (err: any) {
    console.error('❌ 키워드 저장 오류:', err.message);
    throw err;
  }
}

export async function saveGuidelineToSupabase(
  userId: string,
  analysisId: string,
  tone: string,
  content: string
) {
  try {
    const resp = await fetch(getApiUrl('/supabase/save-guideline'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, analysisId, tone, content })
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err?.error || '가이드라인 저장 실패');
    }

    return await resp.json();
  } catch (err: any) {
    console.error('❌ 가이드라인 저장 오류:', err.message);
    throw err;
  }
}

export async function saveCompleteAnalysis(
  userId: string,
  placeName: string,
  description: string,
  facets: Facets,
  keywords: Keyword[],
  guideline: string,
  tone: string
) {
  try {
    const analysis = await saveAnalysisToSupabase(
      userId,
      placeName,
      description,
      facets,
      keywords,
      guideline
    );

    const analysisId = analysis.analysisId;

    await saveKeywordsToSupabase(keywords);

    await saveGuidelineToSupabase(userId, analysisId, tone, guideline);

    return { analysisId };
  } catch (err) {
    console.error('❌ 전체 분석 저장 오류:', err);
    throw err;
  }
}
