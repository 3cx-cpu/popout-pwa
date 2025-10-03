import { useState, useEffect, useRef } from 'react';

const useWebSocket = (sid, from) => {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(0);
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

            console.log('=== SALES DATA DEBUG ===');
  console.log('salesAssignment:', msg.data.salesAssignment);
  console.log('salesRepInfo:', msg.data.salesRepInfo);
  console.log('========================');
            debugLog('='.repeat(60));
            debugLog('CUSTOMER DATA RECEIVED');
            debugLog('='.repeat(60));
            
            
            // Log the entire data structure
            debugLog('Full data structure:', msg.data);
            
            // Check data integrity
            const dataIntegrity = {
              hasContact: !!msg.data.contact,
              contactName: msg.data.contact?.fullName || 'N/A',
              hasLeads: !!msg.data.leads,
              leadsCount: msg.data.leads?.length || 0,
              hasAllLeadsData: !!msg.data.allLeadsData,
              allLeadsDataIsArray: Array.isArray(msg.data.allLeadsData),
              allLeadsDataCount: msg.data.allLeadsData?.length || 0
            };
            debugLog('Data integrity check:', dataIntegrity);
            
            // Log each lead's data
            if (msg.data.allLeadsData && Array.isArray(msg.data.allLeadsData)) {
              debugLog(`Processing ${msg.data.allLeadsData.length} leads:`);
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
            
            debugLog('='.repeat(60));
            
            setCustomerData(msg.data);
            setLoading(false);
            setSelectedLeadIndex(0);
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

  return { 
    connectionStatus, 
    customerData, 
    loading, 
    selectedLeadIndex, 
    setSelectedLeadIndex,
    debugLog 
  };
};

export default useWebSocket;