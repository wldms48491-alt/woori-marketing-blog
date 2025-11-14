import React, { useState, useCallback, useMemo } from 'react';
import { extractFacets, rankKeywords, generateGuideline } from '../services/api/geminiClient';
import { saveCompleteAnalysis } from '../services/api/supabaseClient';
import { Keyword, Facets, LoadingState, Tone } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { InputSection } from '../../components/features/input/InputSection';
import { FacetsDisplay } from '../../components/features/keyword/FacetsDisplay';
import { KeywordList } from '../../components/features/keyword/KeywordList';
import { KeywordCombinationCard } from '../../components/features/keyword/KeywordCombinationCard';
import { GuidelinePreview } from '../../components/features/guideline/GuidelinePreview';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [placeInput, setPlaceInput] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [placeAddress, setPlaceAddress] = useState<string | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [recommendedKeywords, setRecommendedKeywords] = useState<Keyword[]>([]);
  const [keywordCombinations, setKeywordCombinations] = useState<any[]>([]);
  const [selectedCombinationIdx, setSelectedCombinationIdx] = useState<number | null>(null);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [guideline, setGuideline] = useState<string>('');
  const [loading, setLoading] = useState<LoadingState>({ active: false, message: '' });
  const [error, setError] = useState<string>('');
  const [diversityWarning, setDiversityWarning] = useState<string>('');
  const [lowResultWarning, setLowResultWarning] = useState<string>('');
  const [tone, setTone] = useState<Tone>('실사 리뷰 톤');

  const [saveStatus, setSaveStatus] = useState<{ state: 'idle' | 'saving' | 'success' | 'error'; message: string }>({
    state: 'idle',
    message: '',
  });
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);

  const persistAnalysis = useCallback(async (guidelineText: string) => {
    if (!guidelineText.trim()) return;
    if (!facets) return;
    
    // 저장은 백그라운드에서 자동 진행 - 실패해도 사용자에게 보여주지 않음
    if (!user) {
      console.log('⚠️ 로그인 정보 없음 - Supabase 저장 건너뜀');
      return;
    }

    // 선택된 조합의 키워드 추출
    const selectedCombination = selectedCombinationIdx !== null ? keywordCombinations[selectedCombinationIdx] : null;
    const selectedKeywordDetails = selectedCombination?.keywords || [];

    if (selectedKeywordDetails.length === 0) {
      console.warn('⚠️ 선택된 키워드가 없음');
      return;
    }

    // 백그라운드에서 자동 저장 시도 (실패해도 무시)
    try {
      console.log('💾 백그라운드 Supabase 저장 시작...');
      
      const { analysisId } = await saveCompleteAnalysis(
        user.id,
        placeInput?.trim() || '미입력 상호',
        userInput,
        facets,
        selectedKeywordDetails,
        guidelineText,
        tone
      );
      
      setSavedAnalysisId(analysisId ?? null);
      console.log('✅ 백그라운드 저장 완료:', analysisId);
    } catch (err) {
      // 저장 실패해도 로그만 남기고 사용자에게는 보여주지 않음
      console.error('⚠️ 백그라운드 저장 실패 (무시됨):', err);
    }
  }, [user, facets, keywordCombinations, selectedCombinationIdx, placeInput, userInput, tone]);

  const handleAnalyze = useCallback(async () => {
    if (userInput.trim().length < 10) {
      setError('업체 요약을 10자 이상 입력해주세요.');
      return;
    }
    setError('');
    setSaveStatus({ state: 'idle', message: '' });
    setSavedAnalysisId(null);
    setDiversityWarning('');
    setLowResultWarning('');
    setLoading({ active: true, message: '🔄 업체 정보 분석 중...' });
    setFacets(null);
    setRecommendedKeywords([]);
    setKeywordCombinations([]);
    setSelectedCombinationIdx(null);
    setSelectedKeywords(new Set());
    setGuideline('');

    try {
      const extractedFacets = await extractFacets(userInput, placeInput, placeAddress || undefined);
      setFacets(extractedFacets);

      setLoading({ active: true, message: '🔄 키워드 순위 분석 중...' });
      const rankResponse = await rankKeywords(extractedFacets);
      console.log('📊 백엔드 응답:', rankResponse);
      
      // 4가지 키워드 조합 저장
      if (rankResponse.recommended_combinations && Array.isArray(rankResponse.recommended_combinations)) {
        console.log('✅ 조합 처리:', rankResponse.recommended_combinations.length);
        setKeywordCombinations(rankResponse.recommended_combinations);
        
        // 첫 번째 조합 자동 선택
        if (rankResponse.recommended_combinations.length > 0) {
          setSelectedCombinationIdx(0);
          
          // 첫 번째 조합의 키워드 자동 선택
          const firstCombination = rankResponse.recommended_combinations[0];
          if (firstCombination.keywords && Array.isArray(firstCombination.keywords)) {
            const initialSelected = new Set(
              firstCombination.keywords.map((k: any) => k.kw).filter(Boolean)
            );
            setSelectedKeywords(initialSelected);
          }
        }
      }
      
      // 백엔드의 warning 메시지 사용
      if (rankResponse.warning) {
        console.log('⚠️ warning:', rankResponse.warning);
        setLowResultWarning(rankResponse.warning);
      }
    } catch (err) {
      console.error('❌ 분석 중 오류 발생:', err);
      const errorMessage = err instanceof Error ? err.message : 'AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setError(errorMessage);
      // 에러 발생해도 화면에 부분 결과는 유지
    } finally {
      setLoading({ active: false, message: '' });
    }
  }, [userInput, placeInput, placeAddress]);

  const handleKeywordSelect = (keyword: string) => {
    setSelectedKeywords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyword)) newSet.delete(keyword); else newSet.add(keyword);
      return newSet;
    });
  };

  const handleGenerateGuideline = useCallback(async (isRegen: boolean = false) => {
    console.log('🎯 가이드라인 생성 시작');
    console.log('  selectedKeywords:', selectedKeywords);
    console.log('  selectedKeywords.size:', selectedKeywords.size);
    
    if (selectedKeywords.size === 0) {
      console.warn('⚠️ 선택된 키워드가 없습니다');
      setError('가이드라인을 생성할 키워드를 1개 이상 선택해주세요.');
      return;
    }
    
    setError('');
    setLoading({ active: true, message: isRegen ? '가이드라인 재생성 중...' : '가이드라인 생성 중...' });
    setGuideline('');
    
    try {
      const keywordArray = Array.from(selectedKeywords);
      console.log('✅ 키워드 배열:', keywordArray);
      
      const guidelineText = await generateGuideline(keywordArray, tone);
      console.log('✅ 가이드라인 생성 완료');
      setGuideline(guidelineText);
      persistAnalysis(guidelineText);
    } catch (err) {
      console.error('❌ 가이드라인 생성 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '가이드라인 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      setError(errorMessage);
    } finally {
      setLoading({ active: false, message: '' });
    }
  }, [selectedKeywords, tone, persistAnalysis]);

  const handleExportCSV = useCallback(() => {
    if (recommendedKeywords.length === 0) return;
    const headers = ['Keyword', 'Effective SV', 'Exact SV', 'Document Count', 'LC Score', 'Confidence', 'Threshold Rule', 'Threshold Explanation', 'Reason', 'Token Explanation'];
    const rows = recommendedKeywords.map(kw => [
      `"${kw.kw.replace(/\"/g, '""')}"`,
      kw.sv_effective,
      kw.sv_exact,
      kw.doc_t,
      kw.lc_score.toFixed(2),
      kw.conf ? `${(kw.conf * 100).toFixed(0)}%` : 'N/A',
      kw.threshold_rule,
      `"${kw.explanation_threshold.replace(/\"/g, '""')}"`,
      `"${kw.why.replace(/\"/g, '""')}"`,
      `"${(kw.explanation || '').replace(/\"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'recommended_keywords.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [recommendedKeywords]);

  const canGenerateGuideline = useMemo(() => selectedKeywords.size > 0 && !loading.active, [selectedKeywords, loading.active]);

  return (
    <AppShell>
      <main className="bg-gradient-to-br from-white via-green-50 to-white min-h-screen">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <InputSection 
              placeInput={placeInput}
              setPlaceInput={setPlaceInput}
              userInput={userInput} 
              setUserInput={setUserInput} 
              onAnalyze={handleAnalyze} 
              loading={loading.active}
              onPlaceSelect={(address) => setPlaceAddress(address)}
            />

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-start gap-3 shadow-sm" role="alert">
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">오류 발생</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            )}
            
            {placeAddress && (
              <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-4 rounded-lg shadow-sm">
                <p className="text-xs font-semibold text-green-700 mb-1">선택한 업체 주소</p>
                <p className="text-sm">{placeAddress}</p>
              </div>
            )}
            
            {lowResultWarning && (
               <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-lg flex items-start gap-3 shadow-sm" role="alert">
                  <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">정보</p>
                    <p className="text-sm mt-1">{lowResultWarning}</p>
                  </div>
              </div>
            )}

            {diversityWarning && !lowResultWarning && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-lg flex items-start gap-3 shadow-sm" role="alert">
                  <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">알림</p>
                    <p className="text-sm mt-1">{diversityWarning}</p>
                  </div>
              </div>
            )}

            {loading.active && (
              <div className="flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-lg shadow-md border border-green-200">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-[#03C75A]"></div>
                <p className="text-green-800 font-semibold text-center text-lg">{loading.message}</p>
                <p className="text-green-600 text-sm text-center">처리과정이 오래걸릴 수도 있어요.</p>
              </div>
            )}

            {facets && <FacetsDisplay facets={facets} />}
            
            {keywordCombinations.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-900 mb-1">3. 추천 키워드 조합 (4가지)</h2>
                <p className="text-sm text-gray-600 mb-6">아래 4가지 조합 중 최적 전략을 선택하여 블로그 콘텐츠 작성 방향을 결정하세요</p>
                <div className="space-y-4">
                  {keywordCombinations.map((combo, idx) => (
                    <KeywordCombinationCard
                      key={idx}
                      combination={combo}
                      isSelected={selectedCombinationIdx === idx}
                      onSelect={() => {
                        setSelectedCombinationIdx(idx);
                        // 선택된 조합의 키워드 자동 업데이트
                        if (combo.keywords && Array.isArray(combo.keywords)) {
                          const newSelected = new Set(
                            combo.keywords.map((k: any) => k.kw).filter(Boolean)
                          );
                          setSelectedKeywords(newSelected);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:sticky top-24 self-start">
            <GuidelinePreview 
              guideline={guideline}
              onGenerate={() => handleGenerateGuideline()}
              onRegenerate={() => handleGenerateGuideline(true)}
              tone={tone}
              setTone={setTone}
              canGenerate={canGenerateGuideline}
              isLoading={loading.active && guideline === ''}
            />
          </div>
        </div>
      </main>
    </AppShell>
  );
};

export default DashboardPage;
