import React from 'react';
import { FileText, Phone, Mail, MapPin, Car, User, Calendar, Wrench } from 'lucide-react';

const ServiceAdvisorMainCard = ({ loading, serviceData }) => {
  const repairOrder = serviceData?.repairOrder || {
    roNumber: '#RO-252656',
    service: 'Brake Service Complete',
    vehicle: '2019 Silverado 1500',
    technician: 'Mike Rodriguez',
    completed: 'March 20, 2024',
    promiseDate: 'March 20, 2024',
    promiseTime: '4:00 PM',
    status: 'Ready for Pickup',
    amount: '$487.50'
  };

  const invoice = serviceData?.invoice || {
    items: [
      { description: 'Brake Pad Replacement (Front)', amount: '$285.00' },
      { description: 'Labor', amount: '$162.50' },
      { description: 'Shop Supplies', amount: '$15.00' },
      { description: 'Tax (8.25%)', amount: '$25.00' }
    ],
    total: '$487.50'
  };

  const vehicle = serviceData?.vehicle || {
    year: '2019',
    make: 'Chevrolet',
    model: 'Silverado 1500',
    vin: '1GCUKREHXKZ123456',
    mileage: '45,250',
    lastService: 'March 20, 2024',
    serviceAdvisor: 'Jennifer Martinez'
  };

  const contact = serviceData?.contact || {
    phone: '(555) 123-4567',
    email: 'sarah.johnson@email.com',
    address: '1234 Oak Street\nDallas, TX 75201'
  };

  return (
    <div className="space-y-4">
      {/* Main Invoice Card */}
      {/* Main Invoice Card */}
      <div className="bg-[#dde8ff] border-l-4 border-blue-900 p-6 rounded-lg">
        {/* Header Section - directly on light blue background */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#1e3a8a] rounded-full flex items-center justify-center p-3">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L1 21h22L12 2z" fill="#ffffff" />
                <path d="M12 9v4m0 4h.01" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Invoiced Repair Order</h2>
              <p className="text-sm text-gray-600">Payment Required - Customer Calling</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{repairOrder.amount}</div>
            <div className="text-xs text-gray-600">Amount Due</div>
          </div>
        </div>

        {/* Three Cards Section */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Repair Order Details */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
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
            </div>

            {/* Completion & Promise Details */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
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
            </div>
          </div>

          {/* Invoice Breakdown */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Invoice Breakdown
            </h3>
            <div className="space-y-2">
              {invoice.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.description}</span>
                  <span className="font-semibold">{item.amount}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold pt-2 border-t">
                <span>Total Amount Due:</span>
                <span>{invoice.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Send Payment Link Button */}
        <div className="flex justify-end mt-6">
          <button className="bg-white hover:bg-gray-50 text-[#002e85] font-medium py-2 px-4 rounded-lg flex items-center gap-2 text-sm border border-gray-200">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Send Payment Link
          </button>
        </div>
      </div>
      {/* Bottom Section Cards */}
<div className="grid grid-cols-3 gap-4">
  {/* Vehicle Information */}
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
      <div className="font-semibold" style={{ color: '#0b1b2c' }}>
        2019 Chevrolet Silverado 1500
      </div>
      <div style={{ color: '#3d4858' }}>VIN: 1GCUKREH5KZ123456</div>
      <div style={{ color: '#9095a0' }}>Mileage: 45,250</div>
      <div className="pt-2 mt-2 space-y-1 text-xs" style={{ borderTop: '1px solid #e4e6eb' }}>
        <div style={{ color: '#414c5b' }}>
          Last Service: <span className="font-semibold text-black">March 20, 2024</span>
        </div>
        <div style={{ color: '#414c5b' }}>
          Service Advisor: <span className="font-semibold text-black">Jennifer Martinez</span>
        </div>
      </div>
    </div>
  </div>
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
          (555) 123-4567
        </div>
        <div className="text-sm text-gray-500">Primary</div>
      </div>
    </div>

    <div className="flex items-start gap-3">
      <Mail className="w-5 h-5 text-blue-900 mt-0.5" />
      <div>
        <div className="text-base font-medium text-gray-900">
          sarah.johnson@email.com
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
          1234 Oak Street
        </div>
        <div className="text-sm text-gray-500">Dallas, TX 75201</div>
      </div>
    </div>
  </div>
</div>

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