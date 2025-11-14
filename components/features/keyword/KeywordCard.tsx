import React from 'react';
import type { Keyword } from '@/src/types';
import { TrendingUp, FileText, BarChart, Check, HelpCircle, ShieldCheck, Info, CheckCircle2 } from 'lucide-react';

interface KeywordCardProps {
  keyword: Keyword;
  isSelected: boolean;
  onSelect: () => void;
}

export const KeywordCard: React.FC<KeywordCardProps> = ({ keyword, isSelected, onSelect }) => {
  
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getThresholdRuleBadge = () => {
    switch (keyword.threshold_rule) {
      case 'TREND_EXEMPT':
        return <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">[TREND 예외]</span>;
      case 'POI_EXEMPT':
        return <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">[POI 예외]</span>;
      default:
        return null;
    }
  };

  return (
    <div 
      className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer ${isSelected ? 'border-green-500 bg-green-50 ring-2 ring-green-500' : 'border-gray-200 bg-white hover:border-gray-300'}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isSelected ? 'bg-[#03C75A]' : 'bg-gray-200'}`}>
              {isSelected && <Check className="h-4 w-4 text-white" />}
            </div>
            <h3 className="text-md font-bold text-gray-900 flex items-center gap-2 flex-wrap">
              <span>{keyword.kw}</span>
              {getThresholdRuleBadge()}
              {keyword.explanation && (
                <div className="relative group">
                  <Info className="h-4 w-4 text-blue-500 cursor-pointer" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {keyword.explanation}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                  </div>
                </div>
              )}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mt-3 ml-9">
            <div className="flex items-center gap-1" title="유효 월간 검색량">
              <TrendingUp className="h-3 w-3 text-gray-400" />
              <span className="font-bold">{keyword.sv_effective.toLocaleString()}</span>
              {keyword.threshold_pass && (
                 <div className="relative group">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 cursor-pointer" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-2 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <p className="font-bold mb-1">검색량 기준 충족</p>
                        {keyword.explanation_threshold}
                        <hr className="my-1 border-gray-600"/>
                        <p>정확: {keyword.sv_exact.toLocaleString()}</p>
                        <p>유효: {keyword.sv_effective.toLocaleString()}</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                    </div>
                 </div>
              )}
            </div>
            <div className="flex items-center gap-1" title="블로그 문서수">
              <FileText className="h-3 w-3 text-gray-400" />
              <span>{keyword.doc_t.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1" title="저경쟁 점수">
              <BarChart className="h-3 w-3 text-gray-400" />
              <div className="w-12 bg-gray-200 rounded-full h-1.5">
                <div 
                  className={`${getScoreColor(keyword.lc_score)} h-1.5 rounded-full`} 
                  style={{ width: `${keyword.lc_score * 100}%` }}
                ></div>
              </div>
              <span className="font-semibold">{keyword.lc_score.toFixed(2)}</span>
            </div>
            {keyword.conf && (
               <div className="flex items-center gap-1" title="데이터 신뢰도">
                <ShieldCheck className="h-3 w-3 text-gray-400" />
                <span className="font-semibold">{`${(keyword.conf * 100).toFixed(0)}%`}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 ml-9 text-xs text-gray-500 bg-gray-100 p-2 rounded-md flex items-start gap-2">
        <HelpCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <span>{keyword.why}</span>
      </div>
    </div>
  );
};
