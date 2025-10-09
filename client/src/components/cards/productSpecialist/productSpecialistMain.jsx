// client\src\components\cards\productSpecialist\productSpecialistMain.jsx

import React from 'react';
import { User, Car, RefreshCw, Activity, Users, Phone, Clock, Mail } from 'lucide-react';

const ProductSpecialistMainCard = ({ loading, customerData, from, vehicleData, allLeads, selectedLeadIndex, handleLeadClick }) => {
  // Add state for tracking which vehicle to display
  const [selectedVehicleOfInterestIndex, setSelectedVehicleOfInterestIndex] = React.useState(0);
  const [selectedTradeVehicleIndex, setSelectedTradeVehicleIndex] = React.useState(0);

  const contact = customerData?.contact || {};
  const salesAgent = customerData?.salesRepInfo || null;

  // Get vehicles for the selected lead - ONLY valid ones
  const currentLead = allLeads[selectedLeadIndex];
  const vehiclesOfInterest = currentLead?.vehiclesOfInterest || [];
  const tradeVehicles = currentLead?.tradeVehicles || [];

  // Reset vehicle indices when lead changes
  React.useEffect(() => {
    setSelectedVehicleOfInterestIndex(0);
    setSelectedTradeVehicleIndex(0);
  }, [selectedLeadIndex]);

  // Get current vehicles to display
  const currentDesiredVehicle = vehiclesOfInterest[selectedVehicleOfInterestIndex];
  const currentTradeVehicle = tradeVehicles[selectedTradeVehicleIndex];

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
      {/* Wrapper div with light blue background and dark blue left border */}
      <div className="bg-[#dde8ff] border-l-4 border-blue-900 p-4 rounded-lg space-y-3">
        {/* First Row - 2 Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Lead Status & Activity Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 text-yellow-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h2 className="text-base xl:text-md font-bold text-blue-900">Lead Status & Activity</h2>
            </div>

            {allLeads.length > 0 ? (
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
              <div className="text-center text-gray-500 py-8 text-sm xl:text-md">No active leads found</div>
            )}
          </div>

          {/* Sales Assignment Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-yellow-500" />
              <h2 className="text-base xl:text-md font-bold text-blue-900">Sales Assignment</h2>
            </div>

            {salesAgent ? (
              <div>
                <div className="flex items-center gap-3 mb-3" style={{ backgroundColor: '#f9fafb', padding: '10px', borderRadius: '6px' }}>
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
                  <div className="mb-3 px-2">
                    <div className="flex items-center gap-2 text-sm xl:text-md">
                      <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
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

                <div className="space-y-2.5 pt-3 border-t border-gray-200">
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

                  <div className="flex justify-between items-start gap-2">
                    <div className="text-sm xl:text-md font-semibold text-black-600 whitespace-nowrap">Lead Source:</div>
                    <div 
                      className="text-sm xl:text-md text-gray-900 text-right break-words max-w-[180px]"
                      title={allLeads[selectedLeadIndex]?.leadSource?.leadSourceName || 'Unknown'}
                    >
                      {allLeads[selectedLeadIndex]?.leadSource?.leadSourceName || 'Unknown'}
                    </div>
                  </div>

                  <div className="flex justify-between items-start gap-2">
                    <div className="text-sm xl:text-md font-semibold text-black-600 whitespace-nowrap">Created On:</div>
                    <div className="text-sm xl:text-md text-gray-900 text-right whitespace-nowrap">
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
              <div className="text-center text-gray-500 py-8 text-sm xl:text-md">No agent assigned</div>
            )}
          </div>
        </div>

        {/* Second Row - Last Activity */}
        <div className="bg-[#eff6ff] rounded-lg border border-gray-200 p-4">
          <h2 className="text-base xl:text-md font-bold text-blue-900 mb-4">Last Activity</h2>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 text-base xl:text-md">Test Drive Appointment</div>
              <div className="text-gray-600 text-sm xl:text-md mt-1">Test Drive - November 15, 2025 10:00</div>
              <div className="text-gray-500 text-sm xl:text-md mt-0.5">Associate: Sarah Johnson</div>
            </div>
          </div>
        </div>
      </div>

      {/* Third Row - 3 Information Cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Desired Vehicle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4 justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                </svg>
              </div>
              <h2 className="text-base xl:text-md font-bold" style={{ color: '#2b4f7d' }}>Desired Vehicle</h2>
            </div>
            {vehiclesOfInterest.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedVehicleOfInterestIndex(prev => Math.max(0, prev - 1))}
                  disabled={selectedVehicleOfInterestIndex === 0}
                  className="px-1.5 py-0.5 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  ←
                </button>
                <span className="text-sm xl:text-md text-gray-600 font-medium">
                  {selectedVehicleOfInterestIndex + 1}/{vehiclesOfInterest.length}
                </span>
                <button
                  onClick={() => setSelectedVehicleOfInterestIndex(prev => Math.min(vehiclesOfInterest.length - 1, prev + 1))}
                  disabled={selectedVehicleOfInterestIndex === vehiclesOfInterest.length - 1}
                  className="px-1.5 py-0.5 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {currentDesiredVehicle ? (
            <div className="space-y-2.5">
              <div className="flex flex-col gap-0.5">
                <div className="text-sm xl:text-md font-semibold text-black-600">Year/Make/Model:</div>
                <div className="text-sm xl:text-md text-gray-900">
                  {currentDesiredVehicle.year || 'N/A'} {currentDesiredVehicle.make} {currentDesiredVehicle.model}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm xl:text-md font-semibold text-black-600">Trim Level:</div>
                <div className="text-sm xl:text-md text-gray-900">
                  {(currentDesiredVehicle.trim && currentDesiredVehicle.trim !== "null" && currentDesiredVehicle.trim.trim() !== "") 
                    ? currentDesiredVehicle.trim 
                    : currentDesiredVehicle.trimName || 'N/A'}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm xl:text-md font-semibold text-black-600">Color:</div>
                <div className="text-sm xl:text-md text-gray-900">
                  {(currentDesiredVehicle.exteriorColor && currentDesiredVehicle.exteriorColor !== "null" && currentDesiredVehicle.exteriorColor.trim() !== "") 
                    ? currentDesiredVehicle.exteriorColor 
                    : currentDesiredVehicle.externalColorName || 'N/A'}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm xl:text-md font-semibold text-black-600">Retail Price:</div>
                <div className="text-sm xl:text-md text-gray-900">
                  {currentDesiredVehicle.sellingPrice 
                    ? `$${currentDesiredVehicle.sellingPrice.toLocaleString()}`
                    : currentDesiredVehicle.price 
                      ? `$${currentDesiredVehicle.price.toLocaleString()}`
                      : 'N/A'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4 text-sm xl:text-md">No vehicle preferences</div>
          )}
        </div>

        {/* Current Vehicle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4 justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h2 className="text-base xl:text-md font-bold" style={{ color: '#2b4f7d' }}>Current Vehicle</h2>
            </div>
            {tradeVehicles.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedTradeVehicleIndex(prev => Math.max(0, prev - 1))}
                  disabled={selectedTradeVehicleIndex === 0}
                  className="px-1.5 py-0.5 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  ←
                </button>
                <span className="text-sm xl:text-md text-gray-600 font-medium">
                  {selectedTradeVehicleIndex + 1}/{tradeVehicles.length}
                </span>
                <button
                  onClick={() => setSelectedTradeVehicleIndex(prev => Math.min(tradeVehicles.length - 1, prev + 1))}
                  disabled={selectedTradeVehicleIndex === tradeVehicles.length - 1}
                  className="px-1.5 py-0.5 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {currentTradeVehicle ? (
            <div className="space-y-2.5">
              <div className="flex flex-col gap-0.5">
                <div className="text-sm xl:text-md font-semibold text-black-600">Year/Make/Model:</div>
                <div className="text-sm xl:text-md text-gray-900">
                  {currentTradeVehicle.year || 'N/A'} {currentTradeVehicle.make} {currentTradeVehicle.model}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm xl:text-md font-semibold text-black-600">Trim:</div>
                <div className="text-sm xl:text-md text-gray-900">
                  {currentTradeVehicle.trim || 'N/A'}
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-sm xl:text-md font-semibold text-black-600">Mileage:</div>
                <div className="text-sm xl:text-md text-gray-900">
                  {currentTradeVehicle.mileage || 'N/A'} miles
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4 text-sm xl:text-md">No trade vehicle</div>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-7 bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-4 text-white" fill="currentColor" viewBox="0 0 26 20">
                <g>
                  <circle cx="7" cy="7" r="3" />
                  <path d="M7 12c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z" />
                  <rect x="16" y="5" width="8" height="2" />
                  <rect x="16" y="9" width="8" height="2" />
                  <rect x="16" y="13" width="8" height="2" />
                </g>
              </svg>
            </div>
            <h2 className="text-base xl:text-md font-bold text-gray-900">Contact Information</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-blue-900 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm xl:text-md font-medium text-gray-900">
                  {contact?.phone || 'N/A'}
                </div>
                <div className="text-xs xl:text-sm text-gray-500">Primary</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-blue-900 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm xl:text-md font-medium text-gray-900 truncate" title={contact?.email || 'N/A'}>
                  {contact?.email || 'N/A'}
                </div>
                <div className="text-xs xl:text-sm text-gray-500">Email</div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-900 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <div>
                <div className="text-sm xl:text-md font-medium text-gray-900">
                  {contact?.StreetAddress || 'N/A'}
                </div>
                <div className="text-xs xl:text-sm text-gray-500">{contact?.cityStatePost || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSpecialistMainCard;