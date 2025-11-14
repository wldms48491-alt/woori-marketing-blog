import { useEffect, useState } from 'react';

// 임시 스텁: 실제 구현이 연결될 때 대체 예정
async function fetchLocations(): Promise<string[]> {
  return [];
}

export function useLocationData() {
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    // API에서 데이터 가져오기
    fetchLocations().then((data) => {
      // 중복 제거 + 빈 값 필터링
      const filtered = [...new Set(data.filter((loc) => loc.trim()))];
      setLocations(filtered);
    });
  }, []);

  return locations;
}
