
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, MapPin, User, Phone, AlignLeft, Clock as ClockIcon, Info, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Helmet } from 'react-helmet';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { checkPreApproval } from '@/utils/preApprovalUtils';
import { formatIndianPhoneNumber } from '@/utils/phoneUtils';
import { useToast } from '@/components/ui/use-toast';
import { useOTPRateLimit } from '@/hooks/useOTPRateLimit';

const GuestInfoForm = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const lockboxId = location.state?.lockboxId;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    reason: '',
  });
  
  const [duration, setDuration] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  const { canResend, recordResendAttempt, getResendTimeRemaining } = useOTPRateLimit();
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

  if (!lockboxId) {
    return <Navigate to="/guest-portal" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'reason' && value.length > 500) return;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, phone: val }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: null }));
    }
  };

  const handleDurationChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setDuration(val);
      if (errors.duration) {
        setErrors(prev => ({ ...prev, duration: null }));
      }
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (formData.phone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number';
    }
    
    if (!formData.reason.trim()) newErrors.reason = 'Reason for access is required';
    
    const durationNum = parseInt(duration, 10);
    if (!duration || isNaN(durationNum) || durationNum <= 0) {
      newErrors.duration = 'Please enter a valid time in minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canResend()) {
      toast({ 
        title: "Rate Limited", 
        description: `Too many attempts. Please wait ${resendTimeLeft} seconds before trying again.`, 
        variant: "destructive" 
      });
      return;
    }

    setValidationResult(null);
    if (!validate()) return;
    
    setIsSubmitting(true);
    // Mark an attempt since this goes directly to sending OTP step
    recordResendAttempt();
    
    try {
      const formattedPhone = formatIndianPhoneNumber(formData.phone);
      const combinedName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const currentDateString = new Date().toISOString().split('T')[0];
      const durationNum = parseInt(duration, 10);
      
      let formattedGuestInfo = {
        ...formData,
        phone: formattedPhone,
        name: combinedName,
        guestName: combinedName,
        requestedDuration: durationNum,
        duration: durationNum,
        date: currentDateString,
        lockboxId: lockboxId,
        isPreApproved: false,
        preApprovalId: null
      };
      
      const { found, preApproval, error } = await checkPreApproval(
        lockboxId, 
        combinedName, 
        formattedPhone,
        currentDateString
      );

      if (found && preApproval) {
        setValidationResult({ success: true, message: "Pre-approval match found!" });
        formattedGuestInfo.isPreApproved = true;
        formattedGuestInfo.preApprovalId = preApproval.id;
        formattedGuestInfo.duration = preApproval.approvalDurationMinutes || durationNum;
        
        toast({ 
          title: "Pre-Approval Verified", 
          description: "Your details match a pre-approved request.",
          className: "bg-green-50 border-green-200"
        });
      } else {
        let msg = "No active pre-approval found. Proceeding as standard request.";
        if (error === "EXPIRED_DATE") msg = "Pre-approval date has expired.";
        if (error === "ALREADY_USED") msg = "Pre-approval was already used.";
        if (error === "EXPIRED_STATUS") msg = "Pre-approval status is marked expired.";
        
        setValidationResult({ success: false, message: msg });
        
        toast({ 
          title: "Standard Request", 
          description: msg,
          variant: "default"
        });
      }

      setTimeout(() => {
        navigate('/guest/verify', {
          state: {
            lockboxId,
            guestInfo: formattedGuestInfo
          }
        });
      }, 800);

    } catch (err) {
      console.error("[GuestInfoForm] Submission error:", err);
      toast({ title: "Error processing request", description: err.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const inputBaseClass = "w-full px-[14px] py-[10px] bg-white border-2 rounded-[10px] text-[16px] text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors duration-200";
  const labelClass = "block text-[13px] sm:text-[14px] font-semibold text-[#1F2937] mb-1.5 font-inter";

  return (
    <>
      <Helmet><title>Request Access - Smart Lock</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] via-[#1E3A5F] to-[#0F172A] py-8 px-4 flex flex-col items-center justify-center font-sans relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#EA580C]/20 rounded-full blur-[100px] mix-blend-screen pointer-events-none transform -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#EC4899]/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none transform translate-x-1/3 translate-y-1/3" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[700px] relative z-10"
        >
          <Card className="bg-white border-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-[16px] relative overflow-hidden backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-[#EA580C] to-[#EC4899]"></div>
            
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-orange-50 p-2.5 rounded-full">
                  <Shield className="w-7 h-7 text-[#EA580C]" />
                </div>
                <div>
                  <h1 className="text-[24px] sm:text-[28px] font-bold text-[#1F2937] font-poppins leading-tight tracking-tight">Request Access</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">Property ID:</span>
                    <span className="bg-[#EA580C] text-white text-[11px] sm:text-[13px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      {lockboxId}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence>
                  {validationResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${validationResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}
                    >
                      {validationResult.success ? <CheckCircle2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      {validationResult.message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-[#F9FAFB] rounded-[12px] p-4 space-y-3 border border-gray-100">
                  <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1F2937] font-poppins flex items-center gap-2 border-b border-gray-200 pb-2">
                    <User className="w-4.5 h-4.5 text-[#EA580C]" /> Personal Information
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`${inputBaseClass} ${errors.firstName ? 'border-[#EF4444]' : 'border-[#E5E7EB] focus:border-[#EA580C]'}`}
                        placeholder="Jane"
                        disabled={isSubmitting || !canResend()}
                      />
                      {errors.firstName && <p className="text-[#EF4444] text-xs mt-1 font-medium">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`${inputBaseClass} ${errors.lastName ? 'border-[#EF4444]' : 'border-[#E5E7EB] focus:border-[#EA580C]'}`}
                        placeholder="Doe"
                        disabled={isSubmitting || !canResend()}
                      />
                      {errors.lastName && <p className="text-[#EF4444] text-xs mt-1 font-medium">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Indian Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-[14px] top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        className={`${inputBaseClass} pl-11 ${errors.phone ? 'border-[#EF4444]' : 'border-[#E5E7EB] focus:border-[#EA580C]'}`}
                        placeholder="10-digit number"
                        disabled={isSubmitting || !canResend()}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 font-medium">Indian numbers only</p>
                    {errors.phone && <p className="text-[#EF4444] text-xs mt-1 font-medium">{errors.phone}</p>}
                  </div>
                </div>

                <div className="bg-[#F9FAFB] rounded-[12px] p-4 space-y-3 border border-gray-100">
                  <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1F2937] font-poppins flex items-center gap-2 border-b border-gray-200 pb-2">
                    <ClockIcon className="w-4.5 h-4.5 text-[#EA580C]" /> Access Details
                  </h3>

                  <div>
                    <label className={labelClass}>Reason for Access</label>
                    <div className="relative">
                      <AlignLeft className="absolute left-[14px] top-[12px] w-4.5 h-4.5 text-gray-400" />
                      <textarea
                        name="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        className={`${inputBaseClass} pl-11 min-h-[80px] max-h-[120px] resize-y ${errors.reason ? 'border-[#EF4444]' : 'border-[#E5E7EB] focus:border-[#EA580C]'}`}
                        placeholder="e.g. Scheduled maintenance, cleaning..."
                        disabled={isSubmitting || !canResend()}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      {errors.reason ? (
                        <p className="text-[#EF4444] text-[11px] font-medium">{errors.reason}</p>
                      ) : (
                        <div />
                      )}
                      <p className="text-gray-500 text-[11px]">{formData.reason.length}/500</p>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Time Needed (Minutes)</label>
                    <div className="relative">
                      <ClockIcon className="absolute left-[14px] top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                      <input
                        type="text"
                        value={duration}
                        onChange={handleDurationChange}
                        className={`${inputBaseClass} pl-11 ${errors.duration ? 'border-[#EF4444]' : 'border-[#E5E7EB] focus:border-[#EA580C]'}`}
                        placeholder="e.g. 60"
                        disabled={isSubmitting || !canResend()}
                      />
                    </div>
                    {errors.duration && <p className="text-[#EF4444] text-xs mt-1 font-medium">{errors.duration}</p>}
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !canResend()}
                    className="w-full py-[12px] text-[15px] font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-[10px] transform transition-all duration-300 hover:scale-[1.01] hover:shadow-md border-0 disabled-btn-state h-auto min-h-[48px] flex-col justify-center"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center"><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2"></span> Sending OTP...</span>
                    ) : !canResend() ? (
                      <span className="flex items-center text-sm font-medium countdown-timer"><ClockIcon className="w-4 h-4 mr-1.5" /> Try again in {resendTimeLeft}s</span>
                    ) : (
                      'Verify Identity'
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => navigate('/guest-portal')}
                    className="w-full py-[12px] text-[15px] font-semibold bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-[10px] border-0 transition-colors duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default GuestInfoForm;
