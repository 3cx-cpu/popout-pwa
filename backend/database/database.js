// backend\database.js

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://korulla:comstream%402025@172.235.9.115:27017/admin';
const DB_NAME = 'call_data';
const COLLECTION_NAME = 'calls';

let client = null;
let db = null;

async function connectDB() {
  try {
    if (client && client.topology && client.topology.isConnected()) {
      console.log('✅ MongoDB already connected');
      return db;
    }

    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);

    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB successfully');

    // Create indexes for better query performance
    const collection = db.collection(COLLECTION_NAME);

    // Index for user queries
    await collection.createIndex({ userExtension: 1, savedAt: -1 });

    // Index for call ID lookups
    await collection.createIndex({ callId: 1 });

    // Note: _id is already unique by default, no need to create index

    console.log('✅ MongoDB indexes created');

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

async function saveCallData(callData) {
  try {
    const database = await connectDB();
    const collection = database.collection(COLLECTION_NAME);

    const callDocument = {
      ...callData,
      savedAt: new Date()
    };

    // Only add _id if not already provided
    if (!callDocument._id) {
      callDocument._id = `${callData.userExtension}-${callData.callId}-${Date.now()}`;
    }

    const result = await collection.insertOne(callDocument);
    console.log('💾 Call data saved to MongoDB:', result.insertedId);
    return result.insertedId;
  } catch (error) {
    // Check if it's a duplicate key error
    if (error.code === 11000) {
      console.log('⚠️ Duplicate call entry prevented:', callData._id);
      return callData._id;
    }
    console.error('❌ Error saving call data:', error.message);
    throw error;
  }
}

async function getCallHistory(userExtension, limit = 50, skip = 0) {
  try {
    const database = await connectDB();
    const collection = database.collection(COLLECTION_NAME);

    const calls = await collection
      .find({ userExtension: userExtension })
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`📞 Retrieved ${calls.length} calls for user ${userExtension}`);
    return calls;
  } catch (error) {
    console.error('❌ Error retrieving call history:', error.message);
    throw error;
  }
}

async function getCallById(callId) {
  try {
    const database = await connectDB();
    const collection = database.collection(COLLECTION_NAME);

    const call = await collection.findOne({ _id: callId });
    console.log(`📞 Retrieved call: ${callId}`);
    return call;
  } catch (error) {
    console.error('❌ Error retrieving call:', error.message);
    throw error;
  }
}

async function deleteOldCalls(daysOld = 90) {
  try {
    const database = await connectDB();
    const collection = database.collection(COLLECTION_NAME);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await collection.deleteMany({
      savedAt: { $lt: cutoffDate }
    });

    console.log(`🗑️ Deleted ${result.deletedCount} old calls (older than ${daysOld} days)`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error deleting old calls:', error.message);
    throw error;
  }
}

async function closeDB() {
  if (client) {
    await client.close();
    console.log('❌ MongoDB connection closed');
  }
}

module.exports = {
  connectDB,
  saveCallData,
  getCallHistory,
  getCallById,
  deleteOldCalls,
  closeDB
};