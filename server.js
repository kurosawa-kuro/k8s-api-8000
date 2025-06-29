import app from './src/app.js';

// サーバーはapp.jsで起動されるため、ここでは何もしない
// テスト環境ではサーバーを起動しない
if (process.env.NODE_ENV !== 'test') {
  console.log('Server started from server.js entry point');
}