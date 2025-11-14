#!/usr/bin/env node
/**
 * Phase A2: 주소 파싱 고도화 테스트
 * - 도로명/번지/동 패턴 인식
 * - 구/군 역추론 (유일 매칭)
 */

import 'dotenv/config.js';
import axios from 'axios';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parseAddress } from './server/locationDatabase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Phase A2 주소 파싱 테스트 ===\n');

// 1) parseAddress 단위 테스트 (직접)
const unitCases = [
  {
    name: '도로명+번호: 서울 강남구 테헤란로 123',
    input: '서울 강남구 테헤란로 123',
    expect: { city: '서울', district: '강남구', streetIncludes: '테헤란로' }
  },
  {
    name: '지번: 제주 서귀포시 토평동 123-4',
    input: '제주 서귀포시 토평동 123-4',
    expect: { city: '제주', district: '서귀포시', neighborhood: '토평동' }
  },
  {
    name: '별칭+도로명: 역삼동 테헤란로 12길 5',
    input: '역삼동 테헤란로 12길 5',
    expect: { neighborhood: '역삼동', streetIncludes: '테헤란로' }
  }
];

let unitPassed = 0;
for (const tc of unitCases) {
  const parsed = parseAddress(tc.input);
  const okCity = parsed?.city === tc.expect.city;
  const okDistrict = parsed?.district === tc.expect.district;
  const okNeighborhood = tc.expect.neighborhood ? parsed?.neighborhood === tc.expect.neighborhood : true;
  const okStreet = tc.expect.streetIncludes ? (parsed?.street || '').includes(tc.expect.streetIncludes) : true;

  const passed = !!parsed && okCity && okDistrict && okNeighborhood && okStreet;
  console.log(`【단위】${tc.name} -> ${passed ? '✓' : '✗'}`);
  if (!passed) {
    console.log('  기대:', tc.expect);
    console.log('  실제:', parsed);
  } else {
    unitPassed++;
  }
}

// 2) API 통합 테스트 (서버 구동 후 /api/ai/extract-facets)
let serverStarted = false;
let apiPassed = 0;
let apiFailed = 0;

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

server.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('백엔드 서버 시작됨')) {
    serverStarted = true;
  }
});

server.stderr.on('data', (data) => {
  console.error('[서버 에러]', data.toString());
});

async function waitAndRunApiTests() {
  for (let i = 0; i < 20; i++) {
    if (serverStarted) {
      await runApiTests();
      server.kill();
      const totalUnit = unitCases.length;
      console.log(`\n=== 요약 ===`);
      console.log(`단위 테스트: ${unitPassed}/${totalUnit} 통과`);
      console.log(`API 테스트: ${apiPassed}/${apiCases.length} 통과`);
      process.exit(apiFailed === 0 ? 0 : 1);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('\n✗ 서버 시작 실패');
  server.kill();
  process.exit(1);
}

const apiCases = [
  {
    name: 'E2E-1: 서울 강남구 테헤란로 123 카페',
    data: {
      placeInfo: '서울 강남구 테헤란로 123 카페',
      description: '서울 강남구 테헤란로 123 감성 카페'
    },
    expect: { city: '서울', district: '강남구' }
  },
  {
    name: 'E2E-2: 제주 서귀포시 토평동 123-4 음식점',
    data: {
      placeInfo: '제주 서귀포시 토평동 123-4 음식점',
      description: '제주 서귀포시 토평동 123-4'
    },
    expect: { city: '제주', district: '서귀포시' }
  },
  {
    name: 'E2E-3: 역삼동 테헤란로 12길 5 브런치',
    data: {
      placeInfo: '역삼동 테헤란로 12길 5 브런치',
      description: '감성 있는 브런치 카페, 서울 강남구 역삼동 테헤란로 12길 5'
    },
    expect: { city: '서울', district: '강남구' }
  }
];

async function runApiTests() {
  console.log('\n=== API 통합 테스트 시작 ===');
  for (const tc of apiCases) {
    try {
      const res = await axios.post('http://127.0.0.1:3005/api/ai/extract-facets', tc.data, { timeout: 4000 });
      const loc = res.data?.location || {};
      const okCity = loc.city === tc.expect.city;
      const okDistrict = loc.district === tc.expect.district;
      const passed = okCity && okDistrict;
      console.log(`【API】${tc.name} -> ${passed ? '✓' : '✗'}`);
      if (!passed) {
        console.log('  기대:', tc.expect);
        console.log('  실제:', loc);
        apiFailed++;
      } else {
        apiPassed++;
      }
    } catch (err: any) {
      console.log(`【API】${tc.name} -> ✗ (요청 실패: ${err.message})`);
      apiFailed++;
    }
  }
}

waitAndRunApiTests();

// 타임아웃 보호
setTimeout(() => {
  console.log('\n✗ 타임아웃: 35초 초과');
  server.kill();
  process.exit(1);
}, 35000);
