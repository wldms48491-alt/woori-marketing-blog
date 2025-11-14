import { Express, Request, Response } from 'express';
import {
  saveAnalysis,
  getUserAnalyses,
  getAnalysis,
  updateAnalysis,
  deleteAnalysis,
  saveKeywords,
  getAnalysisKeywords,
  saveGuideline,
  getAnalysisGuideline
} from './supabaseClient';

export function setupSupabaseRoutes(app: Express) {
  // 분석 결과 저장
  app.post('/api/supabase/save-analysis', async (req: Request, res: Response) => {
    try {
      console.log('💾 [/api/supabase/save-analysis] 요청 수신');
      const { userId, placeName, description, facets, keywords, guideline } = req.body;

      if (!userId || !placeName) {
        return res.status(400).json({ error: '필수 파라미터 누락: userId, placeName' });
      }

      const analysis = await saveAnalysis({
        userId,
        placeName,
        description,
        facets: facets || {},
        keywords: keywords || [],
        guideline: guideline || ''
      });

      console.log('✅ 분석 저장 성공:', analysis.id);
      res.json({ success: true, analysisId: analysis.id, analysis });
    } catch (err: any) {
      console.error('❌ 분석 저장 오류:', err.message);
      res.status(500).json({ error: '분석 저장 실패', details: err.message });
    }
  });

  // 사용자 분석 목록 조회
  app.get('/api/supabase/analyses/:userId', async (req: Request, res: Response) => {
    try {
      console.log('📋 [/api/supabase/analyses] 요청 수신:', req.params.userId);
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: '필수 파라미터 누락: userId' });
      }

      const analyses = await getUserAnalyses(userId);

      console.log(`✅ ${analyses.length}개 분석 조회 성공`);
      res.json({ success: true, count: analyses.length, analyses });
    } catch (err: any) {
      console.error('❌ 분석 조회 오류:', err.message);
      res.status(500).json({ error: '분석 조회 실패', details: err.message });
    }
  });

  // 특정 분석 상세 조회
  app.get('/api/supabase/analysis/:analysisId', async (req: Request, res: Response) => {
    try {
      console.log('📌 [/api/supabase/analysis] 요청 수신:', req.params.analysisId);
      const { analysisId } = req.params;

      if (!analysisId) {
        return res.status(400).json({ error: '필수 파라미터 누락: analysisId' });
      }

      const analysis = await getAnalysis(analysisId);
      const keywords = await getAnalysisKeywords(analysisId);
      const guideline = await getAnalysisGuideline(analysisId);

      console.log(`✅ 분석 상세 조회 성공 (키워드: ${keywords.length}개)`);
      res.json({ success: true, analysis, keywords, guideline });
    } catch (err: any) {
      console.error('❌ 분석 상세 조회 오류:', err.message);
      res.status(500).json({ error: '분석 상세 조회 실패', details: err.message });
    }
  });

  // 분석 결과 업데이트
  app.put('/api/supabase/analysis/:analysisId', async (req: Request, res: Response) => {
    try {
      console.log('✏️  [/api/supabase/analysis] 업데이트 요청:', req.params.analysisId);
      const { analysisId } = req.params;
      const updates = req.body;

      if (!analysisId) {
        return res.status(400).json({ error: '필수 파라미터 누락: analysisId' });
      }

      const updated = await updateAnalysis(analysisId, updates);

      console.log('✅ 분석 업데이트 성공');
      res.json({ success: true, analysis: updated });
    } catch (err: any) {
      console.error('❌ 분석 업데이트 오류:', err.message);
      res.status(500).json({ error: '분석 업데이트 실패', details: err.message });
    }
  });

  // 분석 결과 삭제
  app.delete('/api/supabase/analysis/:analysisId', async (req: Request, res: Response) => {
    try {
      console.log('🗑️  [/api/supabase/analysis] 삭제 요청:', req.params.analysisId);
      const { analysisId } = req.params;

      if (!analysisId) {
        return res.status(400).json({ error: '필수 파라미터 누락: analysisId' });
      }

      await deleteAnalysis(analysisId);

      console.log('✅ 분석 삭제 성공');
      res.json({ success: true, message: '분석이 삭제되었습니다' });
    } catch (err: any) {
      console.error('❌ 분석 삭제 오류:', err.message);
      res.status(500).json({ error: '분석 삭제 실패', details: err.message });
    }
  });

  // 키워드 저장
  app.post('/api/supabase/save-keywords', async (req: Request, res: Response) => {
    try {
      console.log('💾 [/api/supabase/save-keywords] 요청 수신');
      const { keywords } = req.body;

      if (!keywords || !Array.isArray(keywords)) {
        return res.status(400).json({ error: '필수 파라미터 누락: keywords (배열)' });
      }

      const saved = await saveKeywords(keywords);

      console.log(`✅ ${saved.length}개 키워드 저장 성공`);
      res.json({ success: true, count: saved.length, keywords: saved });
    } catch (err: any) {
      console.error('❌ 키워드 저장 오류:', err.message);
      res.status(500).json({ error: '키워드 저장 실패', details: err.message });
    }
  });

  // 가이드라인 저장
  app.post('/api/supabase/save-guideline', async (req: Request, res: Response) => {
    try {
      console.log('💾 [/api/supabase/save-guideline] 요청 수신');
      const { userId, analysisId, tone, content } = req.body;

      if (!userId || !analysisId || !tone || !content) {
        return res.status(400).json({ error: '필수 파라미터 누락: userId, analysisId, tone, content' });
      }

      const guideline = await saveGuideline({ userId, analysisId, tone, content });

      console.log('✅ 가이드라인 저장 성공:', guideline.id);
      res.json({ success: true, guidelineId: guideline.id, guideline });
    } catch (err: any) {
      console.error('❌ 가이드라인 저장 오류:', err.message);
      res.status(500).json({ error: '가이드라인 저장 실패', details: err.message });
    }
  });
}
