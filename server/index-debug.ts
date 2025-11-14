import 'dotenv/config.js';
import type { Express, Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 디버그 서버 초기화...');
console.log('현재 파일:', __filename);
console.log('현재 디렉토리:', process.cwd());
console.log('Node 버전:', process.version);
console.log('환경:', process.env.NODE_ENV || 'development');

const app: Express = express();
const PORT = parseInt(process.env.PORT || '3008', 10);

console.log(`📍 포트 설정: ${PORT}`);

app.use(cors());
console.log('✅ CORS 설정 완료');

app.use(express.json());
console.log('✅ JSON 파서 설정 완료');

app.get('/health', (req: Request, res: Response) => {
  console.log('📍 GET /health 요청 처리 중...');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

console.log('✅ 라우트 설정 완료');

// 여기서 서버 시작
console.log(`🔄 ${PORT}번 포트에서 서버 시작 시도...`);

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n✅ 디버그 서버 시작됨: http://127.0.0.1:${PORT}`);
  console.log(`테스트 명령어: curl http://127.0.0.1:${PORT}/health\n`);
  
  // 서버가 실제로 바인딩되었는지 확인
  const address = server.address();
  console.log('서버 주소 정보:', JSON.stringify(address, null, 2));
});

server.on('error', (err: any) => {
  console.error('❌ 서버 바인딩 오류:', err.message);
  console.error('📋 코드:', err.code);
  console.error('📋 전체 오류:', err);
  process.exit(1);
});

// 60초 후 자동 종료
setTimeout(() => {
  console.log('\n⏱️  60초 타임아웃 - 서버 종료');
  server.close(() => {
    console.log('서버 종료 완료');
    process.exit(0);
  });
}, 60000);

console.log('서버는 이제 요청을 기다리고 있습니다...');
