import { useState, useEffect, useRef } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notifications, setNotifications] = useState([]);
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [callInfo, setCallInfo] = useState(null);
  const wsRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) connectWebSocket();
  }, [isAuthenticated, currentUser]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:7080/api/login'
        : 'https://popbackend.comstreamtech.com/api/login';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        const user = { username: data.username };
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        setIsAuthenticated(true);
      } else {
        setLoginError(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      setLoginError('Connection error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setNotifications([]);
    setShowCustomerPopup(false);
    setCustomerData(null);
    wsRef.current?.close();
  };

  const connectWebSocket = () => {
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'ws://localhost:7080'
      : 'wss://popbackend.comstreamtech.com';
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      ws.send(JSON.stringify({ type: 'authenticate', username: currentUser.username }));
    };
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);
        if (message.type === 'call_notification' && message.data.userExtension === currentUser.username) {
          handleIncomingCall(message.data);
        } else if (message.type === 'authenticated') {
          console.log('WebSocket authenticated for user:', currentUser.username);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
    ws.onerror = () => setConnectionStatus('error');
    ws.onclose = () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
      if (isAuthenticated) setTimeout(connectWebSocket, 3000);
    };
    wsRef.current = ws;
  };

  const handleIncomingCall = (callData) => {
    console.log('Incoming call with customer data:', callData);
    const notification = { id: Date.now(), ...callData };
    setNotifications(prev => [notification, ...prev]);
    
    if (callData.customerData) {
      console.log('Showing customer dashboard with data');
      setCustomerData(callData.customerData);
      setCallInfo({
        callerNumber: callData.callerNumber,
        callerName: callData.customerData?.contact?.fullName || callData.callerName
      });
      setShowCustomerPopup(true);
    }

    audioRef.current?.play().catch(() => console.log('Audio play prevented'));

    if ('Notification' in window && Notification.permission === 'granted') {
      const customerName = callData.customerData?.contact?.fullName || callData.callerName || 'Unknown';
      new Notification('Incoming Call', {
        body: `${customerName} (${callData.callerNumber})`,
        icon: '/icon-192.png',
        tag: callData.callId,
        requireInteraction: true
      });
    }
  };

  const closeCustomerPopup = () => {
    setShowCustomerPopup(false);
    setCustomerData(null);
    setCallInfo(null);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <h1>3CX Call Notifications</h1>
            <p>Sign in to receive call notifications</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Extension</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your extension" required disabled={isLoggingIn} />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={isLoggingIn} />
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="btn-login" disabled={isLoggingIn}>{isLoggingIn ? 'Signing in...' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    );
  }

  // Show Dashboard when call comes in
  if (showCustomerPopup && customerData) {
    return (
      <div className="customer-dashboard-container">
        <Dashboard 
          customerDataProp={customerData}
          fromProp={callInfo?.callerNumber}
          onClose={closeCustomerPopup}
        />
      </div>
    );
  }

  // Waiting Screen
  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>3CX Call Notifications</h1>
          <span className="user-badge">Ext: {currentUser.username}</span>
        </div>
        <div className="header-actions">
          <div className={`status-indicator ${connectionStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">{connectionStatus}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      <main className="main-content">
        <div className="notifications-header">
          <h2>Recent Calls ({notifications.length})</h2>
          {notifications.length > 0 && <button className="btn-clear" onClick={() => setNotifications([])}>Clear All</button>}
        </div>
        {notifications.length === 0 ? (
          <div className="empty-state"><p>No calls yet. Waiting for incoming calls...</p></div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div key={notification.id} className="notification-card">
                <div className="notification-header">
                  <h3>{notification.customerData?.contact?.fullName || notification.callerName || 'Unknown Caller'}</h3>
                  <span className="time">{new Date(notification.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="notification-body">
                  <p><strong>Number:</strong> {notification.callerNumber}</p>
                  <p><strong>Extension:</strong> {notification.extension}</p>
                  {notification.customerData?.contact && (
                    <>
                      <p><strong>Customer ID:</strong> {notification.customerData.contact.contactId}</p>
                      <p><strong>Leads:</strong> {notification.customerData.leads?.length || 0}</p>
                    </>
                  )}
                  <p><strong>Status:</strong> <span className="status-badge-small">{notification.status}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;