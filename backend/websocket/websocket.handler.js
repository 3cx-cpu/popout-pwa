// backend/websocket/websocket.handler.js

const WebSocket = require('ws');
const { HEARTBEAT_INTERVAL } = require('../config/constants');

const connectedClients = new Map();

function heartbeat() {
  this.isAlive = true;
}

function setupWebSocketServer(wss) {
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        const clientInfo = connectedClients.get(ws);
        console.log(`💀 Terminating dead connection for ${clientInfo?.username || 'unknown'}`);
        connectedClients.delete(ws);
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on('connection', (ws) => {
    console.log('🔌 Client connected');

    ws.isAlive = true;
    ws.on('pong', heartbeat);

    connectedClients.set(ws, {
      authenticated: false,
      username: null,
      connectedAt: Date.now()
    });

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to call notification service',
      serverTime: new Date().toISOString()
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'authenticate') {
          const username = message.username;
          connectedClients.set(ws, {
            authenticated: true,
            username: username,
            connectedAt: Date.now()
          });
          console.log(`✅ User ${username} authenticated`);

          ws.send(JSON.stringify({
            type: 'authenticated',
            message: 'Authentication successful',
            username: username,
            serverTime: new Date().toISOString()
          }));
        } else if (message.type === 'ping') {
          ws.send(JSON.stringify({
            type: 'pong',
            serverTime: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('❌ Error processing client message:', error.message);
      }
    });

    ws.on('close', () => {
      const clientInfo = connectedClients.get(ws);
      console.log(`❌ Client disconnected (${clientInfo?.username || 'unauthenticated'})`);
      connectedClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('❌ Client WebSocket error:', error.message);
      connectedClients.delete(ws);
    });
  });

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return heartbeatInterval;
}

function broadcastToUser(username, message) {
  let sentCount = 0;
  const deadClients = [];

  connectedClients.forEach((clientInfo, client) => {
    if (clientInfo.username === username) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          console.error(`❌ Error sending to client ${username}:`, error.message);
          deadClients.push(client);
        }
      } else {
        deadClients.push(client);
      }
    }
  });

  deadClients.forEach(client => connectedClients.delete(client));

  if (sentCount === 0) {
    console.warn(`⚠️ No active clients for user ${username}`);
  }
}

function getConnectedClients() {
  return connectedClients;
}

module.exports = {
  setupWebSocketServer,
  broadcastToUser,
  getConnectedClients
};