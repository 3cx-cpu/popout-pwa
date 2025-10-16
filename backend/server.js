// backend/server.js

const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const http = require('http');

// Config
const { 
  PRODUCTION_MODE, 
  TEST_PHONE_NUMBER, 
  CUSTOMER_DATA_CACHE_DURATION, 
  TOKEN_REFRESH_INTERVAL,
  CUSTOMER_DATA_CACHE_DURATION: CACHE_DURATION_MIN
} = require('./config/constants');

// Database
const { connectDB, closeDB } = require('./database/database');

// Services
const { getAccessToken, isTokenValid } = require('./services/pbx.service');
const { getVinToken } = require('./services/vinsolutions.service');
const { getCacheStats } = require('./services/cache.service');

// WebSocket
const { setupWebSocketServer, broadcastToUser, getConnectedClients } = require('./websocket/websocket.handler');
const { connectTo3CXWebSocket, isPBXConnected, getLatestSequence, getPBXReconnectAttempts, closePBXWebSocket } = require('./websocket/pbx.websocket');

// Routes
const authRoutes = require('./routes/auth.routes');
const callRoutes = require('./routes/call.routes');

// Utils
const { startCallTimer, endCallTimer, getActiveCallTimers } = require('./utils/callTimer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

let tokenRefreshInterval = null;

// Setup WebSocket server
const heartbeatInterval = setupWebSocketServer(wss);

// Routes
app.use('/api', authRoutes);
app.use('/api', callRoutes);

// Token refresh mechanism
function startTokenRefreshInterval() {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }

  tokenRefreshInterval = setInterval(async () => {
    try {
      console.log('🔄 Refreshing 3CX token proactively...');
      await getAccessToken();
    } catch (error) {
      console.error('❌ Failed to refresh token proactively:', error.message);
    }
  }, TOKEN_REFRESH_INTERVAL);
}

// Health check endpoint
app.get('/health', (req, res) => {
  const connectedClients = getConnectedClients();
  const clientStats = Array.from(connectedClients.values()).reduce((acc, client) => {
    if (client.authenticated) {
      acc.authenticated++;
      if (!acc.users[client.username]) {
        acc.users[client.username] = 0;
      }
      acc.users[client.username]++;
    } else {
      acc.unauthenticated++;
    }
    return acc;
  }, { authenticated: 0, unauthenticated: 0, users: {} });

  const cacheStats = getCacheStats();
  const activeCallTimers = getActiveCallTimers();

  res.json({
    status: 'ok',
    pbxConnected: isPBXConnected(),
    connectedClients: connectedClients.size,
    clientStats: clientStats,
    latestSequence: getLatestSequence(),
    tokenValid: isTokenValid(),
    uptime: process.uptime(),
    pbxReconnectAttempts: getPBXReconnectAttempts(),
    activeCallTimers: activeCallTimers.size,
    cache: {
      customerDataCache: cacheStats.totalCached,
      hotCache: cacheStats.hotCached,
      cacheDurationMinutes: CUSTOMER_DATA_CACHE_DURATION / 1000 / 60,
      details: cacheStats.details
    }
  });
});

const PORT = process.env.PORT || 7080;

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 3CX + VinSolutions Integration Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server running on port ${PORT}`);

  if (PRODUCTION_MODE) {
    console.log(`✅ MODE: PRODUCTION (using real phone numbers)`);
  } else {
    console.log(`🧪 MODE: TESTING (using test number: ${TEST_PHONE_NUMBER})`);
  }

  console.log(`\n📊 CACHE CONFIGURATION:`);
  console.log(`   - Customer Data Cache: ${CACHE_DURATION_MIN / 1000 / 60} minutes`);
  console.log(`   - Hot Cache (Pre-fetch): ${require('./config/constants').HOT_CACHE_DURATION / 1000} seconds`);
  console.log(`\n📡 PROGRESSIVE LOADING: Enabled (4 stages)`);
  console.log(`\n⏱️ CALL TIMER: Based on 'Connected' status`);
  console.log(`\n🔄 TOKEN REFRESH: Every ${TOKEN_REFRESH_INTERVAL / 1000} seconds`);

  console.log(`${'='.repeat(60)}\n`);

  try {
    await getAccessToken();
    startTokenRefreshInterval(); // Start token refresh interval
    await getVinToken();
    await connectDB();
    
    const connectedClients = getConnectedClients();
    await connectTo3CXWebSocket(
      broadcastToUser, 
      connectedClients,
      (callId, userExtension) => startCallTimer(callId, userExtension, broadcastToUser),
      (callId, userExtension) => endCallTimer(callId, userExtension, broadcastToUser)
    );
    
    console.log('✅ All services initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  clearInterval(heartbeatInterval);
  closePBXWebSocket();
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
  await closeDB();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  clearInterval(heartbeatInterval);
  closePBXWebSocket();
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
  await closeDB();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };