// backend/utils/callGroupManager.js

const CONCURRENT_WINDOW = 5000; // 5 seconds window for concurrent calls
const callGroups = new Map(); // extension -> array of concurrent calls

function getCallGroup(extension) {
  if (!callGroups.has(extension)) {
    callGroups.set(extension, []);
  }
  return callGroups.get(extension);
}

function addToCallGroup(extension, callInfo) {
  const group = getCallGroup(extension);
  const now = Date.now();
  
  // Clean up old calls outside the window
  const activeGroup = group.filter(call => 
    (now - call.timestamp) < CONCURRENT_WINDOW
  );
  
  // Add new call with enhanced info
  activeGroup.push({
    ...callInfo,
    timestamp: now,
    groupIndex: activeGroup.length // Track position in group
  });
  
  callGroups.set(extension, activeGroup);
  
  console.log(`📊 Call Group Updated for ${extension}:`, {
    totalCalls: activeGroup.length,
    calls: activeGroup.map(c => ({ 
      callId: c.callId, 
      phone: c.phoneNumber,
      groupIndex: c.groupIndex 
    }))
  });
  
  // Log test mode info if applicable
  const { PRODUCTION_MODE } = require('../config/constants');
  if (!PRODUCTION_MODE) {
    console.log(`🧪 Test Mode - Numbers assigned:`, 
      activeGroup.map(c => `Call ${c.callId}: ${c.phoneNumber}`)
    );
  }
  
  return activeGroup;
}

function getConcurrentCalls(extension) {
  const group = getCallGroup(extension);
  const now = Date.now();
  
  return group.filter(call => 
    (now - call.timestamp) < CONCURRENT_WINDOW
  );
}

function clearCallFromGroup(extension, callId) {
  const group = getCallGroup(extension);
  const updated = group.filter(call => call.callId !== callId);
  callGroups.set(extension, updated);
  
  console.log(`🗑️ Removed call ${callId} from group for ${extension}`);
}

module.exports = {
  addToCallGroup,
  getConcurrentCalls,
  clearCallFromGroup,
  CONCURRENT_WINDOW
};