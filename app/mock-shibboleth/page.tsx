// app/mock-shibboleth/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MockShibbolethPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('testuser');
  const [email, setEmail] = useState('testuser@utoronto.ca');
  const [displayName, setDisplayName] = useState('Test User');
  const [affiliation, setAffiliation] = useState('student');

  const handleLogin = async () => {
    // Call your mock endpoint that will set headers and redirect
    const params = new URLSearchParams({
      userId,
      email,
      displayName,
      affiliation,
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
            User ID (eppn):
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Display Name:
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Affiliation (role):
          </label>
          <select
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty (Instructor)</option>
            <option value="staff">Staff (Admin)</option>
          </select>
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

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Quick Test Users:</strong></p>
        <ul>
          <li>Student: testuser / student</li>
          <li>Instructor: instructor / faculty</li>
          <li>Admin: admin / staff</li>
        </ul>
      </div>
    </div>
  );
}