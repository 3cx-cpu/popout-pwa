import React from 'react';

const RoleTabs = ({ activeRole, onRoleChange }) => {
  const roles = [
    { id: 'receptionist', label: 'Receptionist' },
    { id: 'productSpecialist', label: 'Product Specialist' },
    { id: 'serviceManager', label: 'Service Manager' },
    { id: 'serviceAdvisor', label: 'Service Advisor' },
    { id: 'salesManager', label: 'Sales Manager' },
    { id: 'partsRep', label: 'Parts Rep' },
    { id: 'collisionManager', label: 'Collision Manager' },
    { id: 'multiMatch', label: 'Multi-Match' },
    { id: 'household', label: 'Household' }
  ];

  return (
    <div className="bg-gray-100 px-4 py-2 flex items-center gap-1 overflow-x-auto">
      {roles.map(role => (
        <button
          key={role.id}
          onClick={() => onRoleChange(role.id)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeRole === role.id
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
};

export default RoleTabs;