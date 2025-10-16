// backend/utils/callTimer.js

const activeCallTimers = new Map();

function startCallTimer(callId, userExtension, broadcastFunction) {
  // Check if timer already exists for this call
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

  // Send timer started notification
  broadcastFunction(userExtension, {
    type: 'call_timer_started',
    callId: callId,
    startTime: startTime,
    timestamp: new Date().toISOString()
  });
}

function endCallTimer(callId, userExtension, broadcastFunction) {
  const timerInfo = activeCallTimers.get(callId);

  if (!timerInfo) {
    console.log(`⚠️ No active timer found for call ${callId}`);
    return;
  }

  const endTime = Date.now();
  const duration = Math.floor((endTime - timerInfo.startTime) / 1000);

  activeCallTimers.delete(callId);

  console.log(`⏱️ CALL TIMER ENDED - Call ID: ${callId}, Duration: ${duration}s`);

  // Send timer ended notification with duration
  broadcastFunction(userExtension, {
    type: 'call_timer_ended',
    callId: callId,
    startTime: timerInfo.startTime,
    endTime: endTime,
    duration: duration,
    timestamp: new Date().toISOString()
  });
}

function getActiveCallTimers() {
  return activeCallTimers;
}

module.exports = {
  startCallTimer,
  endCallTimer,
  getActiveCallTimers
};