interface LocationInfoProps {
  locations: string[];
}

export function LocationInfo({ locations }: LocationInfoProps) {
  // 중복 제거
  const uniqueLocations = [...new Set(locations)];

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-building text-gray-500">
          {/* ...existing svg content... */}
        </svg>
        <span>장소 정보</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {uniqueLocations.map((location) => (
          <span key={location} className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800">
            {location}
          </span>
        ))}
      </div>
    </div>
  );
}
