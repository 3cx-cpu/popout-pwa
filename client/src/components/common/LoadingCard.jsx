// client\src\components\common\LoadingCard.jsx

import React from 'react';

const LoadingCard = () => (
  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
    <div className="w-6 h-6 border-3 border-gray-300 border-t-blue-500 rounded-full animate-spin mb-3"></div>
    <div className="text-sm">Loading...</div>
  </div>
);

export default LoadingCard;