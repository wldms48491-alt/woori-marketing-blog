import React from 'react';
import type { Facets } from '@/src/types';
import { Tag, MapPin, Utensils, Users, Lightbulb, Star, Settings, Building, Sparkles, DollarSign, Zap, Eye, Calendar, Percent, Clock, ParkingCircle, Heart, Accessibility, Flame, Map } from 'lucide-react';

interface FacetCategory {
  title: string;
  icon: React.ElementType;
  color: 'gray' | 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'pink' | 'indigo' | 'orange' | 'emerald' | 'cyan';
  items: (string | undefined)[];
}

const colorClasses = {
  gray: { icon: 'text-gray-500', bg: 'bg-gray-100', text: 'text-gray-800' },
  blue: { icon: 'text-blue-500', bg: 'bg-blue-100', text: 'text-blue-800' },
  green: { icon: 'text-green-500', bg: 'bg-green-100', text: 'text-green-800' },
  purple: { icon: 'text-purple-500', bg: 'bg-purple-100', text: 'text-purple-800' },
  yellow: { icon: 'text-yellow-500', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  red: { icon: 'text-red-500', bg: 'bg-red-100', text: 'text-red-800' },
  pink: { icon: 'text-pink-500', bg: 'bg-pink-100', text: 'text-pink-800' },
  indigo: { icon: 'text-indigo-500', bg: 'bg-indigo-100', text: 'text-indigo-800' },
  orange: { icon: 'text-orange-500', bg: 'bg-orange-100', text: 'text-orange-800' },
  emerald: { icon: 'text-emerald-500', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  cyan: { icon: 'text-cyan-500', bg: 'bg-cyan-100', text: 'text-cyan-800' },
};

export const FacetsDisplay: React.FC<{ facets: Facets }> = ({ facets }) => {
  const placeItems = [
    facets.place?.name,
    facets.place?.address,
    ...(facets.place?.poi_aliases || [])
  ].filter(Boolean);

  // 위치/상권 정보 구성 (중복 제거)
  const locationItems: string[] = [];
  const addedItems = new Set<string>();
  
  // 위치 정보: 도시 > 구군 > 동 순서로 표시
  if (facets.location?.city) {
    locationItems.push(facets.location.city);
    addedItems.add(facets.location.city);
  }
  if (facets.location?.district) {
    locationItems.push(facets.location.district);
    addedItems.add(facets.location.district);
  }
  if (facets.location?.dong) {
    locationItems.push(facets.location.dong);  // 라벨 제거
    addedItems.add(facets.location.dong);
  }
  
  // 미시상권 정보
  if (facets.location?.micro_area) {
    locationItems.push(facets.location.micro_area);  // 라벨 제거
    addedItems.add(facets.location.micro_area);
  }
  
  // POI 및 trade_area 추가 (중복 제거)
  if (facets.location?.poi) {
    facets.location.poi.forEach(item => {
      if (item && !addedItems.has(item)) {
        locationItems.push(item);
        addedItems.add(item);
      }
    });
  }
  if (facets.trade_area) {
    facets.trade_area.forEach(item => {
      if (item && !addedItems.has(item)) {
        locationItems.push(item);
        addedItems.add(item);
      }
    });
  }

  const tradeAreaDetailItems: string[] = (facets.trade_area_details || []).map(d => `${d.name} (${d.type} · ${d.score.toFixed(2)})`);

  const categories = [
    { title: '장소 정보', icon: Building, color: 'gray' as const, items: placeItems },
    { title: '위치/상권', icon: MapPin, color: 'blue' as const, items: locationItems },
    { title: '상권 상세', icon: Map, color: 'green' as const, items: tradeAreaDetailItems },
    { title: '업종/카테고리', icon: Utensils, color: 'green' as const, items: facets.category },
    { title: '메뉴/서비스', icon: Tag, color: 'purple' as const, items: facets.items?.map(item => item.name) },
    { title: '타겟 고객', icon: Users, color: 'yellow' as const, items: facets.audience },
    { title: '방문 의도', icon: Lightbulb, color: 'red' as const, items: facets.intent },
    { title: '차별점/USP', icon: Star, color: 'green' as const, items: facets.usp },
    { title: '편의/시설', icon: Settings, color: 'pink' as const, items: facets.amenities },
    { title: '분위기', icon: Sparkles, color: 'indigo' as const, items: facets.vibe },
    { title: '가격대', icon: DollarSign, color: 'orange' as const, items: facets.price_range },
    { title: '주요 혜택', icon: Zap, color: 'emerald' as const, items: facets.benefits },
    { title: '주요 특징', icon: Eye, color: 'cyan' as const, items: facets.features },
    { title: '계절성', icon: Calendar, color: 'pink' as const, items: facets.season },
    { title: '프로모션', icon: Percent, color: 'red' as const, items: facets.promotion },
    { title: '예약 시스템', icon: Clock, color: 'blue' as const, items: facets.reservation_system },
    { title: '주차', icon: ParkingCircle, color: 'gray' as const, items: facets.parking },
    { title: '단체 친화', icon: Users, color: 'green' as const, items: facets.group_friendly },
    { title: '반려동물', icon: Heart, color: 'red' as const, items: facets.pet_friendly },
    { title: '접근성', icon: Accessibility, color: 'blue' as const, items: facets.accessibility },
    { title: '시그니처 메뉴', icon: Flame, color: 'orange' as const, items: facets.signature_menu },
    { title: '운영 시간', icon: Clock, color: 'purple' as const, items: facets.operating_hours },
    { title: '인근 명소', icon: Map, color: 'green' as const, items: facets.nearby_attractions },
  ].filter(cat => cat.items && cat.items.length > 0 && cat.items.some(item => item));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-bold text-gray-800 mb-4">2. 자동 추출 태그</h2>
      <div className="flex flex-col gap-4">
        {categories.map((category) => (
          <div key={category.title}>
            <div className={`flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2`}>
              <category.icon className={colorClasses[category.color].icon} />
              <span>{category.title}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {category.items?.map((item, index) => item && (
                <span key={index} className={`px-3 py-1 text-sm rounded-full ${colorClasses[category.color].bg} ${colorClasses[category.color].text}`}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
