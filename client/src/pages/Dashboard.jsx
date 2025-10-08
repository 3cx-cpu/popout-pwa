import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import RoleTabs from '../components/common/RoleTabs';
import ConnectionStatusBadge from '../components/common/ConnectionStatusBadge';
import CustomerInfoCard from '../components/common/CustomerInfoCard';
import ReceptionistMainCard from '../components/cards/receptionist/ReceptionistMainCard';
import ProductSpecialistMainCard from '../components/cards/productSpecialist/productSpecialistMain';
import ServiceAdvisorMainCard from '../components/cards/serviceAdvisor/ServiceAdvisorMainCard';
import useCallDuration from '../hooks/useCallDuration';

const Dashboard = ({ customerDataProp, fromProp, onClose, loadingStage = 4, isCallActive = true }) => {
  const [activeRole, setActiveRole] = useState('receptionist');
  const [customerData, setCustomerData] = useState(customerDataProp);
  const [from] = useState(fromProp);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(0);
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);
  const { callDuration } = useCallDuration(isCallActive);

  // CRITICAL: Update customerData when prop changes
  useEffect(() => {
    console.log('📊 Dashboard received new customerData:', customerDataProp);
    setCustomerData(customerDataProp);
  }, [customerDataProp]);

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
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                stage.complete 
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
      allContactsData: customerData?.allContactsData
    };

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
            serviceData={currentCustomerData?.serviceAdvisorData}
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
          <div className={`w-2 h-2 ${isCallActive ? 'bg-green-500' : 'bg-red-500'} rounded-full ${isCallActive ? 'animate-pulse' : ''}`}></div>
          <span className={`${isCallActive ? 'text-green-600' : 'text-red-600'} text-sm font-semibold`}>
            {isCallActive ? 'LIVE CALL' : 'CALL ENDED'}
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

      <div className="p-4">
        {renderRoleContent()}
      </div>

      <div className={`fixed bottom-4 right-4 ${isCallActive ? 'bg-gray-900' : 'bg-red-900'} text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm transition-colors`}>
        <Clock className="w-4 h-4" />
        <span>Call Duration: {formatDuration(callDuration)}</span>
        {!isCallActive && <span className="ml-2 font-bold">(ENDED)</span>}
      </div>
    </div>
  );
};

export default Dashboard;