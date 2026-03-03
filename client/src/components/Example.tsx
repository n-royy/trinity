import React, { useEffect, useState } from 'react';

interface PingStatus {
  message: string;
}

const PingComponent: React.FC = () => {
  const [status, setStatus] = useState<PingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPingStatus = async () => {
      try {
        // Assuming the backend is running on http://localhost:3000 as per context
        const response = await fetch('http://localhost:3000/ping');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Network response was not ok');
        }
        const data: PingStatus = await response.json();
        setStatus(data);
      } catch (err: any) {
        console.error('Failed to fetch ping status:', err);
        setError(err.message || 'Failed to connect to the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchPingStatus();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Pinging Server...</h1>
        <p>Loading status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Ping Failed!</h1>
        <p>Error: {error}</p>
        <p>Please ensure the backend server is running on http://localhost:3000.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'green' }}>
      <h1>Ping Status: Success!</h1>
      {status ? <p>Message from server: <strong>{status.message}</strong></p> : <p>Server is reachable.</p>}
      <p>The backend server is operational.</p>
    </div>
  );
};

export default PingComponent;
