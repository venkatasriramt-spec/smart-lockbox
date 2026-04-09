
import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Check, Loader, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  validatePhoneNumber, 
  formatPhoneForFirebase, 
  validateOTPFormat, 
  generateOTPErrorMessage 
} from '@/utils/otpUtils';
import { generateCaptchaErrorMessage } from '@/utils/captchaUtils';

const PhoneVerification = ({ onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('INPUT'); // INPUT, OTP, VERIFIED
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  
  const { updatePhoneVerification, phoneVerified } = useAuth();
  const { toast } = useToast();
  const recaptchaContainerRef = useRef(null);

  useEffect(() => {
    if (phoneVerified) {
      setStep('VERIFIED');
    }
  }, [phoneVerified]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'normal',
          'callback': () => setError(''),
          'expired-callback': () => {
            setError('reCAPTCHA expired. Please verify again.');
            toast({ title: "Session Expired", description: "reCAPTCHA expired. Please try again.", variant: "destructive" });
          }
        });
        window.recaptchaVerifier.render();
      } catch (err) {
        console.error("Recaptcha init error", err);
      }
    }
  };

  useEffect(() => {
    if (step === 'INPUT') {
      const timer = setTimeout(setupRecaptcha, 500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError('');
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneForFirebase(phoneNumber);
      const appVerifier = window.recaptchaVerifier;
      
      if (!appVerifier) throw new Error("reCAPTCHA not initialized");

      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep('OTP');
      setCooldown(30);
      toast({ title: "OTP Sent", description: `Code sent to ${formattedPhone}` });
    } catch (err) {
      console.error(err);
      const msg = err.code?.includes('captcha') 
        ? generateCaptchaErrorMessage(err) 
        : generateOTPErrorMessage(err.code);
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
      
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
        setTimeout(setupRecaptcha, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateOTPFormat(otp)) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      await confirmationResult.confirm(otp);
      
      const formattedPhone = formatPhoneForFirebase(phoneNumber);
      await updatePhoneVerification(true, formattedPhone);
      
      setStep('VERIFIED');
      toast({ title: "Phone Verified", description: "Your phone number has been successfully verified." });
      
      if (onSuccess) onSuccess();
    } catch (err) {
      const msg = generateOTPErrorMessage(err.code);
      setError(msg);
      toast({ title: "Verification Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'VERIFIED') {
    return (
      <Card className="p-6 text-center border-green-200 bg-green-50">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-800 mb-2">Phone Verified</h3>
        <p className="text-green-700 mb-4">Your phone number is verified and ready for use.</p>
        <Button onClick={() => onSuccess && onSuccess()} className="bg-green-600 hover:bg-green-700 text-white">
          Continue
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-md w-full mx-auto">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Phone className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Verify Phone</h2>
        <p className="text-gray-600">
          {step === 'INPUT' ? 'Enter your 10-digit mobile number.' : 'Enter the 6-digit code sent to your phone.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {step === 'INPUT' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
            <div className="flex gap-2">
              <div className="flex items-center justify-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 font-medium">
                +91
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-lg tracking-wider"
                placeholder="9876543210"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div id="recaptcha-container" ref={recaptchaContainerRef} className="flex justify-center my-4 min-h-[78px]"></div>

          <Button type="submit" disabled={loading || phoneNumber.length !== 10} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg">
            {loading ? <Loader className="w-5 h-5 animate-spin mr-2" /> : null}
            Send Code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 text-center text-3xl font-mono tracking-[0.5em] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="000000"
              maxLength={6}
              required
            />
          </div>

          <Button type="submit" disabled={loading || otp.length !== 6} className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg">
            {loading ? <Loader className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
            Verify OTP
          </Button>

          <div className="flex flex-col items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              disabled={cooldown > 0 || loading}
              onClick={handleSendOtp}
              className="w-full"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep('INPUT');
                setOtp('');
                setError('');
              }}
              className="text-sm text-gray-500 hover:text-gray-900 font-medium"
            >
              Change Phone Number
            </button>
          </div>
        </form>
      )}
    </Card>
  );
};

export default PhoneVerification;
