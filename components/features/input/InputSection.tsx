import React, { useState, useRef, useEffect } from "react";
import { Play, MapPin, X } from "lucide-react";

interface InputSectionProps {
  placeInput: string;
  setPlaceInput: (value: string) => void;
  userInput: string;
  setUserInput: (value: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  onPlaceSelect?: (address: string) => void;
}

interface PlaceResult {
  id: string;
  title: string;
  address: string;
}

interface SearchCache {
  query: string;
  results: PlaceResult[];
  timestamp: number;
  hasMore: boolean;
  total: number;
}

export const InputSection: React.FC<InputSectionProps> = ({
  placeInput,
  setPlaceInput,
  userInput,
  setUserInput,
  onAnalyze,
  loading,
  onPlaceSelect,
}) => {
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedPlaceInfo, setSelectedPlaceInfo] = useState<{
    name: string;
    address: string;
  } | null>(null);
  const [searchCache, setSearchCache] = useState<SearchCache | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchPlaces = async (query: string, page: number) => {
    const url = `/api/search/places?query=${encodeURIComponent(query)}&page=${page}`;
    console.log("\n========== 🌐 API 요청 시작 ==========");
    console.log("📤 URL:", url);
    const resp = await fetch(url);
    console.log("📡 응답:", resp.status, resp.statusText);
    if (!resp.ok) {
      const text = await resp.text();
      console.error("❌ 응답 본문:", text);
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    console.log("✅ 파싱 완료");
    return data;
  };

  const handlePlaceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log("\n🔍 입력값:", value);
    setPlaceInput(value);
    setCurrentPage(1);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          console.log("🔄 검색 시작");
          setIsSearching(true);

          if (
            searchCache &&
            searchCache.query === value &&
            Date.now() - searchCache.timestamp < 5 * 60 * 1000
          ) {
            console.log("💾 캐시에서 로드");
            setSearchResults(searchCache.results);
            setHasMore(searchCache.hasMore);
            setShowResults(true);
            setIsSearching(false);
            return;
          }

          const data = await fetchPlaces(value, 1);

          if (data.success && Array.isArray(data.places)) {
            console.log("✅ 결과:", data.places.length);
            const results: PlaceResult[] = data.places.map((p: any) => ({
              id: p.id,
              title: p.title,
              address: p.address,
            }));
            setSearchResults(results);
            setHasMore(!!data.hasMore);
            setSearchCache({
              query: value,
              results,
              timestamp: Date.now(),
              hasMore: !!data.hasMore,
              total: data.total || results.length,
            });
            setShowResults(true);
          } else {
            console.log("⚠️ 응답 형식 오류");
            setSearchResults([]);
            setHasMore(false);
            setShowResults(true);
          }
        } catch (err) {
          console.error("❌ 검색 오류:", err);
          setSearchResults([]);
          setHasMore(false);
          setShowResults(true);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
    }
  };

  const loadMoreResults = async () => {
    if (!hasMore || isSearching || !placeInput.trim()) return;
    try {
      setIsSearching(true);
      const nextPage = currentPage + 1;
      const data = await fetchPlaces(placeInput, nextPage);
      if (data.success && Array.isArray(data.places)) {
        const more: PlaceResult[] = data.places.map((p: any) => ({
          id: p.id,
          title: p.title,
          address: p.address,
        }));
        const merged = [...searchResults, ...more];
        setSearchResults(merged);
        setHasMore(!!data.hasMore);
        setCurrentPage(nextPage);
      }
    } catch (err) {
      console.error("추가 로드 오류:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (place: PlaceResult) => {
    console.log("\n✓ 업체 선택:", place.title);
    setPlaceInput(place.title);
    setShowResults(false);
    setSelectedPlaceInfo({ name: place.title, address: place.address });
    if (onPlaceSelect) {
      onPlaceSelect(place.address);
    }
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    if (showResults) {
      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }
  }, [showResults]);

  return (
    <div
      ref={containerRef}
      className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all"
    >
      <div className="mb-6">
        <label htmlFor="place-input" className="block text-sm font-semibold text-gray-900 mb-3">
          업체명 또는 주소
        </label>
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            id="place-input"
            type="text"
            className="w-full pl-12 py-3 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03C75A] focus:border-transparent transition-all focus:shadow-md"
            placeholder="예) 코코브루니 서현점"
            value={placeInput}
            onChange={handlePlaceInputChange}
            disabled={loading}
            autoComplete="off"
          />
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
            </div>
          )}
          {showResults && (searchResults.length > 0 || isSearching) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
              {isSearching && searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mx-auto mb-2"></div>
                  검색중...
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-gray-200">
                    {searchResults.map((place) => (
                      <li
                        key={place.id}
                        className="p-3 cursor-pointer hover:bg-green-50 transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectPlace(place);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {place.title}
                        </p>
                        <p className="text-xs text-gray-500">{place.address}</p>
                      </li>
                    ))}
                  </ul>
                  {hasMore && (
                    <div className="p-3 border-t border-gray-200 text-center">
                      <button
                        onClick={loadMoreResults}
                        disabled={isSearching}
                        className="text-sm text-green-600 hover:text-green-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSearching ? "로드 중..." : "더보기"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedPlaceInfo && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-green-700 mb-1">
                선택한 업체
              </p>
              <p className="text-sm font-medium text-gray-900">
                {selectedPlaceInfo.name}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {selectedPlaceInfo.address}
              </p>
            </div>
            <button
              onClick={() => setSelectedPlaceInfo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <label
          htmlFor="business-summary"
          className="block text-sm font-semibold text-gray-900 mb-3"
        >
          업체 요약 입력 <span className="text-red-500">*</span>
        </label>
        <textarea
          id="business-summary"
          rows={4}
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#03C75A] focus:border-transparent transition-all focus:shadow-md resize-none"
          placeholder="예) 분당 서현역 근처 브런치 카페. 시그니처는 크루아상 샌드와 콜드브루. 20-30대 여성 방문多."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          disabled={loading}
        />
        <p className="text-xs text-gray-500 mt-2">최소 10자 이상 입력하세요</p>
      </div>

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#03C75A] to-[#00a043] text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>분석 중...</span>
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            <span>키워드 & 가이드 생성</span>
          </>
        )}
      </button>
    </div>
  );
};
