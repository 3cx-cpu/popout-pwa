const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const cors = require('cors');
const http = require('http');
const https = require('https');
const { connectDB, saveCallData, getCallHistory, getCallById, closeDB } = require('./database');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const PBX_BASE_URL = 'https://pbx.bozarthconnect.com';
const TOKEN_URL = `${PBX_BASE_URL}/connect/token`;
const WS_URL = 'wss://pbx.bozarthconnect.com/callcontrol/ws';
const LOGIN_URL = 'https://pbx.bozarthconnect.com/webclient/api/Login/GetAccessToken';

// ============= TESTING CONFIGURATION =============
const PRODUCTION_MODE = true;
const TEST_PHONE_NUMBER = '3037517500';
// ================================================

// ============= CACHE CONFIGURATION =============
const CUSTOMER_DATA_CACHE_DURATION = 10 * 60 * 1000;
const HOT_CACHE_DURATION = 60 * 1000;
const CALL_CACHE_DURATION = 60000;
// ==============================================

// ============= TOKEN REFRESH CONFIGURATION =============
const TOKEN_REFRESH_INTERVAL = 50000;
const TOKEN_REFRESH_BUFFER = 10000;
// ========================================================

const VIN_CONFIG = {
  tokenUrl: "https://authentication.vinsolutions.com/connect/token",
  apiBaseUrl: "https://api.vinsolutions.com",
  clientId: "GATEW0099657",
  clientSecret: "B8B5C389100149958F0DC0B4C1BB4FEE",
  apiKey: "ZrqgRCrh355BhV46t2eWq1FkrLPxcWa64novnnnf",
  dealerId: "22269",
  userId: "1286659"
};

// ============= TEKION CONFIGURATION =============
const TEKION_CONFIG = {
  apiBaseUrl: "https://api.bozarthconnect.com/lookup",
  apiKey: "6E9ViMUn5O2LBBcFQ5MIxKkzMdsC74c8wwtAeQdh",
  operatorEmail: "jnegri@edbozarth.com"
};
// ================================================

let accessToken = null;
let tokenExpiryTime = null;
let pbxWebSocket = null;
let latestSequence = 0;
let connectedClients = new Map();
let vinToken = null;
let vinTokenExpiry = null;
let pbxReconnectAttempts = 0;
let isConnectingToPBX = false;
let tokenRefreshInterval = null;

// ============= CACHE STORAGE =============
const customerDataCache = new Map();
const hotCache = new Map();
const processedCalls = new Map();
const savedCalls = new Map();
const activeCallTimers = new Map();
// ========================================

// HEARTBEAT CONFIGURATION
const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 60000;
const PBX_PING_INTERVAL = 25000;
const PBX_RECONNECT_MAX_DELAY = 30000;
const PBX_RECONNECT_BASE_DELAY = 1000;

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
});

// ============= CACHE HELPER FUNCTIONS =============

function getCacheStats() {
  const stats = {
    totalCached: customerDataCache.size,
    hotCached: hotCache.size,
    details: []
  };

  customerDataCache.forEach((value, key) => {
    const ageMinutes = ((Date.now() - value.timestamp) / 1000 / 60).toFixed(1);
    stats.details.push({
      phone: key,
      ageMinutes: ageMinutes,
      hits: value.hits || 0
    });
  });

  return stats;
}

function cleanupOldCaches() {
  const now = Date.now();

  for (const [phone, data] of customerDataCache.entries()) {
    if (now - data.timestamp > CUSTOMER_DATA_CACHE_DURATION) {
      console.log(`🗑️ Removing expired cache for: ${phone} (age: ${((now - data.timestamp) / 1000 / 60).toFixed(1)} min)`);
      customerDataCache.delete(phone);
    }
  }

  for (const [phone, data] of hotCache.entries()) {
    if (now - data.timestamp > HOT_CACHE_DURATION) {
      console.log(`🗑️ Removing expired hot cache for: ${phone}`);
      hotCache.delete(phone);
    }
  }

  for (const [callId, timestamp] of processedCalls.entries()) {
    if (now - timestamp > CALL_CACHE_DURATION) {
      processedCalls.delete(callId);
    }
  }

  for (const [callId, timestamp] of savedCalls.entries()) {
    if (now - timestamp > CALL_CACHE_DURATION) {
      savedCalls.delete(callId);
    }
  }
}

setInterval(cleanupOldCaches, 30000);

