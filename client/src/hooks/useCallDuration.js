// client/src/hooks/useCallDuration.js

import { useState, useEffect, useRef } from 'react';

const useCallDuration = (isCallActive = true) => {
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef(new Date());
  const timerRef = useRef(null);

  useEffect(() => {
    if (isCallActive) {
      // Start or resume timer
      timerRef.current = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now - callStartTimeRef.current) / 1000);
        setCallDuration(duration);
      }, 1000);
    } else {
      // Stop timer when call is not active
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive]);

  const resetTimer = () => {
    callStartTimeRef.current = new Date();
    setCallDuration(0);
  };

  return { callDuration, resetTimer };
};

export default useCallDuration;