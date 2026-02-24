// HTTP to HTTPS Proxy for SIM800L
// Accepts HTTP from Arduino, forwards to HTTPS Render backend

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Backend URL from environment variable or default
const BACKEND_URL = process.env.TARGET_URL || 
                   process.env.BACKEND_URL || 
                   'https://backend-air-quality-production.up.railway.app';

console.log('🎯 Target backend:', BACKEND_URL);

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'HTTP Proxy Running', 
    forwards_to: BACKEND_URL,
    note: 'SIM800L sends HTTP here, proxy forwards to HTTPS backend'
  });
});

// Wake backend from cold start, retry once on timeout
async function forwardToBackend(body) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/sensor-data`, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000  // 60s per attempt
      });
      return response;
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.includes('timeout'));
      if (attempt === 1 && isTimeout) {
        console.log(`⏳ Attempt 1 timed out, waking backend and retrying...`);
        // Brief pause then retry — backend should be warm now
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

// Proxy endpoint - forwards HTTP to HTTPS
app.post('/api/sensor-data', async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] Received from Arduino:`);
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const response = await forwardToBackend(req.body);
    console.log(`✅ [${timestamp}] Forwarded successfully. Backend response:`, response.status);
    res.json({ success: true, forwarded: true, backendStatus: response.status });
  } catch (error) {
    console.error(`❌ [${timestamp}] Forward failed:`, error.message);
    if (error.response) {
      console.error(`   Backend returned: ${error.response.status} - ${error.response.statusText}`);
      res.status(error.response.status).json({
        success: false,
        error: error.message,
        backendStatus: error.response.status
      });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Keep backend warm — ping every 4 minutes to prevent cold starts
setInterval(async () => {
  try {
    await axios.get(`${BACKEND_URL}/health`, { timeout: 10000 });
    console.log('💓 Keep-alive ping OK');
  } catch (e) {
    console.log('💤 Keep-alive ping failed (backend may be sleeping):', e.message);
  }
}, 4 * 60 * 1000);

// Catch-all for debugging
app.use((req, res) => {
  console.log(`⚠️  Unhandled ${req.method} request to: ${req.path}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    availableEndpoints: ['POST /api/sensor-data', 'GET /'],
    yourRequest: `${req.method} ${req.path}`
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 HTTP to HTTPS Proxy Server Running');
  console.log('='.repeat(60));
  console.log(`📍 Listening on port: ${PORT}`);
  console.log(`🎯 Forwarding to: ${BACKEND_URL}`);
  console.log(`💡 Use this URL in Arduino: http://[your-proxy-url]/api/sensor-data`);
  console.log('='.repeat(60) + '\n');
});
