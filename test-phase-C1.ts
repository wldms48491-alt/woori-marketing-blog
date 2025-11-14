#!/usr/bin/env node
/**
 * Phase C1: 카테고리 기반 상권 추천 가중치 테스트
 */

import 'dotenv/config.js';
import axios from 'axios';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Phase C1 상권 가중치 테스트 ===\n');

let serverStarted = false;
let server: any = null;
const PORT = 3010;
const BASE = `http://127.0.0.1:${PORT}`;

async function ensureServer() {
  try {
    const health = await axios.get(`${BASE}/health`, { timeout: 1200 });
    if (health.status === 200) { serverStarted = true; return; }
  } catch {}
  server = spawn('npx', ['tsx', 'server/index.ts'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'], shell: true, env: { ...process.env, PORT: String(PORT) } });
  server.stdout.on('data', (d: any) => { if (d.toString().includes('백엔드 서버 시작됨')) serverStarted = true; });
  server.stderr.on('data', (d: any) => { const t = d.toString(); console.error('[서버 에러]', t); if (t.includes('EADDRINUSE')) serverStarted = true; });
}

const cases = [
  {
    name: '카페(강남): metro/commercial 상위',
    data: { placeInfo: '강남역 카페', description: '서울 강남구 감성 카페' },
    expectOneOfTop1: ['강남역', '강남대로', '강남역 상권']
  },
  {
    name: '세차/정비(대구 동성로): commercial/landmark 상위',
    data: { placeInfo: '동성로 세차장', description: '대구 중구 동성로 인근 고급 세차 서비스' },
    expectContains: ['동성로']
  },
  {
    name: '숙박(해운대): attraction 상위',
    data: { placeInfo: '해운대 호텔', description: '부산 해운대구 비치 호텔 숙박' },
    expectOneOfTop1: ['해운대해수욕장']
  }
];

async function run() {
  for (let i = 0; i < 20; i++) { if (serverStarted) break; await new Promise(r => setTimeout(r, 300)); }
  if (!serverStarted) { console.log('✗ 서버 시작 실패'); process.exit(1); }

  let passed = 0, failed = 0;
  for (const tc of cases) {
    try {
  const res = await axios.post(`${BASE}/api/ai/extract-facets`, tc.data, { timeout: 5000 });
      const body = res.data || {};
      const ta: string[] = body.trade_area || [];
      const details: any[] = body.trade_area_details || [];
      let ok = ta.length > 0 && details.length > 0;
      if (tc.expectOneOfTop1) {
        ok = ok && tc.expectOneOfTop1.some(x => ta[0] === x);
      }
      if (tc.expectContains) {
        ok = ok && tc.expectContains.every(x => ta.includes(x));
      }
      console.log(`【${tc.name}】-> ${ok ? '✓' : '✗'}`);
      if (!ok) {
        console.log('  trade_area:', ta);
        console.log('  details:', details);
        failed++;
      } else passed++;
    } catch (e: any) {
      console.log(`【${tc.name}】-> ✗ (요청 실패: ${e.message})`);
      failed++;
    }
  }

  console.log(`\n결과: ${passed} 통과 / ${failed} 실패`);
  process.exit(failed === 0 ? 0 : 1);
}

ensureServer().then(run);
