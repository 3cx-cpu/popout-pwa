// backend/services/pbx.service.js

const axiosInstance = require('../config/axios.config');
const { TOKEN_URL, PBX_BASE_URL, TOKEN_REFRESH_BUFFER, PBX_CLIENT_ID, PBX_CLIENT_SECRET } = require('../config/constants');

let accessToken = null;
let tokenExpiryTime = null;

async function getAccessToken() {
  try {
    const params = new URLSearchParams();
    params.append('client_id', PBX_CLIENT_ID);
    params.append('client_secret', PBX_CLIENT_SECRET);
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

function getTokenExpiryTime() {
  return tokenExpiryTime;
}

function isTokenValid() {
  return accessToken && Date.now() < tokenExpiryTime;
}

module.exports = {
  getAccessToken,
  ensureValidToken,
  getParticipantDetails,
  getTokenExpiryTime,
  isTokenValid
};