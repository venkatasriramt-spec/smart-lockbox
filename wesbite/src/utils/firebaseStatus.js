import { auth, database, initializationError, firebaseConfig } from '@/config/firebase';
import { ref, set, get, child, update } from 'firebase/database';

/**
 * Checks the static configuration status of Firebase.
 */
export const checkFirebaseConfigStatus = () => {
  if (initializationError) {
    return {
      isReady: false,
      stage: 'initialization',
      error: 'Firebase configuration error: ' + initializationError.message
    };
  }

  if (!auth) {
    return {
      isReady: false,
      stage: 'auth',
      error: 'Firebase Auth is not initialized'
    };
  }

  if (!database) {
    return {
      isReady: false,
      stage: 'database',
      error: 'Firebase Database is not initialized'
    };
  }

  return {
    isReady: true,
    stage: 'complete',
    error: null,
    databaseURL: firebaseConfig.databaseURL
  };
};

/**
 * Checks Firebase connection status (alias for checkFirebaseConfigStatus).
 */
export const checkFirebaseConnection = () => {
  return checkFirebaseConfigStatus();
};

/**
 * Performs an active diagnostic test by attempting to write to the database.
 * This verifies network connectivity and write permissions.
 */
export const diagnoseFirebaseConnection = async () => {
  console.group('🔍 Running Firebase Diagnostics');
  
  const configStatus = checkFirebaseConfigStatus();
  if (!configStatus.isReady) {
    console.error('Config Check Failed:', configStatus.error);
    console.groupEnd();
    return {
      success: false,
      step: configStatus.stage,
      message: configStatus.error,
      details: 'Configuration invalid'
    };
  }

  if (!navigator.onLine) {
    console.error('Network Offline');
    console.groupEnd();
    return {
      success: false,
      step: 'network',
      message: 'No internet connection detected',
      details: 'Browser reports offline status'
    };
  }

  const timestamp = Date.now();
  const testRef = ref(database, `_diagnostics/connection_test/${timestamp}`);

  try {
    console.log('Attempting write to:', `_diagnostics/connection_test/${timestamp}`);
    
    // Test Write Operation with 5s timeout
    const writePromise = set(testRef, {
      status: 'test',
      timestamp: timestamp,
      userAgent: navigator.userAgent
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DIAGNOSTIC_TIMEOUT')), 5000)
    );

    await Promise.race([writePromise, timeoutPromise]);
    
    console.log('✅ Write successful');
    console.groupEnd();
    return {
      success: true,
      step: 'write',
      message: 'Connection verified successfully',
      details: `Write latency: ${Date.now() - timestamp}ms`
    };

  } catch (error) {
    console.error('❌ Diagnostic Write Failed:', error);
    console.groupEnd();

    let friendlyMessage = 'Unknown connection error';
    let details = error.message;

    if (error.message === 'DIAGNOSTIC_TIMEOUT') {
      friendlyMessage = 'Database is not responding (Timeout)';
      details = 'Write operation took longer than 5 seconds';
    } else if (error.code === 'PERMISSION_DENIED') {
      friendlyMessage = 'Permission denied';
      details = 'Database rules prevent writing to test path';
    } else if (error.code === 'NETWORK_ERROR') {
      friendlyMessage = 'Network connection failed';
    }

    return {
      success: false,
      step: 'write_failed',
      message: friendlyMessage,
      details: details,
      originalError: error
    };
  }
};

/**
 * Checks if the current user has write permission to the lockbox node.
 * Useful for debugging expiry/locking issues.
 * @param {string} lockboxId 
 */
export const checkLockboxWritePermission = async (lockboxId) => {
  if (!lockboxId) return;
  console.log(`🛡️ Checking write permissions for lockbox: ${lockboxId}`);

  try {
    // Attempt to update a harmless test field
    const lockboxTestRef = ref(database, `lockboxes/${lockboxId}/_permission_check`);
    await set(lockboxTestRef, {
      checkedAt: Date.now(),
      status: 'ok'
    });
    console.log(`✅ Write permission CONFIRMED for lockboxes/${lockboxId}`);
    return true;
  } catch (error) {
    console.error(`❌ Write permission DENIED for lockboxes/${lockboxId}`, error.code, error.message);
    return false;
  }
};

export const getReadableAuthError = (error) => {
  if (!error) return "Unknown error occurred";
  
  const errorCode = error.code || error.message || error;

  switch (errorCode) {
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return "Invalid email or password.";
    case 'auth/wrong-password':
      return "Invalid email or password.";
    case 'auth/invalid-email':
      return "The email address is not valid.";
    case 'auth/user-disabled':
      return "This account has been disabled.";
    case 'auth/email-already-in-use':
      return "An account with this email already exists.";
    case 'auth/weak-password':
      return "Password should be at least 6 characters.";
    case 'auth/network-request-failed':
      return "Network error. Please check your connection.";
    default:
      if (typeof errorCode === 'string' && errorCode.includes('api-key')) {
        return "Configuration Error: Invalid API Key";
      }
      return "Authentication failed. Please try again.";
  }
};