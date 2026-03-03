import React, { useState, useEffect, createContext, useContext, ReactNode, FormEvent, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';

// --- 1. Auth Context Setup ---

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean; // Add loading state for auth operations
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use AuthContext
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Initial loading for checking local storage

  useEffect(() => {
    // Attempt to load user/token from localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user from localStorage', error);
        clearAuthData();
      }
    }
    setLoading(false); // Finished initial loading
  }, []);

  const clearAuthData = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      // --- Mock API Call for Login ---
      // In a real application, replace this with an actual fetch to your backend API, e.g., '/api/auth/login'
      console.log('Attempting login for:', username);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      if (username === 'user' && password === 'password') {
        const mockUser: User = { id: '1', username: 'user' };
        const mockToken = 'mock_jwt_token_123';
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(mockUser));
      } else {
        throw new Error('Invalid credentials');
      }
      // Example of real API call structure:
      /*
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        const { token, user } = data; // Assuming API returns token and user object
        setUser(user);
        setToken(token);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        throw new Error(data.message || 'Login failed');
      }
      */
    } catch (error: any) {
      console.error('Login error:', error.message);
      clearAuthData();
      throw error; // Re-throw to be caught by UI components
    } finally {
      setLoading(false);
    }
  }, [clearAuthData]);

  const register = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      // --- Mock API Call for Registration ---
      // In a real application, replace this with an actual fetch to your backend API, e.g., '/api/auth/register'
      console.log('Attempting registration for:', username);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      // Simulate successful registration and immediate login
      // For demonstration, any new username/password will 'register' and log in.
      const mockUser: User = { id: `user_${Date.now()}`, username: username };
      const mockToken = `mock_jwt_token_for_${username}_${Date.now()}`;
      setUser(mockUser);
      setToken(mockToken);
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      // Example of real API call structure:
      /*
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        const { token, user } = data; // Assuming API returns token and user object
        setUser(user);
        setToken(token);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        throw new Error(data.message || 'Registration failed');
      }
      */
    } catch (error: any) {
      console.error('Registration error:', error.message);
      clearAuthData();
      throw error;
    } finally {
      setLoading(false);
    }
  }, [clearAuthData]);

  const logout = useCallback(() => {
    clearAuthData();
    console.log('User logged out');
  }, [clearAuthData]);

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- 2. Authentication Forms ---

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      // Navigation handled by useEffect
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Username:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-label="Username"
          />
        </label>
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password"
          />
        </label>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
};

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(username, password);
      // Navigation handled by useEffect
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Username:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            aria-label="Username"
          />
        </label>
        <label>
          Password:
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            aria-label="Password"
          />
        </label>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

