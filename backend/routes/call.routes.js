// backend/routes/call.routes.js

const express = require('express');
const { getCallHistory, getCallById } = require('../database/database');

const router = express.Router();

// Get call history for a user
router.get('/call-history/:username', async (req, res) => {
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

// Get specific call by ID
router.get('/call/:callId', async (req, res) => {
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

module.exports = router;