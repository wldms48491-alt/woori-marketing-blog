import React, { useState } from 'react';
import type { Tone } from '@/src/types';
import { FileText, Wand2, RefreshCw, Clipboard, ClipboardCheck, ChevronDown, Check } from 'lucide-react';

interface GuidelinePreviewProps {
  guideline: string;
  onGenerate: () => void;
  onRegenerate: () => void;
  tone: Tone;
  setTone: (tone: Tone) => void;
  canGenerate: boolean;
  isLoading: boolean;
}

export const GuidelinePreview: React.FC<GuidelinePreviewProps> = ({ guideline, onGenerate, onRegenerate, tone, setTone, canGenerate, isLoading }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(guideline);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 마크다운 형식의 가이드라인을 섹션별로 파싱
  const parseGuideline = (text: string) => {
    const sections = [];
    let currentSection = null;
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      if (line.startsWith('## ')) {
        // 새로운 섹션
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: line.replace('## ', ''),
          content: [],
          isChecklist: false
        };
      } else if (line.startsWith('```')) {
        // 코드 블록
        if (!currentSection) {
          currentSection = {
            title: '',
            content: [],
            isChecklist: false
          };
        }
        currentSection.isChecklist = true;
      } else if (line.trim()) {
        if (currentSection) {
          currentSection.content.push(line);
        }
      }
    });

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  const sections = guideline ? parseGuideline(guideline) : [];

  // 리스트 아이템 포맷팅
  const formatListItem = (line: string) => {
    if (line.trim().startsWith('*')) {
      return line.trim().substring(1).trim();
    }
    if (line.trim().startsWith('-')) {
      return line.trim().substring(1).trim();
    }
    return line.trim();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <FileText className="h-5 w-5 text-green-600" />
          <span>4. 체험단 가이드 미리보기</span>
        </h2>
        {guideline && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-800 transition-colors"
          >
            {copied ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
            {copied ? '복사 완료!' : '복사하기'}
          </button>
        )}
      </div>

      {guideline ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden flex-grow flex flex-col bg-white">
          <div className="overflow-y-auto flex-grow">
            <div className="space-y-0">
              {sections.map((section, idx) => (
                <div key={idx} className={idx > 0 ? 'border-t border-gray-200' : ''}>
                  {section.title && (
                    <div className="bg-gradient-to-r from-green-50 to-transparent px-6 py-3 sticky top-0 z-10">
                      <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        <div className="w-1 h-5 bg-green-600 rounded"></div>
                        {section.title}
                      </h3>
                    </div>
                  )}
                  <div className="px-6 py-4 space-y-2">
                    {section.content.map((line, lineIdx) => {
                      const trimmed = line.trim();
                      
                      // 체크리스트 항목
                      if (trimmed.startsWith('- [')) {
                        const isChecked = trimmed.includes('- [x]');
                        const text = trimmed.replace(/- \[[x ]\]/, '').trim();
                        return (
                          <div key={lineIdx} className="flex items-start gap-2 text-sm text-gray-700">
                            <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isChecked ? 'bg-green-600 border-green-600' : 'border-gray-300'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={isChecked ? 'line-through text-gray-400' : ''}>{text}</span>
                          </div>
                        );
                      }
                      
                      // 일반 리스트 항목
                      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
                        const text = formatListItem(line);
                        return (
                          <div key={lineIdx} className="flex items-start gap-2 text-sm text-gray-700 ml-2">
                            <span className="text-green-600 font-bold">•</span>
                            <span>{text}</span>
                          </div>
                        );
                      }
                      
                      // 굵은 텍스트 처리
                      if (trimmed.startsWith('**')) {
                        return (
                          <div key={lineIdx} className="text-sm font-semibold text-gray-800 my-2">
                            {trimmed.replace(/\*\*/g, '')}
                          </div>
                        );
                      }
                      
                      // 일반 텍스트
                      if (trimmed) {
                        return (
                          <p key={lineIdx} className="text-sm text-gray-700 leading-relaxed">
                            {trimmed}
                          </p>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 rounded-md p-8 flex-grow bg-gray-50">
          <Wand2 className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-md font-semibold text-gray-700">가이드라인이 여기에 표시됩니다.</h3>
          <p className="text-sm text-gray-500 mt-1">
            {canGenerate ? '키워드 선택 후 아래 버튼을 눌러주세요.' : '먼저 키워드를 분석하고 선택해주세요.'}
          </p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <select
            id="tone-select"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full appearance-none bg-gray-100 border border-gray-300 text-gray-700 py-2.5 px-4 pr-8 rounded-md leading-tight focus:outline-none focus:bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500"
          >
            <option>실사 리뷰 톤</option>
            <option>미니멀 정보 톤</option>
            <option>감성 에세이 톤</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        <button
          onClick={guideline ? onRegenerate : onGenerate}
          disabled={!canGenerate || isLoading}
          className="flex items-center justify-center gap-2 bg-[#03C75A] text-white font-bold py-2.5 px-4 rounded-md hover:bg-[#02a64a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed sm:flex-initial"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>생성 중...</span>
            </>
          ) : (
            <>
              {guideline ? <RefreshCw className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
              <span>{guideline ? '재생성' : '가이드라인 생성'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
