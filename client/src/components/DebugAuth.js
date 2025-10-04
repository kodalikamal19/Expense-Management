import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DebugAuth = () => {
  const { user, isAuthenticated, loading, token } = useAuth();

  const clearAuth = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg text-xs max-w-xs">
      <h3 className="font-bold mb-2">Auth Debug</h3>
      <div className="space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>User: {user ? `${user.firstName} ${user.lastName}` : 'None'}</div>
        <div>Token: {token ? 'Exists' : 'None'}</div>
        <button 
          onClick={clearAuth}
          className="mt-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
        >
          Clear Auth
        </button>
      </div>
    </div>
  );
};

export default DebugAuth;
