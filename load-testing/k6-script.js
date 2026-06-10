import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // ramp up to 50 users
    { duration: '1m', target: 50 },   // stay at 50 users for 1 minute
    { duration: '30s', target: 0 },   // ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of HTTP requests must complete below 500ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Test Health API (No auth required)
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // Simulated pause
  sleep(1);

  // Note: For a complete WebSocket and Auth test, we would need to:
  // 1. Post to /api/auth/signup or /api/auth/login to get a JWT cookie.
  // 2. Connect to ws://localhost:3000 with the JWT cookie.
  // 
  // Example of how WebSocket testing would look if auth was bypassed or handled:
  /*
  const wsUrl = `ws://${BASE_URL.replace('http://', '')}/socket.io/?EIO=4&transport=websocket`;
  
  const res = ws.connect(wsUrl, null, function (socket) {
    socket.on('open', () => {
      console.log('connected');
      socket.send('40'); // Socket.IO connect packet
      
      socket.setInterval(function timeout() {
        socket.send('2'); // Socket.IO ping packet
      }, 25000);
    });

    socket.on('message', (msg) => {
      // Handle incoming socket.io messages
    });

    socket.on('close', () => console.log('disconnected'));
    socket.on('error', (e) => console.log('error', e.error()));

    socket.setTimeout(function () {
      socket.close();
    }, 10000); // close after 10 seconds
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
  */
}
