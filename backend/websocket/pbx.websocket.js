// backend/websocket/pbx.websocket.js

const WebSocket = require('ws');
const { 
  WS_URL, 
  PBX_PING_INTERVAL, 
  PBX_RECONNECT_BASE_DELAY, 
  PBX_RECONNECT_MAX_DELAY, 
  PRODUCTION_MODE, 
  TEST_PHONE_NUMBER,
  TEST_PHONE_NUMBERS  // Add this import
} = require('../config/constants');
const { ensureValidToken, getParticipantDetails } = require('../services/pbx.service');
const { extractPhoneDigits } = require('../utils/helpers');
const { getCachedCustomerData, setCachedCustomerData, getProcessedCalls, getSavedCalls } = require('../services/cache.service');
const { fetchCustomerDataProgressive } = require('../services/vinsolutions.service');
const { fetchTekionDataProgressive } = require('../services/tekion.service');
const { saveCallData } = require('../database/database');
const { getActiveCallTimers } = require('../utils/callTimer');
const { addToCallGroup, getConcurrentCalls, clearCallFromGroup } = require('../utils/callGroupManager');

let pbxWebSocket = null;
let latestSequence = 0;
let pbxReconnectAttempts = 0;
let isConnectingToPBX = false;
let pbxPingInterval = null;

// Track test number assignment for concurrent calls
const testNumberAssignments = new Map(); // callId -> assigned test number

// Function to get next available test number
function getTestPhoneNumber(callId, entityUserExtension) {
  // Check if this extension already has concurrent calls
  const concurrentCalls = getConcurrentCalls(entityUserExtension);
  
  // If this call already has an assigned number, return it
  if (testNumberAssignments.has(callId)) {
    return testNumberAssignments.get(callId);
  }
  
  // Count how many test numbers are already assigned to this extension
  let assignedCount = 0;
  concurrentCalls.forEach(call => {
    if (testNumberAssignments.has(call.callId)) {
      assignedCount++;
    }
  });
  
  // Use the next number in the array based on assigned count
  const numberIndex = assignedCount % TEST_PHONE_NUMBERS.length;
  const assignedNumber = TEST_PHONE_NUMBERS[numberIndex] || TEST_PHONE_NUMBER;
  
  // Store the assignment
  testNumberAssignments.set(callId, assignedNumber);
  
  console.log(`🧪 TEST MODE: Assigned number ${assignedNumber} to call ${callId} (index: ${numberIndex})`);
  console.log(`🧪 Current assignments for ${entityUserExtension}: ${assignedCount + 1} numbers`);
  
  return assignedNumber;
}

// Function to clear test number assignment when call ends
function clearTestNumberAssignment(callId) {
  if (testNumberAssignments.has(callId)) {
    const number = testNumberAssignments.get(callId);
    testNumberAssignments.delete(callId);
    console.log(`🧹 Cleared test number assignment for call ${callId} (was: ${number})`);
  }
}

function sendProgressiveUpdate(userExtension, stage, data, callInfo, broadcastFunction, multiCallInfo = null) {
  const message = {
    type: 'progressive_update',
    stage: stage,
    data: data,
    callInfo: callInfo,
    timestamp: new Date().toISOString()
  };

  // Add multi-call information if present
  if (multiCallInfo) {
    message.multiCall = multiCallInfo;
  }

  broadcastFunction(userExtension, message);
  console.log(`📤 STAGE ${stage} sent to ${userExtension}${multiCallInfo ? ' [MULTI-CALL]' : ''}`);
}

