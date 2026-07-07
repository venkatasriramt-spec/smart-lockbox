import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';

/**
 * Hook to listen to real-time keyPresent status from ESP32 via Firebase
 * @param {string} lockboxId 
 * @returns {object} { keyPresent, loading, error }
 */
export const useKeyDetection = (lockboxId) => {
  const [keyPresent, setKeyPresent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lockboxId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Subscribing specifically to the keyPresent node
    const keyRef = ref(database, `lockboxes/${lockboxId}/lockbox/keyPresent`);
    
    const unsubscribe = onValue(keyRef, (snapshot) => {
      // !! handles null/undefined by defaulting to false
      const isPresent = !!snapshot.val();
      
      if (import.meta.env.DEV) {
        console.log(`[KeyDetection] Lockbox ${lockboxId} keyPresent updated to: ${isPresent}`);
      }
      
      setKeyPresent(isPresent);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("[KeyDetection] Connection error:", err);
      setError(err.message);
      setLoading(false);
    });

    // Auto-cleanup listener on unmount
    return () => unsubscribe();
  }, [lockboxId]);

  return { keyPresent, loading, error };
};