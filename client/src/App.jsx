// client\src\App.jsx

import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Header from './components/common/Header';

// CONSTANTS
const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 30000; // 30 seconds - match server heartbeat
const PONG_TIMEOUT = 10000; // 10 seconds to wait for pong response

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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const wsRef = useRef(null);
  const audioRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const pongTimeoutRef = useRef(null);
  const isReconnectingRef = useRef(false);

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
    return () => {
      cleanupWebSocket();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      connectWebSocket();
    }
    return () => {
      cleanupWebSocket();
    };
  }, [isAuthenticated, currentUser]);

  const cleanupWebSocket = useCallback(() => {
    console.log('🧹 Cleaning up WebSocket connections...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnection on manual close
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    
    isReconnectingRef.current = false;
  }, []);

  const startPingInterval = useCallback(() => {
    // Clear any existing ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('📤 Sending ping to server...');
        
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
          
          // Set timeout for pong response
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
          }
          
          pongTimeoutRef.current = setTimeout(() => {
            console.warn('⚠️ No pong received from server, connection may be stale');
            setConnectionStatus('reconnecting');
            wsRef.current?.close();
          }, PONG_TIMEOUT);
          
        } catch (error) {
          console.error('❌ Error sending ping:', error);
          setConnectionStatus('error');
          wsRef.current?.close();
        }
      }
    }, PING_INTERVAL);
  }, []);

  const connectWebSocket = useCallback(() => {
    // Prevent multiple simultaneous reconnection attempts
    if (isReconnectingRef.current) {
      console.log('⏳ Reconnection already in progress...');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    isReconnectingRef.current = true;
    
    try {
      const wsUrl = window.location.hostname === 'localhost' 
        ? 'ws://localhost:7080'
        : 'wss://popbackend.comstreamtech.com';
      
      console.log(`🔌 Connecting to WebSocket: ${wsUrl} (Attempt ${reconnectAttempts + 1})`);
      setConnectionStatus('connecting');
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        isReconnectingRef.current = false;
        
        // Authenticate immediately after connection
        console.log('🔐 Authenticating user:', currentUser.username);
        ws.send(JSON.stringify({ 
          type: 'authenticate', 
          username: currentUser.username 
        }));
        
        // Start heartbeat ping
        startPingInterval();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message:', message.type);
          
          if (message.type === 'pong') {
            console.log('📥 Received pong from server');
            if (pongTimeoutRef.current) {
              clearTimeout(pongTimeoutRef.current);
              pongTimeoutRef.current = null;
            }
            return;
          }
          
          if (message.type === 'call_notification' && 
              message.data.userExtension === currentUser.username) {
            handleIncomingCall(message.data);
          } else if (message.type === 'authenticated') {
            console.log('✅ WebSocket authenticated for user:', currentUser.username);
          } else if (message.type === 'connected') {
            console.log('✅ Server confirmed connection');
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        console.log(`❌ WebSocket closed (Code: ${event.code}, Reason: ${event.reason})`);
        setConnectionStatus('disconnected');
        isReconnectingRef.current = false;
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnection if authenticated
        if (isAuthenticated && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(RECONNECT_INTERVAL * Math.pow(1.5, reconnectAttempts), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms...`);
          setConnectionStatus('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('❌ Max reconnection attempts reached');
          setConnectionStatus('failed');
        }
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket:', error);
      setConnectionStatus('error');
      isReconnectingRef.current = false;
    }
  }, [currentUser, isAuthenticated, reconnectAttempts, startPingInterval]);

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
        setReconnectAttempts(0);
      } else {
        setLoginError(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Connection error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    console.log('👋 Logging out...');
    cleanupWebSocket();
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setNotifications([]);
    setShowCustomerPopup(false);
    setCustomerData(null);
    setConnectionStatus('disconnected');
    setReconnectAttempts(0);
  };

  const handleIncomingCall = (callData) => {
    console.log('📞 Incoming call with customer data:', callData);
    const notification = { id: Date.now(), ...callData };
    setNotifications(prev => [notification, ...prev]);
    
    if (callData.customerData) {
      console.log('📊 Showing customer dashboard with data');
      setCustomerData(callData.customerData);
      setCallInfo({
        callerNumber: callData.callerNumber,
        callerName: callData.customerData?.contact?.fullName || callData.callerName
      });
      setShowCustomerPopup(true);
    }

    audioRef.current?.play().catch(() => console.log('🔇 Audio play prevented'));

    if ('Notification' in window && Notification.permission === 'granted') {
      const customerName = callData.customerData?.contact?.fullName || 
                          callData.callerName || 'Unknown';
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

  const getStatusColor = () => {
    switch(connectionStatus) {
      case 'connected': return 'connected';
      case 'connecting': 
      case 'reconnecting': return 'reconnecting';
      case 'error':
      case 'failed':
      case 'disconnected': return 'disconnected';
      default: return 'disconnected';
    }
  };

  const getStatusText = () => {
    if (connectionStatus === 'reconnecting') {
      return `reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`;
    }
    return connectionStatus;
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
              <input 
                id="username" 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Enter your extension" 
                required 
                disabled={isLoggingIn} 
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter your password" 
                required 
                disabled={isLoggingIn} 
              />
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="btn-login" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Waiting Screen with Dashboard
return (
  <div className="app">
    {!showCustomerPopup ? (
      <>
        <Header 
          currentUser={currentUser}
          connectionStatus={connectionStatus}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          handleLogout={handleLogout}
          reconnectAttempts={reconnectAttempts}
          MAX_RECONNECT_ATTEMPTS={MAX_RECONNECT_ATTEMPTS}
          connectWebSocket={connectWebSocket}
        />
        <audio ref={audioRef} src="/notification.mp3" preload="auto" />
        <main className="main-content">
          <div className="notifications-header">
            <h2>Recent Calls ({notifications.length})</h2>
            {notifications.length > 0 && (
              <button className="btn-clear" onClick={() => setNotifications([])}>
                Clear All
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <div className="empty-state">
              <p>No calls yet. Waiting for incoming calls...</p>
              {connectionStatus !== 'connected' && (
                <p className="connection-warning">
                  Connection status: {getStatusText()}
                </p>
              )}
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div key={notification.id} className="notification-card">
                  <div className="notification-header">
                    <h3>
                      {notification.customerData?.contact?.fullName || 
                       notification.callerName || 'Unknown Caller'}
                    </h3>
                    <span className="time">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </span>
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
      </>
    ) : (
      <div className="dashboard-content">
        <Header 
          currentUser={currentUser}
          connectionStatus={connectionStatus}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
          handleLogout={handleLogout}
          reconnectAttempts={reconnectAttempts}
          MAX_RECONNECT_ATTEMPTS={MAX_RECONNECT_ATTEMPTS}
          connectWebSocket={connectWebSocket}
        />
        <Dashboard 
          customerDataProp={customerData}
          fromProp={callInfo?.callerNumber}
          onClose={closeCustomerPopup}
        />
      </div>
    )}
  </div>
);
}

export default App;