import axios from 'axios';

const API_BASE = 'http://localhost:3005';

async function testLocationExtraction() {
  try {
    console.log('🧪 위치 추출 테스트 시작\n');

    // 테스트 1: 원스팀마스타 (장소 주소 포함)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('테스트 1: 원스팀마스타 (주소 포함)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const response1 = await axios.post(`${API_BASE}/api/ai/extract-facets`, {
      description: '30년 경력의 정비사가 직접 운영하는 스팀세차장, 광택과 손세차. 주변 보다 가격이저렴함.',
      placeInfo: '원스팀마스타',
      address: '서울 강남구 테헤란로 123'  // 주소 포함
    });

    console.log('✅ 응답:');
    console.log(JSON.stringify(response1.data, null, 2));
    console.log('\n');

    // 테스트 2: 주소 없이 전송 (Phase 2 자동 검색 테스트)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('테스트 2: 원스팀마스타 (주소 미포함 - Phase 2 테스트)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const response2 = await axios.post(`${API_BASE}/api/ai/extract-facets`, {
      description: '30년 경력의 정비사가 직접 운영하는 스팀세차장, 광택과 손세차.',
      placeInfo: '원스팀마스타'
      // address 없음 - 자동 검색이 활성화됨
    });

    console.log('✅ 응답:');
    console.log(JSON.stringify(response2.data, null, 2));
    console.log('\n');

    // 테스트 3: 다른 업체
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('테스트 3: 스타벅스 (주소 포함)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const response3 = await axios.post(`${API_BASE}/api/ai/extract-facets`, {
      description: '프리미엄 커피 전문점. 편안한 분위기에서 고급 커피를 즐길 수 있습니다.',
      placeInfo: '스타벅스 서울점',
      address: '서울 종로구 인사동 5길 20'
    });

    console.log('✅ 응답:');
    console.log(JSON.stringify(response3.data, null, 2));
    console.log('\n');

    console.log('✅ 모든 테스트 완료!');
    console.log('\n📊 결과 요약:');
    console.log('  - 테스트 1 (주소 포함): 위치 추출 여부 확인');
    console.log('  - 테스트 2 (주소 미포함): Phase 2 자동 검색 동작 확인');
    console.log('  - 테스트 3 (다른 업체): 일반 케이스 확인');

  } catch (error: any) {
    console.error('❌ 오류 발생:');
    if (error.response) {
      console.error('상태:', error.response.status);
      console.error('데이터:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testLocationExtraction();
