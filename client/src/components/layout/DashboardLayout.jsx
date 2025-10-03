import React from 'react';
import Header from '../common/Header';

const DashboardLayout = ({ children, customerData }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        customerName={customerData?.contact?.fullName }
        customerId={customerData?.contact?.phone }
      />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;