#!/usr/bin/env node

import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';

console.error('🚀 [DEBUG] 서버 시작...');

try {
  const app = express();
  const PORT = 3005;

  console.error('📍 [DEBUG] PORT:', PORT);

  app.use(cors());
  console.error('✅ [DEBUG] CORS 설정 완료');

  app.use(express.json());
  console.error('✅ [DEBUG] JSON 파서 설정 완료');

  app.get('/health', (req, res) => {
    console.error('📨 [DEBUG] GET /health 요청 처리 중');
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  console.error('✅ [DEBUG] 라우트 설정 완료');

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.error(`✅ [DEBUG] app.listen() 콜백 실행됨 - 서버 시작: ${PORT}`);
  });

  server.on('listening', () => {
    console.error(`✅ [DEBUG] 서버 listening 이벤트 발생: ${PORT}`);
    const addr = server.address();
    console.error(`✅ [DEBUG] 서버 주소: ${JSON.stringify(addr)}`);
  });

  server.on('error', (err) => {
    console.error('❌ [DEBUG] 서버 에러:', err.message);
    process.exit(1);
  });

} catch (err) {
  console.error('❌ [DEBUG] 예외 발생:', err);
  process.exit(1);
}

console.error('✅ [DEBUG] 스크립트 끝 (프로세스 계속 실행)');
