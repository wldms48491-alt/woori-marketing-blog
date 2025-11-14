import React from 'react';
import { TrendingUp, BarChart3, Zap, Target } from 'lucide-react';

interface KeywordCombinationProps {
  combination: any;
  isSelected: boolean;
  onSelect: () => void;
}

export const KeywordCombinationCard: React.FC<KeywordCombinationProps> = ({ 
  combination, 
  isSelected, 
  onSelect 
}) => {
  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'gold':
        return <Zap className="h-5 w-5 text-yellow-500" />;
      case 'brand':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'intent':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      default:
        return <BarChart3 className="h-5 w-5 text-purple-500" />;
    }
  };

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'gold':
        return '🏆 저경쟁 고검색량';
      case 'brand':
        return '🎯 브랜드 강화';
      case 'intent':
        return '📈 검색의도 대응';
      default:
        return '⭐ 쉬운 승리';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`p-5 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-[#03C75A] bg-green-50 ring-2 ring-[#03C75A]'
          : 'border-gray-200 bg-white hover:border-[#03C75A] hover:shadow-md'
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${
              isSelected ? 'bg-[#03C75A]' : 'border-2 border-gray-300'
            }`}
          >
            {isSelected && <span className="text-white text-sm font-bold">✓</span>}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{combination.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {getStrategyIcon(combination.strategy)}
              <span className="text-xs font-semibold text-gray-600">
                {getStrategyLabel(combination.strategy)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 키워드 리스트 */}
      <div className="mb-4 bg-gray-50 p-3 rounded-lg">
        <p className="text-xs font-semibold text-gray-700 mb-2">포함된 키워드</p>
        <div className="space-y-2">
          {combination.keywords?.map((kw: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-gray-400 w-5">
                  {idx + 1}.
                </span>
                <span className="font-semibold text-gray-900 flex-1">{kw.kw}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600 ml-2 flex-shrink-0">
                <span title="월간 검색량">
                  검색: <span className="font-bold text-gray-900">{(kw.sv || 0).toLocaleString()}</span>
                </span>
                <span title="블로그 경합도">
                  경합: <span className="font-bold text-gray-900">{(kw.doc_t || 0).toLocaleString()}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-3 pt-3 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500 font-semibold">총 검색량</p>
          <p className="text-sm font-bold text-gray-900">{(combination.total_sv || 0).toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 font-semibold">평균 경합도</p>
          <p className="text-sm font-bold text-gray-900">{(combination.avg_competition || 0).toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 font-semibold">효율성</p>
          <p className="text-sm font-bold text-[#03C75A]">
            {combination.total_sv && combination.avg_competition
              ? ((combination.total_sv / combination.avg_competition) * 100).toFixed(0)
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* 추천 설명 */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded text-xs text-blue-800">
        <p className="font-semibold mb-1">💡 추천 이유</p>
        <p>{combination.recommendation}</p>
      </div>
    </div>
  );
};
