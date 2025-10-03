const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const https = require('https');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const PBX_BASE_URL = 'https://pbx.bozarthconnect.com';
const TOKEN_URL = `${PBX_BASE_URL}/connect/token`;
const WS_URL = 'wss://pbx.bozarthconnect.com/callcontrol/ws';
const LOGIN_URL = 'https://pbx.bozarthconnect.com/webclient/api/Login/GetAccessToken';

let accessToken = null;
let tokenExpiryTime = null;
let pbxWebSocket = null;
let latestSequence = 0;
let connectedClients = new Map(); // Changed to Map to store client info

// Create axios instance with SSL verification disabled (for self-signed certs)
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    const response = await axiosInstance.post(LOGIN_URL, {
      Username: username,
      Password: password,
      SecurityCode: "",
      ReCaptchaResponse: null
    });

    if (response.status === 200) {
      return res.json({ 
        success: true, 
        message: 'Login successful',
        username: username,
        data: response.data
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Login failed. Please check your credentials.' 
    });
  }
});

// Get access token from 3CX
async function getAccessToken() {
  try {
    const params = new URLSearchParams();
    params.append('client_id', 'vintest');
    params.append('client_secret', 'K9j6HptuDKQNRRS7y3VhUexjODEUKKRt');
    params.append('grant_type', 'client_credentials');

    const response = await axiosInstance.post(TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    tokenExpiryTime = Date.now() + (response.data.expires_in * 1000) - 5000;
    
    console.log('Access token obtained successfully');
    console.log('Token expires in:', response.data.expires_in, 'seconds');
    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw error;
  }
}

// Check and refresh token if needed
async function ensureValidToken() {
  if (!accessToken || Date.now() >= tokenExpiryTime) {
    console.log('Token expired or not available, fetching new token...');
    await getAccessToken();
  }
  return accessToken;
}

// Get participant details
async function getParticipantDetails(entity) {
  try {
    const token = await ensureValidToken();
    const url = `${PBX_BASE_URL}${entity}`;
    
    console.log('Fetching participant details from:', url);
    
    const response = await axiosInstance.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Participant details received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting participant details:', error.response?.data || error.message);
    return null;
  }
}

// Connect to 3CX WebSocket
async function connectTo3CXWebSocket() {
  try {
    const token = await ensureValidToken();
    
    if (pbxWebSocket) {
      pbxWebSocket.close();
    }

    console.log('Connecting to 3CX WebSocket...');
    
    pbxWebSocket = new WebSocket(WS_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      rejectUnauthorized: false
    });

    pbxWebSocket.on('open', () => {
      console.log('✓ Connected to 3CX WebSocket successfully');
    });

    pbxWebSocket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received - Sequence:', message.sequence);

        if (message.sequence && message.event && message.event.entity) {
          // Update latest sequence
          if (message.sequence > latestSequence) {
            latestSequence = message.sequence;

            const entity = message.event.entity;
            console.log('Entity:', entity);
            
            // Extract extension from entity
            // Format: /callcontrol/3000/participants/3557
            const entityParts = entity.split('/');
            
            if (entityParts.length >= 3 && entityParts[1] === 'callcontrol') {
              const userExtension = entityParts[2];
              console.log(`\n🔔 CALL DETECTED for extension ${userExtension}!`);
              
              // Get participant details
              const participantDetails = await getParticipantDetails(entity);
              
              if (participantDetails) {
                console.log('Call Details:');
                console.log('  - Caller Name:', participantDetails.party_caller_name);
                console.log('  - Caller Number:', participantDetails.party_caller_id);
                console.log('  - Status:', participantDetails.status);
                console.log('  - Type:', participantDetails.party_dn_type);
                console.log('  - Extension:', userExtension);
                
                // Broadcast to specific user's connected clients
                const notification = {
                  type: 'call_notification',
                  data: {
                    callerName: participantDetails.party_caller_name,
                    callerNumber: participantDetails.party_caller_id,
                    extension: participantDetails.dn,
                    status: participantDetails.status,
                    partyDnType: participantDetails.party_dn_type,
                    callId: participantDetails.callid,
                    timestamp: new Date().toISOString(),
                    userExtension: userExtension
                  }
                };

                broadcastToUser(userExtension, notification);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error.message);
      }
    });

    pbxWebSocket.on('error', (error) => {
      console.error('3CX WebSocket error:', error.message);
    });

    pbxWebSocket.on('close', () => {
      console.log('3CX WebSocket closed. Reconnecting in 5 seconds...');
      setTimeout(connectTo3CXWebSocket, 5000);
    });

  } catch (error) {
    console.error('Error connecting to 3CX WebSocket:', error.message);
    setTimeout(connectTo3CXWebSocket, 5000);
  }
}

// Broadcast message to specific user's clients
function broadcastToUser(username, message) {
  let sentCount = 0;
  connectedClients.forEach((clientInfo, client) => {
    if (clientInfo.username === username && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      sentCount++;
    }
  });
  console.log(`✓ Notification sent to ${sentCount} client(s) for user ${username}\n`);
}

// Handle client WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected - Total clients:', connectedClients.size + 1);
  
  // Store client with pending authentication
  connectedClients.set(ws, { authenticated: false, username: null });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle authentication
      if (message.type === 'authenticate') {
        const username = message.username;
        connectedClients.set(ws, { authenticated: true, username: username });
        console.log(`User ${username} authenticated via WebSocket`);
        
        ws.send(JSON.stringify({ 
          type: 'authenticated', 
          message: 'Authentication successful',
          username: username
        }));
      }
    } catch (error) {
      console.error('Error processing client message:', error.message);
    }
  });

  ws.on('close', () => {
    const clientInfo = connectedClients.get(ws);
    console.log(`Client disconnected (${clientInfo?.username || 'unauthenticated'}) - Remaining clients:`, connectedClients.size - 1);
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('Client WebSocket error:', error.message);
    connectedClients.delete(ws);
  });

  // Send connection confirmation
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to call notification service'
  }));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    pbxConnected: pbxWebSocket && pbxWebSocket.readyState === WebSocket.OPEN,
    connectedClients: connectedClients.size,
    latestSequence: latestSequence,
    tokenValid: accessToken && Date.now() < tokenExpiryTime
  });
});

// Start server
const PORT = process.env.PORT || 7080;

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n========================================`);
  console.log(`3CX Call Notification Server`);
  console.log(`========================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`========================================\n`);
  
  // Initialize connection to 3CX
  try {
    await getAccessToken();
    await connectTo3CXWebSocket();
    console.log('✓ 3CX integration initialized successfully\n');
  } catch (error) {
    console.error('✗ Failed to initialize 3CX integration:', error.message);
    console.log('Will retry connection...\n');
  }
});