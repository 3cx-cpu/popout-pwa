// client\src\components\cards\receptionist\ReceptionistMainCard.jsx

import React from 'react';
import { User, Car, RefreshCw, Activity, Users, Phone, Mail } from 'lucide-react';

const ReceptionistMainCard = ({ loading, customerData, from, vehicleData, allLeads, selectedLeadIndex, handleLeadClick }) => {
  const contact = customerData?.contact || {};
  const salesAgent = customerData?.salesRepInfo || null;

  // Function to determine lead status color
  const getLeadStatusColor = (leadStatus) => {
    const status = leadStatus?.toLowerCase();

    // Active/Good statuses - Green
    if (status === 'active' || status === 'hot' || status === 'warm' || status === 'new') {
      return 'bg-green-50 border-l-4 border-green-500';
    }

    // Bad/Inactive statuses - Red
    if (status === 'bad' || status === 'dead' || status === 'lost' || status === 'inactive' || status === 'closed') {
      return 'bg-red-50 border-l-4 border-red-500';
    }

    // Neutral statuses - Yellow/Orange
    if (status === 'cold' || status === 'pending' || status === 'follow_up') {
      return 'bg-yellow-50 border-l-4 border-yellow-500';
    }

    // Default - Blue
    return 'bg-blue-50 border-l-4 border-blue-500';
  };

  // Function to get status display text
  const getStatusDisplayText = (leadStatus) => {
    const status = leadStatus?.toLowerCase();
    
    if (status === 'active' || status === 'hot' || status === 'warm' || status === 'new') {
      return 'Leads';
    }
    
    if (status === 'bad' || status === 'dead' || status === 'lost' || status === 'inactive' || status === 'closed') {
      return 'Leads';
    }
    
    return 'Lead';
  };

  return (
    <div className="space-y-4">
      {/* First Row - 3 Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Customer Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-yellow-600" />
            </div>
            <h2 className="text-lg font-bold text-[#5B79B8]">Customer Information</h2>
          </div>
          {loading ? (
            <div className="space-y-4">
              {['Name:', 'Phone:', 'Email:', 'Address:', 'Lead Source:'].map((label, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-black font-bold">{label}</span>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Name:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {contact?.fullName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Phone:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {contact?.phone || customerData?.callInfo?.party_caller_id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Email:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {contact?.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Address:</span>
                <span className="text-sm font-semibold text-gray-900">
                  <div>
                <div className="text-base font-medium text-gray-900">
                  {contact?.StreetAddress || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">{contact?.cityStatePost || 'N/A'}</div>
              </div>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Lead Source:</span>
                <span className="text-sm font-semibold text-[#5B79B8]">
                  {allLeads[selectedLeadIndex]?.leadSource?.leadSourceName || customerData?.leadSource?.leadSourceName || 'Unknown'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Desired Vehicle Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-yellow-600" />
              </div>
              <h2 className="text-lg font-bold text-[#5B79B8]">Desired Vehicle</h2>
            </div>
            {allLeads.length > 1 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Lead {selectedLeadIndex + 1} of {allLeads.length}
              </span>
            )}
          </div>

          {vehicleData?.desiredVehicle ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Year/Make/Model:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vehicleData.desiredVehicle.year} {vehicleData.desiredVehicle.make} {vehicleData.desiredVehicle.model}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Trim Level:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {(vehicleData.desiredVehicle.trim && vehicleData.desiredVehicle.trim !== "null" && vehicleData.desiredVehicle.trim.trim() !== "") 
                    ? vehicleData.desiredVehicle.trim 
                    : vehicleData.desiredVehicle.trimName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Color Preference:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {(vehicleData.desiredVehicle.exteriorColor && vehicleData.desiredVehicle.exteriorColor !== "null" && vehicleData.desiredVehicle.exteriorColor.trim() !== "") 
                    ? vehicleData.desiredVehicle.exteriorColor 
                    : vehicleData.desiredVehicle.externalColorName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Retail Price:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vehicleData.desiredVehicle.sellingPrice 
                    ? `$${vehicleData.desiredVehicle.sellingPrice.toLocaleString()}`
                    : vehicleData.desiredVehicle.price 
                      ? `$${vehicleData.desiredVehicle.price.toLocaleString()}`
                      : vehicleData.desiredVehicle.msrp
                        ? `$${vehicleData.desiredVehicle.msrp.toLocaleString()}`
                        : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No vehicle preferences on file
            </div>
          )}
        </div>

        {/* Trade-in Vehicle Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-yellow-600" />
              </div>
              <h2 className="text-lg font-bold text-[#5B79B8]">Trade-in Vehicle</h2>
            </div>
            {allLeads.length > 1 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                Lead {selectedLeadIndex + 1} of {allLeads.length}
              </span>
            )}
          </div>

          {vehicleData?.tradeVehicle ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Year/Make/Model:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vehicleData.tradeVehicle.year} {vehicleData.tradeVehicle.make} {vehicleData.tradeVehicle.model}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Trim:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vehicleData.tradeVehicle.trim || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Mileage:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vehicleData.tradeVehicle.mileage ? `${vehicleData.tradeVehicle.mileage.toLocaleString()} miles` : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              No trade vehicle on file
            </div>
          )}
        </div>
      </div>

      {/* Second Row - 2 Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          {/* Lead Activity Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 text-yellow-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h2 className="text-base font-bold text-blue-900">Lead Status & Activity</h2>
            </div>

            {allLeads.length > 0 ? (
              <div>
                {/* Dynamic status box based on selected lead status */}
                {allLeads[selectedLeadIndex] && (
                  <div className={`${getLeadStatusColor(allLeads[selectedLeadIndex].leadStatus)} rounded-lg p-3 mb-4`}>
                    <div className="font-bold text-gray-900">{getStatusDisplayText(allLeads[selectedLeadIndex].leadStatus)}</div>
                    <div className="text-sm text-gray-600">{allLeads.length} lead(s) found</div>
                  </div>
                )}

                <div className="space-y-2">
                  {allLeads.map((lead, index) => (
                    <div
                      key={`${lead.leadId}-${index}`}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedLeadIndex === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => handleLeadClick(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{lead.leadType} Lead</div>
                          <div className="text-xs text-gray-600">
                            Status: {lead.leadStatus?.replace(/_/g, ' ')} | Category: {lead.leadGroupCategory}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${lead.leadStatus?.toLowerCase() === 'active' ||
                            lead.leadStatus?.toLowerCase() === 'hot' ||
                            lead.leadStatus?.toLowerCase() === 'warm' ||
                            lead.leadStatus?.toLowerCase() === 'new'
                            ? 'bg-green-100 text-green-700'
                            : lead.leadStatus?.toLowerCase() === 'bad' ||
                              lead.leadStatus?.toLowerCase() === 'dead' ||
                              lead.leadStatus?.toLowerCase() === 'lost' ||
                              lead.leadStatus?.toLowerCase() === 'inactive' ||
                              lead.leadStatus?.toLowerCase() === 'closed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                            }`}>
                            {lead.leadStatus || 'ACTIVE'}
                          </div>
                          {selectedLeadIndex === index && (
                            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Selected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No active leads found</div>
            )}
          </div>
        </div>
        
        {/* Sales Assignment Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-yellow-500" />
            <h2 className="text-base font-bold text-blue-900">Sales Assignment</h2>
          </div>

          {salesAgent ? (
            <div>
              <div className="flex items-center gap-3 mb-4" style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <div className="text-white font-bold text-lg">
                    {salesAgent.firstName?.[0]}{salesAgent.lastName?.[0]}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900">{salesAgent.fullName}</div>
                  <div className="text-sm text-gray-600">
                    {salesAgent.userTypes?.join(', ') || 'Sales Representative'}
                  </div>
                  {/* <div className="flex items-center gap-2 mt-1">
                    <span className="bg-green-100 text-green-700 text-sm px-2 py-0.5 rounded">Available</span>
                    <span className="text-sm text-gray-600">Ext: N/A</span>
                  </div> */}
                </div>
                {/* <button 
                  className="text-white text-sm font-medium py-2 px-4 rounded-md flex items-center gap-2 transition-colors"
                  style={{ backgroundColor: '#2b4f7d' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a5f'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#2b4f7d'}
                >
                  <Phone className="w-4 h-4" />
                  Transfer
                </button> */}
              </div>

              {/* Add email if available */}
              {salesAgent.emailAddress && (
                <div className="mb-3 px-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <a href={`mailto:${salesAgent.emailAddress}`} className="text-blue-600 hover:underline">
                      {salesAgent.emailAddress}
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-3 border-t border-gray-200">
                {/* Lead Priority with conditional styling */}
                <div className="flex justify-between items-start">
                  <div className="text-medium font-semibold text-black-600 min-w-[140px]">Lead Priority:</div>
                  <div className="text-gray-900 text-right">
                    {allLeads[selectedLeadIndex]?.isHot ? (
                      <span className="bg-red-500 text-white px-3 py-1 rounded text-sm font-semibold">Hot</span>
                    ) : (
                      <span className="bg-gray-300 text-gray-600 px-3 py-1 rounded text-sm font-semibold line-through">Hot</span>
                    )}
                  </div>
                </div>

                {/* Lead Source */}
                <div className="flex justify-between items-start">
                  <div className="text-medium font-semibold text-black-600 min-w-[140px]">Lead Source:</div>
                  <div className="text-gray-900 text-right">
                    {allLeads[selectedLeadIndex]?.leadSource?.leadSourceName || 'Unknown'}
                  </div>
                </div>

                {/* Time Created */}
                <div className="flex justify-between items-start">
                  <div className="text-medium font-semibold text-black-600 min-w-[140px]">Created On:</div>
                  <div className="text-gray-900 text-right">
                    {allLeads[selectedLeadIndex]?.createdUtc 
                      ? new Date(allLeads[selectedLeadIndex].createdUtc).toLocaleString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                          timeZone: 'UTC'
                        }) + ' UTC'
                      : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">No agent assigned</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistMainCard;