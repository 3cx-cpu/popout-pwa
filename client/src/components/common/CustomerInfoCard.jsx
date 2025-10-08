// client/src/components/common/CustomerInfoCard.jsx

import React from 'react';
import { Clock, User, Check, ChevronLeft, ChevronRight, Users } from 'lucide-react';

const CustomerInfoCard = ({ customerData, from, loading, selectedContactIndex, onContactChange, loadingStage = 4 }) => {
    const formatPhoneNumber = (phone) => {
        if (!phone) return '(555) 123-4567';
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
        return phone;
    };

    // Stage 1: Only phone number available
    if (loadingStage === 1 || loading) {
        return (
            <div className="bg-[#f7f8f9] border-b border-gray-200">
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-300 border-[3px] border-white flex-shrink-0 animate-pulse">
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                <User className="w-10 h-10 text-gray-600" />
                            </div>
                        </div>

                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-semibold text-gray-900 animate-pulse">
                                    Loading...
                                </h2>
                            </div>
                            <div className="flex items-center gap-2 font-semibold text-[#1e3a8a]">
                                <span className="text-lg">{formatPhoneNumber(from)}</span>
                            </div>
                            <div className="text-sm text-blue-600 mt-1 flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                                Fetching customer information...
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 mr-19">
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col items-center gap-1">
                                <div className="relative w-14 h-14 flex items-center justify-center">
                                    <div className="w-14 h-14 bg-gray-200 rounded-full absolute animate-pulse"></div>
                                    <button className="relative w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </button>
                                </div>
                                <span className="text-xs text-gray-600">Searching...</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <div className="relative w-14 h-14 flex items-center justify-center">
                                    <div className="w-14 h-14 bg-[#dbeafe] rounded-full absolute"></div>
                                    <button className="relative w-6 h-6 bg-[#2563eb] hover:bg-[#1d4ed8] rounded-full flex items-center justify-center transition-colors">
                                        <Clock className="w-6 h-6 text-white" />
                                    </button>
                                </div>
                                <span className="text-xs text-gray-600">
                                    {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Stage 2+: Customer data available
    const hasMultipleContacts = customerData?.hasMultipleContacts && customerData?.allContactsData?.length > 1;
    const allContactsData = customerData?.allContactsData || [];
    
    const currentContactData = hasMultipleContacts 
        ? allContactsData[selectedContactIndex] 
        : { contact: customerData?.contact };
    
    const currentContact = currentContactData?.contact || {};
    
    const phoneNumber = from || currentContact?.phone || '(555) 123-4567';
    const CustName = currentContact?.fullName || 'N/A';
    const CustId = currentContact?.contactId || 'N/A';

    // Show loading indicator for stages 2-3
    const isPartiallyLoaded = loadingStage < 4;

    return (
        <div className="bg-[#f7f8f9] border-b border-gray-200">
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-300 border-[3px] border-white flex-shrink-0">
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <User className="w-10 h-10 text-gray-600" />
                        </div>
                    </div>

                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-semibold text-gray-900">
                                {CustName}
                            </h2>
                            {isPartiallyLoaded && (
                                <div className="flex items-center gap-2 ml-2">
                                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                                        <span className="text-xs font-semibold">
                                            Loading details...
                                        </span>
                                    </div>
                                </div>
                            )}
                            {hasMultipleContacts && !isPartiallyLoaded && (
                                <div className="flex items-center gap-2 ml-2">
                                    <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Users className="w-4 h-4" />
                                        <span className="text-xs font-semibold">
                                            {selectedContactIndex + 1} of {allContactsData.length} contacts
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => onContactChange(Math.max(0, selectedContactIndex - 1))}
                                        disabled={selectedContactIndex === 0}
                                        className={`p-1 rounded ${selectedContactIndex === 0 
                                            ? 'text-gray-400 cursor-not-allowed' 
                                            : 'text-blue-600 hover:bg-blue-50'}`}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => onContactChange(Math.min(allContactsData.length - 1, selectedContactIndex + 1))}
                                        disabled={selectedContactIndex === allContactsData.length - 1}
                                        className={`p-1 rounded ${selectedContactIndex === allContactsData.length - 1 
                                            ? 'text-gray-400 cursor-not-allowed' 
                                            : 'text-blue-600 hover:bg-blue-50'}`}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 font-semibold text-[#1e3a8a]">
                            <span className="text-lg">{formatPhoneNumber(phoneNumber)}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Customer ID: #{CustId}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6 mr-19">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-1">
                            <div className="relative w-14 h-14 flex items-center justify-center">
                                <div className={`w-14 h-14 rounded-full absolute ${
                                    isPartiallyLoaded ? 'bg-yellow-100' : 'bg-[#dcfce7]'
                                }`}></div>
                                <button className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                                    isPartiallyLoaded 
                                        ? 'bg-yellow-500 hover:bg-yellow-600' 
                                        : 'bg-[#16a34a] hover:bg-[#15803d]'
                                }`}>
                                    {isPartiallyLoaded ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <Check className="w-5 h-5 text-white" />
                                    )}
                                </button>
                            </div>
                            <span className="text-xs text-gray-600">
                                {isPartiallyLoaded ? 'Loading...' : 'CRM Match'}
                            </span>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                            <div className="relative w-14 h-14 flex items-center justify-center">
                                <div className="w-14 h-14 bg-[#dbeafe] rounded-full absolute"></div>
                                <button className="relative w-6 h-6 bg-[#2563eb] hover:bg-[#1d4ed8] rounded-full flex items-center justify-center transition-colors">
                                    <Clock className="w-6 h-6 text-white" />
                                </button>
                            </div>
                            <span className="text-xs text-gray-600">
                                {new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {hasMultipleContacts && !isPartiallyLoaded && (
                <div className="px-4 pb-2 border-t border-gray-100 mt-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-600">All contacts for this number:</div>
                        {customerData?.loadingBackgroundContacts && (
                            <div className="flex items-center gap-2 text-xs text-blue-600">
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                Loading additional contacts...
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {allContactsData.map((contactData, idx) => (
                            <button
                                key={contactData.contact?.contactId || idx}
                                onClick={() => onContactChange(idx)}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                    idx === selectedContactIndex
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                            >
                                {contactData.contact?.fullName || `Contact ${idx + 1}`}
                                {contactData.leads?.length > 0 && (
                                    <span className="ml-1">({contactData.leads.length} leads)</span>
                                )}
                            </button>
                        ))}
                        {customerData?.loadingBackgroundContacts && (
                            <div className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-500 animate-pulse">
                                Loading more...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerInfoCard;