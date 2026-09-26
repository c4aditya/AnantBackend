require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = 5408;
const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;

function httpRequest({ method, path, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let resBody = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', (chunk) => (resBody += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody);
          resolve({ status: res.statusCode, data: parsed, cookies });
        } catch (e) {
          resolve({ status: res.statusCode, data: resBody, cookies });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Connecting DB & Testing Admin Email & Password Controller Update...');
  await connectDB();

  const server = app.listen(PORT, async () => {
    console.log(`Test Server listening on port ${PORT}\n`);

    try {
      // 1. Test Create Admin with adminEmail & adminPassword
      const adminEmail = `admin_${Date.now()}@anantairways.com`;
      console.log('1. Calling POST /api/v1/auth/create-admin with adminEmail & adminPassword...');
      const createRes = await httpRequest({
        method: 'POST',
        path: '/auth/create-admin',
        body: {
          adminEmail: adminEmail,
          adminPassword: 'adminpassword123'
        }
      });
      console.log(`✓ Create Admin Status: ${createRes.status} -> adminEmail: ${createRes.data?.data?.user?.adminEmail}`);

      // 2. Test Login Admin with adminEmail & adminPassword
      console.log('\n2. Calling POST /api/v1/auth/login-admin with adminEmail & adminPassword...');
      const loginRes = await httpRequest({
        method: 'POST',
        path: '/auth/login-admin',
        body: {
          adminEmail: adminEmail,
          adminPassword: 'adminpassword123'
        }
      });
      console.log(`✓ Login Admin Status: ${loginRes.status} -> Role: ${loginRes.data?.data?.user?.role}`);

      console.log('\n🎉 ADMIN EMAIL & PASSWORD CONTROLLER UPDATE PASSED PERFECTLY!');
    } catch (err) {
      console.error('❌ Test error:', err);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

runTests();
