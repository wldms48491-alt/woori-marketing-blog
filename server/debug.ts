import 'dotenv/config.js';
import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';

config({ path: '.env.local' });

// 전역 에러 핸들러
process.on('uncaughtException', (err) => {
  console.error('❌ 예상치 못한 에러:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 미처리 Promise 거부:', reason);
  process.exit(1);
});

const app = express();
const PORT = 3005;

console.log('1️⃣  Express 앱 생성');

// 미들웨어
app.use(cors());
app.use(express.json());

console.log('2️⃣  미들웨어 설정 완료');

// 헬스 체크
app.get('/health', (req, res) => {
  console.log('✅ /health 요청 수신');
  res.json({ status: 'OK', time: new Date().toISOString() });
});

console.log('3️⃣  헬스 체크 라우트 등록');

// 포트 바인딩
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`4️⃣  포트 바인딩 성공: http://0.0.0.0:${PORT}`);
  });
  
  server.on('error', (err: any) => {
    console.error('❌ 서버 에러:', err.message);
    process.exit(1);
  });
} catch (err) {
  console.error('❌ 포트 바인딩 실패:', err);
  process.exit(1);
}
