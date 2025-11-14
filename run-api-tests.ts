#!/usr/bin/env node
/**
 * API 통합 테스트 스크립트
 * 서버를 시작하고 API를 테스트합니다
 */

import 'dotenv/config.js';
import axios from 'axios';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Express API 통합 테스트 ===\n');

// 서버 시작
let serverStarted = false;
let testsPassed = 0;
let testsFailed = 0;

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

// 서버 로그 처리
server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('[서버]', output);
  if (output.includes('백엔드 서버 시작됨')) {
    serverStarted = true;
  }
});

server.stderr.on('data', (data) => {
  console.error('[서버 에러]', data.toString());
});

// 서버가 준비될 때까지 대기 후 테스트 실행
async function waitAndTest() {
  for (let i = 0; i < 15; i++) {
    if (serverStarted) {
      console.log('\n✓ 서버 시작 확인\n');
      await runTests();
      server.kill();
      process.exit(testsFailed > 0 ? 1 : 0);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n✗ 서버 시작 실패');
  server.kill();
  process.exit(1);
}

async function runTests() {
  const testCases = [
    {
      name: '테스트 1: 강남역 카페',
      data: {
        placeInfo: '강남역 카페',
        description: '강남 강남역 인근 감성 있는 분위기의 카페'
      },
      expect: {
        city: '서울',
        district: '강남',
        category: '카페'
      }
    },
    {
      name: '테스트 2: 부산 해운대',
      data: {
        placeInfo: '해운대 해산물',
        description: '부산 해운대구 신선한 횟집'
      },
      expect: {
        city: '부산',
        district: '해운대'
      }
    },
    {
      name: '테스트 3: 대구 세차장',
      data: {
        placeInfo: '동성로 세차장',
        description: '대구 중구 동성로 인근 고급 세차장'
      },
      expect: {
        city: '대구',
        district: '중구'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`【${testCase.name}】`);
    try {
      const response = await axios.post(
        'http://127.0.0.1:3005/api/ai/extract-facets',
        testCase.data,
        { timeout: 3000 }
      );

      const result = response.data;
      
      // 응답 검증
      if (!result.place || !result.location) {
        console.log('✗ 응답 형식 오류\n');
        testsFailed++;
        continue;
      }

      // 필드 검증
      const cityMatch = result.location.city === testCase.expect.city;
      const districtMatch = result.location.district === testCase.expect.district;

      if (cityMatch && districtMatch) {
        console.log('✓ 통과');
        console.log(`  업체명: ${result.place.name}`);
        console.log(`  지역: ${result.location.city} ${result.location.district}`);
        console.log(`  카테고리: ${result.category?.join(', ')}\n`);
        testsPassed++;
      } else {
        console.log('✗ 응답 값 불일치');
        console.log(`  기대: ${testCase.expect.city} ${testCase.expect.district}`);
        console.log(`  실제: ${result.location.city} ${result.location.district}\n`);
        testsFailed++;
      }
    } catch (error: any) {
      console.log('✗ 요청 실패');
      console.log(`  에러: ${error.message}\n`);
      testsFailed++;
    }
  }

  console.log(`\n=== 테스트 결과: ${testsPassed} 통과 / ${testsFailed} 실패 ===`);
}

waitAndTest();

// 타임아웃: 30초 후에도 실행 중이면 강제 종료
setTimeout(() => {
  console.log('\n✗ 타임아웃: 30초 초과');
  server.kill();
  process.exit(1);
}, 30000);