function getCachedCustomerData(phoneNumber) {
  const cached = customerDataCache.get(phoneNumber);

  if (cached && (Date.now() - cached.timestamp < CUSTOMER_DATA_CACHE_DURATION)) {
    cached.hits = (cached.hits || 0) + 1;
    const ageSeconds = ((Date.now() - cached.timestamp) / 1000).toFixed(1);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 CACHE HIT! Phone: ${phoneNumber}`);
    console.log(`📊 Cache Stats:`);
    console.log(`   - Age: ${ageSeconds}s`);
    console.log(`   - Total Hits: ${cached.hits}`);
    console.log(`   - Expires in: ${((CUSTOMER_DATA_CACHE_DURATION - (Date.now() - cached.timestamp)) / 1000 / 60).toFixed(1)} min`);
    console.log(`${'='.repeat(60)}\n`);
    return cached.data;
  }

  return null;
}

function setCachedCustomerData(phoneNumber, data) {
  customerDataCache.set(phoneNumber, {
    data: data,
    timestamp: Date.now(),
    hits: 0
  });
  console.log(`💾 Cached customer data for: ${phoneNumber}`);
}

// ============= HELPER FUNCTIONS =============

function extractPhoneDigits(phone) {
  const digits = String(phone).replace(/[^\d]/g, "");
  if (digits.length === 11 && digits[0] === '1') {
    return digits.substring(1);
  }
  return digits;
}

// ============= CALL TIMER MANAGEMENT =============

function startCallTimer(callId, userExtension) {
  if (activeCallTimers.has(callId)) {
    console.log(`⏱️ Timer already running for call ${callId}`);
    return;
  }

  const startTime = Date.now();
  activeCallTimers.set(callId, {
    startTime: startTime,
    userExtension: userExtension,
    status: 'active'
  });

  console.log(`⏱️ CALL TIMER STARTED - Call ID: ${callId}, User: ${userExtension}`);

  broadcastToUser(userExtension, {
    type: 'call_timer_started',
    callId: callId,
    startTime: startTime,
    timestamp: new Date().toISOString()
  });
}

function endCallTimer(callId, userExtension) {
  const timerInfo = activeCallTimers.get(callId);

  if (!timerInfo) {
    console.log(`⚠️ No active timer found for call ${callId}`);
    return;
  }

  const endTime = Date.now();
  const duration = Math.floor((endTime - timerInfo.startTime) / 1000);

  activeCallTimers.delete(callId);

  console.log(`⏱️ CALL TIMER ENDED - Call ID: ${callId}, Duration: ${duration}s`);

  broadcastToUser(userExtension, {
    type: 'call_timer_ended',
    callId: callId,
    startTime: timerInfo.startTime,
    endTime: endTime,
    duration: duration,
    timestamp: new Date().toISOString()
  });
}

// ============= PROGRESSIVE DATA SENDING =============

function sendProgressiveUpdate(userExtension, stage, data, callInfo) {
  const message = {
    type: 'progressive_update',
    stage: stage,
    data: data,
    callInfo: callInfo,
    timestamp: new Date().toISOString()
  };

  broadcastToUser(userExtension, message);
  console.log(`📤 STAGE ${stage} sent to ${userExtension}`);
}

// ============= TEKION API FUNCTIONS =============

async function getTekionCustomerByPhone(phoneNumber) {
  try {
    console.log(`🔍 Fetching Tekion customer by phone: ${phoneNumber}`);
    
    const response = await axios.post(
      TEKION_CONFIG.apiBaseUrl,
      {
        phone: phoneNumber,
        operatorEmail: TEKION_CONFIG.operatorEmail
      },
      {
        headers: {
          'x-api-key': TEKION_CONFIG.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.Tekion && response.data.Tekion.customer) {
      console.log(`✅ Tekion customer found: ${response.data.Tekion.customer.customerId}`);
      return response.data.Tekion.customer;
    }

    console.log(`❌ No Tekion customer found for: ${phoneNumber}`);
    return null;
  } catch (error) {
    console.error('❌ Error fetching Tekion customer:', error.message);
    return null;
  }
}

async function getTekionCustomerDetails(customerId) {
  try {
    console.log(`🔍 Fetching Tekion customer details for ID: ${customerId}`);
    
    const response = await axios.post(
      TEKION_CONFIG.apiBaseUrl,
      {
        operatorEmail: TEKION_CONFIG.operatorEmail,
        customer_id: customerId,
        include: ["deals", "ros"]
      },
      {
        headers: {
          'x-api-key': TEKION_CONFIG.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.Tekion) {
      console.log(`✅ Tekion customer details retrieved`);
      return response.data.Tekion;
    }

    console.log(`❌ No Tekion details found for customer: ${customerId}`);
    return null;
  } catch (error) {
    console.error('❌ Error fetching Tekion customer details:', error.message);
    return null;
  }
}

function processTekionData(tekionDetails) {
  if (!tekionDetails || !tekionDetails.repair_orders || tekionDetails.repair_orders.length === 0) {
    return null;
  }

  const repairOrders = tekionDetails.repair_orders.map(ro => {
    // Extract all job descriptions
    const services = ro.jobs ? ro.jobs.map(job => ({
      jobNo: job.job_no,
      concernDescription: job.concern_description,
      status: job.status,
      completedTime: job.completed_time,
      payType: job.pay_type,
      jobPrice: job.job_price,
      operations: job.operations ? job.operations.map(op => ({
        techStory: op.tech_story,
        opcodeDescription: op.opcode_description,
        laborPrice: op.labor_price,
        parts: op.parts || []
      })) : []
    })) : [];

    return {
      // RO Basic Info
      roId: ro.ro_id,
      roNumber: ro.ro_number,
      roStatus: ro.ro_status,
      roCreatedTime: ro.ro_created_time,
      roClosedTime: ro.ro_closed_time,
      promiseTime: ro.promise_time,
      checkinTime: ro.checkin_time,
      lastInvoicedTime: ro.last_invoiced_time,

      // Vehicle Info
      vin: ro.vin,
      year: ro.year,
      make: ro.make,
      model: ro.model,
      trim: ro.trim,
      odometerIn: ro.odometer_in,
      odometerOut: ro.odometer_out,
      bodyType: ro.body_type,

      // Customer Info
      customerId: ro.customer_id,
      customerFirstName: ro.customer_first_name || ro.billing_customer_first_name,
      customerLastName: ro.customer_last_name || ro.billing_customer_last_name,
      customerMobilePhone: ro.customer_mobile_phone || ro.billing_customer_mobile_phone,
      customerEmail: ro.customer_email || ro.billing_customer_email,
      customerAddressLine1: ro.customer_address_line_1 || ro.billing_customer_address_line_1,
      customerCity: ro.customer_city || ro.billing_customer_city,
      customerState: ro.customer_state || ro.billing_customer_state,
      customerPostalCode: ro.customer_postal_code || ro.billing_customer_postal_code,

      // Financial Info
      cpTotalAmt: ro.cp_total_amt,
      cpRoLaborTotalAmt: ro.cp_ro_labor_total_amt,
      cpRoPartsTotalAmt: ro.cp_ro_parts_total_amt,
      cpTaxAmt: ro.cp_tax_amt,
      cpTotalDiscountAmt: ro.cp_total_discount_amt,
      cpRoLaborCostAmt: ro.cp_ro_labor_cost_amt,
      cpRoPartCostAmt: ro.cp_ro_part_cost_amt,

      // Service Details
      serviceAdvisorId: ro.service_advisor_id,
      jobCount: ro.job_count,
      services: services
    };
  });

  return {
    customerId: tekionDetails.customer,
    repairOrders: repairOrders,
    deals: tekionDetails.deals || []
  };
}

// ============= VINSOLUTIONS FUNCTIONS =============

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

async function getContactsByPhone(phoneNumber) {
  const url = `${VIN_CONFIG.apiBaseUrl}/gateway/v1/contact`;

  try {
    const response = await makeVinRequest(url, { phone: phoneNumber });

    if (response && response.length > 0) {
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

// ============= PROGRESSIVE DATA FETCHING WITH PARALLEL VIN + TEKION =============

async function fetchCustomerDataProgressive(phoneNumber, userExtension, callInfo) {
  const overallStartTime = Date.now();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 PROGRESSIVE DATA FETCH STARTED for: ${phoneNumber}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    // STAGE 2: Fetch Basic Contact Info from BOTH VinSolutions and Tekion in PARALLEL
    const stage2Start = Date.now();
    console.log(`📥 STAGE 2: Fetching basic contact info from VinSolutions AND Tekion in parallel...`);
    
    const [vinContactsResult, tekionCustomerResult] = await Promise.allSettled([
      getContactsByPhone(phoneNumber),
      getTekionCustomerByPhone(phoneNumber)
    ]);

    const contacts = vinContactsResult.status === 'fulfilled' ? vinContactsResult.value : [];
    const tekionCustomer = tekionCustomerResult.status === 'fulfilled' ? tekionCustomerResult.value : null;
    
    const stage2Duration = ((Date.now() - stage2Start) / 1000).toFixed(2);

    const hasVinData = contacts && contacts.length > 0;
    const hasTekionData = tekionCustomer !== null;

    console.log(`✅ STAGE 2 Complete in ${stage2Duration}s:`);
    console.log(`   - VinSolutions: ${hasVinData ? `Found ${contacts.length} contact(s)` : 'No data'}`);
    console.log(`   - Tekion: ${hasTekionData ? `Found customer ${tekionCustomer.customerId}` : 'No data'}`);

    if (!hasVinData && !hasTekionData) {
      console.log(`❌ No data found in either system for: ${phoneNumber}`);
      sendProgressiveUpdate(userExtension, 2, {
        vinContact: null,
        tekionContact: null,
        error: 'No contact found in any system'
      }, callInfo);
      return null;
    }

    // Send Stage 2 data immediately
    sendProgressiveUpdate(userExtension, 2, {
      vinContact: hasVinData ? contacts[0] : null,
      vinContacts: contacts,
      hasMultipleVinContacts: contacts.length > 1,
      tekionContact: tekionCustomer,
      hasVinData: hasVinData,
      hasTekionData: hasTekionData
    }, callInfo);

    // STAGE 3: Fetch Lead Summaries from VinSolutions AND Repair Orders from Tekion in PARALLEL
    const stage3Start = Date.now();
    console.log(`📥 STAGE 3: Fetching lead summaries (Vin) and repair orders (Tekion) in parallel...`);

    const stage3Promises = [];
    
    // VinSolutions lead summaries
    if (hasVinData) {
      const vinLeadsPromise = Promise.all(contacts.map(async (contact) => {
        const leads = await getLeads(contact.contactId);
        return { contact, leads, leadCount: leads.length };
      }));
      stage3Promises.push(vinLeadsPromise);
    } else {
      stage3Promises.push(Promise.resolve([]));
    }

    // Tekion repair orders
    if (hasTekionData && tekionCustomer.customerId) {
      stage3Promises.push(getTekionCustomerDetails(tekionCustomer.customerId));
    } else {
      stage3Promises.push(Promise.resolve(null));
    }

    const [contactsWithLeads, tekionDetails] = await Promise.all(stage3Promises);
    const stage3Duration = ((Date.now() - stage3Start) / 1000).toFixed(2);

    console.log(`✅ STAGE 3 Complete in ${stage3Duration}s`);

    // Process Tekion data
    const tekionData = processTekionData(tekionDetails);

    // Send Stage 3 data
    const primaryContactLeads = hasVinData && contactsWithLeads.length > 0 ? contactsWithLeads[0] : null;
    sendProgressiveUpdate(userExtension, 3, {
      vinContact: hasVinData ? contacts[0] : null,
      vinContacts: contacts,
      hasMultipleVinContacts: contacts.length > 1,
      vinLeads: primaryContactLeads?.leads || [],
      vinLeadCount: primaryContactLeads?.leadCount || 0,
      allVinContactsLeadSummary: contactsWithLeads.map(c => ({
        contactId: c.contact.contactId,
        fullName: c.contact.fullName,
        leadCount: c.leadCount
      })),
      tekionContact: tekionCustomer,
      tekionRepairOrdersCount: tekionData?.repairOrders?.length || 0,
      tekionDealsCount: tekionData?.deals?.length || 0,
      hasVinData: hasVinData,
      hasTekionData: hasTekionData
    }, callInfo);

    // STAGE 4: Fetch Detailed Lead Data from VinSolutions (vehicles, sales rep)
    // Tekion data is already complete from Stage 3
    const stage4Start = Date.now();
    console.log(`📥 STAGE 4: Fetching detailed VinSolutions lead data...`);

    let allContactsDetailedData = [];
    
    if (hasVinData && contactsWithLeads.length > 0) {
      allContactsDetailedData = await Promise.all(
        contactsWithLeads.map(async ({ contact, leads }) => {
          let allLeadsData = [];
          let primarySalesRepInfo = null;

          if (leads.length > 0) {
            allLeadsData = await processLeadsInParallel(leads);

            for (const leadData of allLeadsData) {
              if (leadData.salesRepInfo) {
                primarySalesRepInfo = leadData.salesRepInfo;
                break;
              }
            }
          }

          const salesAssignment = await getUserById(VIN_CONFIG.userId);

          const isVehicleComplete = (vehicle) => {
            return vehicle.make !== null && vehicle.model !== null &&
              vehicle.make !== '' && vehicle.model !== '';
          };

          const processedLeadsData = allLeadsData.map(lead => {
            const vehiclesOfInterest = lead.vehiclesOfInterest || [];
            const tradeVehicles = lead.tradeVehicles || [];

            const validVOI = vehiclesOfInterest.filter(isVehicleComplete);
            const incompleteVOI = vehiclesOfInterest.filter(v => !isVehicleComplete(v));

            const validTrade = tradeVehicles.filter(isVehicleComplete);
            const incompleteTrade = tradeVehicles.filter(v => !isVehicleComplete(v));

            return {
              ...lead,
              vehiclesOfInterest: validVOI,
              incompleteVehiclesOfInterest: incompleteVOI,
              tradeVehicles: validTrade,
              incompleteTradeVehicles: incompleteTrade
            };
          });

          const allValidVOI = processedLeadsData.flatMap(lead => lead.vehiclesOfInterest || []);
          const allIncompleteVOI = processedLeadsData.flatMap(lead => lead.incompleteVehiclesOfInterest || []);
          const allValidTrade = processedLeadsData.flatMap(lead => lead.tradeVehicles || []);
          const allIncompleteTrade = processedLeadsData.flatMap(lead => lead.incompleteTradeVehicles || []);

          return {
            contact,
            leads,
            allLeadsData: processedLeadsData,
            vehiclesOfInterest: allValidVOI,
            incompleteVehiclesOfInterest: allIncompleteVOI,
            tradeVehicles: allValidTrade,
            incompleteTradeVehicles: allIncompleteTrade,
            salesAssignment,
            salesRepInfo: primarySalesRepInfo,
            leadSource: processedLeadsData[0]?.leadSource || null
          };
        })
      );
    }

    const stage4Duration = ((Date.now() - stage4Start) / 1000).toFixed(2);
    console.log(`✅ STAGE 4 Complete: Detailed lead data in ${stage4Duration}s`);

    // Build final complete data structure
    const completeData = {
      // VinSolutions Data
      vinSolutions: hasVinData ? {
        contact: contacts[0],
        leads: allContactsDetailedData[0]?.leads || [],
        allLeadsData: allContactsDetailedData[0]?.allLeadsData || [],
        vehiclesOfInterest: allContactsDetailedData[0]?.vehiclesOfInterest || [],
        incompleteVehiclesOfInterest: allContactsDetailedData[0]?.incompleteVehiclesOfInterest || [],
        tradeVehicles: allContactsDetailedData[0]?.tradeVehicles || [],
        incompleteTradeVehicles: allContactsDetailedData[0]?.incompleteTradeVehicles || [],
        salesAssignment: allContactsDetailedData[0]?.salesAssignment,
        salesRepInfo: allContactsDetailedData[0]?.salesRepInfo,
        leadSource: allContactsDetailedData[0]?.leadSource,
        contacts,
        allContactsData: allContactsDetailedData,
        hasMultipleContacts: contacts.length > 1
      } : null,

      // Tekion Data
      tekion: hasTekionData ? {
        customer: tekionCustomer,
        ...tekionData
      } : null,

      // Metadata
      hasVinData: hasVinData,
      hasTekionData: hasTekionData,
      phoneNumber: phoneNumber
    };

    // Send Stage 4 (Complete) data
    sendProgressiveUpdate(userExtension, 4, completeData, callInfo);

    // ALSO send in legacy format for backward compatibility
    const legacyNotification = {
      type: 'call_notification',
      data: {
        ...callInfo,
        customerData: completeData
      }
    };
    broadcastToUser(userExtension, legacyNotification);
    console.log(`📤 Legacy format sent to ${userExtension}`);

    // Cache the complete data
    setCachedCustomerData(phoneNumber, completeData);

    // Save to MongoDB
    const callId = callInfo.callId;
    if (!savedCalls.has(callId)) {
      try {
        savedCalls.set(callId, Date.now());
        const uniqueId = `${callInfo.callId}-${Date.now()}`;
        await saveCallData({
          _id: uniqueId,
          userExtension: userExtension,
          callId: callInfo.callId,
          callerName: callInfo.callerName,
          callerNumber: callInfo.callerNumber,
          extension: callInfo.extension,
          status: callInfo.status,
          timestamp: callInfo.timestamp,
          customerData: completeData,
          phoneNumber: phoneNumber
        });
        console.log('💾 Call data saved to database');
      } catch (dbError) {
        console.error('❌ Failed to save call data:', dbError);
      }
    } else {
      console.log(`⏭️ Skipping DB save - call ${callId} already saved`);
    }

    const totalDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ PROGRESSIVE FETCH COMPLETE in ${totalDuration}s`);
    console.log(`   Stage 2 (Contact - Both):    ${stage2Duration}s`);
    console.log(`   Stage 3 (Summary - Both):    ${stage3Duration}s`);
    console.log(`   Stage 4 (Complete Data):     ${stage4Duration}s`);
    console.log(`${'='.repeat(70)}\n`);

    return completeData;

  } catch (error) {
    const duration = ((Date.now() - overallStartTime) / 1000).toFixed(2);
    console.error(`❌ Error in progressive fetch (${duration}s):`, error.message);
    return null;
  }
}

