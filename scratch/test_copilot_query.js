const http = require('http');

const data = JSON.stringify({
  message: "show trainers attendance",
  history: []
});

const req = http.request('http://localhost:3001/api/copilot', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', err => console.error('Req error:', err));
req.write(data);
req.end();
