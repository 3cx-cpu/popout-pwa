import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import RoleTabs from '../components/common/RoleTabs';
import ConnectionStatusBadge from '../components/common/ConnectionStatusBadge';
import CustomerInfoCard from '../components/common/CustomerInfoCard';
import ReceptionistMainCard from '../components/cards/receptionist/ReceptionistMainCard';
import ProductSpecialistMainCard from '../components/cards/productSpecialist/productSpecialistMain';
import ServiceAdvisorMainCard from '../components/cards/serviceAdvisor/ServiceAdvisorMainCard';

const Dashboard = ({ customerDataProp, fromProp, onClose, loadingStage = 4, isCallActive = true, callStartTime = null }) => {
  const [activeRole, setActiveRole] = useState('receptionist');
  const [customerData, setCustomerData] = useState(customerDataProp);
  const [from] = useState(fromProp);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(0);
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);
  const [callDuration, setCallDuration] = useState(0);

  // Update customerData when prop changes
  useEffect(() => {
    console.log('📊 Dashboard received new customerData:', customerDataProp);
    setCustomerData(customerDataProp);

    if (customerDataProp?.tekionData) {
      console.log('🎯 TEKION DATA IN DASHBOARD:', customerDataProp.tekionData);

      // Log repair orders if present
      if (customerDataProp.tekionData.repairOrders) {
        console.log('🔧 REPAIR ORDERS:', customerDataProp.tekionData.repairOrders);

        // Log the first repair order details
        const firstRO = customerDataProp.tekionData.repairOrders[0];
        if (firstRO) {
          console.log('📋 First RO Details:', {
            roNumber: firstRO.roNumber,
            status: firstRO.status,
            totalAmount: firstRO.financial?.totalAmount,
            vehicle: firstRO.vehicle,
            jobs: firstRO.jobs
          });
        }
      }
    }

  }, [customerDataProp]);

  // Handle call duration timer based on callStartTime
  useEffect(() => {
    let timerInterval = null;

    if (isCallActive && callStartTime) {
      // Calculate initial duration if call was already in progress
      const initialDuration = Math.floor((Date.now() - callStartTime) / 1000);
      setCallDuration(initialDuration);

      // Start interval to update duration every second
      timerInterval = setInterval(() => {
        const currentDuration = Math.floor((Date.now() - callStartTime) / 1000);
        setCallDuration(currentDuration);
      }, 1000);
    } else if (!isCallActive) {
      // Keep the last duration when call ends
      // Don't reset to 0 immediately
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isCallActive, callStartTime]);

  // Determine loading state based on stage
  const isLoading = loadingStage < 4;
  const hasBasicContact = loadingStage >= 2;
  const hasLeadSummary = loadingStage >= 3;
  const hasCompleteData = loadingStage >= 4;

  const getCurrentContactData = () => {
    if (!customerData) {
      console.log('⚠️ Dashboard: No customer data available');
      return null;
    }

    console.log('📊 Dashboard getCurrentContactData:', {
      hasMultipleContacts: customerData?.hasMultipleContacts,
      allContactsDataLength: customerData?.allContactsData?.length,
      selectedContactIndex: selectedContactIndex
    });

    if (customerData?.hasMultipleContacts && customerData?.allContactsData) {
      return customerData.allContactsData[selectedContactIndex] || {};
    }
    return {
      contact: customerData?.contact,
      leads: customerData?.leads,
      allLeadsData: customerData?.allLeadsData,
      vehiclesOfInterest: customerData?.vehiclesOfInterest,
      tradeVehicles: customerData?.tradeVehicles,
      salesAssignment: customerData?.salesAssignment,
      salesRepInfo: customerData?.salesRepInfo,
      leadSource: customerData?.leadSource
    };
  };

  const currentContactData = getCurrentContactData();

  console.log('📊 Dashboard currentContactData:', currentContactData);

  const getVehicleData = () => {
    const emptyData = { desiredVehicle: null, tradeVehicle: null, leadSource: null };

    if (!currentContactData) {
      return emptyData;
    }

    if (currentContactData.allLeadsData && Array.isArray(currentContactData.allLeadsData)) {
      const currentLead = currentContactData.allLeadsData[selectedLeadIndex];
      if (currentLead) {
        return {
          desiredVehicle: currentLead.vehiclesOfInterest?.[0] || null,
          tradeVehicle: currentLead.tradeVehicles?.[0] || null,
          leadSource: currentLead.leadSource || null
        };
      }
    }

    return {
      desiredVehicle: currentContactData.vehiclesOfInterest?.[0] || null,
      tradeVehicle: currentContactData.tradeVehicles?.[0] || null,
      leadSource: currentContactData.leadSource || null
    };
  };

  const vehicleData = getVehicleData();
  const allLeads = currentContactData?.allLeadsData || currentContactData?.leads || [];

  const handleLeadClick = (index) => {
    setSelectedLeadIndex(index);
  };

  const handleContactChange = (index) => {
    setSelectedContactIndex(index);
    setSelectedLeadIndex(0);
  };

  // Loading Stage Indicator Component
  const LoadingStageIndicator = () => {
    if (!isLoading) return null;

    const stages = [
      { number: 1, label: 'Phone Number', complete: loadingStage >= 1 },
      { number: 2, label: 'Contact Info', complete: loadingStage >= 2 },
      { number: 3, label: 'Lead Summary', complete: loadingStage >= 3 },
      { number: 4, label: 'Complete Data', complete: loadingStage >= 4 }
    ];

    return (
      <div className="fixed top-20 right-4 bg-white shadow-lg rounded-lg p-4 border-2 border-blue-500 z-50 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
          <span className="font-semibold text-gray-800">Loading Customer Data...</span>
        </div>
        <div className="space-y-2">
          {stages.map((stage) => (
            <div key={stage.number} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stage.complete
                  ? 'bg-green-500 text-white'
                  : stage.number === loadingStage
                    ? 'bg-blue-500 text-white animate-pulse'
                    : 'bg-gray-300 text-gray-600'
                }`}>
                {stage.complete ? '✓' : stage.number}
              </div>
              <span className={`text-sm ${stage.complete ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                {stage.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRoleContent = () => {
    const currentCustomerData = {
      ...currentContactData,
      hasMultipleContacts: customerData?.hasMultipleContacts,
      allContactsData: customerData?.allContactsData,
      tekionData: customerData?.tekionData
    };



  console.log('🎯 Passing to ServiceAdvisor:', {
    hasTekionData: !!currentCustomerData.tekionData,
    tekionData: currentCustomerData.tekionData
  });
    // Show progressive loading states
    const loading = !hasCompleteData;

    switch (activeRole) {
      case 'receptionist':
        return (
          <ReceptionistMainCard
            loading={loading}
            customerData={currentCustomerData}
            from={from}
            vehicleData={vehicleData}
            allLeads={allLeads}
            selectedLeadIndex={selectedLeadIndex}
            handleLeadClick={handleLeadClick}
            loadingStage={loadingStage}
          />
        );
      case 'productSpecialist':
        return (
          <ProductSpecialistMainCard
            loading={loading}
            customerData={currentCustomerData}
            from={from}
            vehicleData={vehicleData}
            allLeads={allLeads}
            selectedLeadIndex={selectedLeadIndex}
            handleLeadClick={handleLeadClick}
            loadingStage={loadingStage}
          />
        );
   case 'serviceAdvisor':
      return (
        <ServiceAdvisorMainCard
          loading={loading}
          serviceData={{
            tekionData: currentCustomerData?.tekionData, // Pass Tekion data
            contact: currentContactData?.contact
          }}
          loadingStage={loadingStage}
        />
      );
      default:
        return (
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">No content available for this role</p>
              <p className="text-sm">Please select Receptionist or Service Advisor to view data</p>
            </div>
          </div>
        );
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStatusText = () => {
    if (isCallActive && callStartTime) {
      return 'CALL CONNECTED';
    } else if (!isCallActive && callDuration > 0) {
      return 'CALL ENDED';
    } else if (isCallActive && !callStartTime) {
      return 'CALL RINGING';
    } else {
      return 'CALL STATUS UNKNOWN';
    }
  };

  const getCallStatusColor = () => {
    if (isCallActive && callStartTime) {
      return 'text-green-600';
    } else if (!isCallActive && callDuration > 0) {
      return 'text-red-600';
    } else if (isCallActive && !callStartTime) {
      return 'text-yellow-600';
    } else {
      return 'text-gray-600';
    }
  };

  const getCallStatusBg = () => {
    if (isCallActive && callStartTime) {
      return 'bg-green-500';
    } else if (!isCallActive && callDuration > 0) {
      return 'bg-red-500';
    } else if (isCallActive && !callStartTime) {
      return 'bg-yellow-500';
    } else {
      return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingStageIndicator />

      <CustomerInfoCard
        customerData={customerData}
        from={from}
        loading={!hasBasicContact}
        selectedContactIndex={selectedContactIndex}
        onContactChange={handleContactChange}
        loadingStage={loadingStage}
      />

      <RoleTabs activeRole={activeRole} onRoleChange={setActiveRole} />

      <div className="bg-white border-b px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${getCallStatusBg()} rounded-full ${isCallActive && callStartTime ? 'animate-pulse' : ''}`}></div>
          <span className={`${getCallStatusColor()} text-sm font-semibold`}>
            {getCallStatusText()}
          </span>
          {isLoading && (
            <span className="text-blue-600 text-sm ml-4">
              Loading Stage {loadingStage}/4...
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded transition-colors"
          >
            <X className="w-4 h-4" />
            Close Call Screen
          </button>
        )}
      </div>

      <div className="p-3">
        {renderRoleContent()}
      </div>

      {/* Call Timer Display */}
      {(callStartTime || callDuration > 0) && (
        <div className={`fixed bottom-4 right-4 ${!isCallActive ? 'bg-red-900' : 'bg-gray-900'} text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm transition-colors`}>
          <Clock className="w-4 h-4" />
          <span>
            {isCallActive && callStartTime ? 'Call Duration: ' : 'Final Duration: '}
            {formatDuration(callDuration)}
          </span>
          {!isCallActive && callDuration > 0 && <span className="ml-2 font-bold">(ENDED)</span>}
        </div>
      )}
    </div>
  );
};

export default Dashboard;