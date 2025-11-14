/**
 * Supabase Service
 * 
 * DB CRUD: projects, inputs, keywords, campaigns
 * RLS enforced per tenant (agency_id from JWT)
 */

import {
  DBProject,
  DBInput,
  DBKeyword,
  DBCampaign,
  Facets,
  RankedKeyword,
  ErrorResponse,
} from '../types';

interface SupabaseClient {
  from(table: string): any;
  auth: {
    getUser(): Promise<{ data: { user: any } | null }>;
  };
}

class SupabaseService {
  private client: SupabaseClient | null = null;

  /**
   * Supabase 클라이언트 초기화
   */
  initialize(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * 현재 사용자의 agency_id 조회
   */
  async getCurrentAgencyId(): Promise<string> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data } = await this.client.auth.getUser();
    if (!data?.user) throw new Error('Not authenticated');

    // JWT에서 agency_id 클레임 추출 (또는 사용자 프로필에서)
    const agencyId = data.user.user_metadata?.agency_id || data.user.id;
    return agencyId;
  }

  /**
   * 프로젝트 생성/조회
   */
  async getProject(projectId: string): Promise<DBProject | null> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('[supabaseService.getProject] error:', error);
      return null;
    }

    return data as DBProject;
  }

  /**
   * 입력값 저장
   */
  async upsertInput(
    projectId: string,
    raw: string,
    facets: Facets,
    place: any
  ): Promise<DBInput> {
    if (!this.client) throw new Error('Supabase not initialized');

    const agencyId = await this.getCurrentAgencyId();

    const { data, error } = await this.client.from('inputs').upsert(
      {
        project_id: projectId,
        raw_text: raw,
        facets,
        place,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    );

    if (error) {
      console.error('[supabaseService.upsertInput] error:', error);
      throw error;
    }

    return (data?.[0] || {}) as DBInput;
  }

  /**
   * 키워드 목록 저장
   */
  async upsertKeywords(
    projectId: string,
    keywords: RankedKeyword[]
  ): Promise<DBKeyword[]> {
    if (!this.client) throw new Error('Supabase not initialized');

    const rows = keywords.map((kw) => ({
      project_id: projectId,
      phrase: kw.phrase,
      sv_exact: kw.sv_exact,
      sv_variant_max: kw.sv_variant_max,
      sv_effective: kw.sv_effective,
      doc_total: kw.doc_total,
      doc_30d: kw.doc_30d,
      serp_d: kw.serp_d,
      lc_score: kw.lc_star,
      final_score: kw.final_score,
      conf: kw.conf,
      rationale: {
        exceeds_threshold: kw.exceeds_threshold,
        threshold_rule: kw.threshold_rule,
        exception_reason: kw.exception_reason,
      },
      substituted_from: kw.substituted_from,
      selected: kw.selected || false,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await this.client
      .from('keywords')
      .upsert(rows, { onConflict: 'project_id,phrase' });

    if (error) {
      console.error('[supabaseService.upsertKeywords] error:', error);
      throw error;
    }

    return (data || []) as DBKeyword[];
  }

  /**
   * 프로젝트별 키워드 목록 조회
   */
  async listKeywords(projectId: string): Promise<DBKeyword[]> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('keywords')
      .select('*')
      .eq('project_id', projectId)
      .order('final_score', { ascending: false });

    if (error) {
      console.error('[supabaseService.listKeywords] error:', error);
      return [];
    }

    return (data || []) as DBKeyword[];
  }

  /**
   * 캠페인 조회
   */
  async getCampaign(projectId: string): Promise<DBCampaign | null> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('campaigns')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      console.error('[supabaseService.getCampaign] error:', error);
      return null;
    }

    return data as DBCampaign;
  }

  /**
   * 캠페인 저장
   */
  async saveCampaign(
    projectId: string,
    main4: string[],
    options: any = {}
  ): Promise<DBCampaign> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client.from('campaigns').upsert(
      {
        project_id: projectId,
        main4,
        backup4: options.backup4 || [],
        tone: options.tone || 'neutral',
        deadline: options.deadline || null,
        status: options.status || 'draft',
        created_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    );

    if (error) {
      console.error('[supabaseService.saveCampaign] error:', error);
      throw error;
    }

    return (data?.[0] || {}) as DBCampaign;
  }

  /**
   * API 캐시 조회
   */
  async getCachedData(key: string): Promise<any | null> {
    if (!this.client) throw new Error('Supabase not initialized');

    const { data, error } = await this.client
      .from('api_cache')
      .select('data')
      .eq('key', key)
      .single();

    if (error || !data) {
      return null;
    }

    // TTL 확인
    const { data: cacheRow } = await this.client
      .from('api_cache')
      .select('ttl_at')
      .eq('key', key)
      .single();

    if (cacheRow && new Date() > new Date(cacheRow.ttl_at)) {
      // TTL 만료: 삭제
      await this.client.from('api_cache').delete().eq('key', key);
      return null;
    }

    return data?.data || null;
  }

  /**
   * API 캐시 저장
   */
  async setCacheData(
    key: string,
    data: any,
    ttlMs: number = 72 * 60 * 60 * 1000,
    source: string = 'unknown'
  ): Promise<void> {
    if (!this.client) throw new Error('Supabase not initialized');

    const ttlAt = new Date(Date.now() + ttlMs).toISOString();

    const { error } = await this.client.from('api_cache').upsert(
      {
        key,
        data,
        ttl_at: ttlAt,
        source,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

    if (error) {
      console.error('[supabaseService.setCacheData] error:', error);
    }
  }
}

export default new SupabaseService();
