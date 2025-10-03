import { useState, useEffect, useRef } from 'react';

const useCallDuration = () => {
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((now - callStartTimeRef.current) / 1000);
      setCallDuration(duration);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return callDuration;
};

export default useCallDuration;