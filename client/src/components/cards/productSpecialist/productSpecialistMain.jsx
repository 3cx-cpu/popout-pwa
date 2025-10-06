import React from 'react';
import { User, Car, RefreshCw, Activity, Users, Phone, Clock, Mail } from 'lucide-react';

const ProductSpecialistMainCard = ({ loading, customerData, from, vehicleData, allLeads, selectedLeadIndex, handleLeadClick }) => {
  const contact = customerData?.contact || {};
  
  // FIXED: Only use salesRepInfo, completely ignore salesAssignment
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
      {/* Wrapper div with light blue background and dark blue left border */}
      <div className="bg-[#dde8ff] border-l-4 border-blue-900 p-6 rounded-lg space-y-4">        {/* First Row - 2 Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Lead Status & Activity Card - Original Design */}
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
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-green-100 text-green-700 text-sm px-2 py-0.5 rounded">Available</span>
            <span className="text-sm text-gray-600">Ext: N/A</span>
          </div>
        </div>
        <button 
          className="text-white text-sm font-medium py-2 px-4 rounded-md flex items-center gap-2 transition-colors"
          style={{ backgroundColor: '#2b4f7d' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a5f'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#2b4f7d'}
        >
          <Phone className="w-4 h-4" />
          Transfer
        </button>
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

        {/* <div className="flex justify-between items-start">
          <div className="text-medium font-semibold text-black-600 min-w-[140px]">Last Contact:</div>
          <div className="text-right" style={{ color: '#284c7b' }}>March 18, 2024</div>
        </div>
        <div className="flex justify-between items-start">
          <div className="text-medium font-semibold text-black-600 min-w-[140px]">Contact Method:</div>
          <div className="text-gray-900 text-right">Email Follow-up</div>
        </div>
        <div className="flex justify-between items-start">
          <div className="text-medium font-semibold text-black-600 min-w-[140px]">Next Follow-up:</div>
          <div className="text-gray-900 text-right text-yellow-600 font-medium">Today</div>
        </div> */}
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
        {/* Desired Vehicle Summary */}
        {/* {vehicleData?.desiredVehicle && (
          <div className="flex justify-between items-start">
            <div className="text-medium font-semibold text-black-600 min-w-[140px]">Desired Vehicle:</div>
            <div className="text-gray-900 text-right">
              {vehicleData.desiredVehicle.year} {vehicleData.desiredVehicle.make} {vehicleData.desiredVehicle.model}
            </div>
          </div>
        )} */}

        {/* Current Vehicle Summary */}
        {/* {vehicleData?.tradeVehicle && (
          <div className="flex justify-between items-start">
            <div className="text-medium font-semibold text-black-600 min-w-[140px]">Current Vehicle:</div>
            <div className="text-gray-900 text-right">
              {vehicleData.tradeVehicle.year} {vehicleData.tradeVehicle.make} {vehicleData.tradeVehicle.model}
            </div>
          </div>
        )} */}
      </div>
    </div>
  ) : (
    <div className="text-center text-gray-500 py-8">No agent assigned</div>
  )}
