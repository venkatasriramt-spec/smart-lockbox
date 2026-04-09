
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ref, onValue, update } from 'firebase/database';
import { database, serverTimestamp } from '@/config/firebase';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { logRequestState } from '@/utils/requestStatusValidation';
import { Card } from '@/components/ui/card';
import { Hourglass, ShieldCheck, Lock, Phone, PhoneCall, Loader, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import KeyAvailabilityGuard from '@/components/KeyAvailabilityGuard';
import GuestAccessDenialScreen from '@/components/GuestAccessDenialScreen';
import { maskIndianPhoneNumber } from '@/utils/phoneUtils';

const GuestWaitingScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearGuestData } = useAuth();
  const { lockboxId, requestId, error: routeError } = location.state || {};
  const [request, setRequest] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const ownerPhone = "+91 1234567890";
  
  const prevStatusRef = useRef('PENDING');

  useEffect(() => {
    console.log(`[WAITING_SCREEN] MOUNTED. URL Params:`, { lockboxId, requestId, routeError });
    
    // Allow rendering if we have a specific route error (like missing key)
    if (!lockboxId || (!requestId && !routeError)) {
      console.warn(`[WAITING_SCREEN] Missing required params. Redirecting to portal.`);
      navigate('/guest-portal', { replace: true });
      return;
    }

    // If there is no requestId but we have a routeError, we don't need to listen to Firebase
    if (!requestId) return;

    console.log(`[WAITING_SCREEN] Initializing request listener on individual request: lockboxes/${lockboxId}/requests/${requestId}`);
    
    const reqRef = ref(database, `lockboxes/${lockboxId}/requests/${requestId}`);
    const unsubReq = onValue(reqRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setRequest(data);
        
        console.log(`[WAITING_SCREEN] Listener Update Triggered`);
        logRequestState("WAITING_LISTENER", data);
        
        const currentStatus = data.status;
        const requestAge = Date.now() - (data.createdAt || data.timestamp || 0);
        
        if (currentStatus === 'CLOSED_BY_OWNER') {
          if (requestAge > 5000) {
            console.log("[WAITING_SCREEN] CRITICAL: Individual request CLOSED_BY_OWNER condition met! Redirecting...");
            toast({ title: "Request Denied", description: "The owner has closed this access request.", variant: "destructive" });
            setTimeout(() => navigate('/box-closed-by-owner', { replace: true }), 300);
          }
        } else if (currentStatus === 'APPROVED') {
          console.log("[WAITING_SCREEN] Request APPROVED! Proceeding to session.");
          navigate('/guest/access', { state: { lockboxId, request: data }, replace: true });
        }
        
        prevStatusRef.current = currentStatus;
      }
    });

    return () => {
      if (unsubReq) unsubReq();
    };
  }, [lockboxId, requestId, routeError, navigate, toast]);

  const handleKeyRemoved = () => {
    navigate('/guest/access', { state: { lockboxId, request } });
  };

  const handleCancelRequest = async () => {
    if (!lockboxId || !requestId) {
      clearGuestData();
      navigate('/guest-portal', { replace: true });
      return;
    }

    setIsCancelling(true);
    toast({ title: "Cancelling Request", description: "Please wait while we cancel your request..." });

    try {
      const reqRef = ref(database, `lockboxes/${lockboxId}/requests/${requestId}`);
      await update(reqRef, {
        status: 'CANCELLED',
        cancelledAt: serverTimestamp()
      });
      
      toast({ title: "Request Cancelled", description: "Your access request has been successfully cancelled." });
      clearGuestData();
      navigate('/guest-portal', { replace: true });
    } catch (error) {
      toast({ title: "Cancellation Failed", description: "An error occurred while trying to cancel. Please try again.", variant: "destructive" });
      setIsCancelling(false);
    }
  };

  const backgroundClasses = "min-h-screen bg-gradient-to-br from-[#0D2E33] via-[#081C24] to-[#050B10] flex items-center justify-center p-4 font-sans relative overflow-hidden";

  const renderContent = () => {
    // Handle error state (e.g., when redirected here because the key is missing)
    if (routeError === 'key_missing') {
      return (
        <div className={backgroundClasses}>
          <Helmet><title>Key Not Available - Smart Lock</title></Helmet>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md relative z-10 px-4"
          >
            <Card className="p-8 sm:p-10 bg-white border-0 shadow-2xl text-center rounded-[32px] overflow-hidden">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </div>
              <h2 className="text-[28px] font-bold text-gray-900 mb-3 tracking-tight">Key Not Available</h2>
              <p className="text-gray-500 mb-8 font-medium">The key is currently not present in the lockbox. Please contact the owner or try again later.</p>
              <Button 
                onClick={() => navigate('/guest-portal', { replace: true })} 
                className="w-full py-6 text-lg font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-2xl"
              >
                Return to Portal
              </Button>
            </Card>
          </motion.div>
        </div>
      );
    }

    if (!request && !routeError) {
      return (
        <div className={backgroundClasses}>
          <div className="flex flex-col items-center relative z-10">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="bg-white/10 backdrop-blur-md p-5 rounded-full shadow-2xl mb-4 border border-white/20"
            >
              <Hourglass className="w-10 h-10 text-[#EA580C]" />
            </motion.div>
            <p className="text-white/80 font-bold tracking-tight animate-pulse">Initializing request...</p>
          </div>
        </div>
      );
    }

    if (request?.status === 'REJECTED') {
      return <GuestAccessDenialScreen lockboxId={lockboxId} onTryAgain={() => navigate('/guest-portal')} isExpired={false} requestStatus="REJECTED" />;
    }

    if (request?.status === 'EXPIRED') {
      return <GuestAccessDenialScreen lockboxId={lockboxId} onTryAgain={() => navigate('/guest-portal')} isExpired={true} requestStatus="EXPIRED" />;
    }

    return (
      <>
        <Helmet><title>Waiting for Approval - Smart Lock</title></Helmet>
        <div className={backgroundClasses}>
          <div className="absolute top-[-10%] left-[-5%] w-[450px] h-[450px] bg-[#EA580C]/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] bg-[#0D2E33]/30 rounded-full blur-[100px] pointer-events-none" />

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-md relative z-10 px-4"
          >
            <Card className="p-8 sm:p-10 bg-white border-0 shadow-[0_40px_80px_rgba(0,0,0,0.4)] text-center rounded-[32px] overflow-hidden">
              <div className="mb-8 flex justify-center">
                 <div className="relative">
                    <div className="w-24 h-24 bg-[#FFF7ED] rounded-3xl flex items-center justify-center shadow-inner">
                      <motion.div
                        animate={{ rotate: [0, 180, 180, 360, 360] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", times: [0, 0.4, 0.5, 0.9, 1] }}
                      >
                        <Hourglass className="w-12 h-12 text-[#EA580C]" />
                      </motion.div>
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-2 border-4 border-white shadow-md"
                    >
                      <Lock className="w-3.5 h-3.5 text-white" />
                    </motion.div>
                 </div>
              </div>
              
              <div className="flex justify-center mb-5">
                <span className="inline-flex items-center gap-2 bg-[#F8FAFC] text-[#EA580C] text-[12px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider border border-gray-100 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
                  Awaiting Owner
                </span>
              </div>
              
              <h2 className="text-[32px] font-extrabold text-[#0F172A] mb-3 font-poppins leading-tight tracking-tight">Request Sent</h2>
              <p className="text-[#64748B] text-base mb-6 font-medium px-2 leading-relaxed">
                We've reached out to the property owner. Please keep this window open to receive your access code.
              </p>

              {request && (request.phone || request.guestPhone) && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 flex items-center gap-3 border border-gray-100 text-left">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Registered Phone</p>
                    <p className="text-gray-900 font-mono font-bold text-sm">{maskIndianPhoneNumber(request.phone || request.guestPhone)}</p>
                  </div>
                </div>
              )}

              <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">CONTACT OWNER</p>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-blue-900 font-medium leading-tight">Need immediate access? Contact the owner directly for manual approval.</p>
                  <a href={`tel:${ownerPhone}`} className="inline-flex items-center gap-2 font-mono font-bold text-blue-700 hover:text-blue-800 bg-blue-100/50 px-3 py-1.5 rounded-full">
                    <PhoneCall className="w-4 h-4" /> {ownerPhone}
                  </a>
                </div>
              </div>

              <div className="bg-[#F1F5F9] rounded-2xl p-5 mb-8 flex items-center justify-between border border-gray-200/50">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[14px] text-[#334155] font-bold">Secure Protocol</span>
                </div>
                <span className="text-[13px] text-[#64748B] font-semibold bg-white/50 px-2 py-0.5 rounded-md">~2m wait</span>
              </div>

              <Button 
                onClick={handleCancelRequest} 
                disabled={isCancelling}
                variant="outline"
                className="w-full border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[#64748B] font-bold py-7 rounded-[20px] transition-all hover:text-[#0F172A] group shadow-sm flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <><Loader className="w-5 h-5 animate-spin" /> Cancelling...</>
                ) : (
                  'Cancel Request'
                )}
              </Button>
            </Card>
          </motion.div>
        </div>
      </>
    );
  };

  return (
    <KeyAvailabilityGuard lockboxId={lockboxId} onKeyRemoved={handleKeyRemoved} request={request}>
      {renderContent()}
    </KeyAvailabilityGuard>
  );
};

export default GuestWaitingScreen;