// --- 3. Dashboard Component ---

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newConversationName, setNewConversationName] = useState('');

  useEffect(() => {
    // --- Mock API Call for Conversations ---
    // In a real application, fetch from your backend API, e.g., '/api/conversations'
    console.log('Fetching conversations...');
    const fetchConversations = async () => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      setConversations([
        { id: 'c1', name: 'General Chat', lastMessage: 'Hello everyone!' },
        { id: 'c2', name: 'Project Alpha', lastMessage: 'Meeting at 3 PM' },
        { id: 'c3', name: 'Team Discussion', lastMessage: 'Latest updates...' },
      ]);
    };
    fetchConversations();
  }, []);

  const createConversation = async (e: FormEvent) => {
    e.preventDefault();
    if (!newConversationName.trim()) return;

    // --- Mock API Call for Creating Conversation ---
    // In a real application, POST to your backend API, e.g., '/api/conversations'
    console.log('Creating new conversation:', newConversationName);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const newConv: Conversation = {
      id: `c${conversations.length + 1}`,
      name: newConversationName,
      lastMessage: 'New conversation created!',
    };
    setConversations((prev) => [...prev, newConv]);
    setNewConversationName('');
    setSelectedConversationId(newConv.id); // Select the newly created conversation
  };

  const selectedConversation = conversations.find(
    (conv) => conv.id === selectedConversationId
  );

  return (
    <div className="dashboard-container">
      <h2>Welcome, {user?.username || 'Guest'}!</h2>

      <div className="dashboard-layout">
        <div className="conversations-sidebar">
          <h3>Your Conversations</h3>
          <ul className="conversation-list">
            {conversations.map((conv) => (
              <li
                key={conv.id}
                className={`conversation-item ${conv.id === selectedConversationId ? 'selected' : ''}`}
                onClick={() => setSelectedConversationId(conv.id)}
              >
                <h4>{conv.name}</h4>
                <p>{conv.lastMessage}</p>
              </li>
            ))}
          </ul>
          <form onSubmit={createConversation} className="new-conversation-form">
            <input
              type="text"
              value={newConversationName}
              onChange={(e) => setNewConversationName(e.target.value)}
              placeholder="New conversation name"
              aria-label="New conversation name"
              required
            />
            <button type="submit">Create New</button>
          </form>
        </div>

        <div className="conversation-detail">
          {selectedConversation ? (
            <>
              <h3>{selectedConversation.name}</h3>
              <div className="message-area">
                {/* Placeholder for messages in the selected conversation */}
                <p>Chat history for "{selectedConversation.name}" will appear here.</p>
                <p>Last message: "{selectedConversation.lastMessage}"</p>
                {/* In a real app, this would be a message list with input */}
                <div style={{ height: '200px', border: '1px solid #ddd', padding: '10px', overflowY: 'auto', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
                    <p>Message 1 from User A</p>
                    <p>Message 2 from User B</p>
                    <p>Message 3 from {user?.username}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <input type="text" placeholder="Type a message..." style={{ flexGrow: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }} />
                  <button style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Send</button>
                </div>
              </div>
            </>
          ) : (
            <p>Select a conversation or create a new one to start chatting.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 4. Profile Management ---

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <p>Loading profile...</p>; // Or redirect if not authenticated, handled by PrivateRoute
  }

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      <div className="profile-details">
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Username:</strong> {user.username}</p>
        {/* Add more user details if available */}
      </div>
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
    </div>
  );
};

// --- 5. Navigation Bar ---

const NavBar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">ChatApp</Link>
      </div>
      <ul className="nav-links">
        {isAuthenticated ? (
          <>
            <li>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/profile">Profile ({user?.username})</Link>
            </li>
            <li>
              <button onClick={handleLogout} className="nav-button">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link to="/login">Login</Link>
            </li>
            <li>
              <Link to="/register">Register</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

// --- 6. Protected Route Component ---

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // Optionally render a full-page spinner or loading indicator
    return <div className="loading-spinner">Loading authentication...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// --- 7. Main Application Layout and Routing (`AppLayout`) ---

const NotFoundPage = () => {
    return (
        <div className="auth-container" style={{ textAlign: 'center', marginTop: '100px' }}>
            <h2>404 - Page Not Found</h2>
            <p>The page you are looking for does not exist.</p>
            <Link to="/">Go to Dashboard</Link>
        </div>
    );
};

const AppLayout = () => {
  return (
    <div className="app-container">
      <NavBar />
      <main className="app-main">
        <Routes>
          {/* Redirect root to dashboard if authenticated, or login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <style>{`
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          background-color: #f0f2f5;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .navbar {
          background-color: #282c34;
          padding: 15px 30px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .nav-brand a {
          color: white;
          text-decoration: none;
          font-size: 1.5em;
          font-weight: bold;
        }

        .nav-links {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          gap: 20px;
        }

        .nav-links li a, .nav-links li button {
          color: white;
          text-decoration: none;
          padding: 8px 15px;
          border-radius: 5px;
          transition: background-color 0.3s ease;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1em;
        }

        .nav-links li a:hover, .nav-links li button:hover {
          background-color: #4a515f;
        }

        .app-main {
          flex-grow: 1;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start; /* Align content to the top */
        }

        /* Auth Forms */
        .auth-container {
          background-color: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
          text-align: center;
          margin-top: 50px; /* Adjust spacing from navbar */
        }

        .auth-container h2 {
          color: #333;
          margin-bottom: 25px;
        }

        .auth-form label {
          display: block;
          text-align: left;
          margin-bottom: 15px;
          font-weight: bold;
          color: #555;
        }

        .auth-form input {
          width: calc(100% - 20px);
          padding: 12px 10px;
          margin-top: 5px;
          border: 1px solid #ccc;
          border-radius: 5px;
          box-sizing: border-box;
          font-size: 1em;
        }

        .auth-form button {
          background-color: #007bff;
          color: white;
          padding: 12px 25px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1.1em;
          margin-top: 20px;
          transition: background-color 0.3s ease;
        }

        .auth-form button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .auth-form button:disabled {
          background-color: #a0c9ed;
          cursor: not-allowed;
        }

        .auth-container p {
          margin-top: 20px;
          color: #666;
        }

        .auth-container p a {
          color: #007bff;
          text-decoration: none;
        }

        .auth-container p a:hover {
          text-decoration: underline;
        }

        .error-message {
          color: #dc3545;
          margin-top: 10px;
          font-size: 0.9em;
        }

        /* Dashboard */
        .dashboard-container {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          max-width: 1000px;
          width: 100%;
          margin-top: 30px;
          text-align: left;
        }

        .dashboard-container h2 {
          color: #333;
          margin-bottom: 30px;
          text-align: center;
        }

        .dashboard-layout {
          display: flex;
          gap: 25px;
        }

        .conversations-sidebar {
          flex: 1; /* Takes 1 part of available space */
          min-width: 250px;
          max-width: 300px;
          border-right: 1px solid #eee;
          padding-right: 25px;
        }

        .conversations-sidebar h3 {
          margin-top: 0;
          color: #333;
          margin-bottom: 20px;
        }

        .conversation-list {
          list-style: none;
          padding: 0;
          max-height: 400px; /* Limit height for scroll */
          overflow-y: auto;
          margin-bottom: 20px;
        }

        .conversation-item {
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .conversation-item:hover {
          background-color: #e2e6ea;
          border-color: #d1d6da;
        }

        .conversation-item.selected {
          background-color: #007bff;
          color: white;
          border-color: #007bff;
        }
        .conversation-item.selected h4, .conversation-item.selected p {
            color: white; /* Ensure text is white on selected item */
        }

        .conversation-item h4 {
          margin-top: 0;
          margin-bottom: 5px;
          color: inherit; /* Inherit color from parent (.selected) */
        }
        .conversation-item p {
            color: inherit; /* Inherit color from parent (.selected) */
            font-size: 0.9em;
            margin-bottom: 0;
        }

        .new-conversation-form {
          display: flex;
          gap: 10px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .new-conversation-form input {
          flex-grow: 1;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 5px;
        }

        .new-conversation-form button {
          background-color: #28a745;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }

        .new-conversation-form button:hover {
          background-color: #218838;
        }

        .conversation-detail {
          flex: 3; /* Takes 3 parts of available space */
          display: flex;
          flex-direction: column;
        }

        .conversation-detail h3 {
          margin-top: 0;
          color: #333;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #eee;
        }

        .message-area {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 8px;
            min-height: 300px;
            display: flex;
            flex-direction: column;
            justify-content: space-between; /* Pushes input to bottom */
            flex-grow: 1; /* Makes message area fill available space */
        }

        /* Profile Page */
        .profile-container {
          background-color: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 100%;
          text-align: center;
          margin-top: 50px;
        }

        .profile-container h2 {
          color: #333;
          margin-bottom: 30px;
        }

        .profile-details p {
          font-size: 1.1em;
          margin-bottom: 15px;
          color: #555;
        }

        .profile-details p strong {
          color: #333;
        }

        .logout-button {
          background-color: #dc3545;
          color: white;
          padding: 12px 25px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1.1em;
          margin-top: 30px;
          transition: background-color 0.3s ease;
        }

        .logout-button:hover {
          background-color: #c82333;
        }

        .loading-spinner {
          text-align: center;
          padding: 50px;
          font-size: 1.2em;
          color: #666;
        }

        /* Responsive Adjustments */
        @media (max-width: 768px) {
            .navbar {
                flex-direction: column;
                gap: 10px;
            }
            .nav-links {
                flex-wrap: wrap;
                justify-content: center;
            }
            .dashboard-layout {
                flex-direction: column;
            }
            .conversations-sidebar {
                border-right: none;
                border-bottom: 1px solid #eee;
                padding-right: 0;
                padding-bottom: 20px;
                max-width: 100%;
            }
        }
      `}</style>
    </div>
  );
};

// --- Root Component for the example ---
// This component should be rendered by your application's entry point (e.g., main.tsx or App.tsx)
const Example = () => {
  return (
    // BrowserRouter should wrap your entire application where routing is needed
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
};

export default Example;
