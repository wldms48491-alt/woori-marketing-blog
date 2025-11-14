import React from 'react';
import type { Keyword } from '@/src/types';
import { KeywordCard } from './KeywordCard';
import { Download } from 'lucide-react';

interface KeywordListProps {
  keywords: Keyword[];
  selectedKeywords: Set<string>;
  onKeywordSelect: (keyword: string) => void;
  onExportCSV: () => void;
}

export const KeywordList: React.FC<KeywordListProps> = ({ keywords, selectedKeywords, onKeywordSelect, onExportCSV }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">3. 추천 키워드 (4개)</h2>
        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-800 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>CSV로 내보내기</span>
        </button>
      </div>
      <div className="space-y-4">
        {keywords.map((kw) => (
          <KeywordCard
            key={kw.kw}
            keyword={kw}
            isSelected={selectedKeywords.has(kw.kw)}
            onSelect={() => onKeywordSelect(kw.kw)}
          />
        ))}
      </div>
    </div>
  );
};
