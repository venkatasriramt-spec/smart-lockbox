
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue, update } from 'firebase/database';
import { database, serverTimestamp } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { 
  updateLockboxStateUnlocked, 
  updateLockboxStateLocked,
  manuallyUnlockLockbox,
  manuallyLockLockbox,
  closeBoxByOwner
} from '@/utils/lockboxUtils';
import { checkAndMarkExpiredPreApprovals } from '@/utils/preApprovalUtils';
import { useToast } from '@/components/ui/use-toast';
import { 
  Check, X, Clock, Phone, Lock, Unlock, 
  AlertCircle, User, CalendarPlus,
  ArrowRight, History, ShieldCheck, Activity, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OwnerDashboardHeader from '@/components/OwnerDashboardHeader';
import PreApprovalForm from '@/components/PreApprovalForm';
import PreApprovalsList from '@/components/PreApprovalsList';
import ActiveAccessMonitor from '@/components/ActiveAccessMonitor.jsx';
import KeyNotReturnedAlert from '@/components/KeyNotReturnedAlert';
import { maskIndianPhoneNumber } from '@/utils/phoneUtils';

window.DEBUG_CLOSE_BOX = window.DEBUG_CLOSE_BOX ?? true;

const debugLog = (step, ...args) => {
  if (window.DEBUG_CLOSE_BOX) {
    const timestamp = new Date().toISOString();
    console.log(`[CLOSE_BOX_FLOW] [${timestamp}] ${step}`, ...args);
  }
};

const LOCKBOX_ID = "SmartLock_123";

const formatTime = (ms) => {
  if (ms <= 0) return "00:00:00";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getGuestName = (req) => {
  if (!req) return 'Unknown Guest';
  return req.name || req.guestName || 'Unknown Guest';
};

const getGuestPhone = (req) => {
  if (!req) return null;
  return req.phone || req.guestPhone || null;
};

const ApprovalModal = ({ isOpen, onClose, onConfirm, request }) => {
  const [duration, setDuration] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (request && isOpen) {
      setDuration('');
      setError('');
    }
  }, [request, isOpen]);

  const handleDurationChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setDuration('');
      setError('Duration is required');
      return;
    }
    if (/^\d{0,3}$/.test(value)) {
      setDuration(value); 
      const numValue = parseInt(value, 10);
      if (numValue <= 0) {
        setError('Duration must be greater than 0');
      } else {
        setError('');
      }
    }
  };

  const handleConfirm = () => {
    const numDuration = parseInt(duration, 10);
    if (!numDuration || numDuration <= 0) {
      setError('Please enter a valid duration greater than 0');
      return;
    }
    onConfirm(request.id, numDuration);
  };

  if (!isOpen || !request) return null;

  const phoneToDisplay = getGuestPhone(request);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border-0"
      >
        <div className="bg-[#0891B2] px-6 py-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 font-poppins">
            <ShieldCheck className="w-6 h-6" /> Approve Request
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors bg-black/10 rounded-full p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="bg-[#F0F9FF] p-5 rounded-2xl border border-[#BAE6FD]">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#BAE6FD]/50">
              <span className="text-sm font-bold text-[#0369A1] flex items-center gap-2"><User className="w-4 h-4"/> Guest</span>
              <span className="font-black text-gray-900 text-lg">{getGuestName(request)}</span>
            </div>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#BAE6FD]/50">
               <span className="text-sm font-bold text-[#0369A1] flex items-center gap-2"><Phone className="w-4 h-4"/> Phone</span>
               <span className="font-bold text-gray-900 font-mono bg-white px-3 py-1 rounded-lg shadow-sm">
                 {phoneToDisplay ? maskIndianPhoneNumber(phoneToDisplay) : 'N/A'}
               </span>
            </div>
             <div className="flex justify-between items-center">
               <span className="text-sm font-bold text-[#0369A1] flex items-center gap-2"><Clock className="w-4 h-4"/> Requested</span>
               <Badge className="bg-[#0891B2] text-white font-bold px-3 py-1 text-sm shadow-md">{request.duration || request.requestedDuration || '0'} mins</Badge>
            </div>
          </div>

          <div>
             <label className="block text-sm font-black text-gray-900 mb-3 uppercase tracking-wider">
               Approved Duration (minutes)
             </label>
             <input
                type="text"
                value={duration}
                onChange={handleDurationChange}
                placeholder="e.g. 60"
                autoFocus
                className={`w-full px-5 py-4 border-2 rounded-xl focus:outline-none transition-all duration-300 text-gray-900 bg-gray-50 placeholder:text-gray-400 font-black text-2xl text-center ${
                  error ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-4 focus:ring-[#EF4444]/20' : 'border-gray-200 focus:border-[#059669] focus:ring-4 focus:ring-[#059669]/20'
                }`}
             />
             {error && (
                <p className="text-sm font-bold text-[#EF4444] mt-3 flex items-center justify-center gap-1.5"><AlertCircle className="w-4 h-4"/>{error}</p>
             )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1 py-7 rounded-xl font-bold text-lg border-2">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              variant="default"
              className="flex-1 py-7 rounded-xl font-black text-lg shadow-xl shadow-[#059669]/30"
              disabled={!!error || !duration}
            >
              Confirm Access
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const OwnerPendingRequestsComplete = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState({});
  const [realLockboxState, setRealLockboxState] = useState(null); 
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [modalOpen, setModalOpen] = useState(false);
  const [preApprovalModalOpen, setPreApprovalModalOpen] = useState(false);
  const [editingPreApproval, setEditingPreApproval] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isManualActionLoading, setIsManualActionLoading] = useState(false);
  const { toast } = useToast();
  
  const isProcessingExpiry = useRef(false);

  useEffect(() => {
    setModalOpen(false);
    setPreApprovalModalOpen(false);
    setEditingPreApproval(null);
    setSelectedRequest(null);
  }, []);

  useEffect(() => {
    checkAndMarkExpiredPreApprovals(LOCKBOX_ID);
    const cleanupInterval = setInterval(() => {
      checkAndMarkExpiredPreApprovals(LOCKBOX_ID);
    }, 60 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, [LOCKBOX_ID]);

  useEffect(() => {
    const requestsRef = ref(database, `lockboxes/${LOCKBOX_ID}/requests`);
    const unsubRequests = onValue(requestsRef, (snapshot) => {
      try {
        const val = snapshot.val() || {};
        setRequests(val);
      } catch (err) {
        console.error(`[Owner Real-Time Listener] Error processing requests update:`, err);
        toast({ title: "Sync Error", description: "Failed to sync pending requests. Retrying...", variant: "destructive" });
      }
    });
    
    return () => unsubRequests();
  }, [toast]);

  useEffect(() => {
    const lockboxRef = ref(database, `lockboxes/${LOCKBOX_ID}/lockbox`);
    const unsubLockbox = onValue(lockboxRef, (snapshot) => {
      const val = snapshot.val();
      setRealLockboxState(val || { state: 'LOCKED' });
      if (val?.state === 'LOCKED') {
        isProcessingExpiry.current = false;
      }
    });
    return () => unsubLockbox();
  }, []);

  const checkShouldShowActiveSession = useCallback((currentState, currentRequests, now) => {
    if (!currentState || currentState.state !== 'UNLOCKED') return false;
    if (!currentState.unlockedUntil || currentState.unlockedUntil <= now) return false;
    const activeReqId = currentState.activeRequestId;
    if (activeReqId === "MANUAL_OVERRIDE") return true;
    const activeReq = activeReqId ? currentRequests[activeReqId] : null;
    if (!activeReq || activeReq.status !== 'APPROVED') return false;
    return true;
  }, []);

  useEffect(() => {
    setCurrentTime(Date.now());
    const timerInterval = setInterval(async () => {
      const now = Date.now();
      setCurrentTime(now);

      if (realLockboxState?.state === 'UNLOCKED' && realLockboxState?.unlockedUntil) {
        if (realLockboxState.unlockedUntil <= now) {
          if (!isProcessingExpiry.current) {
            isProcessingExpiry.current = true;
            try {
              if (realLockboxState?.keyPresent || realLockboxState?.activeRequestId === "MANUAL_OVERRIDE") {
                await updateLockboxStateLocked(LOCKBOX_ID);
                const activeRequestId = realLockboxState.activeRequestId;
                if (activeRequestId && activeRequestId !== "MANUAL_OVERRIDE") {
                  const requestRef = ref(database, `lockboxes/${LOCKBOX_ID}/requests/${activeRequestId}`);
                  await update(requestRef, { status: "EXPIRED", expiryAt: serverTimestamp() });
                }
              }
            } catch (error) {
              isProcessingExpiry.current = false; 
            }
          }
        }
      }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [realLockboxState?.state, realLockboxState?.unlockedUntil, realLockboxState?.activeRequestId, realLockboxState?.keyPresent]);

  const showActiveSession = useMemo(() => {
    return checkShouldShowActiveSession(realLockboxState, requests, currentTime);
  }, [checkShouldShowActiveSession, realLockboxState, requests, currentTime]);

  const displayData = useMemo(() => {
    if (!showActiveSession) {
      return { state: 'LOCKED', activeAccessId: null, unlockedUntil: null, activeGuestName: null, activeGuestPhone: null, activeReason: null, approvedAt: null, autoApprovedViaPreApproval: false, isPreApproved: false };
    }
    const activeReqId = realLockboxState.activeRequestId;
    if (activeReqId === "MANUAL_OVERRIDE") {
       return { state: 'UNLOCKED', activeAccessId: activeReqId, unlockedUntil: realLockboxState.unlockedUntil, activeGuestName: 'Manual Override (Owner)', activeGuestPhone: 'N/A', activeReason: 'Manually Unlocked', approvedAt: realLockboxState.lastUpdated, autoApprovedViaPreApproval: false, isPreApproved: false };
    }
    const activeReq = requests[activeReqId];
    return { 
      state: 'UNLOCKED', 
      activeAccessId: activeReqId, 
      unlockedUntil: realLockboxState.unlockedUntil, 
      activeGuestName: getGuestName(activeReq), 
      activeGuestPhone: getGuestPhone(activeReq) || 'Unknown', 
      activeReason: activeReq?.reason || 'Access Granted', 
      approvedAt: activeReq?.approvedAt,
      autoApprovedViaPreApproval: activeReq?.approvalReason === "Auto-approved via pre-approval after OTP verification" || activeReq?.autoApprovedViaPreApproval,
      isPreApproved: activeReq?.preApproved || false
    };
  }, [showActiveSession, realLockboxState, requests]);

  const alertGuestInfo = useMemo(() => {
    if (realLockboxState?.alert !== 'KEY_NOT_RETURNED') return null;
    let req = null;
    
    if (realLockboxState.activeRequestId && realLockboxState.activeRequestId !== "MANUAL_OVERRIDE") {
      req = requests[realLockboxState.activeRequestId];
    }
    
    if (!req) {
      const sorted = Object.values(requests).sort((a, b) => {
        const timeA = a.expiryAt || a.timestamp || 0;
        const timeB = b.expiryAt || b.timestamp || 0;
        return timeB - timeA;
      });
      req = sorted.find(r => r.status === 'EXPIRED');
    }
    
    return {
      name: getGuestName(req) || 'Unknown Guest',
      phone: getGuestPhone(req) || 'Unknown Phone'
    };
  }, [realLockboxState, requests]);

  const openApprovalModal = (request) => {
    setSelectedRequest(request);
    setModalOpen(true);
  };

  const confirmAccept = async (requestId, approvedDurationMinutes) => {
    if (!currentUser) {
       toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
       return;
    }
    try {
      const durationInt = parseInt(approvedDurationMinutes, 10);
      const approvedDurationSeconds = durationInt * 60;
      const now = Date.now();
      const expiryAt = now + (approvedDurationSeconds * 1000);
      
      await update(ref(database, `lockboxes/${LOCKBOX_ID}/requests/${requestId}`), {
        status: 'APPROVED', 
        approvedAt: now, 
        expiryAt: expiryAt, 
        approvedDuration: approvedDurationSeconds
      });
      
      await updateLockboxStateUnlocked(LOCKBOX_ID, requestId, approvedDurationSeconds);
      
      setModalOpen(false);
      setSelectedRequest(null);
      toast({ title: "Access Granted", className: "bg-[#059669] text-white" });
    } catch (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (requestId) => {
    try {
      await update(ref(database, `lockboxes/${LOCKBOX_ID}/requests/${requestId}`), {
        status: 'REJECTED'
      });
      if (displayData.activeAccessId === requestId) {
         await updateLockboxStateLocked(LOCKBOX_ID);
      } 
      toast({ title: "Request rejected", className: "bg-[#EF4444] text-white" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    }
  };

  const handleManualAction = async (action) => {
    setIsManualActionLoading(true);
    try {
      if (action === 'unlock') {
        await manuallyUnlockLockbox(LOCKBOX_ID);
        toast({ 
          title: "Lockbox Unlocked", 
          description: "The lockbox has been opened manually.", 
          className: "bg-[#059669] text-white" 
        });
      } else if (action === 'lock') {
        debugLog(`Owner clicked Close Box button`);
        debugLog(`Verifying active request ID consistency before closing.`, {
          lockboxId: LOCKBOX_ID,
          activeAccessId: displayData.activeAccessId
        });

        if (displayData.activeAccessId && displayData.activeAccessId !== "MANUAL_OVERRIDE") {
          debugLog(`Passing request ID to closeBoxByOwner: ${displayData.activeAccessId}`);
          await closeBoxByOwner(LOCKBOX_ID, displayData.activeAccessId);
          debugLog(`closeBoxByOwner returned successfully`);
        } else {
          debugLog(`No specific request ID linked, falling back to manuallyLockLockbox`);
          await manuallyLockLockbox(LOCKBOX_ID);
        }
        
        toast({ 
          title: "Lockbox Secured", 
          description: "The lockbox has been closed securely.", 
          className: "bg-[#0891B2] text-white" 
        });
      }
    } catch (error) {
      debugLog(`Error during Close Box operation:`, error);
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsManualActionLoading(false);
    }
  };

  const handlePreApprovalEdit = (item) => {
    setEditingPreApproval(item);
    setPreApprovalModalOpen(true);
  };

  const handleNewPreApproval = () => {
    setEditingPreApproval(null);
    setPreApprovalModalOpen(true);
  };

  const requestsList = Object.entries(requests).map(([id, data]) => ({ id, ...data }));
  requestsList.sort((a, b) => (b.timestamp || b.createdAt || b.date) - (a.timestamp || a.createdAt || a.date));

  const pendingRequests = requestsList.filter(r => (r.status === 'PENDING' || r.status === 'AWAITING_VERIFICATION'));
  const recentPendingRequests = pendingRequests.slice(0, 5);

  const isUnlocked = displayData.state === 'UNLOCKED';
  const timeRemaining = displayData.unlockedUntil ? Math.max(0, displayData.unlockedUntil - currentTime) : 0;

  return (
    <>
      <ActiveAccessMonitor lockboxId={LOCKBOX_ID} />
      <Helmet><title>Owner Dashboard - SmartLock</title></Helmet>
      
      <AnimatePresence>
        {modalOpen && (
          <ApprovalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onConfirm={confirmAccept} request={selectedRequest} />
        )}
      </AnimatePresence>
      
      <PreApprovalForm isOpen={preApprovalModalOpen} onClose={() => setPreApprovalModalOpen(false)} lockboxId={LOCKBOX_ID} initialData={editingPreApproval} />

      <div className="min-h-screen bg-[#F0F9FF] font-sans pb-20">
        <OwnerDashboardHeader lockboxState={displayData} />

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
          
          {realLockboxState?.alert === 'KEY_NOT_RETURNED' && (
             <KeyNotReturnedAlert 
               lockboxId={LOCKBOX_ID} 
               guestName={alertGuestInfo?.name || 'Unknown Guest'} 
               guestPhone={alertGuestInfo?.phone || 'Unknown Phone'} 
               alertTimestamp={realLockboxState.lastUpdated} 
             />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            
            <Card className="lg:col-span-1 xl:col-span-1 order-1 bg-[#0891B2] text-white border-0 shadow-xl overflow-hidden rounded-3xl relative">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <CardContent className="p-8 relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-4 rounded-2xl shadow-inner ${isUnlocked ? 'bg-[#059669]' : 'bg-[#0F172A]/30'}`}>
                    {isUnlocked ? <Unlock className="w-10 h-10 text-white" /> : <Lock className="w-10 h-10 text-white" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-poppins text-cyan-100">Status</h2>
                    <p className="text-3xl font-black tracking-wide">{displayData.state}</p>
                  </div>
                </div>

                <div className="flex-1">
                   {isUnlocked && (
                     <div className="bg-white/10 rounded-2xl p-6 text-center border border-white/20 mb-6 backdrop-blur-md">
                        <p className="text-cyan-100 font-bold uppercase tracking-wider text-sm mb-2">Auto-Lock In</p>
                        <div className="text-5xl font-mono font-black tracking-tighter">
                          {formatTime(timeRemaining)}
                        </div>
                     </div>
                   )}
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  <Button 
                    onClick={() => handleManualAction('unlock')}
                    disabled={isManualActionLoading || isUnlocked}
                    variant="default"
                    className="w-full py-7 font-black text-lg bg-[#059669] hover:bg-[#047857] shadow-xl shadow-[#059669]/40 border-0"
                  >
                    <Unlock className="w-6 h-6 mr-3" /> Open Box
                  </Button>
                  <Button 
                    onClick={() => handleManualAction('lock')}
                    disabled={isManualActionLoading || !isUnlocked}
                    variant="destructive"
                    className="w-full py-7 font-black text-lg bg-[#EF4444] hover:bg-[#DC2626] shadow-xl shadow-[#EF4444]/40 border-0"
                  >
                    <Lock className="w-6 h-6 mr-3" /> Close Box
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 xl:col-span-2 order-2 xl:order-2 bg-[#EC4899] text-white border-0 shadow-xl overflow-hidden rounded-3xl relative">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />
              <CardContent className="p-8 relative z-10 h-full flex flex-col">
                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/20 flex-wrap gap-4">
                  <h2 className="text-3xl font-black font-poppins flex items-center gap-3">
                    <Activity className="w-8 h-8" /> Active Session
                  </h2>
                  <div className="flex gap-2">
                    {(displayData.autoApprovedViaPreApproval || displayData.isPreApproved) && (
                      <Badge className="bg-[#7C3AED] text-white px-3 py-1.5 text-xs border-0 font-bold shadow-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> PRE-APPROVED
                      </Badge>
                    )}
                    {isUnlocked ? (
                      <Badge className="bg-[#0891B2] text-white px-4 py-2 text-sm border-0 font-black shadow-lg">ACTIVE</Badge>
                    ) : (
                      <Badge className="bg-white/20 text-white px-4 py-2 text-sm border-0 font-black">NO SESSION</Badge>
                    )}
                  </div>
                </div>

                {isUnlocked ? (
                  <div className="flex-1 grid sm:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <p className="text-pink-200 font-bold uppercase tracking-wider text-sm mb-1">Guest Name</p>
                        <p className="text-3xl font-black">{displayData.activeGuestName}</p>
                      </div>
                      <div>
                        <p className="text-pink-200 font-bold uppercase tracking-wider text-sm mb-1">Phone Number</p>
                        <p className="text-2xl font-mono font-bold bg-white/10 inline-block px-4 py-2 rounded-xl border border-white/20">
                          {displayData.activeGuestPhone !== 'N/A' ? maskIndianPhoneNumber(displayData.activeGuestPhone) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-pink-200 font-bold uppercase tracking-wider text-sm mb-2">Access Reason</p>
                      <div className="bg-white/10 rounded-2xl p-6 border border-white/20 h-full">
                        <p className="text-lg italic font-medium leading-relaxed">"{displayData.activeReason}"</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-80">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
                      <Lock className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold font-poppins mb-2">Ready and Secure</h3>
                    <p className="text-pink-100 text-lg">The lockbox is currently locked. Approve a request to start a session.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-[#EA580C] px-8 py-6 flex items-center justify-between">
              <h2 className="text-2xl font-black font-poppins text-white flex items-center gap-3">
                <AlertCircle className="w-7 h-7" />
                Pending Requests
                {pendingRequests.length > 0 && (
                  <span className="bg-white text-[#EA580C] text-sm font-black px-3 py-1 rounded-full shadow-md">{pendingRequests.length}</span>
                )}
              </h2>
            </div>

            <div className="p-8 bg-[#FFF7ED]">
              {recentPendingRequests.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-[#C2410C] font-bold text-xl">No pending requests right now.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {recentPendingRequests.map(request => {
                    const phoneToDisplay = getGuestPhone(request);
                    const isPreApproved = request.preApproved;
                    
                    return (
                      <motion.div key={request.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <Card className="h-full flex flex-col relative bg-white shadow-lg border border-orange-100 rounded-2xl hover:shadow-xl transition-all">
                          <div className="absolute top-0 left-0 w-full h-2 bg-[#EA580C] rounded-t-2xl" />
                          
                          <CardHeader className="pb-4 px-6 pt-6">
                            <div className="flex justify-between items-start mb-2">
                              <CardTitle className="text-xl font-black font-poppins text-gray-900 flex items-center gap-2 flex-wrap">
                                {getGuestName(request)}
                                {isPreApproved && (
                                  <Badge className="bg-[#7C3AED] text-white border-0 text-[10px] font-black px-2 py-0.5 shadow-sm">
                                    <Sparkles className="w-3 h-3 mr-1" /> PRE-APPROVED (OTP)
                                  </Badge>
                                )}
                              </CardTitle>
                              <Badge className="bg-orange-100 text-[#EA580C] border-0 font-black px-3 py-1 mt-1 sm:mt-0">
                                {request.duration || request.requestedDuration || 0}m
                              </Badge>
                            </div>
                            <div className="text-sm font-bold text-gray-500 flex items-center gap-2">
                              <Clock className="w-4 h-4" /> 
                              {new Date(request.timestamp || request.createdAt || request.date || Date.now()).toLocaleTimeString()}
                            </div>
                          </CardHeader>
                          
                          <CardContent className="flex-1 flex flex-col px-6 pb-6">
                            <div className="space-y-4 mb-8 flex-1">
                               <div className="flex items-center gap-3 text-gray-900 font-mono font-bold bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                                 <Phone className="w-5 h-5 text-[#EA580C]" />
                                 {phoneToDisplay ? maskIndianPhoneNumber(phoneToDisplay) : 'No phone number'}
                               </div>
                               <div className="text-gray-600 italic font-medium leading-relaxed bg-gray-50 p-4 rounded-xl">
                                 "{request.reason || 'No specific reason provided'}"
                               </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-auto">
                              <Button onClick={() => openApprovalModal(request)} variant="default" className="rounded-xl font-black py-6 shadow-md bg-[#059669] hover:bg-[#047857]">
                                <Check className="w-5 h-5 mr-2" /> Accept
                              </Button>
                              <Button onClick={() => handleReject(request.id)} variant="destructive" className="rounded-xl font-black py-6 shadow-md bg-[#EF4444] hover:bg-[#DC2626]">
                                <X className="w-5 h-5 mr-2" /> Reject
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="bg-[#7C3AED] px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-black font-poppins text-white flex items-center gap-3">
                <CalendarPlus className="w-7 h-7" />
                Pre-Approved Guests
              </h2>
              <Button onClick={handleNewPreApproval} className="bg-white text-[#7C3AED] hover:bg-purple-50 rounded-xl shadow-lg font-black py-6 px-6">
                <CalendarPlus className="w-5 h-5 mr-2" /> Add New Guest
              </Button>
            </div>
            <div className="p-8 bg-[#F5F3FF]">
              <PreApprovalsList lockboxId={LOCKBOX_ID} onEdit={handlePreApprovalEdit} />
            </div>
          </section>

          <section>
            <Card className="bg-[#059669] border-0 shadow-2xl rounded-3xl overflow-hidden hover:shadow-[0_20px_50px_rgba(5,150,105,0.3)] transition-all duration-300 relative group">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
              <CardContent className="p-10 flex flex-col sm:flex-row items-center justify-between gap-8 relative z-10">
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-white rounded-2xl shadow-xl shrink-0">
                    <History className="w-10 h-10 text-[#059669]" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white font-poppins mb-2">Full Audit Logs</h3>
                    <p className="text-emerald-100 font-medium text-lg">Review all past interactions, approvals, and security alerts.</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate('/owner/history')} 
                  className="w-full sm:w-auto py-8 px-10 bg-white hover:bg-gray-50 text-[#059669] rounded-2xl font-black text-xl shadow-xl transform transition-all hover:scale-105"
                >
                  View Full Logs <ArrowRight className="w-6 h-6 ml-3" />
                </Button>
              </CardContent>
            </Card>
          </section>

        </main>
      </div>
    </>
  );
};

export default OwnerPendingRequestsComplete;
