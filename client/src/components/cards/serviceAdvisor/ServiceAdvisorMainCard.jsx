import React, { useState, useEffect } from 'react';
import { FileText, Phone, Mail, Car, Calendar, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';

// Skeleton Components
const RepairOrderSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
    <div className="space-y-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex justify-between">
          <div className="h-3 bg-gray-200 rounded w-24"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      ))}
    </div>
  </div>
);

const ServiceAdvisorMainCard = ({ loading, serviceData, loadingStage }) => {
  const [selectedROIndex, setSelectedROIndex] = useState(0);
  const [custPayStatus, setCustPayStatus] = useState('Open');
  
  // Extract data
  const tekionData = serviceData?.tekionData;
  const repairOrders = tekionData?.repairOrders || [];
  const contact = serviceData?.contact;
  const allRepairOrders = tekionData?.repairOrders || [];

  // Debug logging
  useEffect(() => {
    console.log('🔧 ServiceAdvisorMainCard received:', {
      tekionData,
      contact,
      repairOrdersCount: allRepairOrders.length,
      loadingStage
    });
  }, [tekionData, contact, loadingStage, allRepairOrders.length]);

  // Get the selected repair order
  const selectedRO = allRepairOrders[selectedROIndex];

  // Update payment status based on selected RO
  useEffect(() => {
    if (selectedRO) {
      setCustPayStatus(selectedRO.status === 'CLOSED' ? 'Invoiced' : 'Open');
    }
  }, [selectedRO]);

  // Format currency (amounts are in cents)
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '$0.00';
    return `$${(amount / 100).toFixed(2)}`;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Map repair order details for selected RO
const repairOrder = selectedRO ? {
  roNumber: `#${selectedRO.roNumber}`,
  service: selectedRO.jobs?.map(job => job.description || job.name).filter(Boolean).join(', ') || 'Service',
  vehicle: selectedRO.vehicle ? 
    `${selectedRO.vehicle.year} ${selectedRO.vehicle.make} ${selectedRO.vehicle.model}` : 
    'Vehicle Info Not Available',
  // FIX: Get technician from techStories array inside jobs
  technician: (() => {
    // Try to find technician from any job's techStories
    for (const job of selectedRO.jobs || []) {
      if (job.techStories && job.techStories.length > 0) {
        const techStory = job.techStories[0];
        if (techStory.technician) {
          return `${techStory.technician.firstName || ''} ${techStory.technician.lastName || ''}`.trim();
        }
      }
    }
    // Fallback to other possible locations
    return selectedRO.technician?.name || 
           selectedRO.assignedTechnician?.name || 
           'Not Assigned';
  })(),
  completed: formatDate(selectedRO.closedTime),
  promiseDate: formatDate(selectedRO.promiseTime),
  promiseTime: formatTime(selectedRO.promiseTime),
  status: selectedRO.status === 'CLOSED' ? 'Ready for Pickup' : selectedRO.status || 'In Progress',
  amount: formatCurrency(selectedRO.financial?.totalAmount)
} : null;

  // Map invoice breakdown
  const invoice = selectedRO?.financial ? {
    items: [
      ...(selectedRO.jobs || []).map(job => ({
        description: job.description || job.name || 'Service Item',
        amount: formatCurrency(job.amount || job.price || 0)
      })),
      { description: 'Labor', amount: formatCurrency(selectedRO.financial.laborTotal) },
      { description: 'Parts', amount: formatCurrency(selectedRO.financial.partsTotal) },
      { description: 'Tax', amount: formatCurrency(selectedRO.financial.tax) }
    ].filter(item => item.description),
    total: formatCurrency(selectedRO.financial.totalAmount)
  } : null;

  // Map repair status items from jobs
  const repairStatusItems = selectedRO?.jobs?.map(job => ({
    title: job.description || job.name || 'Service Item',
    partsStatus: job.partsStatus || 'In Stock',
    partsStatusColor: 
      job.partsStatus === 'Ordered' ? 'text-orange-500' : 
      job.partsStatus === 'In Stock' ? 'text-green-600' : 
      'text-gray-500',
    estimate: formatCurrency(job.amount || job.price || 0),
    status: job.status === 'COMPLETED' ? 'Complete' : 'In-Progress',
    statusColor: job.status === 'COMPLETED' ? 'bg-[#22c55e]' : 'bg-[#3b82f6]'
  })) || [];

  // Map vehicle information
  const vehicle = selectedRO?.vehicle ? {
    fullName: `${selectedRO.vehicle.year} ${selectedRO.vehicle.make} ${selectedRO.vehicle.model}`,
    vin: selectedRO.vehicle.vin || 'N/A',
    mileage: selectedRO.vehicle.mileageIn || selectedRO.vehicle.mileageOut || 'N/A',
    lastService: formatDate(selectedRO.closedTime),
    serviceAdvisor: selectedRO.serviceAdvisor?.name || selectedRO.customer?.serviceAdvisor || 'Not Assigned'
  } : null;

  // Map contact information
  const contactInfo = selectedRO?.customer || contact ? {
    phone: selectedRO?.customer?.phone || contact?.phone || contact?.phones?.[0]?.number || '(555) 123-4567',
    email: selectedRO?.customer?.email || contact?.email || contact?.emails?.[0]?.address || 'No email on file',
    address: selectedRO?.customer?.address ? 
      `${selectedRO.customer.address.street || ''}\n${selectedRO.customer.address.city || ''}, ${selectedRO.customer.address.state || ''} ${selectedRO.customer.address.zip || ''}`.trim() : 
      'No address on file'
  } : null;

  // Loading state
  if (allRepairOrders.length === 0 && loadingStage < 4) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // No repair orders
  if (allRepairOrders.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-600">No repair orders found for this customer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto space-y-4">
      {/* RO Tabs Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Repair Orders ({allRepairOrders.length})</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedROIndex(Math.max(0, selectedROIndex - 1))}
              disabled={selectedROIndex === 0}
              className={`p-1 rounded ${selectedROIndex === 0 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:bg-blue-50'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              {selectedROIndex + 1} of {allRepairOrders.length}
            </span>
            <button
              onClick={() => setSelectedROIndex(Math.min(allRepairOrders.length - 1, selectedROIndex + 1))}
              disabled={selectedROIndex === allRepairOrders.length - 1}
              className={`p-1 rounded ${selectedROIndex === allRepairOrders.length - 1 
                ? 'text-gray-400 cursor-not-allowed' 
                : 'text-blue-600 hover:bg-blue-50'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {allRepairOrders.map((ro, index) => (
            <button
              key={ro.roId || index}
              onClick={() => setSelectedROIndex(index)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                index === selectedROIndex
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className="text-sm">RO #{ro.roNumber}</span>
                <span className="text-xs opacity-80">{formatDate(ro.createdTime)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="bg-[#dde8ff] border-l-4 border-blue-900 p-6 rounded-lg">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#1e3a8a] rounded-full flex items-center justify-center p-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L1 21h22L12 2z" fill="#ffffff" />
                <path d="M12 9v4m0 4h.01" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {custPayStatus === 'Invoiced' ? 'Invoiced Repair Order' : 'Open Repair Order'}
              </h2>
              <p className="text-sm text-gray-600">
                {custPayStatus === 'Invoiced' ? 'Payment Required - Customer Calling' : 'Service In Progress'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{repairOrder.amount}</div>
            <div className="text-xs text-gray-600">
              {custPayStatus === 'Invoiced' ? 'Amount Due' : 'Estimate'}
            </div>
          </div>
        </div>

        {/* Three Cards Section */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Repair Order Details */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              {loading ? (
                <RepairOrderSkeleton />
              ) : (
                <>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Repair Order Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">RO Number:</span>
                      <span className="font-semibold">{repairOrder.roNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-semibold">{repairOrder.service}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-semibold">{repairOrder.vehicle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Technician:</span>
                      <span className="font-semibold">{repairOrder.technician}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Completion & Promise Details */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              {loading ? (
                <RepairOrderSkeleton />
              ) : (
                <>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Completion & Promise Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-semibold">{repairOrder.completed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promise Date:</span>
                      <span className="font-semibold">{repairOrder.promiseDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Promise Time:</span>
                      <span className="font-semibold">{repairOrder.promiseTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="bg-[#002e85] text-white text-xs px-3 py-1.5 rounded-full">
                        {repairOrder.status}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Conditional Card */}
          {custPayStatus === 'Invoiced' ? (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Invoice Breakdown
              </h3>
              <div className="space-y-2">
                {invoice?.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.description}</span>
                    <span className="font-semibold">{item.amount}</span>
                  </div>
                ))}
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>Total Amount Due:</span>
                  <span>{invoice?.total}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Repair Status</h3>
              <div className="space-y-3">
                {repairStatusItems.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">Parts Status:</span>
                            <span className={`font-semibold ml-1 ${item.partsStatusColor}`}>
                              {item.partsStatus}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Estimate:</span>
                            <span className="font-semibold ml-1 text-gray-900">{item.estimate}</span>
                          </div>
                        </div>
                      </div>
                      <button className={`${item.statusColor} hover:opacity-90 text-white font-medium py-2 px-4 rounded-xl text-sm whitespace-nowrap`}>
                        {item.status}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Send Payment Link Button */}
        {custPayStatus === 'Invoiced' && (
          <div className="flex justify-end mt-6">
            <button className="bg-white hover:bg-gray-50 text-[#002e85] font-medium py-2 px-4 rounded-lg flex items-center gap-2 text-sm border border-gray-200">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Send Payment Link
            </button>
          </div>
        )}
      </div>

      {/* Bottom Section Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Vehicle Information */}
        {vehicle && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Car className="w-4 h-4" style={{ color: '#1e3a8a' }} />
              Vehicle Information
            </h3>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: '#1e3a8a' }}>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-8.5l1.96 2.5H17V9.5h2.5zM18 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                </svg>
              </div>
              <div className="flex-1 space-y-1 text-sm">
                <div className="font-semibold text-gray-900">{vehicle.fullName}</div>
                <div className="text-gray-600">VIN: {vehicle.vin}</div>
                <div className="text-gray-500">Mileage: {vehicle.mileage}</div>
                <div className="pt-2 mt-2 border-t space-y-1 text-xs">
                  <div className="text-gray-600">
                    Last Service: <span className="font-semibold text-black">{vehicle.lastService}</span>
                  </div>
                  <div className="text-gray-600">
                    Service Advisor: <span className="font-semibold text-black">{vehicle.serviceAdvisor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Information */}
        {contactInfo && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-5 text-white" fill="currentColor" viewBox="0 0 26 20">
                  <g>
                    <circle cx="7" cy="7" r="3" />
                    <path d="M7 12c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z" />
                    <rect x="16" y="5" width="8" height="2" />
                    <rect x="16" y="9" width="8" height="2" />
                    <rect x="16" y="13" width="8" height="2" />
                  </g>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-blue-900 mt-0.5" />
                <div>
                  <div className="text-base font-medium text-gray-900">{contactInfo.phone}</div>
                  <div className="text-sm text-gray-500">Primary</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-900 mt-0.5" />
                <div>
                  <div className="text-base font-medium text-gray-900">{contactInfo.email}</div>
                  <div className="text-sm text-gray-500">Email</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-900 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <div>
                  <div className="text-base font-medium text-gray-900 whitespace-pre-line">{contactInfo.address}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              Transfer to Service
            </button>
            <button className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Service
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              View Call History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceAdvisorMainCard;