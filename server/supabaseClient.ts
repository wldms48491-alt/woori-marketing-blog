import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.');
  }

  if (!cachedClient) {
    const apiKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

    cachedClient = createClient(process.env.SUPABASE_URL!, apiKey, {
      auth: {
        persistSession: false
      }
    });
  }

  return cachedClient;
}

// ===== Supabase 데이터 관리 함수 =====

export interface Analysis {
  id?: string;
  userId: string;
  placeName: string;
  description: string;
  facets: Record<string, any>;
  keywords: Record<string, any>[];
  guideline: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Keyword {
  id?: string;
  userId: string;
  analysisId: string;
  keyword: string;
  searchVolume: number;
  lcScore: number;
  confidence: number;
  selected: boolean;
  createdAt?: string;
}

export interface Guideline {
  id?: string;
  userId: string;
  analysisId: string;
  tone: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 분석 결과를 Supabase에 저장
 */
export async function saveAnalysis(analysis: Analysis): Promise<Analysis> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('analyses')
      .insert([analysis])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ 분석 저장 오류:', err);
    throw err;
  }
}

/**
 * 사용자의 분석 목록 조회
 */
export async function getUserAnalyses(userId: string): Promise<Analysis[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('analyses')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ 분석 조회 오류:', err);
    throw err;
  }
}

/**
 * 특정 분석 조회
 */
export async function getAnalysis(analysisId: string): Promise<Analysis> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ 분석 조회 오류:', err);
    throw err;
  }
}

/**
 * 분석 결과 업데이트
 */
export async function updateAnalysis(analysisId: string, updates: Partial<Analysis>): Promise<Analysis> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('analyses')
      .update(updates)
      .eq('id', analysisId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ 분석 업데이트 오류:', err);
    throw err;
  }
}

/**
 * 분석 결과 삭제
 */
export async function deleteAnalysis(analysisId: string): Promise<void> {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('analyses')
      .delete()
      .eq('id', analysisId);

    if (error) throw error;
  } catch (err) {
    console.error('❌ 분석 삭제 오류:', err);
    throw err;
  }
}

/**
 * 키워드 저장
 */
export async function saveKeywords(keywords: Keyword[]): Promise<Keyword[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('keywords')
      .insert(keywords)
      .select();

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ 키워드 저장 오류:', err);
    throw err;
  }
}

/**
 * 분석의 키워드 조회
 */
export async function getAnalysisKeywords(analysisId: string): Promise<Keyword[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('keywords')
      .select('*')
      .eq('analysisId', analysisId)
      .order('searchVolume', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('❌ 키워드 조회 오류:', err);
    throw err;
  }
}

/**
 * 가이드라인 저장
 */
export async function saveGuideline(guideline: Guideline): Promise<Guideline> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('guidelines')
      .insert([guideline])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ 가이드라인 저장 오류:', err);
    throw err;
  }
}

/**
 * 분석의 가이드라인 조회
 */
export async function getAnalysisGuideline(analysisId: string): Promise<Guideline | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('guidelines')
      .select('*')
      .eq('analysisId', analysisId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ 가이드라인 조회 오류:', err);
    throw err;
  }
}
