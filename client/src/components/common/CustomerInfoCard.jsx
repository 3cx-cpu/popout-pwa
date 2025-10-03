// File: components/common/CustomerInfoCard.js

import React from 'react';
import { Clock, User, Check } from 'lucide-react';

const CustomerInfoCard = ({ customerData, from, loading }) => {
    // Format phone number function
    const formatPhoneNumber = (phone) => {
        if (!phone) return '(555) 123-4567';
        // Remove all non-digits
        const cleaned = phone.replace(/\D/g, '');
        // Format as (XXX) XXX-XXXX
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
        return phone;
    };

    if (loading) {
        return (
            <div className="bg-[#f7f8f9] border-b border-gray-200">
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-300 rounded-full animate-pulse"></div>
                        <div>
                            <div className="h-7 bg-gray-300 rounded w-40 mb-2 animate-pulse"></div>
                            <div className="h-5 bg-gray-300 rounded w-32 mb-1 animate-pulse"></div>
                            <div className="h-4 bg-gray-300 rounded w-24 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="h-4 bg-gray-300 rounded w-20 mb-1 animate-pulse"></div>
                            <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                            <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Get phone number from various possible sources
    const phoneNumber = from || customerData?.phone || customerData?.contact?.phone || '(555) 123-4567';
    const CustName = customerData?.fullName || customerData?.contact?.fullName || 'N/A';
    const CustId =  customerData?.contact?.contactId ||'N/A';
    return (
        <div className="bg-[#f7f8f9] border-b border-gray-200">
            <div className="px-4 py-3 flex items-center justify-between">
                {/* Left Section - Customer Info */}
                <div className="flex items-center gap-4">
                    {/* Profile Picture with white border - Increased size */}
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-300 border-[3px] border-white flex-shrink-0">
                        {customerData?.profileImage ? (
                            <img
                                src={customerData.profileImage}
                                alt={`${customerData?.fullName} `}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                                <User className="w-10 h-10 text-gray-600" />
                            </div>
                        )}
                    </div>

                    {/* Name and Details */}
                    <div className="flex flex-col justify-center">
                        <h2 className="text-2xl font-semibold text-gray-900">
                            {CustName}
                        </h2>
                        <div className="flex items-center gap-2 font-semibold text-[#1e3a8a]">
                            <span className="text-lg">{formatPhoneNumber(phoneNumber)}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                            Customer ID: #{CustId || 'N/A'}
                        </div>
                    </div>
                </div>

                {/* Right Section - Status and Actions */}
                <div className="flex items-center gap-6 mr-19">
                    {/* Action Buttons with labels underneath */}
                    <div className="flex items-center gap-6">
                        {/* Green Check Button with CRM Match */}
                        <div className="flex flex-col items-center gap-1">
                            <div className="relative w-14 h-14 flex items-center justify-center">
                                <div className="w-14 h-14 bg-[#dcfce7] rounded-full absolute"></div>
                                <button className="relative w-6 h-6 bg-[#16a34a] hover:bg-[#15803d] rounded-full flex items-center justify-center transition-colors">
                                    <Check className="w-5 h-5 text-white" />
                                </button>
                            </div>
                            <span className="text-xs text-gray-600">CRM Match</span>
                        </div>

                        {/* Blue Clock Button with Time */}
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
};

export default CustomerInfoCard;