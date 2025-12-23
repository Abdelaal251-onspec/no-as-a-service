const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;

// Load reasons from JSON
const reasons = JSON.parse(fs.readFileSync('./reasons.json', 'utf-8'));
// Load yes reasons from JSON
const yesReasons = JSON.parse(fs.readFileSync('./yes-resons.json', 'utf-8'));

// Rate limiter: 120 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  keyGenerator: (req, res) => {
    return req.headers['cf-connecting-ip'] || req.ip; // Fallback if header missing (or for non-CF)
  },
  message: { error: "Too many requests, please try again later. (120 reqs/min/IP)" }
});

app.use(limiter);

// Random rejection reason endpoint
app.get('/no', (req, res) => {
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  res.json({ reason });
});

// Random affirmative reason endpoint
app.get('/yes', (req, res) => {
  const reason = yesReasons[Math.floor(Math.random() * yesReasons.length)];
  res.json({ reason });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  const addressInfo = server.address();
  const boundHost = addressInfo && (addressInfo.address === '::' ? '0.0.0.0' : addressInfo.address);

  // Collect non-internal IPv4 addresses for sharing on local network
  const os = require('os');
  const nets = os.networkInterfaces();
  const networkIPs = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        networkIPs.push(net.address);
      }
    }
  }

  console.log(`No-as-a-Service is running on port ${PORT}`);
  console.log(`Bound to host: ${boundHost}`);
  console.log('Accessible at:');
  console.log(`  Local: http://localhost:${PORT}`);
  if (networkIPs.length > 0) {
    networkIPs.forEach((ip) => console.log(`  Network: http://${ip}:${PORT}`));
  } else {
    console.log('  No non-internal IPv4 addresses detected; ensure your network is configured or set HOST explicitly.');
  }
});
