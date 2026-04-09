
import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Loader, Phone, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { submitAccessRequest, autoApprovePreApprovedRequest } from '@/utils/lockboxUtils';
import { logRequestState } from '@/utils/requestStatusValidation';
import { ref, onValue, get } from 'firebase/database';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, database } from '@/config/firebase';
import { 
  validatePhoneNumber, 
  formatPhoneForFirebase, 
  validateOTPFormat, 
  generateOTPErrorMessage,
  isFirebaseTooManyRequestsError,
  getFirebaseRateLimitMessage
} from '@/utils/otpUtils';
import { generateCaptchaErrorMessage } from '@/utils/captchaUtils';
import { maskIndianPhoneNumber } from '@/utils/phoneUtils';
import { useOTPRateLimit } from '@/hooks/useOTPRateLimit';

const GuestPhoneVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState('phone-input');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [inputPhone, setInputPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [recaptchaError, setRecaptchaError] = useState('');
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  
  const recaptchaContainerRef = useRef(null);
  const { lockboxId, guestInfo } = location.state || {};

  const {
    canVerify,
    recordVerifyAttempt,
    getVerifyTimeRemaining,
    canResend,
    recordResendAttempt,
    getResendTimeRemaining
  } = useOTPRateLimit();

  const verifyTimeLeft = Math.ceil(getVerifyTimeRemaining() / 1000);
  const resendTimeLeft = Math.ceil(getResendTimeRemaining() / 1000);

  useEffect(() => {
    if (!lockboxId) return;
    const lockboxRef = ref(database, `lockboxes/${lockboxId}/lockbox/keyPresent`);
    const unsub = onValue(lockboxRef, (snap) => {
      if (snap.exists() && snap.val() === false) {
        navigate('/guest/waiting', { state: { lockboxId, error: 'key_missing' } });
      }
    });
    return () => unsub();
  }, [lockboxId, navigate]);

  useEffect(() => {
    if (guestInfo?.phone) {
      const digits = guestInfo.phone.replace(/\D/g, '');
      const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
      setInputPhone(last10);
    }
  }, [guestInfo]);

  useEffect(() => {
    let timer;
    if (step === 'phone-input') {
      const initRecaptcha = () => {
        const container = document.getElementById('recaptcha-container');
        if (!container || !recaptchaContainerRef.current) {
          timer = setTimeout(initRecaptcha, 100);
          return;
        }
        try {
          if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              size: 'normal',
              callback: () => {
                setRecaptchaError('');
              },
              'expired-callback': () => {
                setRecaptchaError('reCAPTCHA expired. Please verify again.');
                toast({ title: "Session Expired", description: "reCAPTCHA expired. Please try again.", variant: "destructive" });
              }
            });
            
            window.recaptchaVerifier.render()
              .then(() => {
                setRecaptchaReady(true);
                setRecaptchaError('');
              })
              .catch((err) => {
                console.error('reCAPTCHA render error:', err);
                setRecaptchaError(generateCaptchaErrorMessage(err));
              });
          } else {
            setRecaptchaReady(true);
          }
        } catch (error) {
          console.error('Error creating RecaptchaVerifier:', error);
          setRecaptchaError('Failed to initialize captcha.');
        }
      };

      timer = setTimeout(initRecaptcha, 250);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [step, toast]);

  const retryRecaptcha = () => {
    setRecaptchaError('');
    setRecaptchaReady(false);
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch(e) { }
      window.recaptchaVerifier = null;
    }
    setStep('');
    setTimeout(() => setStep('phone-input'), 50);
  };

  const handleSendOtp = async () => {
    if (!canResend()) {
      toast({ title: "Rate Limited", description: getFirebaseRateLimitMessage(resendTimeLeft), variant: "destructive" });
      return;
    }

    if (recaptchaError || !window.recaptchaVerifier) {
      toast({ title: "System Not Ready", description: "Please wait for reCAPTCHA to load.", variant: "destructive" });
      return;
    }

    if (!validatePhoneNumber(inputPhone)) {
      toast({ title: "Invalid Phone", description: "Please enter a valid 10-digit Indian mobile number.", variant: "destructive" });
      return;
    }

    let formattedPhoneForAuth;
    try {
      formattedPhoneForAuth = formatPhoneForFirebase(inputPhone);
      setFormattedPhone(formattedPhoneForAuth);
    } catch (err) {
      toast({ title: "Invalid Phone Number", description: err.message, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    recordResendAttempt();
    
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhoneForAuth, appVerifier);
      
      setConfirmationResult(result);
      setStep('otp-input');
      toast({ title: "Code Sent", description: `Verification code sent to ${formattedPhoneForAuth}` });
      
    } catch (error) {
      console.error('signInWithPhoneNumber failed:', error);
      
      let msg = generateOTPErrorMessage(error.code);
      if (isFirebaseTooManyRequestsError(error)) {
        msg = getFirebaseRateLimitMessage(resendTimeLeft || 60);
      } else if (error.code?.includes('captcha')) {
        msg = generateCaptchaErrorMessage(error);
      }
      
      toast({ title: "Error", description: msg, variant: "destructive" });
      setRecaptchaError(msg);
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      setRecaptchaReady(false);
      setTimeout(retryRecaptcha, 500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!canVerify()) {
      toast({ title: "Rate Limited", description: getFirebaseRateLimitMessage(verifyTimeLeft), variant: "destructive" });
      return;
    }

    if (!validateOTPFormat(otp)) {
      toast({ title: "Incomplete Code", description: "Please enter the full 6-digit code.", variant: "destructive" });
      return;
    }

    if (!confirmationResult || typeof confirmationResult.confirm !== 'function') {
      toast({ title: "Session Error", description: "Verification session invalid. Please go back and resend the code.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    recordVerifyAttempt();

    try {
      await confirmationResult.confirm(otp);
      toast({ title: "Phone Verified", description: "Your identity has been verified successfully.", className: "bg-[#059669] text-white border-0" });
      await proceedWithAccessRequest();
      
    } catch (error) {
      console.error('OTP confirmation failed:', error);
      let msg = generateOTPErrorMessage(error.code);
      if (isFirebaseTooManyRequestsError(error)) {
        msg = getFirebaseRateLimitMessage(verifyTimeLeft || 60);
      }
      toast({ title: "Verification Failed", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithAccessRequest = async () => {
    try {
      const requestOptions = {
        isPreApproved: !!guestInfo.isPreApproved,
        preApprovalId: guestInfo.preApprovalId
      };
      
      const response = await submitAccessRequest(lockboxId, guestInfo, requestOptions);
      logRequestState("POST-SUBMIT-CLIENT", response);

      const requestRef = ref(database, `lockboxes/${lockboxId}/requests/${response.id}`);
      const requestSnap = await get(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error("Unable to retrieve created access request.");
      }

      const fetchedRequest = requestSnap.val();
      if (fetchedRequest.isPreApproved === true) {
        const updatedRequest = await autoApprovePreApprovedRequest(
          lockboxId, 
          fetchedRequest.id, 
          fetchedRequest.preApprovalId, 
          formattedPhone, 
          fetchedRequest.duration
        );
        navigate('/guest/access', { state: { lockboxId, request: updatedRequest || fetchedRequest } });
      } else {
        navigate('/guest/waiting', { state: { lockboxId, requestId: fetchedRequest.id } });
      }
    } catch (error) {
      toast({ title: "Request Failed", description: error.message, variant: "destructive" });
    }
  };

  if (!lockboxId || !guestInfo) {
    return <Navigate to="/guest-portal" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EC4899] to-[#EA580C] flex flex-col items-center justify-center p-4 font-sans relative">
      <div className="w-full max-w-md z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Card className="bg-indigo-600 shadow-2xl rounded-[16px] p-8 border-none ring-1 ring-white/10 relative z-10">
            
            {step === 'phone-input' ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-white/20">
                    <Phone className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                  <h2 className="text-[28px] font-bold text-white font-poppins mb-2">Verify Phone</h2>
                  <p className="text-indigo-100 font-medium">We'll send a text with a verification code.</p>
                </div>

                <div className="mb-6">
                  <label className="text-indigo-200 text-sm font-semibold mb-2 block">Indian Mobile Number</label>
                  <div className="flex bg-white/10 border border-indigo-400/30 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-white/50 transition-all">
                    <span className="flex items-center justify-center px-4 text-white font-medium border-r border-indigo-400/30 bg-white/5">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={inputPhone}
                      onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-4 py-3 bg-transparent text-white font-mono text-lg tracking-wider focus:outline-none placeholder:text-indigo-300/50"
                      placeholder="9876543210"
                      disabled={isLoading || !canResend()}
                    />
                  </div>
                </div>

                <div 
                  id="recaptcha-container" 
                  ref={recaptchaContainerRef} 
                  className={`flex justify-center mb-6 min-h-[78px] ${recaptchaError ? 'hidden' : 'block'}`}
                ></div>

                {recaptchaError && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-center">
                    <AlertCircle className="w-6 h-6 text-red-200 mx-auto mb-2" />
                    <p className="text-red-100 text-sm mb-3">{recaptchaError}</p>
                    <Button onClick={retryRecaptcha} variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                    </Button>
                  </div>
                )}

                <Button 
                  onClick={handleSendOtp}
                  disabled={isLoading || inputPhone.length !== 10 || (!recaptchaReady && !recaptchaError) || !canResend()}
                  className="w-full py-6 text-lg font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-[12px] transition-all duration-300 hover:scale-[1.02] border-0 disabled:opacity-50 flex flex-col items-center justify-center disabled-btn-state h-auto min-h-[56px]"
                >
                  {isLoading ? (
                    <div className="flex items-center"><Loader className="w-5 h-5 animate-spin mr-2" /> Sending OTP...</div>
                  ) : !canResend() ? (
                    <div className="flex items-center text-sm font-medium countdown-timer"><Clock className="w-4 h-4 mr-1.5" /> Try again in {resendTimeLeft}s</div>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </>
            ) : step === 'otp-input' ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-white/20">
                    <ShieldCheck className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                  <h2 className="text-[28px] font-bold text-white font-poppins mb-2">Enter OTP Code</h2>
                  <p className="text-indigo-100 font-medium">Enter the 6-digit code sent to</p>
                  <p className="font-bold text-white text-lg mt-1">{maskIndianPhoneNumber(formattedPhone)}</p>
                </div>

                <div className="mb-8">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isLoading || !canVerify()}
                    placeholder="000000"
                    className="w-full h-16 text-center text-4xl font-mono tracking-[0.5em] bg-white/10 border-2 border-indigo-400/30 focus:border-white focus:bg-white/20 rounded-[12px] text-white focus:outline-none transition-all shadow-inner"
                  />
                </div>

                <Button 
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6 || !canVerify()}
                  className="w-full py-6 text-lg font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-[12px] transition-all duration-300 hover:scale-[1.02] border-0 mb-4 disabled-btn-state h-auto min-h-[56px]"
                >
                  {isLoading ? (
                    <div className="flex items-center"><Loader className="w-5 h-5 animate-spin mr-2" /> Verifying...</div>
                  ) : !canVerify() ? (
                    <div className="flex items-center text-sm font-medium countdown-timer"><Clock className="w-4 h-4 mr-1.5" /> Try again in {verifyTimeLeft}s</div>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <div className="flex flex-col items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSendOtp}
                    disabled={!canResend() || isLoading}
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 disabled-btn-state"
                  >
                    {!canResend() ? `Resend available in ${resendTimeLeft}s` : 'Resend Code'}
                  </Button>
                  <button 
                    onClick={() => {
                      setStep('phone-input');
                      setOtp('');
                    }}
                    disabled={isLoading}
                    className="text-indigo-200 font-semibold hover:text-white transition-colors text-sm"
                  >
                    Change Phone Number
                  </button>
                </div>
              </>
            ) : null}

            <div className="text-center mt-6 pt-4 border-t border-white/10">
              <button 
                onClick={() => navigate(-1)}
                disabled={isLoading}
                className="text-indigo-200 font-bold hover:text-white flex items-center justify-center mx-auto gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Info
              </button>
            </div>

          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default GuestPhoneVerification;
