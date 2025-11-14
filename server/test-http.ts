import * as http from 'http';

const PORT = 3007;

const server = http.createServer((req, res) => {
  console.log(`📨 요청: ${req.method} ${req.url}`);
  
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, 'localhost', () => {
  console.log(`\n✅ Native HTTP 서버 시작: http://localhost:${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/health\n`);
});

server.on('error', (err: any) => {
  console.error('❌ 서버 에러:', err);
  process.exit(1);
});

// 15초 후 종료
setTimeout(() => {
  console.log('\n⏱️  타임아웃 - 종료');
  process.exit(0);
}, 15000);
