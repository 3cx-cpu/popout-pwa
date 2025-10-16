// backend/config/constants.js

const PBX_BASE_URL = 'https://pbx.bozarthconnect.com';
const TOKEN_URL = `${PBX_BASE_URL}/connect/token`;
const WS_URL = 'wss://pbx.bozarthconnect.com/callcontrol/ws';
const LOGIN_URL = 'https://pbx.bozarthconnect.com/webclient/api/Login/GetAccessToken';

// ============= TESTING CONFIGURATION =============
const PRODUCTION_MODE = false; // Set to false for testing

// Array of test phone numbers - will be used sequentially for concurrent calls
const TEST_PHONE_NUMBERS = [
  '3037517500',  // First call will use this
  '3037517501',  // Second concurrent call will use this
  '3037517502',  // Third concurrent call will use this
  '3037517503',  // Fourth concurrent call will use this
  '3037517504'   // Fifth concurrent call will use this
];

// Fallback single number (for backward compatibility)
const TEST_PHONE_NUMBER = TEST_PHONE_NUMBERS[0];
// ================================================

// ============= CACHE CONFIGURATION =============
const CUSTOMER_DATA_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const HOT_CACHE_DURATION = 60 * 1000; // 60 seconds for pre-fetched data
const CALL_CACHE_DURATION = 60000; // 1 minute
// ==============================================

// ============= TOKEN REFRESH CONFIGURATION =============
const TOKEN_REFRESH_INTERVAL = 50000; // Refresh token every 50 seconds (before 60s expiry)
const TOKEN_REFRESH_BUFFER = 10000; // 10 second buffer before expiry
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

// HEARTBEAT CONFIGURATION
const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 60000;
const PBX_PING_INTERVAL = 25000;
const PBX_RECONNECT_MAX_DELAY = 30000;
const PBX_RECONNECT_BASE_DELAY = 1000;

// 3CX Credentials
const PBX_CLIENT_ID = 'vintest';
const PBX_CLIENT_SECRET = 'K9j6HptuDKQNRRS7y3VhUexjODEUKKRt';

module.exports = {
  PBX_BASE_URL,
  TOKEN_URL,
  WS_URL,
  LOGIN_URL,
  PRODUCTION_MODE,
  TEST_PHONE_NUMBER,
  TEST_PHONE_NUMBERS,
  CUSTOMER_DATA_CACHE_DURATION,
  HOT_CACHE_DURATION,
  CALL_CACHE_DURATION,
  TOKEN_REFRESH_INTERVAL,
  TOKEN_REFRESH_BUFFER,
  VIN_CONFIG,
  HEARTBEAT_INTERVAL,
  CLIENT_TIMEOUT,
  PBX_PING_INTERVAL,
  PBX_RECONNECT_MAX_DELAY,
  PBX_RECONNECT_BASE_DELAY,
  PBX_CLIENT_ID,
  PBX_CLIENT_SECRET
};