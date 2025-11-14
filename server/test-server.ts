import 'dotenv/config.js';
import type { Express, Request, Response } from 'express';
import express from 'express';
import cors from 'cors';

console.log('🚀 간단한 테스트 서버 시작...');

const app: Express = express();
const PORT = 3006;

console.log('Express 앱 생성 완료');

app.use((req: Request, res: Response, next: any) => {
  console.log('📨 요청 수신:', req.method, req.path);
  next();
});

app.use(cors());
console.log('✅ CORS 미들웨어 설정 완료');

app.use(express.json());
console.log('✅ JSON 미들웨어 설정 완료');

// 건강 체크
app.get('/health', (req: Request, res: Response) => {
  console.log('📍 /health 요청 수신 - 응답 전송 중...');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
  console.log('✅ 응답 완료');
});

console.log('✅ 라우트 설정 완료');

console.log(`🔄 ${PORT}번 포트에 바인딩 시도 중...`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ 테스트 서버 시작됨: http://localhost:${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/health\n`);
  console.log('서버는 이제 요청을 기다리고 있습니다...');
});

server.on('error', (err: any) => {
  console.error('❌ 서버 에러:', err);
  process.exit(1);
});

// 10초 후 자동 종료
setTimeout(() => {
  console.log('\n⏱️  10초 타임아웃 - 서버 종료');
  process.exit(0);
}, 10000);
