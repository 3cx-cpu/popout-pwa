// backend/services/cache.service.js

const { CUSTOMER_DATA_CACHE_DURATION, HOT_CACHE_DURATION, CALL_CACHE_DURATION } = require('../config/constants');

const customerDataCache = new Map();
const hotCache = new Map();
const processedCalls = new Map();
const savedCalls = new Map();

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

function getProcessedCalls() {
  return processedCalls;
}

function getSavedCalls() {
  return savedCalls;
}

// Initialize cleanup interval
setInterval(cleanupOldCaches, 30000);

module.exports = {
  getCacheStats,
  cleanupOldCaches,
  getCachedCustomerData,
  setCachedCustomerData,
  getProcessedCalls,
  getSavedCalls
};