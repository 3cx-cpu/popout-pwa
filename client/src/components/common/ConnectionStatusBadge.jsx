// client\src\components\common\ConnectionStatusBadge.jsx

import React from 'react';

const ConnectionStatusBadge = ({ connectionStatus }) => {
  const statusConfig = {
    connecting: { color: 'bg-yellow-500', text: 'Connecting...' },
    connected: { color: 'bg-green-500', text: 'Connected' },
    disconnected: { color: 'bg-red-500', text: 'Disconnected' },
    error: { color: 'bg-red-500', text: 'Error' }
  };

  const config = statusConfig[connectionStatus];

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 ${config.color} rounded-full animate-pulse`}></div>
      <span className="text-xs text-gray-600">{config.text}</span>
    </div>
  );
};

export default ConnectionStatusBadge;