import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Header from './components/common/Header';

// CONSTANTS
const RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const PING_INTERVAL = 30000;
const PONG_TIMEOUT = 10000;
const CONNECTION_TIMEOUT = 5000;
const VISIBILITY_CHECK_INTERVAL = 1000;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [currentCalls, setCurrentCalls] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [callInfo, setCallInfo] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [loadingStage, setLoadingStage] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [currentCallId, setCurrentCallId] = useState(null);

  const wsRef = useRef(null);
  const audioRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const pongTimeoutRef = useRef(null);
  const isReconnectingRef = useRef(false);
  const connectionTimeoutRef = useRef(null);
  const visibilityCheckIntervalRef = useRef(null);
  const lastVisibilityCheckRef = useRef(Date.now());

  // Fetch call history function
  const fetchCallHistory = useCallback(async (usernameParam) => {
    setLoadingHistory(true);
    try {
      const apiUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:7080/api/call-history/'
        : 'https://popbackend.comstreamtech.com/api/call-history/';

      const response = await fetch(`${apiUrl}${usernameParam}?limit=50`);
      const data = await response.json();

      if (data.success) {
        setCallHistory(data.calls);
        console.log(`📞 Loaded ${data.calls.length} historical calls`);
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // Page visibility and WebSocket health check
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Page became visible - checking connection...');
        if (isAuthenticated && currentUser) {
          // Check if WebSocket is still connected
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            console.log('📌 WebSocket disconnected while tab was inactive - reconnecting...');
            connectWebSocket();
          }
        }
      }
    };

    const handleOnline = () => {
      console.log('🌐 Network connection restored');
      if (isAuthenticated && currentUser) {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connectWebSocket();
        }
      }
    };

    const handleOffline = () => {
      console.log('📵 Network connection lost');
      setConnectionStatus('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Regular visibility check to combat idle WebSocket issues
    visibilityCheckIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && isAuthenticated && currentUser) {
        const now = Date.now();
        const timeSinceLastCheck = now - lastVisibilityCheckRef.current;
        
        // If more than 60 seconds since last check, verify connection
        if (timeSinceLastCheck > 60000) {
          console.log('⏰ Long idle detected - verifying connection...');
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // Send a ping to verify connection
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          } else {
            console.log('📌 Idle connection lost - reconnecting...');
            connectWebSocket();
          }
        }
        lastVisibilityCheckRef.current = now;
      }
    }, VISIBILITY_CHECK_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (visibilityCheckIntervalRef.current) {
        clearInterval(visibilityCheckIntervalRef.current);
      }
    };
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsAuthenticated(true);
      fetchCallHistory(user.username);
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return () => {
      cleanupWebSocket();
    };
  }, [fetchCallHistory]);

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

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
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
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('📤 Sending ping to server...');

        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));

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
    if (isReconnectingRef.current) {
      console.log('⏳ Reconnection already in progress...');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    isReconnectingRef.current = true;

    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    try {
      const wsUrl = window.location.hostname === 'localhost'
        ? 'ws://localhost:7080'
        : 'wss://popbackend.comstreamtech.com';

      console.log(`🔌 Connecting to WebSocket: ${wsUrl} (Attempt ${reconnectAttempts + 1})`);
      setConnectionStatus('connecting');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error('⏱️ Connection timeout');
          ws.close();
          setConnectionStatus('timeout');
        }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        isReconnectingRef.current = false;

        console.log('🔐 Authenticating user:', currentUser.username);
        ws.send(JSON.stringify({
          type: 'authenticate',
          username: currentUser.username
        }));

        startPingInterval();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message type:', message.type, message);

          if (message.type === 'pong') {
            console.log('📥 Received pong from server');
            if (pongTimeoutRef.current) {
              clearTimeout(pongTimeoutRef.current);
              pongTimeoutRef.current = null;
            }
            return;
          }

          if (message.type === 'complete_customer_data') {
      console.log('✅ COMPLETE CUSTOMER DATA RECEIVED:', message);
      const callId = message.callInfo?.callId;
      
      if (!callId) {
        console.warn('⚠️ No callId in complete_customer_data');
        return;
      }

      // Update the call with complete Tekion data
      setCurrentCalls(prevCalls => {
        return prevCalls.map(call => {
          if (call.callId === callId) {
            console.log('🔄 Updating call with Tekion data:', callId);
            return {
              ...call,
              customerData: {
                ...call.customerData,
                ...message.vinSolutions,
                tekionData: message.tekion
              },
              tekionData: message.tekion, // Also store at top level for easy access
              fullyLoaded: true,
              loadingStage: 4
            };
          }
          return call;
        });
      });

      // Update popup if showing this call
      setCallInfo(prevInfo => {
        if (prevInfo && prevInfo.callId === callId) {
          setCustomerData(prevData => ({
            ...prevData,
            ...message.vinSolutions,
            tekionData: message.tekion
          }));
        }
        return prevInfo;
      });

      return;
    }

          // Handle call timer started
          if (message.type === 'call_timer_started') {
            console.log('⏱️ Call timer started notification received');
            const { callId, startTime } = message;
            setCallStartTime(startTime);
            setCurrentCallId(callId);
            setIsCallActive(true);
            
            // Update the call in currentCalls with timer info
            setCurrentCalls(prevCalls => {
              return prevCalls.map(call => {
                if (call.callId === callId) {
                  return {
                    ...call,
                    timerStarted: true,
                    startTime: startTime
                  };
                }
                return call;
              });
            });
            return;
          }

          // Handle call timer ended
          if (message.type === 'call_timer_ended') {
            console.log('⏱️ Call timer ended notification received');
            const { callId, duration } = message;
            
            setIsCallActive(false);
            setCallStartTime(null);
            
            // Update the call with final duration
            setCurrentCalls(prevCalls => {
              return prevCalls.map(call => {
                if (call.callId === callId) {
                  return {
                    ...call,
                    timerStarted: false,
                    callDuration: duration,
                    callEnded: true
                  };
                }
                return call;
              });
            });
            
            // Delay closing popup to show final duration
            setTimeout(() => {
              if (currentCallId === callId && showCustomerPopup) {
                setShowCustomerPopup(false);
                setCustomerData(null);
                setCallInfo(null);
                setLoadingStage(0);
                setCurrentCallId(null);
              }
            }, 5000);
            return;
          }

          // Handle call end
          if (message.type === 'call_ended') {
            console.log('📞 Call ended notification received');
            const { callId } = message;
            
            setIsCallActive(false);
            
            // If no timer was started (call wasn't answered), still mark as ended
            setCurrentCalls(prevCalls => {
              return prevCalls.map(call => {
                if (call.callId === callId) {
                  return {
                    ...call,
                    callEnded: true,
                    status: 'Ended'
                  };
                }
                return call;
              });
            });
            
            setTimeout(() => {
              if (currentCallId === callId && showCustomerPopup) {
                setShowCustomerPopup(false);
                setCustomerData(null);
                setCallInfo(null);
                setLoadingStage(0);
                setCurrentCallId(null);
              }
            }, 5000);
            return;
          }

          // HANDLE PROGRESSIVE UPDATES WITH DEDUPLICATION
          if (message.type === 'progressive_update') {
            console.log('🔄 Processing progressive update, stage:', message.stage);
            const callId = message.callInfo?.callId;
            
            if (!callId) {
              console.warn('⚠️ No callId in progressive update');
              return;
            }

            // UPDATE CALL IN STATE
            setCurrentCalls(prevCalls => {
              const existingCallIndex = prevCalls.findIndex(call => call.callId === callId);
              
              if (existingCallIndex !== -1) {
                // UPDATE EXISTING CALL
                console.log(`🔄 Updating existing call ${callId} at stage ${message.stage}`);
                const updatedCalls = [...prevCalls];
                const existingCall = updatedCalls[existingCallIndex];
                
                if (message.stage === 1) {
                  existingCall.phoneNumber = message.data.phoneNumber;
                } else if (message.stage === 2) {
                  existingCall.customerData = {
                    ...existingCall.customerData,
                    ...message.data
                  };
                  if (message.data.contact?.fullName) {
                    existingCall.callerName = message.data.contact.fullName;
                  }
                } else if (message.stage === 3) {
                  existingCall.customerData = {
                    ...existingCall.customerData,
                    ...message.data
                  };
                } else if (message.stage === 4) {
                  existingCall.customerData = message.data;
                  existingCall.fullyLoaded = true;
                }
                
                existingCall.lastUpdate = new Date().toISOString();
                existingCall.loadingStage = message.stage;
                updatedCalls[existingCallIndex] = existingCall;
                
                return updatedCalls;
              } else {
                // CREATE NEW CALL (ONLY ON STAGE 1)
                if (message.stage === 1) {
                  console.log('🆕 Creating new call entry for:', callId);
                  const newCall = {
                    id: Date.now(),
                    callId: callId,
                    callerName: message.callInfo.callerName || message.callInfo.callerNumber,
                    callerNumber: message.callInfo.callerNumber,
                    extension: message.callInfo.extension,
                    status: message.callInfo.status,
                    timestamp: message.callInfo.timestamp || new Date().toISOString(),
                    phoneNumber: message.data.phoneNumber,
                    customerData: null,
                    fullyLoaded: false,
                    loadingStage: 1,
                    lastUpdate: new Date().toISOString(),
                    timerStarted: false,
                    callEnded: false
                  };
                  
                  return [newCall, ...prevCalls];
                } else {
                  console.warn(`⚠️ Received stage ${message.stage} for unknown call ${callId} - ignoring`);
                  return prevCalls;
                }
              }
            });

            // UPDATE POPUP STATES SEPARATELY
            setCurrentCalls(prevCalls => {
              const call = prevCalls.find(c => c.callId === callId);
              
              if (call) {
                // Update popup if it's showing or if it's a new call (stage 1)
                if (message.stage === 1) {
                  // New call - show popup
                  setCurrentCallId(callId);
                  setShowCustomerPopup(true);
                  setCallInfo({
                    callId: callId,
                    callerNumber: call.phoneNumber,
                    callerName: 'Loading...',
                    ...message.callInfo
                  });
                  setCustomerData(null);
                  setLoadingStage(1);
                  
                  // Play sound and show notification
                  audioRef.current?.play().catch(() => console.log('🔇 Audio play prevented'));
                  
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Incoming Call', {
                      body: `Call from ${call.phoneNumber}`,
                      icon: '/icon-192.png',
                      requireInteraction: true
                    });
                  }
                } else {
                  // Update existing call popup if it's currently showing this call
                  setCallInfo(prevInfo => {
                    if (prevInfo && prevInfo.callId === callId) {
                      setCustomerData(call.customerData);
                      setLoadingStage(message.stage);
                      
                      if (message.data.contact?.fullName) {
                        return {
                          ...prevInfo,
                          callerName: message.data.contact.fullName
                        };
                      }
                    }
                    return prevInfo;
                  });
                }
              }
              
              return prevCalls;
            });

            console.log(`\n${'='.repeat(60)}`);
            console.log(`📊 Progressive Update - Stage ${message.stage}`);
            console.log(`${'='.repeat(60)}\n`);

          }

          // HANDLE LEGACY CALL NOTIFICATIONS (WITH DEDUPLICATION)
          else if (message.type === 'call_notification' &&
            message.data.userExtension === currentUser.username) {
            console.log('📞 Processing legacy call notification');
            
            const callId = message.data?.callId;
            if (!callId) {
              console.warn('⚠️ No callId in call notification');
              return;
            }

            setCurrentCalls(prevCalls => {
              const existingCall = prevCalls.find(call => call.callId === callId);
              
              if (existingCall) {
                console.log(`⏭️ Skipping legacy notification - call ${callId} already exists`);
                return prevCalls;
              }
              
              console.log('🆕 Creating call from legacy notification:', callId);
              const newCall = {
                id: Date.now(),
                callId: callId,
                callerName: message.data.customerData?.contact?.fullName || message.data.callerName,
                callerNumber: message.data.callerNumber,
                extension: message.data.extension,
                status: message.data.status,
                timestamp: message.data.timestamp || new Date().toISOString(),
                customerData: message.data.customerData,
                fullyLoaded: true,
                loadingStage: 4,
                lastUpdate: new Date().toISOString(),
                timerStarted: false,
                callEnded: false
              };

              setCurrentCallId(callId);
              setShowCustomerPopup(true);
              setCustomerData(message.data.customerData);
              setCallInfo({
                callId: callId,
                callerNumber: message.data.callerNumber,
                callerName: newCall.callerName
              });
              setLoadingStage(4);

              audioRef.current?.play().catch(() => console.log('🔇 Audio play prevented'));

              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Incoming Call', {
                  body: `${newCall.callerName} (${message.data.callerNumber})`,
                  icon: '/icon-192.png',
                  tag: callId,
                  requireInteraction: true
                });
              }

              return [newCall, ...prevCalls];
            });
          } 
          
          else if (message.type === 'authenticated') {
            console.log('✅ WebSocket authenticated for user:', currentUser.username);
            fetchCallHistory(currentUser.username);
          } 
          
          else if (message.type === 'connected') {
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

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

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
  }, [currentUser, isAuthenticated, reconnectAttempts, startPingInterval, showCustomerPopup, fetchCallHistory, currentCallId]);

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
        await fetchCallHistory(data.username);
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
    setCurrentCalls([]);
    setCallHistory([]);
    setShowCustomerPopup(false);
    setCustomerData(null);
    setConnectionStatus('disconnected');
    setReconnectAttempts(0);
    setLoadingStage(0);
    setIsCallActive(false);
    setCallStartTime(null);
    setCurrentCallId(null);
  };

  const closeCustomerPopup = () => {
    setShowCustomerPopup(false);
    setCustomerData(null);
    setCallInfo(null);
    setLoadingStage(0);
    // Note: Don't reset isCallActive here as call may still be ongoing
  };

  const handleCallClick = (call) => {
    setCustomerData(call.customerData);
    setCallInfo({
      callId: call.callId,
      callerNumber: call.callerNumber,
      callerName: call.customerData?.contact?.fullName || call.callerName
    });
    setShowCustomerPopup(true);
    setLoadingStage(call.loadingStage || 4);
    setCurrentCallId(call.callId);
    
    // Set call active state based on call status
    if (call.timerStarted && !call.callEnded) {
      setIsCallActive(true);
      setCallStartTime(call.startTime);
    } else {
      setIsCallActive(false);
      setCallStartTime(null);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'connected';
      case 'connecting':
      case 'reconnecting': return 'reconnecting';
      case 'offline': return 'offline';
      case 'error':
      case 'failed':
      case 'timeout':
      case 'disconnected': return 'disconnected';
      default: return 'disconnected';
    }
  };

  const getStatusText = () => {
    if (connectionStatus === 'reconnecting') {
      return `reconnecting (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`;
    }
    if (connectionStatus === 'offline') {
      return 'offline - no internet';
    }
    if (connectionStatus === 'timeout') {
      return 'connection timeout';
    }
    return connectionStatus;
  };

