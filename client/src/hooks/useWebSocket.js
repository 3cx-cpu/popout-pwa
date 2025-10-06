import { useState, useEffect, useRef } from 'react';

const useWebSocket = (sid, from) => {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(0);
  const [selectedContactIndex, setSelectedContactIndex] = useState(0); // NEW: Track selected contact
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Debug logging function
  const debugLog = (message, data = null) => {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] ${message}`, data);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  };

  useEffect(() => {
    const connectWebSocket = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/ws`;

      debugLog('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        debugLog('WebSocket connected successfully');
        setConnectionStatus('connected');
        const registerMsg = { type: 'register', sid: sid, from: from };
        debugLog('Sending registration:', registerMsg);
        ws.send(JSON.stringify(registerMsg));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          debugLog('WebSocket message received:', msg.type);

          if (msg.type === 'update' && msg.data) {
            debugLog('='.repeat(60));
            debugLog('CUSTOMER DATA RECEIVED');
            debugLog('='.repeat(60));
            
            // Check for multiple contacts - NEW SECTION
            if (msg.data.hasMultipleContacts) {
              debugLog('🔄 MULTIPLE CONTACTS DETECTED!');
              debugLog(`Total Contacts: ${msg.data.contacts?.length || 0}`);
              debugLog(`Contact Names: ${msg.data.summary?.contactNames?.join(', ') || 'N/A'}`);
              
              // Log each contact's summary
              if (msg.data.allContactsData && Array.isArray(msg.data.allContactsData)) {
                debugLog('All Contacts Data:');
                msg.data.allContactsData.forEach((contactData, idx) => {
                  debugLog(`  Contact ${idx + 1}: ${contactData.contact?.fullName || 'Unknown'}`);
                  debugLog(`    - Contact ID: ${contactData.contact?.contactId}`);
                  debugLog(`    - Leads: ${contactData.leads?.length || 0}`);
                  debugLog(`    - All Leads Data: ${contactData.allLeadsData?.length || 0}`);
                  debugLog(`    - Sales Rep: ${contactData.salesRepInfo?.fullName || 'None'}`);
                });
              }
            } else {
              debugLog('Single contact data received');
            }
            
            // Log the entire data structure
            debugLog('Full data structure:', msg.data);
            
            // Check data integrity - Updated for multiple contacts
            const dataIntegrity = {
              hasContact: !!msg.data.contact,
              contactName: msg.data.contact?.fullName || 'N/A',
              hasLeads: !!msg.data.leads,
              leadsCount: msg.data.leads?.length || 0,
              hasAllLeadsData: !!msg.data.allLeadsData,
              allLeadsDataIsArray: Array.isArray(msg.data.allLeadsData),
              allLeadsDataCount: msg.data.allLeadsData?.length || 0,
              // NEW: Multiple contacts checks
              hasMultipleContacts: msg.data.hasMultipleContacts || false,
              totalContacts: msg.data.contacts?.length || 1,
              hasAllContactsData: !!msg.data.allContactsData,
              allContactsDataCount: msg.data.allContactsData?.length || 0
            };
            debugLog('Data integrity check:', dataIntegrity);
            
            // Log primary contact's lead data (backward compatibility)
            if (msg.data.allLeadsData && Array.isArray(msg.data.allLeadsData)) {
              debugLog(`Processing ${msg.data.allLeadsData.length} leads for primary contact:`);
              msg.data.allLeadsData.forEach((lead, index) => {
                debugLog(`Lead ${index + 1}:`, {
                  leadId: lead.leadId,
                  leadType: lead.leadType,
                  leadStatus: lead.leadStatus,
                  hasVehiclesOfInterest: !!lead.vehiclesOfInterest,
                  vehiclesCount: lead.vehiclesOfInterest?.length || 0,
                  firstVehicle: lead.vehiclesOfInterest?.[0] ? 
                    `${lead.vehiclesOfInterest[0].year} ${lead.vehiclesOfInterest[0].make} ${lead.vehiclesOfInterest[0].model}` : 
                    'None',
                  hasTradeVehicles: !!lead.tradeVehicles,
                  tradeCount: lead.tradeVehicles?.length || 0
                });
              });
            } else {
              debugLog('WARNING: allLeadsData is missing or not an array!');
            }
            
            // Log sales data
            console.log('=== SALES DATA DEBUG ===');
            console.log('salesAssignment:', msg.data.salesAssignment);
            console.log('salesRepInfo:', msg.data.salesRepInfo);
            if (msg.data.hasMultipleContacts && msg.data.allContactsData) {
              console.log('Sales data for all contacts:');
              msg.data.allContactsData.forEach((contactData, idx) => {
                console.log(`  Contact ${idx + 1} Sales Rep:`, contactData.salesRepInfo);
                console.log(`  Contact ${idx + 1} Sales Assignment:`, contactData.salesAssignment);
              });
            }
            console.log('========================');
            
            debugLog('='.repeat(60));
            
            setCustomerData(msg.data);
            setLoading(false);
            setSelectedLeadIndex(0);
            setSelectedContactIndex(0); // Reset to first contact when new data arrives
            
          } else if (msg.type === 'status') {
            debugLog('Status message:', msg);
            setLoading(false);
          } else if (msg.type === 'ack') {
            debugLog('Acknowledgment received');
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          debugLog('Error details:', { message: error.message, event: event.data });
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        debugLog('WebSocket error occurred');
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        debugLog('WebSocket disconnected');
        setConnectionStatus('disconnected');
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [sid, from]);

  // NEW: Helper function to get current contact data
  const getCurrentContactData = () => {
    if (!customerData) return null;
    
    if (customerData.hasMultipleContacts && customerData.allContactsData) {
      return customerData.allContactsData[selectedContactIndex] || null;
    }
    
    // Fallback to single contact structure
    return {
      contact: customerData.contact,
      leads: customerData.leads,
      allLeadsData: customerData.allLeadsData,
      vehiclesOfInterest: customerData.vehiclesOfInterest,
      tradeVehicles: customerData.tradeVehicles,
      salesAssignment: customerData.salesAssignment,
      salesRepInfo: customerData.salesRepInfo,
      leadSource: customerData.leadSource,
      
    };
  };

  return { 
    connectionStatus, 
    customerData, 
    loading, 
    selectedLeadIndex, 
    setSelectedLeadIndex,
    selectedContactIndex, // NEW
    setSelectedContactIndex, // NEW
    getCurrentContactData, // NEW: Helper function
    debugLog 
  };
};

export default useWebSocket;