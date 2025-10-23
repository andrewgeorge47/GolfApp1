import React from 'react';
import { useAuth } from '../AuthContext';

const DebugAuth: React.FC = () => {
  const { user, token, loading } = useAuth();

  return (
    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
      <h3 className="font-bold">Debug Authentication State</h3>
      <div className="text-sm">
        <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
        <p><strong>Token exists:</strong> {token ? 'yes' : 'no'}</p>
        <p><strong>User exists:</strong> {user ? 'yes' : 'no'}</p>
        {user && (
          <div>
            <p><strong>User ID:</strong> {user.member_id}</p>
            <p><strong>Email:</strong> {user.email_address}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </div>
        )}
        <p><strong>Current URL:</strong> {window.location.href}</p>
        <p><strong>Hash:</strong> {window.location.hash}</p>
      </div>
    </div>
  );
};

export default DebugAuth; 