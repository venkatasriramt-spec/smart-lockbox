
export const createRateLimiter = (maxAttempts, windowMs, storageKey) => {
  const getAttempts = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out expired attempts
        const now = Date.now();
        const validAttempts = parsed.filter(time => now - time < windowMs);
        if (validAttempts.length !== parsed.length) {
          localStorage.setItem(storageKey, JSON.stringify(validAttempts));
        }
        return validAttempts;
      }
    } catch (e) {
      console.error("Error reading rate limiter state", e);
    }
    return [];
  };

  const saveAttempts = (attempts) => {
    localStorage.setItem(storageKey, JSON.stringify(attempts));
  };

  return {
    canAttempt: () => {
      const attempts = getAttempts();
      return attempts.length < maxAttempts;
    },
    recordAttempt: () => {
      const attempts = getAttempts();
      attempts.push(Date.now());
      saveAttempts(attempts);
    },
    getTimeUntilReset: () => {
      const attempts = getAttempts();
      if (attempts.length < maxAttempts) return 0;
      const oldestAttempt = Math.min(...attempts);
      const resetTime = oldestAttempt + windowMs;
      return Math.max(0, resetTime - Date.now());
    },
    reset: () => {
      localStorage.removeItem(storageKey);
    }
  };
};

export const createCooldownTimer = (cooldownMs, storageKey) => {
  const getLastAttempt = () => {
    const stored = localStorage.getItem(storageKey);
    return stored ? parseInt(stored, 10) : 0;
  };

  return {
    isOnCooldown: () => {
      const last = getLastAttempt();
      return Date.now() - last < cooldownMs;
    },
    startCooldown: () => {
      localStorage.setItem(storageKey, Date.now().toString());
    },
    getTimeRemaining: () => {
      const last = getLastAttempt();
      const elapsed = Date.now() - last;
      return elapsed >= cooldownMs ? 0 : cooldownMs - elapsed;
    },
    reset: () => {
      localStorage.removeItem(storageKey);
    }
  };
};

export const isFirebaseTooManyRequestsError = (error) => {
  if (!error) return false;
  return error.code === 'auth/too-many-requests';
};

export const getFirebaseRateLimitMessage = (timeRemainingMs) => {
  const seconds = Math.ceil(timeRemainingMs / 1000);
  return `Too many attempts. Please wait ${seconds} seconds before trying again.`;
};
