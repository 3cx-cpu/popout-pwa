// client\src\components\cards\receptionist\ReceptionistMainCard.jsx

import React from 'react';
import { User, Car, RefreshCw, Activity, Users, Phone, Mail } from 'lucide-react';

const ReceptionistMainCard = ({ loading, customerData, from, vehicleData, allLeads, selectedLeadIndex, handleLeadClick, loadingStage = 4 }) => {
  
  // Add state for tracking which vehicle to display
  const [selectedVehicleOfInterestIndex, setSelectedVehicleOfInterestIndex] = React.useState(0);
  const [selectedTradeVehicleIndex, setSelectedTradeVehicleIndex] = React.useState(0);
  
  // Add debug logging
  console.log('🎴 ReceptionistMainCard render:', {
    loading,
    loadingStage,
    hasCustomerData: !!customerData,
    contact: customerData?.contact,
    leadsCount: allLeads?.length
  });

  const contact = customerData?.contact || {};
  const salesAgent = customerData?.salesRepInfo || null;
  

  // Show loading skeleton only for Stage 1 (no contact data yet)
  const showLoadingSkeleton = loadingStage < 2 || !contact.fullName;

  // Function to determine lead status color
  const getLeadStatusColor = (leadStatus) => {
    const status = leadStatus?.toLowerCase();

    if (status === 'active' || status === 'hot' || status === 'warm' || status === 'new') {
      return 'bg-green-50 border-l-4 border-green-500';
    }

    if (status === 'bad' || status === 'dead' || status === 'lost' || status === 'inactive' || status === 'closed') {
      return 'bg-red-50 border-l-4 border-red-500';
    }

    if (status === 'cold' || status === 'pending' || status === 'follow_up') {
      return 'bg-yellow-50 border-l-4 border-yellow-500';
    }

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
    <div className="space-y-3 max-w-[1240px] mx-auto">
      {/* First Row - 3 Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Customer Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-yellow-600" />
            </div>
            <h2 className="text-base xl:text-md font-bold text-[#5B79B8]">Customer Information</h2>
          </div>
          {showLoadingSkeleton ? (
            <div className="space-y-3">
              {['Name:', 'Phone:', 'Email:', 'Address:', 'Lead Source:'].map((label, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm xl:text-md text-black font-bold">{label}</span>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-28"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Name:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
                  {contact?.fullName || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Phone:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
                  {contact?.phone || from || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Email:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900 break-all">
                  {contact?.email || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Address:</span>
                <div>
                  <div className="text-sm xl:text-md font-medium text-gray-900">
                    {contact?.StreetAddress || 'N/A'}
                  </div>
                  <div className="text-xs xl:text-sm text-gray-500">{contact?.cityStatePost || 'N/A'}</div>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Lead Source:</span>
                <span className="text-sm xl:text-md font-semibold text-[#5B79B8] break-words">
                  {allLeads[selectedLeadIndex]?.leadSource?.leadSourceName || customerData?.leadSource?.leadSourceName || 'Unknown'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Desired Vehicle Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-yellow-600" />
              </div>
              <h2 className="text-base xl:text-md font-bold text-[#5B79B8]">Desired Vehicle</h2>
            </div>
            {allLeads.length > 1 && (
              <span className="text-xs xl:text-sm bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                Lead {selectedLeadIndex + 1}/{allLeads.length}
              </span>
            )}
          </div>

          {loadingStage < 4 ? (
            <div className="space-y-3">
              {['Year/Make/Model:', 'Trim Level:', 'Color Preference:', 'Retail Price:'].map((label, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm xl:text-md text-black font-bold">{label}</span>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-28"></div>
                </div>
              ))}
            </div>
          ) : vehicleData?.desiredVehicle ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Year/Make/Model:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
                  {vehicleData.desiredVehicle.year} {vehicleData.desiredVehicle.make} {vehicleData.desiredVehicle.model}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Trim Level:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
                  {(vehicleData.desiredVehicle.trim && vehicleData.desiredVehicle.trim !== "null" && vehicleData.desiredVehicle.trim.trim() !== "") 
                    ? vehicleData.desiredVehicle.trim 
                    : vehicleData.desiredVehicle.trimName || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Color Preference:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
                  {(vehicleData.desiredVehicle.exteriorColor && vehicleData.desiredVehicle.exteriorColor !== "null" && vehicleData.desiredVehicle.exteriorColor.trim() !== "") 
                    ? vehicleData.desiredVehicle.exteriorColor 
                    : vehicleData.desiredVehicle.externalColorName || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Retail Price:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
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
            <div className="text-center text-gray-500 py-6 text-sm xl:text-md">
              No vehicle preferences on file
            </div>
          )}
        </div>

        {/* Trade-in Vehicle Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-3 h-3 text-yellow-600" />
              </div>
              <h2 className="text-base xl:text-md font-bold text-[#5B79B8]">Trade-in Vehicle</h2>
            </div>
            {allLeads.length > 1 && (
              <span className="text-xs xl:text-sm bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                Lead {selectedLeadIndex + 1}/{allLeads.length}
              </span>
            )}
          </div>

          {loadingStage < 4 ? (
            <div className="space-y-3">
              {['Year/Make/Model:', 'Trim:', 'Mileage:'].map((label, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm xl:text-md text-black font-bold">{label}</span>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-28"></div>
                </div>
              ))}
            </div>
          ) : vehicleData?.tradeVehicle ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Year/Make/Model:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
                  {vehicleData.tradeVehicle.year} {vehicleData.tradeVehicle.make} {vehicleData.tradeVehicle.model}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Trim:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
                  {vehicleData.tradeVehicle.trim || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm xl:text-md text-black font-bold">Mileage:</span>
                <span className="text-sm xl:text-md font-semibold text-gray-900">
                  {vehicleData.tradeVehicle.mileage ? `${vehicleData.tradeVehicle.mileage.toLocaleString()} miles` : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6 text-sm xl:text-md">
              No trade vehicle on file
            </div>
          )}
        </div>
      </div>

      {/* Second Row - 2 Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          {/* Lead Activity Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 text-yellow-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h2 className="text-base xl:text-md font-bold text-blue-900">Lead Status & Activity</h2>
            </div>

            {loadingStage < 3 ? (
              <div className="text-center text-gray-500 py-6">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                <span className="text-sm xl:text-md">Loading leads...</span>
              </div>
            ) : allLeads.length > 0 ? (
              <div>
                {allLeads[selectedLeadIndex] && (
                  <div className={`${getLeadStatusColor(allLeads[selectedLeadIndex].leadStatus)} rounded-lg p-2.5 mb-3`}>
                    <div className="font-bold text-gray-900 text-sm xl:text-md">{getStatusDisplayText(allLeads[selectedLeadIndex].leadStatus)}</div>
                    <div className="text-sm xl:text-md text-gray-600">{allLeads.length} lead(s) found</div>
                  </div>
                )}

                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {allLeads.map((lead, index) => (
                    <div
                      key={`${lead.leadId}-${index}`}
                      className={`border rounded-lg p-2.5 cursor-pointer transition-all ${selectedLeadIndex === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => handleLeadClick(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm xl:text-md">{lead.leadType} Lead</div>
                          <div className="text-sm xl:text-md text-gray-600">
                            Status: {lead.leadStatus?.replace(/_/g, ' ')} | {lead.leadGroupCategory}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <div className={`px-2 py-0.5 rounded text-xs xl:text-sm font-semibold ${lead.leadStatus?.toLowerCase() === 'active' ||
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
                            <span className="text-xs xl:text-sm bg-blue-500 text-white px-2 py-0.5 rounded">Selected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-6 text-sm xl:text-md">No active leads found</div>
            )}
          </div>
        </div>
        
        {/* Sales Assignment Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-yellow-500" />
            <h2 className="text-base xl:text-md font-bold text-blue-900">Sales Assignment</h2>
          </div>

          {loadingStage < 4 ? (
            <div className="text-center text-gray-500 py-6">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-sm xl:text-md">Loading sales info...</span>
            </div>
          ) : salesAgent ? (
            <div>
              <div className="flex items-center gap-2 mb-3" style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '6px' }}>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                  <div className="text-white font-bold text-sm xl:text-md">
                    {salesAgent.firstName?.[0]}{salesAgent.lastName?.[0]}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm xl:text-md truncate">{salesAgent.fullName}</div>
                  <div className="text-sm xl:text-md text-gray-600 truncate">
                    {salesAgent.userTypes?.join(', ') || 'Sales Representative'}
                  </div>
                </div>
              </div>

              {salesAgent.emailAddress && (
                <div className="mb-2 px-2">
                  <div className="flex items-center gap-1 text-sm xl:text-md">
                    <Mail className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    <a 
                      href={`mailto:${salesAgent.emailAddress}`} 
                      className="text-blue-600 hover:underline truncate"
                      title={salesAgent.emailAddress}
                    >
                      {salesAgent.emailAddress}
                    </a>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-start gap-2">
                  <div className="text-sm xl:text-md font-semibold text-black-600 whitespace-nowrap">Lead Priority:</div>
                  <div className="text-sm xl:text-md text-gray-900 text-right">
                    {allLeads[selectedLeadIndex]?.isHot ? (
                      <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs xl:text-sm font-semibold">Hot</span>
                    ) : (
                      <span className="bg-gray-300 text-gray-600 px-2 py-0.5 rounded text-xs xl:text-sm font-semibold line-through">Hot</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="text-sm xl:text-md font-semibold text-black-600">Lead Source:</div>
                  <div className="text-sm xl:text-md text-gray-900 break-words">
                    {allLeads[selectedLeadIndex]?.leadSource?.leadSourceName || 'Unknown'}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="text-sm xl:text-md font-semibold text-black-600">Created On:</div>
                  <div className="text-sm xl:text-md text-gray-900">
                    {allLeads[selectedLeadIndex]?.createdUtc 
                      ? new Date(allLeads[selectedLeadIndex].createdUtc).toLocaleString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        }).replace(',', '')
                      : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-6 text-sm xl:text-md">No agent assigned</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistMainCard;