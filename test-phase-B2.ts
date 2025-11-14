#!/usr/bin/env node
/**
 * Phase B2: 신뢰도 점수 검증 테스트
 * - 카테고리 explicit/implicit 점수 및 method 확인
 * - 위치 confidence 레벨→수치 변환 노출 확인
 */

import 'dotenv/config.js';
import axios from 'axios';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Phase B2 신뢰도 점수 테스트 ===\n');

let serverStarted = false;
let server: any = null;

async function ensureServer() {
  try {
    const health = await axios.get('http://127.0.0.1:3005/health', { timeout: 1200 });
    if (health.status === 200) {
      serverStarted = true;
      return;
    }
  } catch {}
  server = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });
  server.stdout.on('data', (data: any) => {
    const output = data.toString();
    if (output.includes('백엔드 서버 시작됨')) serverStarted = true;
  });
  server.stderr.on('data', (data: any) => {
    const txt = data.toString();
    console.error('[서버 에러]', txt);
    if (txt.includes('EADDRINUSE')) {
      // 이미 떠있는 경우로 간주
      serverStarted = true;
    }
  });
}

const cases = [
  {
    name: '카테고리 explicit: 카페 키워드',
    data: { placeInfo: '강남 카페', description: '감성 카페' },
    expect: { category: '카페', method: 'explicit', minConf: 0.9 }
  },
  {
    name: '카테고리 implicit: 라떼+카푸치노',
    data: { placeInfo: '브랜드 없음', description: '라떼와 카푸치노, 아메리카노' },
    expect: { category: '카페', method: 'implicit', minConf: 0.6 }
  },
  {
    name: '위치 confidence: 도시+구/군 모두',
    data: { placeInfo: '강남역 카페', description: '서울 강남구 카페' },
    expectLoc: { level: 'high', minScore: 0.9 }
  }
];

async function run() {
  for (let i = 0; i < 20; i++) {
    if (serverStarted) break;
    await new Promise(r => setTimeout(r, 300));
  }
  if (!serverStarted) {
    console.log('✗ 서버 시작 실패');
    server.kill();
    process.exit(1);
  }

  let passed = 0, failed = 0;
  for (const tc of cases) {
    try {
      const res = await axios.post('http://127.0.0.1:3005/api/ai/extract-facets', tc.data, { timeout: 4000 });
      const body = res.data || {};
      const cat = body.category_details;
      const locConf = body.location_confidence;
      let ok = true;
      if (tc.expect) {
        const okCat = cat?.primary === tc.expect.category;
        const okMethod = cat?.method === tc.expect.method;
        const okConf = (cat?.confidence || 0) >= tc.expect.minConf;
        ok = ok && okCat && okMethod && okConf;
      }
      if (tc.expectLoc) {
        const okLevel = locConf?.level === tc.expectLoc.level;
        const okScore = (locConf?.score || 0) >= tc.expectLoc.minScore;
        ok = ok && okLevel && okScore;
      }
      console.log(`【${tc.name}】-> ${ok ? '✓' : '✗'}`);
      if (!ok) {
        console.log('  응답 일부:', JSON.stringify({ category_details: cat, location_confidence: locConf }, null, 2));
        failed++;
      } else passed++;
    } catch (e: any) {
      console.log(`【${tc.name}】-> ✗ (요청 실패: ${e.message})`);
      failed++;
    }
  }

  console.log(`\n결과: ${passed} 통과 / ${failed} 실패`);
  server.kill();
  process.exit(failed === 0 ? 0 : 1);
}

ensureServer().then(run);
