
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { 
  updateLockboxStateUnlocked, 
  updateLockboxStateLocked,
  manuallyUnlockLockbox,
  closeBoxByOwner
} from '@/utils/lockboxUtils';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { 
  Check, X, Clock, Phone, FileText, Lock, Unlock, 
  History, AlertCircle, User, Power, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import OwnerDashboardHeader from '@/components/OwnerDashboardHeader';
import OwnerLockboxSelector from '@/components/OwnerLockboxSelector';
import KeyNotReturnedAlert from '@/components/KeyNotReturnedAlert';

const formatTime = (ms) => {
  if (ms <= 0) return "00:00:00";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-green-100 text-green-800 border-green-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    EXPIRED: "bg-slate-100 text-slate-800 border-slate-200",
    COMPLETED: "bg-blue-100 text-blue-800 border-blue-200",
    CLOSED_BY_OWNER: "bg-red-200 text-red-900 border-red-300",
    KEY_NOT_RETURNED: "bg-red-600 text-white border-red-700 font-black animate-pulse",
  };
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${styles[status] || styles.EXPIRED}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-green-600 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Check className="w-5 h-5" /> Approve Request
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Guest</span>
              <span className="font-medium text-gray-900">{request.guestName}</span>
            </div>
            <div className="flex justify-between mb-2">
               <span className="text-sm text-gray-500">Phone</span>
               <span className="font-medium text-gray-900">{request.guestPhone}</span>
            </div>
             <div className="flex justify-between">
               <span className="text-sm text-gray-500">Requested</span>
               <span className="font-medium text-gray-900">{request.requestedDuration || '0'} mins</span>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Approved Duration (minutes)
             </label>
             <input
                type="text"
                value={duration}
                onChange={handleDurationChange}
                placeholder="e.g. 60"
                autoFocus
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition-colors text-gray-900 bg-white placeholder-gray-400 ${
                  error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-green-500'
                }`}
             />
             {error ? (
                <p className="text-xs text-red-500 mt-1">{error}</p>
             ) : (
                <p className="text-xs text-gray-500 mt-1">This determines how long the lockbox remains unlocked.</p>
             )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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

const OwnerDashboard = () => {
  const { state: navState } = useLocation();
  const navigate = useNavigate();
  const [selectedLockbox, setSelectedLockbox] = useState(navState?.lockbox || null);
  const [requests, setRequests] = useState({});
  const [realLockboxState, setRealLockboxState] = useState(null);
  const [keyPresent, setKeyPresent] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [modalOpen, setModalOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isManualActionLoading, setIsManualActionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  useEffect(() => {
    if (selectedLockbox) {
      setRequests({});
      setRealLockboxState(null);
      setKeyPresent(false);
      setConnectionError(null);
      setIsLoading(true);
    }
  }, [selectedLockbox?.id]);

  // Request Listener
  useEffect(() => {
    if (!selectedLockbox?.id) return;
    const requestsRef = ref(database, `lockboxes/${selectedLockbox.id}/requests`);
    const unsubRequests = onValue(requestsRef, (snapshot) => {
      const val = snapshot.val();
      setRequests(val || {});
      setIsLoading(false);
    }, (error) => {
      setConnectionError("Failed to connect to requests stream.");
      setIsLoading(false);
    });
    return () => unsubRequests();
  }, [selectedLockbox?.id]);

  // Lockbox State Listener
  useEffect(() => {
    if (!selectedLockbox?.id) return;
    const lockboxRef = ref(database, `lockboxes/${selectedLockbox.id}/lockbox`);
    const unsubLockbox = onValue(lockboxRef, (snapshot) => {
      const val = snapshot.val();
      setRealLockboxState(val || { state: 'LOCKED' });
    }, (error) => {
      setConnectionError("Failed to connect to lockbox status stream.");
    });
    return () => unsubLockbox();
  }, [selectedLockbox?.id]);

  // Key Present Listener
  useEffect(() => {
    if (!selectedLockbox?.id) return;
    const keyPresentRef = ref(database, `lockboxes/${selectedLockbox.id}/keyPresent`);
    const unsubKeyPresent = onValue(keyPresentRef, (snapshot) => {
      setKeyPresent(!!snapshot.val());
    }, (error) => {
      console.error("Failed to connect to keyPresent stream:", error);
    });
    return () => unsubKeyPresent();
  }, [selectedLockbox?.id]);

  useEffect(() => {
    if (realLockboxState?.state !== 'UNLOCKED') return;
    const timerInterval = setInterval(() => setCurrentTime(Date.now()), 1000);
    setCurrentTime(Date.now());
    return () => clearInterval(timerInterval);
  }, [realLockboxState?.state, realLockboxState?.unlockedUntil]);

  const displayState = useMemo(() => {
    if (!realLockboxState || realLockboxState.state !== 'UNLOCKED') {
      return { state: 'LOCKED', activeAccessId: null, unlockedUntil: null, activeGuestName: null, activeGuestPhone: null, activeReason: null, approvedAt: null };
    }
    const activeReqId = realLockboxState.activeRequestId;
    
    if (activeReqId === "MANUAL_OVERRIDE") {
       return {
          state: 'UNLOCKED',
          activeAccessId: activeReqId,
          unlockedUntil: realLockboxState.unlockedUntil,
          activeGuestName: 'Manual Override (Owner)',
          activeGuestPhone: 'N/A',
          activeReason: 'Manually Unlocked',
          approvedAt: realLockboxState.lastUpdated
        };
    }

    const activeReq = activeReqId ? requests[activeReqId] : null;

    if (!activeReq || activeReq.status !== 'APPROVED') {
       return { state: 'LOCKED', activeAccessId: null, unlockedUntil: null, activeGuestName: null, activeGuestPhone: null, activeReason: null, approvedAt: null };
    }

    return {
      state: 'UNLOCKED',
      activeAccessId: activeReqId,
      unlockedUntil: realLockboxState.unlockedUntil,
      activeGuestName: activeReq.guestName || activeReq.name || 'Unknown Guest',
      activeGuestPhone: activeReq.guestPhone || activeReq.phone || 'Unknown',
      activeReason: activeReq.reason || 'Access Granted',
      approvedAt: activeReq.approvedAt
    };
  }, [realLockboxState, requests]);

  const openApprovalModal = (request) => {
    setSelectedRequest(request);
    setModalOpen(true);
  };

  const confirmAccept = async (requestId, approvedDuration) => {
    if (!currentUser) {
       toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
       return;
    }
    try {
      const durationInt = parseInt(approvedDuration, 10);
      const now = Date.now();
      const durationMs = durationInt * 60 * 1000;
      const expiresAt = now + durationMs;

      await update(ref(database, `lockboxes/${selectedLockbox.id}/requests/${requestId}`), {
        status: 'APPROVED',
        approvedAt: now,
        expiresAt: expiresAt,
        approvedDuration: durationInt
      });

      await updateLockboxStateUnlocked(selectedLockbox.id, requestId, expiresAt);
      
      setModalOpen(false);
      setSelectedRequest(null);
      toast({ title: "Access Granted", description: `Unlocked for ${durationInt} mins.`, className: "bg-green-500 text-white" });
    } catch (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (requestId) => {
    try {
      await update(ref(database, `lockboxes/${selectedLockbox.id}/requests/${requestId}`), {
        status: 'REJECTED',
        rejectedAt: Date.now()
      });
      if (displayState.activeAccessId === requestId) {
         await updateLockboxStateLocked(selectedLockbox.id);
      }
      toast({ title: "Request Rejected", description: "Request rejected.", variant: "default" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    }
  };

  const handleManualAction = async (action) => {
    const isUnlock = action === 'unlock';
    if (isUnlock) {
      setIsManualActionLoading(true);
      try {
        await manuallyUnlockLockbox(selectedLockbox.id);
        toast({ title: "Lockbox Unlocked", description: "The lockbox is now open.", className: "bg-green-500 text-white" });
      } catch (error) {
        toast({ title: "Action Failed", description: error.message, variant: "destructive" });
      } finally {
        setIsManualActionLoading(false);
      }
    } else {
      setCloseConfirmOpen(true);
    }
  };

  const confirmCloseBox = async () => {
    setCloseConfirmOpen(false);
    setIsManualActionLoading(true);
    try {
      await closeBoxByOwner(selectedLockbox.id, displayState.activeAccessId);
      toast({ 
        title: "Lockbox closed successfully", 
        description: "The lockbox has been secured and any active guest access was ended.", 
        className: "bg-blue-600 text-white" 
      });
    } catch (error) {
      console.error("[OwnerDashboard] Failed to close box:", error);
      toast({ title: "Action Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsManualActionLoading(false);
    }
  };

  const isUnlocked = displayState.state === 'UNLOCKED';
  const timeRemaining = displayState.unlockedUntil ? Math.max(0, displayState.unlockedUntil - currentTime) : 0;
  const requestsList = Object.entries(requests).map(([id, data]) => ({ id, ...data }));
  const pendingRequests = requestsList.filter(r => r.status === 'PENDING' || r.status === 'AWAITING_VERIFICATION').sort((a, b) => b.timestamp - a.timestamp);
  const historyRequests = requestsList.filter(r => r.status !== 'PENDING' && r.status !== 'AWAITING_VERIFICATION').sort((a, b) => b.timestamp - a.timestamp);

  return (
    <>
      <Helmet><title>Owner Dashboard - SmartLock Manager</title></Helmet>
      
      <ApprovalModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onConfirm={confirmAccept}
        request={selectedRequest}
      />

      <Dialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="w-5 h-5" /> Force Close Lockbox
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to close the lockbox? This will end any active guest access immediately and secure the box.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseConfirmOpen(false)} disabled={isManualActionLoading}>Cancel</Button>
            <Button variant="destructive" onClick={confirmCloseBox} disabled={isManualActionLoading} className="bg-red-600 hover:bg-red-700">
              {isManualActionLoading ? 'Closing...' : 'Close Lockbox'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-gray-50/50">
        <OwnerDashboardHeader lockboxState={displayState} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          <section>
            <OwnerLockboxSelector 
              selectedLockbox={selectedLockbox}
              onSelect={setSelectedLockbox}
            />
          </section>

          {!selectedLockbox ? (
             <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-xl text-gray-500">Please select a lockbox to view requests.</p>
             </div>
          ) : (
            <>
              {realLockboxState?.alert === 'KEY_NOT_RETURNED' && (
                <KeyNotReturnedAlert 
                  lockboxId={selectedLockbox.id}
                  guestName={displayState.activeGuestName || 'Unknown Guest'}
                  guestPhone={displayState.activeGuestPhone || 'Unknown Phone'}
                  alertTimestamp={realLockboxState.lastUpdated}
                />
              )}

              {connectionError && (
                 <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                    <p className="font-bold">Connection Error</p>
                    <p>{connectionError}</p>
                 </div>
              )}

              {isLoading && !connectionError ? (
                 <div className="text-center py-12">
                   <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                   <p className="text-gray-500">Loading lockbox data...</p>
                 </div>
              ) : (
                <>
                  <section>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <div className="p-1 bg-blue-100 rounded-lg">
                          <Lock className="w-4 h-4 text-blue-600" />
                        </div>
                        Lockbox Status (Live)
                      </h2>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          onClick={() => handleManualAction('unlock')}
                          disabled={isManualActionLoading || isUnlocked}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none shadow-sm"
                        >
                          {isManualActionLoading && !isUnlocked ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Unlock className="w-4 h-4 mr-2" />}
                          Open Box
                        </Button>
                        <Button 
                          onClick={() => handleManualAction('lock')}
                          disabled={isManualActionLoading || !isUnlocked}
                          className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none shadow-sm"
                        >
                          {isManualActionLoading && isUnlocked ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                          Close Box
                        </Button>
                      </div>
                    </div>

                    <Card className="border-0 shadow-xl overflow-hidden relative">
                      <div className={`absolute top-0 left-0 w-2 h-full ${isUnlocked ? 'bg-green-500' : 'bg-red-500'}`} />
                      <CardContent className="p-0">
                        <div className="grid md:grid-cols-12 gap-0">
                          <div className={`md:col-span-4 p-8 flex flex-col items-center justify-center text-center ${isUnlocked ? 'bg-green-50' : 'bg-red-50'}`}>
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 shadow-lg ${isUnlocked ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                              {isUnlocked ? <Unlock className="w-10 h-10" /> : <Lock className="w-10 h-10" />}
                            </div>
                            
                            <h3 className={`text-2xl font-black uppercase tracking-wider mb-2 ${isUnlocked ? 'text-green-700' : 'text-red-700'}`}>
                              {displayState.state}
                            </h3>
                            
                            <div style={{ 
                              color: 'white', 
                              backgroundColor: keyPresent ? '#10b981' : '#ef4444', 
                              fontSize: '16px', 
                              fontWeight: 'bold', 
                              padding: '8px 16px', 
                              borderRadius: '8px',
                              marginBottom: '24px',
                              display: 'inline-block'
                            }}>
                              Key Present: {keyPresent ? 'YES' : 'NO'}
                            </div>

                            {isUnlocked && (
                               <div className="mt-2 bg-white/80 backdrop-blur rounded-xl p-3 border border-green-200 w-full max-w-[200px]">
                                 <p className="text-xs text-green-700 font-bold uppercase mb-1">Auto-Lock In</p>
                                 <p className="text-3xl font-mono font-bold text-green-800 tracking-tight">
                                   {formatTime(timeRemaining)}
                                 </p>
                               </div>
                            )}
                          </div>
                          <div className="md:col-span-8 p-8 bg-white">
                            {isUnlocked ? (
                              <div className="h-full flex flex-col justify-center">
                                <div className="flex items-center gap-3 mb-6">
                                   <Badge className="bg-green-100 text-green-700 px-3 py-1">Active Session</Badge>
                                   <span className="text-sm text-gray-400 flex items-center gap-1">
                                     <Clock className="w-3 h-3" /> Started at {displayState.approvedAt ? new Date(displayState.approvedAt).toLocaleTimeString() : 'Unknown'}
                                   </span>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-8">
                                  <div>
                                    <p className="text-sm text-gray-500 mb-1">Guest Name</p>
                                    <p className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                       {displayState.activeAccessId === "MANUAL_OVERRIDE" ? <Power className="w-5 h-5 text-gray-400" /> : <User className="w-5 h-5 text-gray-400" />}
                                       {displayState.activeGuestName}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                                    <p className="text-xl font-bold text-gray-900 flex items-center gap-2 font-mono"><Phone className="w-5 h-5 text-gray-400" />{displayState.activeGuestPhone}</p>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <p className="text-sm text-gray-500 mb-1">Reason for Access</p>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-gray-700 italic">"{displayState.activeReason}"</div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                  <Lock className="w-8 h-8 text-gray-300" />
                                </div>
                                <h4 className="text-lg font-medium text-gray-600">No Active Access</h4>
                                <p className="text-sm">The lockbox is secure. Approve a request or use manual override.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <div className="p-1 bg-yellow-100 rounded-lg"><AlertCircle className="w-4 h-4 text-yellow-600" /></div>
                        Pending Requests
                        {pendingRequests.length > 0 && <Badge className="ml-2 bg-red-500 text-white border-0 hover:bg-red-600">{pendingRequests.length}</Badge>}
                      </h2>
                    </div>
                    
                    <AnimatePresence>
                      {pendingRequests.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                          <p className="text-gray-500">No pending requests at the moment.</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {pendingRequests.map(request => (
                            <motion.div key={request.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                              <Card className="h-full border-l-4 border-l-yellow-400 shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader className="pb-3">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg font-bold">{request.guestName || request.name}</CardTitle>
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{request.requestedDuration || request.duration} mins</Badge>
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(request.createdAt || request.timestamp).toLocaleTimeString()}</div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="space-y-2 text-sm">
                                     <div className="flex items-center gap-2 text-gray-700 font-mono"><Phone className="w-4 h-4 text-gray-400" />{request.guestPhone || request.phone}</div>
                                     <div className="flex items-start gap-2 text-gray-700"><FileText className="w-4 h-4 text-gray-400 mt-0.5" /><span className="italic">"{request.reason}"</span></div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 pt-2">
                                    <Button onClick={() => openApprovalModal(request)} className="bg-green-600 hover:bg-green-700 text-white"><Check className="w-4 h-4 mr-1" /> Accept</Button>
                                    <Button onClick={() => handleReject(request.id)} variant="destructive" className="bg-red-500 hover:bg-red-600"><X className="w-4 h-4 mr-1" /> Reject</Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                  </section>

                  <section>
                     <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="p-1 bg-slate-100 rounded-lg"><History className="w-4 h-4 text-slate-600" /></div>
                      Request History
                    </h2>
                    <Card className="overflow-hidden shadow-md">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr><th className="px-6 py-4">Guest</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Reason</th><th className="px-6 py-4">Duration</th><th className="px-6 py-4">Time</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {historyRequests.length === 0 ? (
                               <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No history available</td></tr>
                            ) : (
                              historyRequests.map(req => (
                                <tr key={req.id} className={`hover:bg-gray-50/50 transition-colors ${req.status === 'KEY_NOT_RETURNED' ? 'bg-red-50/30' : ''}`}>
                                  <td className="px-6 py-4"><div className="font-semibold text-gray-900">{req.guestName || req.name}</div><div className="text-xs text-gray-500 font-mono">{req.guestPhone || req.phone}</div></td>
                                  <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                  <td className="px-6 py-4 text-gray-600">{req.approvedDuration || req.ownerApprovedDuration || req.requestedDuration || req.duration} mins</td>
                                  <td className="px-6 py-4 text-gray-500">
                                     <div className="flex flex-col">
                                       <span>{new Date(req.createdAt || req.timestamp).toLocaleDateString()}</span>
                                       <span className="text-xs">{new Date(req.createdAt || req.timestamp).toLocaleTimeString()}</span>
                                     </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default OwnerDashboard;
