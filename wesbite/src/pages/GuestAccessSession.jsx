
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { useKeyDetection } from '@/hooks/useKeyDetection';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';
import { completeSession } from '@/utils/lockboxUtils';
import { logRequestState } from '@/utils/requestStatusValidation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Key, Lock, Unlock, AlertTriangle, PhoneCall, CheckCircle2, CircleDashed, PartyPopper, XCircle, User, Clock } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';

window.DEBUG_CLOSE_BOX = window.DEBUG_CLOSE_BOX ?? true;

const debugLog = (step, ...args) => {
  if (window.DEBUG_CLOSE_BOX) {
    const timestamp = new Date().toISOString();
    console.log(`[GUEST_SESSION_FLOW] [${timestamp}] ${step}`, ...args);
  }
};

const GuestAccessSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lockboxId, request } = location.state || {};

  const [isClosing, setIsClosing] = useState(false);
  const [requestData, setRequestData] = useState(request);
  const ownerPhone = "+91 1234567890";
  
  const prevStatusRef = useRef(request?.status || 'APPROVED');

  useEffect(() => {
    debugLog(`GuestAccessSession MOUNTED. URL Params:`, { lockboxId, requestId: request?.id });
    
    if (request) {
      logRequestState("INITIAL_MOUNT", request);
    }

    if (!lockboxId || !request?.id) {
      debugLog("No lockboxId or request.id provided. Skipping request listener setup.");
      return;
    }

    const requestPath = `lockboxes/${lockboxId}/requests/${request.id}`;
    debugLog(`Setting up Realtime Listener on INDIVIDUAL REQUEST: ${requestPath}`);
    
    const reqRef = ref(database, requestPath);
    const unsubReq = onValue(reqRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setRequestData(data);
        
        debugLog(`LISTENER TRIGGERED for ${request.id}. Status changed from ${prevStatusRef.current} to ${data.status}`);
        logRequestState("LISTENER_UPDATE", data);
        
        const currentStatus = data.status;
        const requestAge = Date.now() - (data.createdAt || data.timestamp || 0);
        
        debugLog(`Evaluating closure check on individual request: status=${currentStatus}, age=${requestAge}ms`);
        
        // Check INDIVIDUAL REQUEST status ONLY
        if (currentStatus === 'CLOSED_BY_OWNER') {
          if (requestAge > 5000) {
            debugLog("CRITICAL: Individual request CLOSED_BY_OWNER condition met! Redirecting...");
            toast({ title: "Session Closed", description: "Your access session has been closed by the owner.", variant: "destructive" });
            setTimeout(() => navigate('/box-closed-by-owner', { replace: true }), 300);
          } else {
            debugLog("WARNING: CLOSED_BY_OWNER ignored because request age is too young (< 5s) - Preventing false positive redirect.");
          }
        }
        
        prevStatusRef.current = currentStatus;
      } else {
        debugLog(`LISTENER TRIGGERED but no data found at ${requestPath}`);
      }
    });

    return () => {
      debugLog("Unmounting, cleaning up listeners.");
      if (unsubReq) unsubReq();
    };
  }, [lockboxId, request?.id, navigate, toast, request]);

  const { keyPresent, loading: keyLoading } = useKeyDetection(lockboxId);
  const { secondsRemaining, isWarningActive, theftDetected, sessionCompleted } = useCountdownTimer(
    lockboxId, 
    requestData?.expiryAt || requestData?.expiresAt, 
    requestData?.id
  );

  const lockLockbox = async (isEarly = false) => {
    if (!lockboxId) return;
    
    if (!keyPresent) {
      toast({ title: "Key Missing", description: "The key is no longer available in the lockbox. Please return it before closing.", variant: "destructive" });
      return;
    }

    setIsClosing(true);
    try {
      await completeSession(lockboxId, requestData?.id);
      toast({ title: "Success", description: "Lockbox secured successfully", className: "bg-[#059669] text-white" });
      navigate('/', { replace: true });
    } catch (err) {
      toast({ title: "Error", description: "Could not close session.", variant: "destructive" });
      setIsClosing(false);
    }
  };

  const formatTime = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 0) return "0:00";
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!lockboxId || !requestData) {
    debugLog("Missing lockboxId or requestData on render, navigating to fallback.");
    return <Navigate to="/" replace />;
  }

  const guestName = requestData?.name || requestData?.guestName || "Guest";

  if (theftDetected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EF4444] to-[#991B1B] flex items-center justify-center p-4">
        <Helmet><title>Alert - Security Action Required</title></Helmet>
        <Card className="p-10 max-w-md w-full text-center border border-white/20 shadow-2xl bg-white/20 backdrop-blur-md rounded-[12px] relative overflow-hidden">
          <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-8 bg-white/20 text-white shadow-inner">
            <AlertTriangle className="w-14 h-14 animate-bounce drop-shadow-md" />
          </div>
          <h2 className="text-[28px] font-bold text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)] mb-4 font-poppins">Time Expired</h2>
          <p className="text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)] mb-8 font-medium text-lg">Key not returned in time. The lockbox is secured and the owner is notified.</p>
          <div className="bg-white/10 rounded-xl p-6 mb-8 border border-white/20">
            <p className="text-white/80 text-sm font-bold uppercase mb-3 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Contact Support</p>
            <a href={`tel:${ownerPhone}`} className="inline-flex items-center justify-center gap-2 text-2xl font-bold text-white hover:text-blue-200 transition-colors [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
              <PhoneCall className="w-6 h-6 text-white drop-shadow-md" />
              {ownerPhone}
            </a>
          </div>
          <Button onClick={() => navigate('/')} className="w-full py-6 text-lg font-bold bg-white text-red-700 hover:bg-gray-100 border-0" variant="outline">Return to Home</Button>
        </Card>
      </div>
    );
  }

  if (sessionCompleted) {
    return (
      <div className="min-h-screen bg-[#059669] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <Helmet><title>Session Complete</title></Helmet>
        <div className="absolute inset-0 pointer-events-none opacity-50 flex flex-wrap justify-center content-center gap-10">
          {[...Array(20)].map((_, i) => (
             <motion.div
               key={i}
               initial={{ y: -100, opacity: 0, rotate: 0 }}
               animate={{ y: '100vh', opacity: [0, 1, 1, 0], rotate: 360 }}
               transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 2 }}
               className="w-4 h-4 rounded-sm"
               style={{ backgroundColor: ['#FFF', '#FDE68A', '#A7F3D0', '#FECACA'][i % 4] }}
             />
          ))}
        </div>

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full relative z-10">
          <Card className="p-10 text-center bg-transparent border-0 shadow-none">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8 relative backdrop-blur-md">
              <PartyPopper className="w-16 h-16 text-white drop-shadow-md" />
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-[#059669]" />
              </div>
            </motion.div>
            <h2 className="text-[32px] font-bold mb-4 font-poppins text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">Access Complete!</h2>
            <p className="text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)] font-bold text-lg mb-10">The key is securely returned and the box is locked. Have a great day, {guestName}!</p>
            <Button onClick={() => navigate('/')} className="w-full py-6 text-lg font-bold bg-white text-[#059669] hover:bg-gray-50 rounded-[12px] shadow-xl">Back to Home</Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  const totalSeconds = requestData?.approvedDuration || (requestData?.duration * 60) || 15 * 60;
  const progressRatio = totalSeconds > 0 ? (secondsRemaining / totalSeconds) : 0;
  const strokeDashoffset = 628 - (628 * progressRatio);

  return (
    <>
      <Helmet><title>Active Access - Smart Lock</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-[#059669] to-[#0891B2] flex flex-col items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 bg-indigo-600 shadow-2xl border-none rounded-2xl transform transition-transform duration-300 hover:scale-[1.01]">
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col items-center flex-1">
                <Unlock className="w-10 h-10 text-white drop-shadow-md mb-2" />
                <h2 className="text-[24px] font-bold font-poppins text-white tracking-tight">Lockbox Unlocked</h2>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-2 mb-8">
               <div className="flex items-center gap-2 text-indigo-100 bg-white/10 py-2 px-4 rounded-full border border-white/20 shadow-inner">
                 <User className="w-4 h-4" />
                 <span className="text-sm font-semibold">Access granted to {guestName}</span>
               </div>
               {requestData?.approvedDuration && (
                 <div className="flex items-center gap-2 text-emerald-200 font-bold bg-black/20 py-1.5 px-4 rounded-full border border-black/10">
                   <Clock className="w-4 h-4" />
                   <span className="text-sm">Owner approved {Math.round(requestData.approvedDuration / 60)} minutes</span>
                 </div>
               )}
            </div>
            
            <div className="text-center mb-10 relative">
              <svg className="w-56 h-56 mx-auto transform -rotate-90">
                 <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                 <motion.circle 
                   cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent"
                   strokeDasharray="628"
                   strokeDashoffset={strokeDashoffset}
                   className={`transition-all duration-1000 ${isWarningActive ? 'text-red-400' : 'text-white'}`}
                   strokeLinecap="round"
                 />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-[44px] font-extrabold tracking-tighter ${isWarningActive ? 'text-red-400' : 'text-white'}`}>
                  {formatTime(secondsRemaining)}
                </div>
              </div>
              <div className="h-6 mt-4">
                <AnimatePresence>
                  {isWarningActive && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-red-300 font-bold text-sm uppercase tracking-widest">
                      Time Ending Soon
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-700/50 border border-indigo-400/30 rounded-xl p-[20px] text-center">
                <div className="flex justify-center mb-3">
                  <Key className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                <h3 className="text-[18px] font-bold text-white mb-4 font-poppins">Return Key to Box</h3>
                
                <div className="flex items-center justify-center">
                  {keyLoading ? (
                    <div className="flex items-center gap-2 text-indigo-100 font-bold animate-pulse">
                      <CircleDashed className="w-5 h-5 animate-spin"/> Scanning...
                    </div>
                  ) : keyPresent ? (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-emerald-300 font-bold text-lg">
                      <CheckCircle2 className="w-6 h-6"/> Key detected
                    </motion.div>
                  ) : (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2 text-rose-300 font-bold text-lg">
                      <XCircle className="w-6 h-6"/> Key not detected
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-2">
                <Button 
                  onClick={() => lockLockbox(true)}
                  disabled={isClosing || !keyPresent}
                  className="w-full py-6 text-base font-bold bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transform transition-all duration-300 hover:shadow-lg border-0"
                >
                  Return Key Early
                </Button>

                <Button 
                  onClick={() => lockLockbox(false)} 
                  disabled={isClosing || !keyPresent}
                  className={`w-full py-6 text-lg font-bold rounded-xl shadow-xl transform transition-all duration-300 border-0 ${
                    keyPresent 
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50 hover:scale-[1.02]' 
                      : 'bg-indigo-400/50 text-indigo-200 opacity-80 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isClosing ? 'Securing...' : (
                    <>
                      <Lock className="w-5 h-5 mr-2" /> Confirm & Close Box
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default GuestAccessSession;
