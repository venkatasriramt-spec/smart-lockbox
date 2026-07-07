import React, { useState, useEffect } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Check, Loader, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const PhoneVerification = ({ onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('INPUT'); // INPUT, OTP, VERIFIED
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  
  const { updatePhoneVerification, phoneVerified } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (phoneVerified) {
      setStep('VERIFIED');
    }
  }, [phoneVerified]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': (response) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
          toast({
            title: "Session Expired",
            description: "Please refresh and try again.",
            variant: "destructive"
          });
        }
      });
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      
      const result = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      setConfirmationResult(result);
      setStep('OTP');
      toast({
        title: "OTP Sent",
        description: `Code sent to ${fullPhoneNumber}`
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error sending OTP",
        description: error.message,
        variant: "destructive"
      });
      // Reset recaptcha on error so user can try again
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await confirmationResult.confirm(otp);
      
      const fullPhoneNumber = `${countryCode}${phoneNumber}`;
      await updatePhoneVerification(true, fullPhoneNumber);
      
      setStep('VERIFIED');
      toast({
        title: "Phone Verified",
        description: "Your phone number has been successfully verified."
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Invalid OTP",
        description: "The code you entered is incorrect.",
        variant: "destructive"
      });
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
        <Button 
          variant="outline" 
          className="bg-white hover:bg-green-50 text-green-700 border-green-200"
          onClick={() => {
            if (onSuccess) onSuccess();
          }}
        >
          Continue
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Phone className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold">Verify Phone Number</h2>
        <p className="text-gray-600">
          {step === 'INPUT' ? 'We need to verify your phone number for security.' : 'Enter the code sent to your phone.'}
        </p>
      </div>

      {step === 'INPUT' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <div className="flex gap-2">
              <select 
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
                <option value="+91">+91 (IN)</option>
                <option value="+61">+61 (AU)</option>
                {/* Add more codes as needed */}
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="555-0123"
                required
              />
            </div>
          </div>

          <div id="recaptcha-container" className="flex justify-center my-4"></div>

          <Button
            type="submit"
            disabled={loading || !phoneNumber}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
            Send Verification Code
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              maxLength={6}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Verify Code
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep('INPUT');
              setOtp('');
            }}
            className="w-full text-sm text-gray-500 hover:text-gray-700 mt-2"
          >
            Change Phone Number
          </button>
        </form>
      )}
    </Card>
  );
};

export default PhoneVerification;