// Add this state at the top of your App component
const [showPassword, setShowPassword] = useState(false);

// Login Screen
if (!isAuthenticated) {
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-form-section">
          <div className="company-branding">
            <div className="company-name">
              <h1 className="company-name-main">CELEBRATION</h1>
              <p className="company-name-sub">CHEVROLET</p>
            </div>
          </div>
          <div className="login-header">
            <h2>Login</h2>
            {/* <p>Don't have an account? Create your account</p> */}
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
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoggingIn}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember Me</span>
              </label>
              {/* <a href="#" className="forgot-password">Forgot password?</a> */}
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="btn-login" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in...' : 'LOGIN'}
            </button>
          </form>
        </div>
        <div className="login-welcome-section">
          <div className="welcome-content">
            <h1>Welcome<br />Back.</h1>
            <p>Login to your call tracking dashboard and stay connected. Quick access to all your customer interactions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

  // Main App
  return (
    <div className="app pt-20">
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

      {!showCustomerPopup ? (
        <main className="main-content max-w-[1280px] mx-auto px-4">
          <div className="notifications-header">
            <h2>Recent Calls ({currentCalls.length + callHistory.length})</h2>
            <div className="flex gap-2">
              <button
                className="btn-refresh"
                onClick={() => fetchCallHistory(currentUser.username)}
                disabled={loadingHistory}
              >
                {loadingHistory ? 'Refreshing...' : 'Refresh History'}
              </button>
              {currentCalls.length > 0 && (
                <button className="btn-clear" onClick={() => setCurrentCalls([])}>
                  Clear Session
                </button>
              )}
            </div>
          </div>

          {currentCalls.length === 0 && callHistory.length === 0 ? (
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
              {/* Current Session Calls */}
              {currentCalls.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-4">Current Session</h3>
                  {currentCalls.map((call) => (
                    <div
                      key={call.id}
                      className="notification-card cursor-pointer hover:bg-gray-50"
                      onClick={() => handleCallClick(call)}
                    >
                      <div className="notification-header">
                        <h3>
                          {call.callerName || 'Unknown Caller'}
                        </h3>
                        <span className="time">
                          {new Date(call.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="notification-body">
                        <p><strong>Number:</strong> {call.callerNumber}</p>
                        <p><strong>Extension:</strong> {call.extension}</p>
                        {call.customerData?.contact && (
                          <>
                            <p><strong>Customer ID:</strong> {call.customerData.contact.contactId}</p>
                            <p><strong>Leads:</strong> {call.customerData.leads?.length || 0}</p>
                          </>
                        )}
                        <p><strong>Status:</strong> 
                          {call.timerStarted && !call.callEnded ? (
                            <span className="status-badge-small bg-green-100 text-green-700">Active</span>
                          ) : call.callEnded ? (
                            <span className="status-badge-small bg-red-100 text-red-700">Ended</span>
                          ) : (
                            <span className="status-badge-small">{call.status}</span>
                          )}
                        </p>
                        {!call.fullyLoaded && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded ml-2">
                            Loading Stage {call.loadingStage}/4
                          </span>
                        )}
                        {call.callDuration && (
                          <p><strong>Duration:</strong> {Math.floor(call.callDuration / 60)}:{(call.callDuration % 60).toString().padStart(2, '0')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Historical Calls */}
              {callHistory.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">
                    Call History
                    {loadingHistory && <span className="text-sm text-gray-500 ml-2">(Loading...)</span>}
                  </h3>
                  {callHistory.map((call) => (
                    <div
                      key={call._id}
                      className="notification-card cursor-pointer hover:bg-gray-50 bg-gray-50"
                      onClick={() => handleCallClick(call)}
                    >
                      <div className="notification-header">
                        <h3>
                          {call.customerData?.contact?.fullName || call.callerName || 'Unknown Caller'}
                        </h3>
                        <span className="time">
                          {new Date(call.timestamp).toLocaleDateString()} {new Date(call.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="notification-body">
                        <p><strong>Number:</strong> {call.callerNumber}</p>
                        <p><strong>Extension:</strong> {call.extension}</p>
                        {call.customerData?.contact && (
                          <>
                            <p><strong>Customer ID:</strong> {call.customerData.contact.contactId}</p>
                            <p><strong>Leads:</strong> {call.customerData.leads?.length || 0}</p>
                          </>
                        )}
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">Historical</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </main>
      ) : (
        <Dashboard
          customerDataProp={customerData}
          fromProp={callInfo?.callerNumber}
          onClose={closeCustomerPopup}
          loadingStage={loadingStage}
          isCallActive={isCallActive}
          callStartTime={callStartTime}
        />
      )}
    </div>
  );
}

export default App;