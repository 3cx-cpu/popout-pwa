// backend/services/vinsolutions.service.js

const axios = require('axios');
const { VIN_CONFIG } = require('../config/constants');

let vinToken = null;
let vinTokenExpiry = null;

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

async function fetchCustomerDataProgressive(phoneNumber, userExtension, callInfo, sendProgressiveUpdate, setCachedCustomerData, getSavedCalls, saveCallData, broadcastToUser) {
  const overallStartTime = Date.now();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 PROGRESSIVE DATA FETCH STARTED for: ${phoneNumber}`);
  console.log(`${'='.repeat(70)}\n`);

  try {
    // STAGE 2: Fetch Basic Contact Info
    const stage2Start = Date.now();
    console.log(`📥 STAGE 2: Fetching basic contact info...`);
    const contacts = await getContactsByPhone(phoneNumber);
    const stage2Duration = ((Date.now() - stage2Start) / 1000).toFixed(2);

    if (!contacts || contacts.length === 0) {
      console.log(`❌ No contacts found for: ${phoneNumber} (${stage2Duration}s)`);
      sendProgressiveUpdate(userExtension, 2, {
        contact: null,
        error: 'No contact found'
      }, callInfo);
      return null;
    }

    console.log(`✅ STAGE 2 Complete: Found ${contacts.length} contact(s) in ${stage2Duration}s`);

    // Send Stage 2 data immediately
    sendProgressiveUpdate(userExtension, 2, {
      contact: contacts[0],
      contacts: contacts,
      hasMultipleContacts: contacts.length > 1
    }, callInfo);

    // STAGE 3: Fetch Lead Summaries
    const stage3Start = Date.now();
    console.log(`📥 STAGE 3: Fetching lead summaries...`);

    const allContactsDataPromises = contacts.map(async (contact) => {
      const leads = await getLeads(contact.contactId);
      return { contact, leads, leadCount: leads.length };
    });

    const contactsWithLeads = await Promise.all(allContactsDataPromises);
    const stage3Duration = ((Date.now() - stage3Start) / 1000).toFixed(2);

    console.log(`✅ STAGE 3 Complete: Fetched lead summaries in ${stage3Duration}s`);

    // Send Stage 3 data
    const primaryContactLeads = contactsWithLeads[0];
    sendProgressiveUpdate(userExtension, 3, {
      contact: contacts[0],
      contacts: contacts,
      hasMultipleContacts: contacts.length > 1,
      leads: primaryContactLeads.leads,
      leadCount: primaryContactLeads.leadCount,
      allContactsLeadSummary: contactsWithLeads.map(c => ({
        contactId: c.contact.contactId,
        fullName: c.contact.fullName,
        leadCount: c.leadCount
      }))
    }, callInfo);

    // STAGE 4: Fetch Detailed Lead Data (vehicles, sales rep)
    const stage4Start = Date.now();
    console.log(`📥 STAGE 4: Fetching detailed lead data...`);

    const allContactsDetailedData = await Promise.all(
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

    const stage4Duration = ((Date.now() - stage4Start) / 1000).toFixed(2);
    console.log(`✅ STAGE 4 Complete: Detailed lead data in ${stage4Duration}s`);

    // Build final complete data structure
    const completeData = {
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

    // Save to MongoDB - ONE entry per call (global deduplication)
    const savedCallsMap = getSavedCalls();
    const callId = callInfo.callId;
    if (!savedCallsMap.has(callId)) {
      try {
        savedCallsMap.set(callId, Date.now());
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
    console.log(`   Stage 2 (Contact):        ${stage2Duration}s`);
    console.log(`   Stage 3 (Lead Summary):   ${stage3Duration}s`);
    console.log(`   Stage 4 (Complete Data):  ${stage4Duration}s`);
    console.log(`${'='.repeat(70)}\n`);

    return completeData;

  } catch (error) {
    const duration = ((Date.now() - overallStartTime) / 1000).toFixed(2);
    console.error(`❌ Error in progressive fetch (${duration}s):`, error.message);
    return null;
  }
}

module.exports = {
  getVinToken,
  getContactsByPhone,
  getLeads,
  getVehiclesOfInterest,
  getTradeVehicles,
  getLeadSource,
  getUserById,
  getContactDetails,
  processLeadsInParallel,
  fetchCustomerDataProgressive
};