</div>
        </div>

        {/* Second Row - Last Activity */}
        <div className="bg-[#eff6ff] rounded-lg border border-gray-200 p-6">
          <h2 className="text-base font-bold text-blue-900 mb-6">Last Activity</h2>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900 text-lg">Test Drive Appointment</div>
              <div className="text-gray-600 mt-1">Test Drive - November 15, 2025 10:00</div>
              <div className="text-gray-500 text-sm mt-1">Associate: Sarah Johnson</div>
            </div>
          </div>
        </div>
      </div>

      {/* Third Row - 3 Information Cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Desired Vehicle */}
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
    <div className="flex items-center gap-2 mb-6">
      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold" style={{ color: '#2b4f7d' }}>Desired Vehicle</h2>
    </div>

    {vehicleData?.desiredVehicle ? (
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="text-medium font-semibold text-black-600 min-w-[140px]">Year/Make/Model:</div>
          <div className="text-gray-900 text-right">
            {vehicleData.desiredVehicle.year} {vehicleData.desiredVehicle.make} {vehicleData.desiredVehicle.model}
          </div>
        </div>
        <div className="flex justify-between items-start">
          <div className="text-medium font-semibold text-black-600 min-w-[140px]">Trim Level:</div>
          <div className="text-gray-900 text-right">
            {/* Check if trim is null or blank, then use trimName as fallback */}
            {(vehicleData.desiredVehicle.trim && vehicleData.desiredVehicle.trim !== "null" && vehicleData.desiredVehicle.trim.trim() !== "") 
              ? vehicleData.desiredVehicle.trim 
              : vehicleData.desiredVehicle.trimName || 'N/A'}
          </div>
        </div>
        <div className="flex justify-between items-start">
          <div className="text-medium font-semibold text-black-600 min-w-[140px]">Color Preference:</div>
          <div className="text-gray-900 text-right">
            {/* Check if exteriorColor is null or blank, then use externalColorName as fallback */}
            {(vehicleData.desiredVehicle.exteriorColor && vehicleData.desiredVehicle.exteriorColor !== "null" && vehicleData.desiredVehicle.exteriorColor.trim() !== "") 
              ? vehicleData.desiredVehicle.exteriorColor 
              : vehicleData.desiredVehicle.externalColorName || 'N/A'}
          </div>
        </div>
        <div className="flex justify-between items-start">
          <div className="text-medium font-semibold text-black-600 min-w-[140px]">Retail Price:</div>
          <div className="text-gray-900 text-right">
            {/* Use sellingPrice first, then price as fallback, format as currency */}
            {vehicleData.desiredVehicle.sellingPrice 
              ? `$${vehicleData.desiredVehicle.sellingPrice.toLocaleString()}`
              : vehicleData.desiredVehicle.price 
                ? `$${vehicleData.desiredVehicle.price.toLocaleString()}`
                : 'N/A'}
          </div>
        </div>
        {/* <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
          View →
        </button> */}
      </div>
    ) : (
      <div className="text-center text-gray-500 py-4">No vehicle preferences</div>
    )}
  </div>

        {/* Current Vehicle */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold" style={{ color: '#2b4f7d' }}>Current Vehicle</h2>
          </div>

          {vehicleData?.tradeVehicle ? (
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="text-medium font-semibold text-black-600 min-w-[140px]">Year/Make/Model:</div>
                <div className="text-gray-900 text-right">
                  {vehicleData.tradeVehicle.year || ''} {vehicleData.tradeVehicle.make || ''} {vehicleData.tradeVehicle.model || ''}
                </div>
              </div>
              <div className="flex justify-between items-start">
                <div className="text-medium font-semibold text-black-600 min-w-[140px]">Trim:</div>
                <div className="text-gray-900 text-right">{vehicleData.tradeVehicle.trim || 'N/A'}</div>
              </div>
              <div className="flex justify-between items-start">
                <div className="text-medium font-semibold text-black-600 min-w-[140px]">Mileage:</div>
                <div className="text-gray-900 text-right">
                  {(vehicleData.tradeVehicle.mileage || 'N/A')} miles
                </div>
              </div>
              {/* <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
        View →
      </button> */}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">No trade vehicle</div>
          )}
        </div>

        {/* Contact Information */}
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
                <div className="text-base font-medium text-gray-900">
                  {contact?.phone || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Primary</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-900 mt-0.5" />
              <div>
                <div className="text-base font-medium text-gray-900">
                  {contact?.email || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">Email</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-900 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <div>
                <div className="text-base font-medium text-gray-900">
                  {contact?.StreetAddress || 'N/A'}
                </div>
                <div className="text-sm text-gray-500">{contact?.cityStatePost || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSpecialistMainCard;