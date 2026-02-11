// app/mock-shibboleth/page.tsx
'use client';

import { useState } from 'react';

export default function MockShibbolethPage() {
  const [utorid, setUtorid] = useState('');

  const handleLogin = async () => {
    const params = new URLSearchParams({
      utorid,
    });
    
    window.location.href = `/api/auth/shibboleth/mock-login?${params}`;
  };

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px' }}>
      <div style={{ 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffc107', 
        padding: '15px', 
        marginBottom: '20px',
        borderRadius: '5px'
      }}>
        <strong>⚠️ DEVELOPMENT ONLY</strong>
        <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>
          This page simulates Shibboleth authentication for local development.
          It will not be available in production.
        </p>
      </div>

      <h1>Mock Shibboleth Login</h1>
      
      <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            UTORid:
          </label>
          <input
            type="text"
            value={utorid}
            onChange={(e) => setUtorid(e.target.value)}
            placeholder="e.g., smithj01"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Mock Login
        </button>
      </form>
    </div>
  );
}