// ============= 3CX FUNCTIONS =============

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

// ============= API ENDPOINTS FOR CALL HISTORY =============

app.get('/api/call-history/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const calls = await getCallHistory(username, limit, skip);

    res.json({
      success: true,
      count: calls.length,
      calls: calls
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call history',
      error: error.message
    });
  }
});

app.get('/api/call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const call = await getCallById(callId);

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    res.json({
      success: true,
      call: call
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch call',
      error: error.message
    });
  }
});

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
    tokenExpiryTime = Date.now() + (response.data.expires_in * 1000) - TOKEN_REFRESH_BUFFER;

    console.log(`✅ 3CX token obtained (expires in ${response.data.expires_in}s)`);
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

async function getParticipantDetails(entity, retryCount = 0) {
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
    if ((error.response?.status === 401 || error.response?.status === 403) && retryCount === 0) {
      console.log('🔄 Token issue, refreshing and retrying...');
      await getAccessToken();
      return getParticipantDetails(entity, retryCount + 1);
    }
    console.error('❌ Error getting participant details:', error.message);
    return null;
  }
}

let pbxPingInterval = null;

async function connectTo3CXWebSocket() {
  if (isConnectingToPBX) {
    console.log('⏳ Already connecting to 3CX...');
    return;
  }

  isConnectingToPBX = true;

  try {
    const token = await ensureValidToken();

    if (pbxWebSocket) {
      pbxWebSocket.removeAllListeners();
      pbxWebSocket.close();
      pbxWebSocket = null;
    }

    if (pbxPingInterval) {
      clearInterval(pbxPingInterval);
      pbxPingInterval = null;
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
      pbxReconnectAttempts = 0;
      isConnectingToPBX = false;

      pbxPingInterval = setInterval(() => {
        if (pbxWebSocket && pbxWebSocket.readyState === WebSocket.OPEN) {
          pbxWebSocket.ping();
        }
      }, PBX_PING_INTERVAL);
    });

    pbxWebSocket.on('pong', () => {
      // Connection is alive
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
              const entityUserExtension = entityParts[2];
              
              if (message.event.event_type === 1) {
                console.log(`\n${'='.repeat(70)}`);
                console.log(`📞 CALL END EVENT DETECTED`);
                console.log(`   Entity: ${entity}`);
                console.log(`   User Extension from entity: ${entityUserExtension}`);
                console.log(`${'='.repeat(70)}\n`);
                
                let callIdToEnd = null;
                let participantDetails = null;
                
                try {
                  participantDetails = await getParticipantDetails(entity);
                  if (participantDetails) {
                    callIdToEnd = participantDetails.callid;
                    console.log(`✅ Got call ID from participant details: ${callIdToEnd}`);
                  }
                } catch (error) {
                  console.log(`⚠️ Could not get participant details: ${error.message}`);
                }
                
                let timerFound = false;
                
                if (callIdToEnd && activeCallTimers.has(String(callIdToEnd))) {
                  const timerInfo = activeCallTimers.get(String(callIdToEnd));
                  const timeSinceStart = Date.now() - timerInfo.startTime;
                  
                  if (timerInfo.expectingImmediateEnd && timerInfo.userExtension === entityUserExtension) {
                    console.log(`⏭️ Ignoring expected immediate event_type:1 for user ${entityUserExtension}`);
                    timerInfo.expectingImmediateEnd = false;
                    activeCallTimers.set(String(callIdToEnd), timerInfo);
                    timerFound = true;
                  } else if (!timerInfo.expectingImmediateEnd && (timerInfo.userExtension === entityUserExtension || entityUserExtension === '10001')) {
                    console.log(`✅ Ending timer for call ${callIdToEnd} after ${timeSinceStart}ms`);
                    endCallTimer(String(callIdToEnd), timerInfo.userExtension);
                    
                    broadcastToUser(timerInfo.userExtension, {
                      type: 'call_ended',
                      timestamp: new Date().toISOString(),
                      userExtension: timerInfo.userExtension,
                      entity: entity,
                      callId: String(callIdToEnd)
                    });
                    
                    timerFound = true;
                  }
                }
                
                if (!timerFound) {
                  const targetExtensions = new Set();
                  connectedClients.forEach((clientInfo) => {
                    if (clientInfo.authenticated && clientInfo.username) {
                      targetExtensions.add(clientInfo.username);
                    }
                  });
                  
                  for (const [callId, timerInfo] of activeCallTimers.entries()) {
                    if ((timerInfo.userExtension === entityUserExtension) || 
                        (entityUserExtension === '10001' && targetExtensions.has(timerInfo.userExtension))) {
                      
                      const timeSinceStart = Date.now() - timerInfo.startTime;
                      
                      if (timerInfo.expectingImmediateEnd && timerInfo.userExtension === entityUserExtension) {
                        console.log(`⏭️ Ignoring expected immediate event_type:1 for call ${callId}`);
                        timerInfo.expectingImmediateEnd = false;
                        activeCallTimers.set(callId, timerInfo);
                        timerFound = true;
                        break;
                      } else if (!timerInfo.expectingImmediateEnd || timerInfo.userExtension !== entityUserExtension) {
                        if (timerInfo.userExtension === entityUserExtension || 
                            (entityUserExtension === '10001' && !timerInfo.expectingImmediateEnd)) {
                          console.log(`✅ Ending timer for call ${callId} after ${timeSinceStart}ms`);
                          endCallTimer(callId, timerInfo.userExtension);
                          
                          broadcastToUser(timerInfo.userExtension, {
                            type: 'call_ended',
                            timestamp: new Date().toISOString(),
                            userExtension: timerInfo.userExtension,
                            entity: entity,
                            callId: callId
                          });
                          
                          timerFound = true;
                          break;
                        }
                      }
                    }
                  }
                }
                
                if (!timerFound) {
                  const targetExtensions = new Set();
                  connectedClients.forEach((clientInfo) => {
                    if (clientInfo.authenticated && clientInfo.username) {
                      targetExtensions.add(clientInfo.username);
                    }
                  });
                  
                  if (targetExtensions.has(entityUserExtension)) {
                    broadcastToUser(entityUserExtension, {
                      type: 'call_ended',
                      timestamp: new Date().toISOString(),
                      userExtension: entityUserExtension,
                      entity: entity,
                      callId: callIdToEnd || 'unknown'
                    });
                  }
                }
                
                return;
              }
              
              const participantDetails = await getParticipantDetails(entity);
              
              if (!participantDetails) {
                console.log(`⚠️ Could not get participant details for entity: ${entity}`);
                return;
              }

              const callId = String(participantDetails.callid);
              
              if (participantDetails.status === "Connected") {
                const targetExtensions = new Set();
                connectedClients.forEach((clientInfo) => {
                  if (clientInfo.authenticated && clientInfo.username) {
                    targetExtensions.add(clientInfo.username);
                  }
                });
                
                let shouldStartTimer = false;
                let timerUserExtension = null;

                if (targetExtensions.has(entityUserExtension)) {
                  shouldStartTimer = true;
                  timerUserExtension = entityUserExtension;
                } else if (participantDetails.party_dn && targetExtensions.has(participantDetails.party_dn)) {
                  shouldStartTimer = true;
                  timerUserExtension = participantDetails.party_dn;
                }

                if (shouldStartTimer && timerUserExtension) {
                  if (activeCallTimers.has(callId)) {
                    return;
                  }

                  const startTime = Date.now();
                  activeCallTimers.set(callId, {
                    startTime: startTime,
                    userExtension: timerUserExtension,
                    status: 'active',
                    expectingImmediateEnd: true,
                    startedFromEntity: entityUserExtension
                  });

                  console.log(`⏱️ CALL TIMER STARTED - Call ID: ${callId}, User: ${timerUserExtension}`);
                  
                  broadcastToUser(timerUserExtension, {
                    type: 'call_timer_started',
                    callId: callId,
                    startTime: startTime,
                    timestamp: new Date().toISOString()
                  });
                }
              }
              
              if (message.event.event_type === 0 && participantDetails.status === "Ringing") {
                const callKey = `${entityUserExtension}-${callId}`;
                
                if (processedCalls.has(callKey)) {
                  console.log(`⏭️ Skipping duplicate call ${callId} for extension ${entityUserExtension}`);
                  return;
                }
                
                processedCalls.set(callKey, Date.now());
                
                const callReceiveTime = Date.now();
                console.log(`\n${'='.repeat(70)}`);
                console.log(`📞 INCOMING CALL DETECTED`);
                console.log(`${'='.repeat(70)}`);
                console.log(`👤 Extension: ${entityUserExtension}`);
                console.log(`📞 Call ID: ${callId}`);
                console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
                
                const pbxFetchTime = Date.now();
                const pbxDuration = ((pbxFetchTime - callReceiveTime) / 1000).toFixed(3);
                
                const callerNumber = participantDetails.party_caller_id;
                
                console.log(`\n📋 3CX CALL DETAILS RECEIVED (${pbxDuration}s):`);
                console.log(`   Caller Name: ${participantDetails.party_caller_name}`);
                console.log(`   Caller Number: ${callerNumber}`);
                console.log(`   Status: ${participantDetails.status}`);
                
                let vinPhoneNumber;
                if (PRODUCTION_MODE) {
                  vinPhoneNumber = extractPhoneDigits(callerNumber);
                  console.log(`✅ PRODUCTION MODE: Using actual number: ${vinPhoneNumber}`);
                } else {
                  vinPhoneNumber = TEST_PHONE_NUMBER;
                  console.log(`🧪 TESTING MODE: Using test number: ${vinPhoneNumber}`);
                }
                
                const callInfo = {
                  callerName: participantDetails.party_caller_name,
                  callerNumber: participantDetails.party_caller_id,
                  extension: participantDetails.dn,
                  status: participantDetails.status,
                  partyDnType: participantDetails.party_dn_type,
                  callId: callId,
                  timestamp: new Date().toISOString(),
                  userExtension: entityUserExtension
                };
                
                console.log(`\n📤 STAGE 1: Sending immediate phone number...`);
                sendProgressiveUpdate(entityUserExtension, 1, {
                  phoneNumber: vinPhoneNumber
                }, callInfo);
                
                const cachedData = getCachedCustomerData(vinPhoneNumber);
                
                if (cachedData) {
                  console.log(`🎯 Using cached data - sending as complete`);
                  sendProgressiveUpdate(entityUserExtension, 4, cachedData, callInfo);
                  
                  const legacyNotification = {
                    type: 'call_notification',
                    data: {
                      ...callInfo,
                      customerData: cachedData
                    }
                  };
                  broadcastToUser(entityUserExtension, legacyNotification);
                  
                  if (!savedCalls.has(callId)) {
                    try {
                      savedCalls.set(callId, Date.now());
                      const uniqueId = `${callId}-${Date.now()}`;
                      await saveCallData({
                        _id: uniqueId,
                        userExtension: entityUserExtension,
                        callId: callInfo.callId,
                        callerName: callInfo.callerName,
                        callerNumber: callInfo.callerNumber,
                        extension: callInfo.extension,
                        status: callInfo.status,
                        timestamp: callInfo.timestamp,
                        customerData: cachedData,
                        phoneNumber: vinPhoneNumber,
                        fromCache: true
                      });
                      console.log('💾 Cached call data saved to database');
                    } catch (dbError) {
                      console.error('❌ Failed to save cached call data:', dbError);
                    }
                  }
                } else {
                  console.log(`🔄 Starting progressive data fetch...`);
                  await fetchCustomerDataProgressive(vinPhoneNumber, entityUserExtension, callInfo);
                }
                
                const totalCallHandlingTime = ((Date.now() - callReceiveTime) / 1000).toFixed(2);
                console.log(`\n⏱️ Total call handling time: ${totalCallHandlingTime}s`);
                console.log(`${'='.repeat(70)}\n`);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error processing message:', error.message);
      }
    });

    pbxWebSocket.on('error', (error) => {
      console.error('❌ 3CX WebSocket error:', error.message);
      isConnectingToPBX = false;
    });

    pbxWebSocket.on('close', (code, reason) => {
      console.log(`❌ 3CX WebSocket closed (${code}: ${reason}). Reconnecting...`);
      isConnectingToPBX = false;

      if (pbxPingInterval) {
        clearInterval(pbxPingInterval);
        pbxPingInterval = null;
      }

      const delay = Math.min(PBX_RECONNECT_BASE_DELAY * Math.pow(1.5, pbxReconnectAttempts), PBX_RECONNECT_MAX_DELAY);
      pbxReconnectAttempts++;

      console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${pbxReconnectAttempts})...`);

      setTimeout(() => {
        connectTo3CXWebSocket();
      }, delay);
    });

  } catch (error) {
    console.error('❌ Error connecting to 3CX:', error.message);
    isConnectingToPBX = false;

    const delay = Math.min(PBX_RECONNECT_BASE_DELAY * Math.pow(1.5, pbxReconnectAttempts), PBX_RECONNECT_MAX_DELAY);
    pbxReconnectAttempts++;

    setTimeout(() => {
      connectTo3CXWebSocket();
    }, delay);
  }
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

// ============= WEBSOCKET WITH HEARTBEAT =============

function heartbeat() {
  this.isAlive = true;
}

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
  if (pbxPingInterval) clearInterval(pbxPingInterval);
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
});

app.get('/health', (req, res) => {
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

  res.json({
    status: 'ok',
    pbxConnected: pbxWebSocket && pbxWebSocket.readyState === WebSocket.OPEN,
    connectedClients: connectedClients.size,
    clientStats: clientStats,
    latestSequence: latestSequence,
    tokenValid: accessToken && Date.now() < tokenExpiryTime,
    uptime: process.uptime(),
    pbxReconnectAttempts: pbxReconnectAttempts,
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
  console.log(`🚀 3CX + VinSolutions + Tekion Integration Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Server running on port ${PORT}`);

  if (PRODUCTION_MODE) {
    console.log(`✅ MODE: PRODUCTION (using real phone numbers)`);
  } else {
    console.log(`🧪 MODE: TESTING (using test number: ${TEST_PHONE_NUMBER})`);
  }

  console.log(`\n📊 CACHE CONFIGURATION:`);
  console.log(`   - Customer Data Cache: ${CUSTOMER_DATA_CACHE_DURATION / 1000 / 60} minutes`);
  console.log(`   - Hot Cache (Pre-fetch): ${HOT_CACHE_DURATION / 1000} seconds`);
  console.log(`\n📡 PROGRESSIVE LOADING: Enabled (4 stages)`);
  console.log(`\n⏱️ CALL TIMER: Based on 'Connected' status`);
  console.log(`\n🔄 TOKEN REFRESH: Every ${TOKEN_REFRESH_INTERVAL / 1000} seconds`);
  console.log(`\n🔗 DATA SOURCES: VinSolutions + Tekion (Parallel)`);

  console.log(`${'='.repeat(60)}\n`);

  try {
    await getAccessToken();
    startTokenRefreshInterval();
    await getVinToken();
    await connectDB();
    await connectTo3CXWebSocket();
    console.log('✅ All services initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  clearInterval(heartbeatInterval);
  if (pbxPingInterval) clearInterval(pbxPingInterval);
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
  if (pbxPingInterval) clearInterval(pbxPingInterval);
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
  await closeDB();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };