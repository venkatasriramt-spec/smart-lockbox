import { useState, useEffect, useRef } from 'react';
import { triggerBuzzerPattern, clearBuzzer } from '@/utils/buzzerUtils';
import { setTheftAlert, completeSession } from '@/utils/lockboxUtils';
import { database } from '@/config/firebase';
import { ref, get } from 'firebase/database';

export const useCountdownTimer = (lockboxId, expiresAt, requestId = null) => {
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [theftDetected, setTheftAlertState] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  
  const warningTriggeredRef = useRef(false);
  const expirationHandledRef = useRef(false);

  useEffect(() => {
    if (!expiresAt || !lockboxId) return;

    warningTriggeredRef.current = false;
    expirationHandledRef.current = false;
    setIsWarningActive(false);
    setIsExpired(false);
    setTheftAlertState(false);
    setSessionCompleted(false);

    const handleExpiration = async () => {
      if (expirationHandledRef.current) return;
      expirationHandledRef.current = true;
      setIsExpired(true);

      try {
        const keyRef = ref(database, `lockboxes/${lockboxId}/lockbox/keyPresent`);
        const snapshot = await get(keyRef);
        const isKeyPresent = !!snapshot.val();

        if (isKeyPresent) {
          await completeSession(lockboxId, requestId);
          setSessionCompleted(true);
        } else {
          await setTheftAlert(lockboxId, requestId);
          triggerBuzzerPattern(lockboxId, "KEY_NOT_RETURNED", 10000);
          setTheftAlertState(true);
          setTimeout(() => clearBuzzer(lockboxId), 10000);
        }
      } catch (err) {
        console.error("Failed to handle timer expiration securely", err);
      }
    };

    const checkTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 60 && remaining > 0 && !warningTriggeredRef.current) {
        warningTriggeredRef.current = true;
        setIsWarningActive(true);
        triggerBuzzerPattern(lockboxId, "WARNING_1_MIN", 10000);
        
        setTimeout(() => {
          clearBuzzer(lockboxId);
          setIsWarningActive(false);
        }, 10000);
      }

      if (remaining <= 0) {
        handleExpiration();
        return true; 
      }
      return false;
    };

    if (checkTime()) return;

    const interval = setInterval(() => {
      if (checkTime()) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockboxId, expiresAt, requestId]);

  return { secondsRemaining, isExpired, isWarningActive, theftDetected, sessionCompleted };
};