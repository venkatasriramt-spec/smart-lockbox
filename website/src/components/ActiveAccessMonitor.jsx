import { useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { triggerBuzzerWarning, resetBuzzer } from '@/utils/buzzerUtils';

const ActiveAccessMonitor = ({ lockboxId }) => {
  const sessionDataRef = useRef(null);
  const warningTriggeredForRef = useRef(null);

  // 1. Monitor active session data
  useEffect(() => {
    if (!lockboxId) return;

    // Note: We monitor 'lockboxes/{lockboxId}/lockbox' as this node contains 
    // the 'unlockedUntil' and 'state' fields that define the active session 
    // in the current application architecture.
    const activeSessionRef = ref(database, `lockboxes/${lockboxId}/lockbox`);

    const unsubscribe = onValue(activeSessionRef, (snapshot) => {
      const data = snapshot.val();
      sessionDataRef.current = data;
      
      // If the lockbox is locked or data is missing, we ensure we reset our local warning tracker
      // and ensure buzzer is off if we previously triggered it for this session.
      if (!data || data.state !== 'UNLOCKED' || !data.unlockedUntil) {
         if (warningTriggeredForRef.current) {
             resetBuzzer(lockboxId);
             warningTriggeredForRef.current = null;
         }
      }
    });

    return () => unsubscribe();
  }, [lockboxId]);

  // 2. Poll for time remaining
  useEffect(() => {
    if (!lockboxId) return;

    const checkInterval = setInterval(() => {
      const data = sessionDataRef.current;

      // If no active session, do nothing
      if (!data || data.state !== 'UNLOCKED' || !data.unlockedUntil) return;

      const now = Date.now();
      const remaining = data.unlockedUntil - now;

      // Check if exactly 60 seconds remaining (within a 2-second window for reliability)
      // Window: 59000ms to 61000ms
      if (remaining > 59000 && remaining <= 61000) {
        // Only trigger if we haven't triggered for this specific session expiry timestamp yet
        if (warningTriggeredForRef.current !== data.unlockedUntil) {
          triggerBuzzerWarning(lockboxId, "WARNING_1_MIN", 10000);
          
          // Mark as triggered for this session
          warningTriggeredForRef.current = data.unlockedUntil;

          // Schedule reset after 10 seconds
          setTimeout(() => {
            resetBuzzer(lockboxId);
          }, 10000);
        }
      }

      // If access has expired or we are in negative time
      if (remaining <= 0) {
        // Ensure buzzer is off
        resetBuzzer(lockboxId);
      }

    }, 1000);

    return () => clearInterval(checkInterval);
  }, [lockboxId]);

  return null; // Invisible component
};

export default ActiveAccessMonitor;