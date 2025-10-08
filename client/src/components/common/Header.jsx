// client/src/components/common/Header.jsx

import React from 'react';
import { Phone, X } from 'lucide-react';

const Header = ({ currentUser, connectionStatus, getStatusColor, getStatusText, handleLogout, reconnectAttempts, MAX_RECONNECT_ATTEMPTS, connectWebSocket }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Gradient Header */}
      <div 
        className="text-white px-6 py-3"
        style={{
          background: 'linear-gradient(to right, #1b3378 5%, #192f6b 15%, #17295b 25%, #15244c 35%, #132143 50%, #111c39 70%, #0f182d 90%)'
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left Side - Logo and Company Name */}
          <div className="flex items-center">
            <div>
              <div className="text-2xl font-semibold tracking-normal">
                CELEBRATION
              </div>
              <div className="text-base font-normal">
                CHEVROLET
              </div>
            </div>
            <div className="border-l border-white/40 h-12 mx-6"></div>
          </div>
          
          {/* Center - Call Information */}
          <div className="flex-1 flex items-center pl-0">
            <div className="flex flex-col">
              <h2 className="text-xl font-medium tracking-tight">Incoming Call - Customer Information</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-sm font-light">Live Call Active</span>
              </div>
            </div>
          </div>
          
          {/* Right Side - Extension, Connection Status, Logout Button */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                Ext: {currentUser.username}
              </span>
            )}
            
            {connectionStatus && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                getStatusColor() === 'connected' ? 'bg-green-500/20 text-green-100' :
                getStatusColor() === 'reconnecting' ? 'bg-yellow-500/20 text-yellow-100' :
                'bg-red-500/20 text-red-100'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  getStatusColor() === 'connected' ? 'bg-green-300' :
                  getStatusColor() === 'reconnecting' ? 'bg-yellow-300' :
                  'bg-red-300'
                }`}></span>
                <span className="capitalize">{getStatusText()}</span>
              </div>
            )}

            {connectionStatus === 'failed' && (
              <button 
                className="bg-yellow-500/20 text-yellow-100 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                onClick={() => {
                  connectWebSocket();
                }}
              >
                Retry
              </button>
            )}
            
            {handleLogout && (
              <button 
                onClick={handleLogout}
                className="bg-red-500/20 text-red-100 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
              >
                Logout
              </button>
            )}
            
            <button 
              onClick={() => window.close()}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;