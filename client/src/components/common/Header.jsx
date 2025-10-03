import React from 'react';
import { Phone, X } from 'lucide-react';

const Header = () => {
  return (
    <div className="relative">
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
          
          {/* Right Side - Close Button */}
          <button 
            onClick={() => window.close()}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;