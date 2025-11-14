/**
 * API URL을 동적으로 구성하는 유틸리티
 * 프로덕션: VITE_API_URL 환경변수 사용
 * 개발: 상대 경로 /api 사용 (proxy로 연결됨)
 */
export const getApiUrl = (path: string): string => {
  // 프로덕션 환경에서 VITE_API_URL이 설정되어 있으면 사용
  const apiBaseUrl = import.meta.env.VITE_API_URL;
  
  if (apiBaseUrl && import.meta.env.PROD) {
    return `${apiBaseUrl}${path}`;
  }
  
  // 개발 환경 또는 VITE_API_URL이 없으면 상대 경로 사용
  return `/api${path}`;
};