// Function for processing concurrent calls
async function processConcurrentCalls(extension, broadcastFunction) {
  const concurrentCalls = getConcurrentCalls(extension);
  
  if (concurrentCalls.length <= 1) {
    return; // Not a multi-call scenario
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎯 PROCESSING ${concurrentCalls.length} CONCURRENT CALLS for extension ${extension}`);
  console.log(`${'='.repeat(70)}\n`);

  // Fetch data for all concurrent calls in parallel
  const allCallsPromises = concurrentCalls.map(async (call) => {
    // Check cache first
    const cachedData = getCachedCustomerData(call.phoneNumber);
    if (cachedData) {
      console.log(`📦 Using cached data for ${call.phoneNumber}`);
      return {
        callId: call.callId,
        phoneNumber: call.phoneNumber,
        data: cachedData,
        fromCache: true
      };
    }

    // Fetch fresh data
    try {
      console.log(`🔄 Fetching fresh data for ${call.phoneNumber}`);
      
      // Create a wrapper to capture progressive updates
      let capturedData = null;
      const captureUpdate = (ext, stage, data, info) => {
        if (stage === 4) { // Complete data
          capturedData = data;
        }
      };

      const [vinData, tekionData] = await Promise.allSettled([
        fetchCustomerDataProgressive(
          call.phoneNumber,
          extension,
          call,
          captureUpdate,
          setCachedCustomerData,
          getSavedCalls,
          saveCallData,
          broadcastFunction
        ),
        fetchTekionDataProgressive(call.phoneNumber, (stage, data) => {
          if (stage === 'tekion_complete') {
            // Attach to captured data
            if (capturedData) {
              capturedData.tekionData = data;
            }
          }
        })
      ]);

      return {
        callId: call.callId,
        phoneNumber: call.phoneNumber,
        data: capturedData,
        fromCache: false
      };
    } catch (error) {
      console.error(`❌ Error fetching data for ${call.phoneNumber}:`, error);
      return {
        callId: call.callId,
        phoneNumber: call.phoneNumber,
        data: null,
        error: error.message
      };
    }
  });

  const allCallsData = await Promise.all(allCallsPromises);
  
  console.log(`✅ Fetched data for ${allCallsData.length} concurrent calls`);
  
  // Send consolidated update for all concurrent calls
  allCallsData.forEach((callData, index) => {
    const multiCallInfo = {
      isMultiCall: true,
      totalCalls: allCallsData.length,
      callIndex: index,
      allCalls: allCallsData.map(c => ({
        callId: c.callId,
        phoneNumber: c.phoneNumber,
        hasData: !!c.data
      })),
      otherCallsData: allCallsData
        .filter((_, i) => i !== index)
        .map(c => ({
          callId: c.callId,
          phoneNumber: c.phoneNumber,
          data: c.data,
          stage: 4
        }))
    };

    // Find the original call info for this specific call
    const originalCall = concurrentCalls.find(c => c.callId === callData.callId);
    
    if (callData.data) {
      broadcastFunction(extension, {
        type: 'multi_call_update',
        stage: 4,
        data: callData.data,
        callInfo: originalCall,
        multiCall: multiCallInfo,
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log(`📤 Sent multi-call updates for ${allCallsData.length} calls to extension ${extension}`);
}

async function connectTo3CXWebSocket(broadcastFunction, connectedClients, startCallTimer, endCallTimer) {
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
              
              // ============= HANDLE EVENT TYPE 1 (CALL END) FIRST =============
              if (message.event.event_type === 1) {
                console.log(`\n${'='.repeat(70)}`);
                console.log(`📞 CALL END EVENT DETECTED`);
                console.log(`   Entity: ${entity}`);
                console.log(`   User Extension from entity: ${entityUserExtension}`);
                console.log(`${'='.repeat(70)}\n`);
                
                // Try to get participant details to find the correct callId
                let callIdToEnd = null;
                let participantDetails = null;
                
                try {
                  participantDetails = await getParticipantDetails(entity);
                  if (participantDetails) {
                    callIdToEnd = participantDetails.callid;
                    console.log(`✅ Got call ID from participant details: ${callIdToEnd}`);
                    
                    // Clear from call group
                    clearCallFromGroup(entityUserExtension, String(callIdToEnd));
                    
                    // Clear test number assignment
                    if (!PRODUCTION_MODE) {
                      clearTestNumberAssignment(String(callIdToEnd));
                    }
                  }
                } catch (error) {
                  console.log(`⚠️ Could not get participant details: ${error.message}`);
                }
                
                // Look for the timer to end
                let timerFound = false;
                const activeCallTimers = getActiveCallTimers();
                
                // If we have a specific callId, try to find that timer first
                if (callIdToEnd && activeCallTimers.has(String(callIdToEnd))) {
                  const timerInfo = activeCallTimers.get(String(callIdToEnd));
                  console.log(`🔍 Found timer for callId ${callIdToEnd}, user ${timerInfo.userExtension}`);
                  console.log(`📊 Timer details: expectingImmediateEnd=${timerInfo.expectingImmediateEnd}, userExtension=${timerInfo.userExtension}, entityUserExtension=${entityUserExtension}`);
                  
                  // Check if this is the immediate end event we're expecting
                  const timeSinceStart = Date.now() - timerInfo.startTime;
                  
                  // Only ignore if this is for the SAME user extension that started the timer
                  if (timerInfo.expectingImmediateEnd && timerInfo.userExtension === entityUserExtension) {
                    console.log(`⏭️ Ignoring expected immediate event_type:1 for user ${entityUserExtension} - ${timeSinceStart}ms since call connected`);
                    console.log(`📌 This is the automatic end event that comes after connection - ignoring`);
                    timerInfo.expectingImmediateEnd = false; // Clear the flag
                    activeCallTimers.set(String(callIdToEnd), timerInfo);
                    timerFound = true;
                  } else if (!timerInfo.expectingImmediateEnd && (timerInfo.userExtension === entityUserExtension || entityUserExtension === '10001')) {
                    // This is a real end event - only end if flag has been cleared
                    console.log(`✅ Ending timer for call ${callIdToEnd} after ${timeSinceStart}ms (real call end)`);
                    endCallTimer(String(callIdToEnd), timerInfo.userExtension, broadcastFunction);
                    
                    // Send call end notification
                    broadcastFunction(timerInfo.userExtension, {
                      type: 'call_ended',
                      timestamp: new Date().toISOString(),
                      userExtension: timerInfo.userExtension,
                      entity: entity,
                      callId: String(callIdToEnd)
                    });
                    
                    timerFound = true;
                  } else {
                    console.log(`⏭️ Skipping end event - conditions not met for ending timer`);
                  }
                }
                
                // If we couldn't find by specific callId, search all timers
                if (!timerFound) {
                  // Get all currently connected user extensions
                  const targetExtensions = new Set();
                  connectedClients.forEach((clientInfo) => {
                    if (clientInfo.authenticated && clientInfo.username) {
                      targetExtensions.add(clientInfo.username);
                    }
                  });
                  
                  for (const [callId, timerInfo] of activeCallTimers.entries()) {
                    // Check if this could be the right timer based on extension
                    if ((timerInfo.userExtension === entityUserExtension) || 
                        (entityUserExtension === '10001' && targetExtensions.has(timerInfo.userExtension))) {
                      
                      const timeSinceStart = Date.now() - timerInfo.startTime;
                      
                      console.log(`📊 Checking timer: callId=${callId}, userExt=${timerInfo.userExtension}, entityExt=${entityUserExtension}`);
                      console.log(`📊 Timer flags: expectingImmediateEnd=${timerInfo.expectingImmediateEnd}, timeSinceStart=${timeSinceStart}ms`);
                      
                      // Only ignore if this is for the SAME user extension AND flag is set
                      if (timerInfo.expectingImmediateEnd && timerInfo.userExtension === entityUserExtension) {
                        console.log(`⏭️ Ignoring expected immediate event_type:1 for call ${callId} user ${entityUserExtension} - ${timeSinceStart}ms since connected`);
                        console.log(`📌 This is the automatic end event that comes after connection - ignoring`);
                        timerInfo.expectingImmediateEnd = false; // Clear the flag only for matching user
                        activeCallTimers.set(callId, timerInfo);
                        timerFound = true;
                        break;
                      } else if (!timerInfo.expectingImmediateEnd || timerInfo.userExtension !== entityUserExtension) {
                        // This is a real end event OR different extension (trunk scenario)
                        // But we should still check if it's the right call
                        if (timerInfo.userExtension === entityUserExtension || 
                            (entityUserExtension === '10001' && !timerInfo.expectingImmediateEnd)) {
                          console.log(`✅ Ending timer for call ${callId} after ${timeSinceStart}ms (real call end)`);
                          endCallTimer(callId, timerInfo.userExtension, broadcastFunction);
                          
                          // Send call end notification
                          broadcastFunction(timerInfo.userExtension, {
                            type: 'call_ended',
                            timestamp: new Date().toISOString(),
                            userExtension: timerInfo.userExtension,
                            entity: entity,
                            callId: callId
                          });
                          
                          timerFound = true;
                          break;
                        } else {
                          console.log(`⏭️ Skipping end event - wrong extension or still expecting immediate end`);
                        }
                      }
                    }
                  }
                }
                
                // Only send "no active timer" message if this is for a connected user
                if (!timerFound) {
                  const targetExtensions = new Set();
                  connectedClients.forEach((clientInfo) => {
                    if (clientInfo.authenticated && clientInfo.username) {
                      targetExtensions.add(clientInfo.username);
                    }
                  });
                  
                  if (targetExtensions.has(entityUserExtension)) {
                    console.log(`📢 Sending call end notification for ${entityUserExtension} (no active timer)`);
                    broadcastFunction(entityUserExtension, {
                      type: 'call_ended',
                      timestamp: new Date().toISOString(),
                      userExtension: entityUserExtension,
                      entity: entity,
                      callId: callIdToEnd || 'unknown'
                    });
                  }
                }
                
                return; // Exit early for end events
              }
              
              // ============= FOR OTHER EVENTS, FETCH PARTICIPANT DETAILS =============
              const participantDetails = await getParticipantDetails(entity);
              
              if (!participantDetails) {
                console.log(`⚠️ Could not get participant details for entity: ${entity}`);
                return;
              }

              const callId = String(participantDetails.callid); // Always use string for consistency
              const activeCallTimers = getActiveCallTimers();
              
              // ============= CHECK FOR CONNECTED STATUS TO START TIMER =============
              if (participantDetails.status === "Connected") {
                // Get all currently connected user extensions from connectedClients
                const targetExtensions = new Set();
                connectedClients.forEach((clientInfo) => {
                  if (clientInfo.authenticated && clientInfo.username) {
                    targetExtensions.add(clientInfo.username);
                  }
                });
                
                console.log(`🎯 Currently tracking extensions: ${Array.from(targetExtensions).join(', ')}`);
                
                let shouldStartTimer = false;
                let timerUserExtension = null;

                // Check if direct user connection
                if (targetExtensions.has(entityUserExtension)) {
                  shouldStartTimer = true;
                  timerUserExtension = entityUserExtension;
                  console.log(`✅ Direct connection detected for user ${entityUserExtension}`);
                }
                // Check if party_dn contains our user (trunk scenario)
                else if (participantDetails.party_dn && targetExtensions.has(participantDetails.party_dn)) {
                  shouldStartTimer = true;
                  timerUserExtension = participantDetails.party_dn;
                  console.log(`✅ Trunk connection detected for user ${participantDetails.party_dn} via ${entityUserExtension}`);
                }

                if (shouldStartTimer && timerUserExtension) {
                  // Check if timer already exists for this call
                  if (activeCallTimers.has(callId)) {
                    const existingTimer = activeCallTimers.get(callId);
                    console.log(`⏱️ Timer already running for call ${callId} - user: ${existingTimer.userExtension}`);
                    // Check if this is a trunk connection for the same call
                    if (entityUserExtension === '10001' && existingTimer.expectingImmediateEnd) {
                      console.log(`📌 Trunk connection detected - maintaining expectingImmediateEnd flag`);
                    }
                    return;
                  }

                  const startTime = Date.now();
                  activeCallTimers.set(callId, {
                    startTime: startTime,
                    userExtension: timerUserExtension,
                    status: 'active',
                    expectingImmediateEnd: true, // Flag to ignore the next end event from same user
                    startedFromEntity: entityUserExtension // Track which entity started this timer
                  });

                  console.log(`⏱️ CALL TIMER STARTED - Call ID: ${callId}, User: ${timerUserExtension}, Entity: ${entityUserExtension}`);
                  console.log(`📊 Active timers: ${Array.from(activeCallTimers.keys()).join(', ')}`);
                  console.log(`⚠️ Expecting immediate end event for call ${callId} from user ${timerUserExtension} - will ignore first end event from same user`);
                  
                  // Send timer started notification
                  broadcastFunction(timerUserExtension, {
                    type: 'call_timer_started',
                    callId: callId,
                    startTime: startTime,
                    timestamp: new Date().toISOString()
                  });
                }
              }
              
              // ============= CHECK FOR RINGING (event_type: 0) WITH MULTIPLE CALLS =============
              if (message.event.event_type === 0 && participantDetails.status === "Ringing") {
                const processedCalls = getProcessedCalls();
                const callKey = `${entityUserExtension}-${callId}`;
                
                // Check if we've already processed this call for this user
                if (processedCalls.has(callKey)) {
                  console.log(`⏭️ Skipping duplicate call ${callId} for extension ${entityUserExtension}`);
                  return;
                }
                
                // Mark this call as processed for this user
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
                console.log(`   Call ID: ${participantDetails.callid}`);
                
                // ============= ENHANCED TEST MODE LOGIC WITH ARRAY =============
                let phoneNumberForLookup;
                if (PRODUCTION_MODE) {
                  phoneNumberForLookup = extractPhoneDigits(callerNumber);
                  console.log(`✅ PRODUCTION MODE: Using actual number: ${phoneNumberForLookup}`);
                } else {
                  // Get test number based on concurrent call count
                  phoneNumberForLookup = getTestPhoneNumber(callId, entityUserExtension);
                  console.log(`🧪 TESTING MODE: Using test number: ${phoneNumberForLookup} for call ${callId}`);
                  console.log(`🧪 (Actual caller number was: ${callerNumber})`);
                  
                  // Show current test number assignments
                  const currentAssignments = [];
                  testNumberAssignments.forEach((number, id) => {
                    currentAssignments.push(`${id}: ${number}`);
                  });
                  if (currentAssignments.length > 1) {
                    console.log(`🧪 All active test assignments: [${currentAssignments.join(', ')}]`);
                  }
                }
                
                const callInfo = {
                  callerName: participantDetails.party_caller_name,
                  callerNumber: participantDetails.party_caller_id,
                  extension: participantDetails.dn,
                  status: participantDetails.status,
                  partyDnType: participantDetails.party_dn_type,
                  callId: callId,
                  phoneNumber: phoneNumberForLookup,
                  timestamp: new Date().toISOString(),
                  userExtension: entityUserExtension
                };
                
                // Add to call group
                const callGroup = addToCallGroup(entityUserExtension, callInfo);
                
                // Check if this is part of a multi-call scenario
                const concurrentCalls = getConcurrentCalls(entityUserExtension);
                const isMultiCall = concurrentCalls.length > 1;
                
                if (isMultiCall) {
                  // MULTI-CALL SCENARIO
                  console.log(`🎯 MULTI-CALL DETECTED: ${concurrentCalls.length} concurrent calls for ${entityUserExtension}`);
                  
                  // Send concurrent call alert
                  broadcastFunction(entityUserExtension, {
                    type: 'concurrent_call_alert',
                    newCallId: callId,
                    phoneNumber: phoneNumberForLookup,
                    totalConcurrentCalls: concurrentCalls.length,
                    allCalls: concurrentCalls.map(c => ({
                      callId: c.callId,
                      phoneNumber: c.phoneNumber
                    })),
                    message: `${concurrentCalls.length} concurrent calls detected`,
                    timestamp: new Date().toISOString()
                  });
                  
                  // Process all concurrent calls together
                  setTimeout(() => {
                    processConcurrentCalls(entityUserExtension, broadcastFunction);
                  }, 1000); // Small delay to catch any more concurrent calls
                  
                } else {
                  // SINGLE CALL SCENARIO (EXISTING LOGIC)
                  console.log(`\n📤 STAGE 1: Sending immediate phone number...`);
                  sendProgressiveUpdate(entityUserExtension, 1, {
                    phoneNumber: phoneNumberForLookup
                  }, callInfo, broadcastFunction);
                  
                  // Check cache first
                  const cachedData = getCachedCustomerData(phoneNumberForLookup);
                  
                  if (cachedData) {
                    // Send cached data immediately as complete
                    console.log(`🎯 Using cached data - sending as complete`);
                    sendProgressiveUpdate(entityUserExtension, 4, cachedData, callInfo, broadcastFunction);
                    
                    // ALSO send in legacy format for backward compatibility
                    const legacyNotification = {
                      type: 'call_notification',
                      data: {
                        ...callInfo,
                        customerData: cachedData
                      }
                    };
                    broadcastFunction(entityUserExtension, legacyNotification);
                    console.log(`📤 Legacy format sent to ${entityUserExtension}`);
                    
                    // If we have cached Tekion data, send it too
                    if (cachedData.tekionData) {
                      broadcastFunction(entityUserExtension, {
                        type: 'tekion_data',
                        data: cachedData.tekionData,
                        callInfo: callInfo,
                        timestamp: new Date().toISOString()
                      });
                      console.log(`📤 Cached Tekion data sent to ${entityUserExtension}`);
                    }
                    
                    // Save cached call to MongoDB
                    const savedCallsMap = getSavedCalls();
                    if (!savedCallsMap.has(callId)) {
                      try {
                        savedCallsMap.set(callId, Date.now());
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
                          phoneNumber: phoneNumberForLookup,
                          fromCache: true
                        });
                        console.log('💾 Cached call data saved to database');
                      } catch (dbError) {
                        console.error('❌ Failed to save cached call data:', dbError);
                      }
                    }
                  } else {
                    // Start PARALLEL fetch for both VinSolutions and Tekion
                    console.log(`🔄 Starting parallel data fetch (VinSolutions + Tekion)...`);
                    console.log(`📌 Using phone number: ${phoneNumberForLookup} for both APIs`);
                    
                    // Create a function to send Tekion updates
                    const sendTekionUpdate = (stage, data) => {
                      broadcastFunction(entityUserExtension, {
                        type: 'tekion_update',
                        stage: stage,
                        data: data,
                        callInfo: callInfo,
                        timestamp: new Date().toISOString()
                      });
                      console.log(`📤 Tekion ${stage} sent to ${entityUserExtension}`);
                    };
                    
                    // Start both fetches in parallel with the SAME phone number
                    const [vinData, tekionData] = await Promise.allSettled([
                      fetchCustomerDataProgressive(
                        phoneNumberForLookup, // Using the test/production number
                        entityUserExtension, 
                        callInfo, 
                        (ext, stage, data, info) => sendProgressiveUpdate(ext, stage, data, info, broadcastFunction),
                        setCachedCustomerData,
                        getSavedCalls,
                        saveCallData,
                        broadcastFunction
                      ),
                      fetchTekionDataProgressive(phoneNumberForLookup, sendTekionUpdate) // Using the same number
                    ]);
                    
                    // Process results
                    let completeVinData = null;
                    let completeTekionData = null;
                    
                    if (vinData.status === 'fulfilled') {
                      completeVinData = vinData.value;
                    } else {
                      console.error('❌ VinSolutions fetch failed:', vinData.reason);
                    }
                    
                    if (tekionData.status === 'fulfilled') {
                      completeTekionData = tekionData.value;
                    } else {
                      console.error('❌ Tekion fetch failed:', tekionData.reason);
                    }
                    
                    // Combine the data for caching if VinSolutions succeeded
                    if (completeVinData) {
                      const completeData = {
                        ...completeVinData,
                        tekionData: completeTekionData
                      };
                      
                      // Update cache with combined data
                      setCachedCustomerData(phoneNumberForLookup, completeData);
                      
                      // Send final combined notification
                      broadcastFunction(entityUserExtension, {
                        type: 'complete_customer_data',
                        vinSolutions: completeVinData,
                        tekion: completeTekionData,
                        callInfo: callInfo,
                        timestamp: new Date().toISOString()
                      });
                      console.log(`📤 Complete combined data sent to ${entityUserExtension}`);
                      
                      // Save to MongoDB with both data sources
                      const savedCallsMap = getSavedCalls();
                      if (!savedCallsMap.has(callId)) {
                        try {
                          savedCallsMap.set(callId, Date.now());
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
                            customerData: completeData,
                            phoneNumber: phoneNumberForLookup,
                            fromCache: false
                          });
                          console.log('💾 Complete call data (VinSolutions + Tekion) saved to database');
                        } catch (dbError) {
                          console.error('❌ Failed to save complete call data:', dbError);
                        }
                      }
                    }
                  }
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
        connectTo3CXWebSocket(broadcastFunction, connectedClients, startCallTimer, endCallTimer);
      }, delay);
    });

  } catch (error) {
    console.error('❌ Error connecting to 3CX:', error.message);
    isConnectingToPBX = false;

    const delay = Math.min(PBX_RECONNECT_BASE_DELAY * Math.pow(1.5, pbxReconnectAttempts), PBX_RECONNECT_MAX_DELAY);
    pbxReconnectAttempts++;

    setTimeout(() => {
      connectTo3CXWebSocket(broadcastFunction, connectedClients, startCallTimer, endCallTimer);
    }, delay);
  }
}

function isPBXConnected() {
  return pbxWebSocket && pbxWebSocket.readyState === WebSocket.OPEN;
}

function getLatestSequence() {
  return latestSequence;
}

function getPBXReconnectAttempts() {
  return pbxReconnectAttempts;
}

function closePBXWebSocket() {
  if (pbxPingInterval) {
    clearInterval(pbxPingInterval);
    pbxPingInterval = null;
  }
  if (pbxWebSocket) {
    pbxWebSocket.close();
  }
}

module.exports = {
  connectTo3CXWebSocket,
  isPBXConnected,
  getLatestSequence,
  getPBXReconnectAttempts,
  closePBXWebSocket
};