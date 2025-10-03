import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';
import RoleTabs from '../components/common/RoleTabs';
import ConnectionStatusBadge from '../components/common/ConnectionStatusBadge';
import CustomerInfoCard from '../components/common/CustomerInfoCard';
import ReceptionistMainCard from '../components/cards/receptionist/ReceptionistMainCard';
import ProductSpecialistMainCard from '../components/cards/productSpecialist/productSpecialistMain';
import ServiceAdvisorMainCard from '../components/cards/serviceAdvisor/ServiceAdvisorMainCard';
import useCallDuration from '../hooks/useCallDuration';

const Dashboard = ({ customerDataProp, fromProp, onClose }) => {
  // Use prop data if provided, otherwise try URL params (backward compatibility)
  const getInitialData = () => {
    if (customerDataProp) return customerDataProp;
    
    // Fallback to URL params
    const params = new URLSearchParams(window.location.search);
    const customerDataParam = params.get('customerData');
    if (customerDataParam) {
      try {
        return JSON.parse(decodeURIComponent(customerDataParam));
      } catch (e) {
        console.error('Error parsing customerData from URL:', e);
      }
    }
    return null;
  };

  const getInitialFrom = () => {
    if (fromProp) return fromProp;
    const params = new URLSearchParams(window.location.search);
    return params.get('from') || '';
  };

  const [activeRole, setActiveRole] = useState('productSpecialist');
  const [customerData] = useState(getInitialData());
  const [from] = useState(getInitialFrom());
  const [loading] = useState(false);
  const [selectedLeadIndex, setSelectedLeadIndex] = useState(0);
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);
  const callDuration = useCallDuration();

  // Get data for the selected contact
  const getCurrentContactData = () => {
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

  const renderRoleContent = () => {
    const currentCustomerData = {
      ...currentContactData,
      hasMultipleContacts: customerData?.hasMultipleContacts,
      allContactsData: customerData?.allContactsData
    };

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
          />
        );
      case 'serviceAdvisor':
        return (
          <ServiceAdvisorMainCard 
            loading={loading} 
            serviceData={currentCustomerData?.serviceAdvisorData} 
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
      <CustomerInfoCard 
        customerData={customerData} 
        from={from} 
        loading={loading}
        selectedContactIndex={selectedContactIndex}
        onContactChange={handleContactChange}
      />
      
      <RoleTabs activeRole={activeRole} onRoleChange={setActiveRole} />
      
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-green-600 text-sm font-semibold">LIVE CALL</span>
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

      <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4" />
        <span>Call Duration: {formatDuration(callDuration)}</span>
      </div>
    </div>
  );
};

export default Dashboard;