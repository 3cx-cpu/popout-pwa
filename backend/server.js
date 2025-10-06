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

// VinSolutions Configuration
const VIN_CONFIG = {
  tokenUrl: "https://authentication.vinsolutions.com/connect/token",
  apiBaseUrl: "https://api.vinsolutions.com",
  clientId: "GATEW0099657",
  clientSecret: "B8B5C389100149958F0DC0B4C1BB4FEE",
  apiKey: "ZrqgRCrh355BhV46t2eWq1FkrLPxcWa64novnnnf",
  dealerId: "22269",
  userId: "1286659"
};

let accessToken = null;
let tokenExpiryTime = null;
let pbxWebSocket = null;
let latestSequence = 0;
let connectedClients = new Map();

// VinSolutions token
let vinToken = null;
let vinTokenExpiry = null;

// Create axios instance
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

// ============= VINSOLUTIONS API FUNCTIONS =============

// Extract phone digits
function extractPhoneDigits(phone) {
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length === 11 && digits[0] === '1') {
    return digits.substring(1);
  }
  return digits;
}

// Get VinSolutions Token
async function getVinToken(forceRefresh = false) {
  try {
    if (!forceRefresh && vinToken && vinTokenExpiry && new Date() < vinTokenExpiry) {
      return vinToken;
    }

    console.log("🔐 Fetching VinSolutions token...");
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: VIN_CONFIG.clientId,
      client_secret: VIN_CONFIG.clientSecret,
      scope: "PublicAPI"
    });

    const response = await axios.post(VIN_CONFIG.tokenUrl, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    vinToken = response.data.access_token;
    vinTokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
    console.log(`✅ VinSolutions token obtained`);
    return vinToken;
  } catch (error) {
    console.error('❌ Error getting VinSolutions token:', error.message);
    throw error;
  }
}

