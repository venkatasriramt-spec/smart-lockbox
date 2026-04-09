
import { useState, useEffect, useCallback } from 'react';
import { createRateLimiter, createCooldownTimer } from '@/utils/rateLimitingUtils';

export const useOTPRateLimit = () => {
  // Config
  const MAX_VERIFY_ATTEMPTS = 5;
  const VERIFY_WINDOW_MS = 15 * 60 * 1000; // 15 mins
  const VERIFY_COOLDOWN_MS = 30 * 1000; // 30 seconds

  const MAX_RESEND_ATTEMPTS = 3;
  const RESEND_WINDOW_MS = 60 * 1000; // 60 seconds
  const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

  // Limiters & Timers
  const verifyLimiter = createRateLimiter(MAX_VERIFY_ATTEMPTS, VERIFY_WINDOW_MS, 'otp_verify_limits');
  const verifyCooldown = createCooldownTimer(VERIFY_COOLDOWN_MS, 'otp_verify_cooldown');

  const resendLimiter = createRateLimiter(MAX_RESEND_ATTEMPTS, RESEND_WINDOW_MS, 'otp_resend_limits');
  const resendCooldown = createCooldownTimer(RESEND_COOLDOWN_MS, 'otp_resend_cooldown');

  // State
  const [verifyTimeRemaining, setVerifyTimeRemaining] = useState(0);
  const [resendTimeRemaining, setResendTimeRemaining] = useState(0);

  const updateTimers = useCallback(() => {
    // Verify
    const vLimitWait = verifyLimiter.getTimeUntilReset();
    const vCoolWait = verifyCooldown.getTimeRemaining();
    setVerifyTimeRemaining(Math.max(vLimitWait, vCoolWait));

    // Resend
    const rLimitWait = resendLimiter.getTimeUntilReset();
    const rCoolWait = resendCooldown.getTimeRemaining();
    setResendTimeRemaining(Math.max(rLimitWait, rCoolWait));
  }, []);

  useEffect(() => {
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [updateTimers]);

  return {
    canVerify: () => verifyTimeRemaining <= 0,
    recordVerifyAttempt: () => {
      verifyLimiter.recordAttempt();
      verifyCooldown.startCooldown();
      updateTimers();
    },
    getVerifyTimeRemaining: () => verifyTimeRemaining,
    
    canResend: () => resendTimeRemaining <= 0,
    recordResendAttempt: () => {
      resendLimiter.recordAttempt();
      resendCooldown.startCooldown();
      updateTimers();
    },
    getResendTimeRemaining: () => resendTimeRemaining,

    resetAll: () => {
      verifyLimiter.reset();
      verifyCooldown.reset();
      resendLimiter.reset();
      resendCooldown.reset();
      updateTimers();
    }
  };
};
