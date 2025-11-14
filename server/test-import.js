console.log('🚀 서버 로드 테스트 시작');

try {
  console.log('1️⃣ dotenv 로드 중...');
  require('dotenv').config({ path: '.env.local' });
  console.log('✅ dotenv 로드 완료');
} catch (e) {
  console.error('❌ dotenv 오류:', e);
}

try {
  console.log('2️⃣ http 모듈 임포트...');
  const http = require('http');
  console.log('✅ http 모듈 임포트 완료');
} catch (e) {
  console.error('❌ http 오류:', e);
}

try {
  console.log('3️⃣ express 모듈 임포트...');
  const express = require('express');
  console.log('✅ express 모듈 임포트 완료');
} catch (e) {
  console.error('❌ express 오류:', e);
}

try {
  console.log('4️⃣ supabaseClient 모듈 임포트...');
  require('./supabaseClient');
  console.log('✅ supabaseClient 모듈 임포트 완료');
} catch (e) {
  console.error('❌ supabaseClient 오류:', e.message);
  console.error('📋 스택:', e.stack);
}

try {
  console.log('5️⃣ supabaseRoutes 모듈 임포트...');
  require('./supabaseRoutes');
  console.log('✅ supabaseRoutes 모듈 임포트 완료');
} catch (e) {
  console.error('❌ supabaseRoutes 오류:', e.message);
  console.error('📋 스택:', e.stack);
}

console.log('\n✅ 모든 모듈 로드 성공!');