// Make VinSolutions Request
async function makeVinRequest(url, params = {}, headers = {}, retryOnAuth = true) {
  try {
    let token = await getVinToken();
    
    const defaultHeaders = {
      "Authorization": `Bearer ${token}`,
      "api_key": VIN_CONFIG.apiKey,
      "Accept": headers.Accept || "application/json"
    };

    const fullParams = { 
      dealerId: params.dealerId || VIN_CONFIG.dealerId,
      ...params 
    };
    
    if (url.includes('/gateway/v1/') || url.includes('/leads')) {
      fullParams.userId = params.userId || VIN_CONFIG.userId;
    }

    const response = await axios.get(url, {
      params: fullParams,
      headers: { ...defaultHeaders, ...headers },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401 && retryOnAuth) {
      console.log("🔄 VinSolutions token expired, refreshing...");
      await getVinToken(true);
      return makeVinRequest(url, params, headers, false);
    }
    
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw error;
  }
}

// Get all contacts by phone
async function getContactsByPhone(phoneNumber) {
  console.log(`📞 Fetching contacts for: ${phoneNumber}`);
  const url = `${VIN_CONFIG.apiBaseUrl}/gateway/v1/contact`;
  
  try {
    const response = await makeVinRequest(url, { phone: phoneNumber });
    
    if (response && response.length > 0) {
      console.log(`✅ Found ${response.length} contact(s)`);
      return response.map((contact) => {
        const contactInfo = contact.ContactInformation;
        return {
          contactId: contact.ContactId,
          firstName: contactInfo.FirstName || "",
          lastName: contactInfo.LastName || "",
          fullName: `${contactInfo.FirstName || ""} ${contactInfo.LastName || ""}`.trim(),
          phones: contactInfo.Phones || [],
          emails: contactInfo.Emails || [],
          addresses: contactInfo.Addresses || [],
          StreetAddress: `${contactInfo.Addresses?.[0]?.StreetAddress}` || "",
          cityStatePost: `${contactInfo.Addresses?.[0]?.City || ""} ${contactInfo.Addresses?.[0]?.State || ""} ${contactInfo.Addresses?.[0]?.Postal || ""}`.trim() || "",
          phone: phoneNumber,
          email: contactInfo.Emails?.[0]?.EmailAddress || ""
        };
      });
    }
    return [];
  } catch (error) {
    console.error("❌ Error fetching contacts:", error.message);
    return [];
  }
}

// Get leads for contact
async function getLeads(contactId) {
  const url = `${VIN_CONFIG.apiBaseUrl}/leads`;
  const params = { limit: 100, sortBy: 'Date', contactId };
  const headers = {
    "Accept": "application/vnd.coxauto.v3+json",
    "Content-Type": "application/vnd.coxauto.v3+json"
  };
  
  try {
    const response = await makeVinRequest(url, params, headers);
    if (response && response.items) {
      return response.items.map(lead => ({
        leadId: lead.leadId,
        leadStatus: lead.leadStatusType,
        leadType: lead.leadType,
        leadGroupCategory: lead.leadGroupCategory,
        createdUtc: lead.createdUtc,
        isHot: lead.isHot,
        contact: lead.contact,
        leadSource: lead.leadSource,
        vehiclesOfInterest: lead.vehiclesOfInterest || [],
        tradeVehicles: lead.tradeVehicles || []
      }));
    }
    return [];
  } catch (error) {
    console.error("❌ Error fetching leads:", error.message);
    return [];
  }
}

// Get vehicles of interest
async function getVehiclesOfInterest(leadId) {
  const url = `${VIN_CONFIG.apiBaseUrl}/vehicles/interest`;
  const headers = {
    "Accept": "application/vnd.coxauto.v1+json",
    "Content-Type": "application/vnd.coxauto.v1+json"
  };
  
  try {
    const response = await makeVinRequest(url, { leadId }, headers);
    if (response && response.items) {
      return response.items.map(vehicle => ({
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim || "",
        vin: vehicle.vin,
        mileage: vehicle.mileage,
        sellingPrice: vehicle.sellingPrice,
        msrp: vehicle.msrp,
        inventoryType: vehicle.inventoryType,
        exteriorColor: vehicle.exteriorColor || "",
        interiorColor: vehicle.interiorColor || "",
        stockNumber: vehicle.stockNumber || "",
        description: vehicle.description || "",
        // Additional fields from autoEntity
        trimName: vehicle.autoEntity?.trimName || "",
        autoEntityMileage: vehicle.autoEntity?.mileage || null,
        interiorColorName: vehicle.autoEntity?.interiorColorName || "",
        externalColorName: vehicle.autoEntity?.externalColorName || "",
        price: vehicle.autoEntity?.price || null
      }));
    }
    return [];
  } catch (error) {
    console.error("❌ Error fetching vehicles:", error.message);
    return [];
  }
}

// Get trade vehicles
async function getTradeVehicles(leadId) {
  const url = `${VIN_CONFIG.apiBaseUrl}/vehicles/trade`;
  const headers = {
    "Accept": "application/vnd.coxauto.v1+json",
    "Content-Type": "application/vnd.coxauto.v1+json"
  };
  
  try {
    const response = await makeVinRequest(url, { leadId }, headers);
    if (response && response.items) {
      return response.items.map(vehicle => ({
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim || "",
        vin: vehicle.vin,
        mileage: vehicle.mileage
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}

// Get lead source
async function getLeadSource(leadSourceId) {
  const url = `${VIN_CONFIG.apiBaseUrl}/leadSources/id/${leadSourceId}`;
  const headers = { "Accept": "application/vnd.coxauto.v1+json" };
  
  try {
    const response = await makeVinRequest(url, {}, headers);
    if (response) {
      return {
        leadSourceId: response.leadSourceId,
        leadSourceName: response.leadSourceName
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Get user by ID
async function getUserById(userId) {
  if (!userId || userId === 0) return null;
  
  const url = `${VIN_CONFIG.apiBaseUrl}/gateway/v1/tenant/user/id/${userId}`;
  const params = { dealerId: VIN_CONFIG.dealerId, limit: 100, UserId: userId };
  
  try {
    const response = await makeVinRequest(url, params);
    if (response) {
      return {
        userId: response.UserId,
        fullName: response.FullName,
        firstName: response.FirstName,
        lastName: response.LastName,
        emailAddress: response.EmailAddress,
        userTypes: response.UserTypes || []
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Get contact details with dealer team
async function getContactDetails(contactUrl) {
  try {
    const urlMatch = contactUrl.match(/contacts\/id\/(\d+)\?dealerid=(\d+)/);
    if (!urlMatch) return null;
    
    const contactId = urlMatch[1];
    const dealerId = urlMatch[2];
    const url = `${VIN_CONFIG.apiBaseUrl}/contacts/id/${contactId}`;
    const params = { dealerId, userId: VIN_CONFIG.userId };
    
    const response = await makeVinRequest(url, params);
    if (response && response.length > 0) {
      const contactData = response[0];
      const salesRep = contactData.DealerTeam?.find(member => member.RoleName === "Sales Rep");
      
      return {
        contactInfo: contactData.ContactInformation,
        dealerTeam: contactData.DealerTeam,
        salesRepUserId: salesRep?.UserId || null,
        salesRepName: salesRep?.FullName || null
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Process leads in parallel
async function processLeadsInParallel(leads) {
  const leadPromises = leads.map(async (lead) => {
    const [vehiclesOfInterest, tradeVehicles, leadSource, contactDetails] = await Promise.allSettled([
      getVehiclesOfInterest(lead.leadId),
      getTradeVehicles(lead.leadId),
      lead.leadSource ? (async () => {
        const match = lead.leadSource.match(/\/(\d+)\?/);
        return match ? getLeadSource(match[1]) : null;
      })() : Promise.resolve(null),
      lead.contact ? getContactDetails(lead.contact) : Promise.resolve(null)
    ]);
    
    const salesRepData = contactDetails.status === 'fulfilled' && contactDetails.value?.salesRepUserId
      ? await getUserById(contactDetails.value.salesRepUserId)
      : null;
    
    return {
      ...lead,
      vehiclesOfInterest: vehiclesOfInterest.status === 'fulfilled' ? vehiclesOfInterest.value : [],
      tradeVehicles: tradeVehicles.status === 'fulfilled' ? tradeVehicles.value : [],
      leadSource: leadSource.status === 'fulfilled' ? leadSource.value : null,
      salesRepInfo: salesRepData
    };
  });
  
  return Promise.all(leadPromises);
}

// Get complete customer data
async function getCompleteCustomerData(phoneNumber) {
  console.log("\n🚀 Fetching complete customer data for:", phoneNumber);
  const startTime = Date.now();
  
  try {
    const contacts = await getContactsByPhone(phoneNumber);
    
    if (!contacts || contacts.length === 0) {
      console.log("⚠️ No contacts found");
      return null;
    }
    
    console.log(`✅ Found ${contacts.length} contact(s)`);
    
    // Process each contact
    const allContactsDataPromises = contacts.map(async (contact) => {
      const leads = await getLeads(contact.contactId);
      let allLeadsData = [];
      let primarySalesRepInfo = null;
      
      if (leads.length > 0) {
        allLeadsData = await processLeadsInParallel(leads);
        
        // Find primary sales rep
        for (const leadData of allLeadsData) {
          if (leadData.salesRepInfo) {
            primarySalesRepInfo = leadData.salesRepInfo;
            break;
          }
        }
      }
      
      const salesAssignment = await getUserById(VIN_CONFIG.userId);
      
      return {
        contact,
        leads,
        allLeadsData,
        vehiclesOfInterest: allLeadsData[0]?.vehiclesOfInterest || [],
        tradeVehicles: allLeadsData[0]?.tradeVehicles || [],
        salesAssignment,
        salesRepInfo: primarySalesRepInfo,
        leadSource: allLeadsData[0]?.leadSource || null
      };
    });
    
    const allContactsData = await Promise.all(allContactsDataPromises);
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Data retrieval complete in ${totalTime}ms`);
    
    return {
      contact: contacts[0],
      leads: allContactsData[0]?.leads || [],
      allLeadsData: allContactsData[0]?.allLeadsData || [],
      vehiclesOfInterest: allContactsData[0]?.vehiclesOfInterest || [],
      tradeVehicles: allContactsData[0]?.tradeVehicles || [],
      salesAssignment: allContactsData[0]?.salesAssignment,
      salesRepInfo: allContactsData[0]?.salesRepInfo,
      leadSource: allContactsData[0]?.leadSource,
      contacts,
      allContactsData,
      hasMultipleContacts: contacts.length > 1,
      retrievalTime: totalTime
    };
  } catch (error) {
    console.error("❌ Error in getCompleteCustomerData:", error.message);
    return null;
  }
}

// ============= 3CX FUNCTIONS =============

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

// Get 3CX access token
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
    
    console.log('✅ 3CX token obtained');
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting 3CX token:', error.message);
    throw error;
  }
}

async function ensureValidToken() {
  if (!accessToken || Date.now() >= tokenExpiryTime) {
    await getAccessToken();
  }
  return accessToken;
}

// Get participant details
async function getParticipantDetails(entity) {
  try {
    const token = await ensureValidToken();
    const url = `${PBX_BASE_URL}${entity}`;
    
    const response = await axiosInstance.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error getting participant details:', error.message);
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

    console.log('🔌 Connecting to 3CX WebSocket...');
    
    pbxWebSocket = new WebSocket(WS_URL, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      rejectUnauthorized: false
    });

    pbxWebSocket.on('open', () => {
      console.log('✅ Connected to 3CX WebSocket');
    });

    pbxWebSocket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.sequence && message.event && message.event.entity) {
          if (message.sequence > latestSequence) {
            latestSequence = message.sequence;

            const entity = message.event.entity;
            const entityParts = entity.split('/');
            
            if (entityParts.length >= 3 && entityParts[1] === 'callcontrol') {
              const userExtension = entityParts[2];
              console.log(`\n🔔 CALL DETECTED for extension ${userExtension}`);
              
              const participantDetails = await getParticipantDetails(entity);
              
              if (participantDetails) {
                const callerNumber = participantDetails.party_caller_id;
                console.log(`📞 Caller Number: ${callerNumber}`);
                
                // Fetch VinSolutions data
                const vinPhoneNumber = extractPhoneDigits(callerNumber);
                console.log(`🔍 Searching VinSolutions for: ${vinPhoneNumber}`);
                
                const customerData = await getCompleteCustomerData(vinPhoneNumber);
                
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
                    userExtension: userExtension,
                    // VinSolutions data
                    customerData: customerData
                  }
                };

                broadcastToUser(userExtension, notification);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error processing WebSocket message:', error.message);
      }
    });

    pbxWebSocket.on('error', (error) => {
      console.error('❌ 3CX WebSocket error:', error.message);
    });

    pbxWebSocket.on('close', () => {
      console.log('❌ 3CX WebSocket closed. Reconnecting...');
      setTimeout(connectTo3CXWebSocket, 5000);
    });

  } catch (error) {
    console.error('❌ Error connecting to 3CX:', error.message);
    setTimeout(connectTo3CXWebSocket, 5000);
  }
}

function broadcastToUser(username, message) {
  let sentCount = 0;
  connectedClients.forEach((clientInfo, client) => {
    if (clientInfo.username === username && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      sentCount++;
    }
  });
  console.log(`✅ Notification sent to ${sentCount} client(s) for user ${username}`);
}

// WebSocket handler
wss.on('connection', (ws) => {
  console.log('🔌 Client connected');
  connectedClients.set(ws, { authenticated: false, username: null });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'authenticate') {
        const username = message.username;
        connectedClients.set(ws, { authenticated: true, username: username });
        console.log(`✅ User ${username} authenticated`);
        
        ws.send(JSON.stringify({ 
          type: 'authenticated', 
          message: 'Authentication successful',
          username: username
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

  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to call notification service'
  }));
});

// Health check
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
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 3CX + VinSolutions Integration Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server running on port ${PORT}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    await getAccessToken();
    await getVinToken(); // Initialize VinSolutions token
    await connectTo3CXWebSocket();
    console.log('✅ All services initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
  }
});

module.exports = { app, server };