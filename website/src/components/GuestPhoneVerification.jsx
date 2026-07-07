import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, Loader, Phone, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { submitAccessRequest, autoApprovePreApprovedRequest } from '@/utils/lockboxUtils';
import { logRequestState } from '@/utils/requestStatusValidation';
import { ref, onValue, get } from 'firebase/database';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, database } from '@/config/firebase';
import { formatIndianPhoneNumber, maskIndianPhoneNumber } from '@/utils/phoneUtils';

const GuestPhoneVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState('phone-input'); // 'phone-input' | 'otp-input'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [inputPhone, setInputPhone] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const [recaptchaError, setRecaptchaError] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  
  const inputRefs = useRef([]);
  const recaptchaContainerRef = useRef(null);

  const { lockboxId, guestInfo } = location.state || {};

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
              callback: (token) => {
                console.log('reCAPTCHA verified successfully');
                setRecaptchaError(false);
              },
              'expired-callback': () => {
                console.warn('reCAPTCHA expired');
                setRecaptchaError(true);
                toast({ title: "Session Expired", description: "reCAPTCHA expired. Please try again.", variant: "destructive" });
              }
            });
            
            window.recaptchaVerifier.render()
              .then(() => {
                setRecaptchaReady(true);
                setRecaptchaError(false);
              })
              .catch((err) => {
                console.error('reCAPTCHA render error:', err);
                setRecaptchaError(true);
              });
          } else {
            setRecaptchaReady(true);
          }
        } catch (error) {
          console.error('Error creating RecaptchaVerifier:', error);
          setRecaptchaError(true);
        }
      };

      timer = setTimeout(initRecaptcha, 250);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [step, toast]);

  const retryRecaptcha = () => {
    setRecaptchaError(false);
    setRecaptchaReady(false);
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch(e) {
        console.error("Error clearing recaptcha", e);
      }
      window.recaptchaVerifier = null;
    }
    setStep('');
    setTimeout(() => setStep('phone-input'), 50);
  };

  const handleSendOtp = async () => {
    if (recaptchaError || !window.recaptchaVerifier) {
      toast({ title: "System Not Ready", description: "Please wait for reCAPTCHA to load or click retry.", variant: "destructive" });
      return;
    }

    let formattedPhoneForAuth;
    try {
      formattedPhoneForAuth = formatIndianPhoneNumber(inputPhone);
      setFormattedPhone(formattedPhoneForAuth);
    } catch (err) {
      toast({ title: "Invalid Phone Number", description: "Please enter a valid 10-digit Indian mobile number.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, formattedPhoneForAuth, appVerifier);
      
      setConfirmationResult(result);
      setStep('otp-input');
      toast({ title: "Code Sent", description: `Verification code sent securely` });
      
      setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 100);
      
    } catch (error) {
      console.error('signInWithPhoneNumber failed:', error.code, error.message);
      
      let errorMsg = "Failed to send code. Please try again.";
      if (error.code === 'auth/invalid-phone-number') errorMsg = "Invalid phone number format.";
      if (error.code === 'auth/too-many-requests') errorMsg = "Too many attempts, please try again later.";
      if (error.code === 'auth/operation-not-allowed') errorMsg = "Phone authentication is not enabled.";
      
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      setRecaptchaError(true);
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      setRecaptchaReady(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (index, value) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter') {
      const otpString = otp.join('');
      if (otpString.length === 6 && !isLoading) {
        handleVerifyOtp();
      }
    }
  };

  const handleVerifyOtp = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      toast({ title: "Incomplete Code", description: "Please enter the full 6-digit code.", variant: "destructive" });
      return;
    }

    if (!confirmationResult || typeof confirmationResult.confirm !== 'function') {
      toast({ title: "Session Error", description: "Verification session invalid. Please go back and resend the code.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[DEEP TRACE] Beginning OTP confirmation...`);
      await confirmationResult.confirm(otpString);
      console.log(`[DEEP TRACE] OTP confirmation SUCCESSFUL.`);
      
      toast({ title: "Phone Verified", description: "Your identity has been verified successfully.", className: "bg-[#059669] text-white border-0" });
      
      await proceedWithAccessRequest();
      
    } catch (error) {
      console.error('[DEEP TRACE] OTP confirmation failed:', error.code, error.message);
      
      let errorMsg = "Invalid verification code.";
      if (error.code === 'auth/invalid-verification-code') errorMsg = "Invalid OTP code.";
      if (error.code === 'auth/code-expired') errorMsg = "OTP code has expired, please request a new one.";
      
      toast({ title: "Verification Failed", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const proceedWithAccessRequest = async () => {
    try {
      console.log(`[DEEP TRACE] Proceeding with access request creation...`);
      const requestOptions = {
        isPreApproved: !!guestInfo.isPreApproved,
        preApprovalId: guestInfo.preApprovalId
      };
      
      console.log(`[DEEP TRACE] Calling submitAccessRequest with:`, { lockboxId, guestInfo, requestOptions });
      const response = await submitAccessRequest(lockboxId, guestInfo, requestOptions);
      
      logRequestState("POST-SUBMIT-CLIENT", response);

      const requestRef = ref(database, `lockboxes/${lockboxId}/requests/${response.id}`);
      const requestSnap = await get(requestRef);
      
      if (!requestSnap.exists()) {
        console.error(`[DEEP TRACE] Failed to fetch newly created request from DB! id: ${response.id}`);
        throw new Error("Unable to retrieve created access request.");
      }

      const fetchedRequest = requestSnap.val();
      console.log(`[DEEP TRACE] Fetched request directly from DB:`);
      logRequestState("FETCHED-FROM-DB", fetchedRequest);

      if (fetchedRequest.isPreApproved === true) {
        console.log(`[DEEP TRACE] Request is pre-approved. Routing to autoApprove...`);
        const updatedRequest = await autoApprovePreApprovedRequest(
          lockboxId, 
          fetchedRequest.id, 
          fetchedRequest.preApprovalId, 
          formattedPhone, 
          fetchedRequest.duration
        );
        navigate('/guest/access', { state: { lockboxId, request: updatedRequest || fetchedRequest } });
      } else {
        console.log(`[DEEP TRACE] Request is normal. Routing to Waiting screen...`);
        navigate('/guest/waiting', { state: { lockboxId, requestId: fetchedRequest.id } });
      }
    } catch (error) {
      console.error("[DEEP TRACE] Error in proceedWithAccessRequest:", error);
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
                  <h2 className="text-[28px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] font-poppins mb-2">Step 1: Phone Verification</h2>
                  <p className="text-indigo-100 font-medium">We'll send a text with a verification code.</p>
                </div>

                <div className="mb-6">
                  <label className="text-indigo-200 text-sm font-semibold mb-2 block">Indian Mobile Number</label>
                  <input
                    type="text"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-4 py-3 bg-white/10 border border-indigo-400/30 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
                    placeholder="Enter 10-digit mobile number"
                    disabled={isLoading}
                  />
                  <p className="text-indigo-200/70 text-xs mt-2 font-medium">Indian mobile numbers only (10 digits)</p>
                </div>

                <div 
                  id="recaptcha-container" 
                  ref={recaptchaContainerRef} 
                  className={`flex justify-center mb-6 min-h-[78px] ${recaptchaError ? 'hidden' : 'block'}`}
                ></div>

                {recaptchaError && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-center">
                    <AlertCircle className="w-6 h-6 text-red-200 mx-auto mb-2" />
                    <p className="text-red-100 text-sm mb-3">reCAPTCHA verification is temporarily unavailable. Please try again.</p>
                    <Button 
                      onClick={retryRecaptcha} 
                      variant="outline" 
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all"
                      size="sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                    </Button>
                  </div>
                )}

                <Button 
                  onClick={handleSendOtp}
                  disabled={isLoading || inputPhone.length !== 10 || (!recaptchaReady && !recaptchaError)}
                  className="w-full py-6 text-lg font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-[12px] transition-all duration-300 hover:scale-[1.02] border-0 disabled:opacity-50"
                >
                  {isLoading ? <><Loader className="w-5 h-5 animate-spin mr-2" /> Sending...</> : 'Send Verification Code'}
                </Button>
              </>
            ) : step === 'otp-input' ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-white/20">
                    <ShieldCheck className="w-8 h-8 text-white drop-shadow-md" />
                  </div>
                  <h2 className="text-[28px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.2)] font-poppins mb-2">Step 2: Enter OTP Code</h2>
                  <p className="text-indigo-100 font-medium">Enter the 6-digit code sent to</p>
                  <p className="font-bold text-white text-lg mt-1">{maskIndianPhoneNumber(formattedPhone)}</p>
                </div>

                <div className="flex justify-between gap-2 mb-8">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-14 text-center text-2xl font-bold bg-white/10 border-2 border-indigo-400/30 focus:border-white focus:bg-white/20 rounded-[12px] text-white focus:outline-none transition-all shadow-inner"
                    />
                  ))}
                </div>

                <Button 
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.some(d => !d)}
                  className="w-full py-6 text-lg font-bold text-white bg-[#059669] hover:bg-[#047857] rounded-[12px] transition-all duration-300 hover:scale-[1.02] border-0 mb-4"
                >
                  {isLoading ? <><Loader className="w-5 h-5 animate-spin mr-2" /> Verifying...</> : 'Verify Code'}
                </Button>

                <div className="text-center space-y-3">
                  <button 
                    onClick={() => {
                      setStep('phone-input');
                      setOtp(['', '', '', '', '', '']);
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