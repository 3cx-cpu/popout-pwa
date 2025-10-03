import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [notifications, setNotifications] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(true);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const wsRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
      setIsStandalone(true);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      connectWebSocket();
    }
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.error('Login error:', error);
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
    setCurrentCall(null);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const connectWebSocket = () => {
    const wsUrl = window.location.hostname === 'localhost' 
      ? 'ws://localhost:7080'
      : 'wss://popbackend.comstreamtech.com';
    
    console.log('Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      
      // Authenticate the WebSocket connection
      ws.send(JSON.stringify({
        type: 'authenticate',
        username: currentUser.username
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);

        if (message.type === 'call_notification') {
          // Only show call if it's for the current user
          if (message.data.userExtension === currentUser.username) {
            handleIncomingCall(message.data);
          }
        } else if (message.type === 'authenticated') {
          console.log('WebSocket authenticated for user:', currentUser.username);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
      
      // Reconnect after 3 seconds if still authenticated
      if (isAuthenticated) {
        setTimeout(connectWebSocket, 3000);
      }
    };

    wsRef.current = ws;
  };

  const handleIncomingCall = (callData) => {
    console.log('Incoming call:', callData);
    
    const notification = {
      id: Date.now(),
      ...callData
    };
    
    setNotifications(prev => [notification, ...prev]);
    setCurrentCall(notification);

    // Play notification sound
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.error('Error playing sound:', err));
    }

    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Incoming Call', {
        body: `${callData.callerName || 'Unknown'} (${callData.callerNumber})`,
        icon: '/icon-192.png',
        tag: callData.callId,
        requireInteraction: true
      });
    }

    // Auto-close popup after 30 seconds
    setTimeout(() => {
      setCurrentCall(null);
    }, 30000);
  };

  const closeCallPopup = () => {
    setCurrentCall(null);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } else {
      setShowInstallModal(true);
    }
  };

  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
    if (userAgent.includes('edg')) return 'edge';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    if (userAgent.includes('firefox')) return 'firefox';
    return 'other';
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

            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            <button type="submit" className="btn-login" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main App (after login)
  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>3CX Call Notifications</h1>
          <span className="user-badge">Ext: {currentUser.username}</span>
        </div>
        <div className="header-actions">
          {showInstallButton && !isStandalone && (
            <button className="btn-install" onClick={handleInstallClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Install App
            </button>
          )}
          {isStandalone && (
            <span className="installed-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Installed
            </span>
          )}
          <div className={`status-indicator ${connectionStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">{connectionStatus}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Install Instructions Modal */}
      {showInstallModal && (
        <div className="modal-overlay" onClick={() => setShowInstallModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowInstallModal(false)}>×</button>
            
            <h2>📱 Install This App</h2>
            
            <div className="install-instructions">
              {getBrowserInfo() === 'chrome' && (
                <>
                  <h3>Chrome Instructions:</h3>
                  <ol>
                    <li>Click the <strong>three-dot menu (⋮)</strong> in the top right</li>
                    <li>Select <strong>"Install 3CX Call Notifications"</strong> or <strong>"Install app"</strong></li>
                    <li>Click <strong>"Install"</strong> in the popup</li>
                    <li>The app will open in its own window!</li>
                  </ol>
                  <p className="note">Or look for the install icon (⊕) in the address bar</p>
                </>
              )}
              
              {getBrowserInfo() === 'edge' && (
                <>
                  <h3>Edge Instructions:</h3>
                  <ol>
                    <li>Click the <strong>three-dot menu (...)</strong> in the top right</li>
                    <li>Go to <strong>"Apps"</strong> → <strong>"Install this site as an app"</strong></li>
                    <li>Click <strong>"Install"</strong></li>
                    <li>The app will be added to your Start Menu!</li>
                  </ol>
                </>
              )}
              
              {getBrowserInfo() === 'safari' && (
                <>
                  <h3>Safari Instructions:</h3>
                  <ol>
                    <li>Tap the <strong>Share button</strong> (square with arrow pointing up)</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong></li>
                    <li>The app icon will appear on your home screen!</li>
                  </ol>
                </>
              )}
              
              {getBrowserInfo() === 'other' && (
                <>
                  <h3>Installation Instructions:</h3>
                  <p>Look for an install option in your browser's menu, or check the address bar for an install icon.</p>
                  <p>This app can be installed as a Progressive Web App (PWA) on most modern browsers.</p>
                </>
              )}
            </div>

            <button className="btn-dismiss" onClick={() => setShowInstallModal(false)}>
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Current Call Popup */}
      {currentCall && (
        <div className="call-popup-overlay">
          <div className="call-popup">
            <button className="close-btn" onClick={closeCallPopup}>×</button>
            
            <div className="call-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>

            <h2>Incoming Call</h2>
            
            <div className="call-details">
              <div className="detail-row">
                <span className="label">Caller:</span>
                <span className="value">{currentCall.callerName || 'Unknown'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Number:</span>
                <span className="value">{currentCall.callerNumber}</span>
              </div>
              <div className="detail-row">
                <span className="label">Type:</span>
                <span className="value">{currentCall.partyDnType}</span>
              </div>
              <div className="detail-row">
                <span className="label">Extension:</span>
                <span className="value">{currentCall.extension}</span>
              </div>
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className="value status-badge">{currentCall.status}</span>
              </div>
            </div>

            <div className="call-actions">
              <button className="btn-dismiss" onClick={closeCallPopup}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <main className="main-content">
        <div className="notifications-header">
          <h2>Recent Calls ({notifications.length})</h2>
          {notifications.length > 0 && (
            <button className="btn-clear" onClick={clearNotifications}>
              Clear All
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="empty-state">
            <p>No calls yet. Waiting for incoming calls...</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div key={notification.id} className="notification-card">
                <div className="notification-header">
                  <h3>{notification.callerName || 'Unknown Caller'}</h3>
                  <span className="time">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="notification-body">
                  <p><strong>Number:</strong> {notification.callerNumber}</p>
                  <p><strong>Type:</strong> {notification.partyDnType}</p>
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