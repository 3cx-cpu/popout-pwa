// Update src/components/cards/receptionist/ReceptionistMainCard.jsx
import React from 'react';
import { User, Car, RefreshCw, Activity, Users, Phone } from 'lucide-react';

const ReceptionistMainCard = ({ loading, customerData, from, vehicleData, allLeads, selectedLeadIndex, handleLeadClick }) => {
  const contact = customerData?.contact || {};
  const salesAgent = customerData?.salesAssignment || null;

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
      return 'Active Lead';
    }
    
    if (status === 'bad' || status === 'dead' || status === 'lost' || status === 'inactive' || status === 'closed') {
      return 'Bad Lead';
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
                  {contact?.email }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Address:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {contact?.address || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Lead Source:</span>
                <span className="text-sm font-semibold text-[#5B79B8]">
                  {customerData?.leadSource?.leadSourceName}
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
                  {vehicleData.desiredVehicle.trim || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Color Preference:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {vehicleData.desiredVehicle.colorPreference || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-black font-bold">Retail Price:</span>
                <span className="text-sm font-semibold text-gray-900">
                  ${(vehicleData.desiredVehicle.sellingPrice || vehicleData.desiredVehicle.msrp || 0).toLocaleString()}
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
                  {(vehicleData.tradeVehicle.mileage || 0).toLocaleString()} miles
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
        <div className="bg-white rounded-lg shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-base font-semibold">Sales Assignment</h2>
          </div>
          
          {salesAgent ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                  {salesAgent.firstName?.[0]}{salesAgent.lastName?.[0]}
                </div>
                <div>
                  <div className="font-semibold">{salesAgent.fullName}</div>
                  <div className="text-xs text-gray-600">{salesAgent.ilmAccess}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Available</span>
                  </div>
                </div>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                Transfer Call
              </button>

              <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Email:</span>
                  <div className="text-xs break-all">{salesAgent.emailAddress}</div>
                </div>
                <div>
                  <span className="text-gray-600">User ID:</span>
                  <div className="font-semibold">{salesAgent.userId}</div>
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