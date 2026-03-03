import React, { useState, useEffect } from 'react';

const PingComponent: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPing = async () => {
      try {
        // Assuming your backend is running on http://localhost:3000
        // Adjust the URL if your backend is hosted elsewhere or on a different port
        const response = await fetch('http://localhost:3000/ping');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMessage(data.message);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch ping message');
      } finally {
        setLoading(false);
      }
    };

    fetchPing();
  }, []); // Empty dependency array means this effect runs once after the initial render

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px', margin: '20px auto' }}>
      <h2>Ping API Response</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {message && (
        <p>
          <strong>Message from /ping:</strong> {message}
        </p>
      )}
      {!loading && !error && !message && (
        <p>No message received. Check backend server and network.</p>
      )}
    </div>
  );
};

export default PingComponent;
