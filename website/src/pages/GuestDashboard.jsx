import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { database, serverTimestamp } from '@/config/firebase';
import { ref, update, onValue } from 'firebase/database';
import { updateLockboxStateLocked } from '@/utils/lockboxUtils';
import { checkLockboxWritePermission } from '@/utils/firebaseStatus';
import { useToast } from '@/components/ui/use-toast';

const GuestDashboard = () => {
  const navigate = useNavigate();
  const { guestData } = useAuth();
  const { toast } = useToast();
  const [activeRequest, setActiveRequest] = useState(null);

  // If there is an active request in the context, we should ideally show its status.
  const hasActiveRequest = !!guestData.requestId;

  // Validate permissions on mount to help debug potential issues early
  useEffect(() => {
    if (guestData.lockboxId) {
      checkLockboxWritePermission(guestData.lockboxId);
    }
  }, [guestData.lockboxId]);

  // Monitor the active request specifically for expiry
  useEffect(() => {
    if (!guestData.requestId || !guestData.lockboxId) return;

    const requestRef = ref(database, `lockboxes/${guestData.lockboxId}/requests/${guestData.requestId}`);
    
    const unsubscribe = onValue(requestRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setActiveRequest(data);
      }
    });

    return () => unsubscribe();
  }, [guestData.requestId, guestData.lockboxId]);

  // Periodic check for expiry with comprehensive logging
  useEffect(() => {
    // Only proceed if we have an active, approved request with an expiration time
    if (!activeRequest || activeRequest.status !== 'APPROVED' || !activeRequest.expiresAt) return;

    const checkExpiry = async () => {
      const now = Date.now();
      const remaining = activeRequest.expiresAt - now;
      
      // Log status every check (can be noisy, but useful for debugging this specific issue)
      console.log(`⏱️ Expiry Check: Now=${now}, Expires=${activeRequest.expiresAt}, Remaining=${remaining}ms, ID=${guestData.lockboxId}`);
      
      if (now >= activeRequest.expiresAt) {
        console.warn("🚨 EXPIRED! Detected expiry threshold met. Initiating lockout sequence...");
        
        try {
          // 1. Lock the box FIRST
          if (guestData.lockboxId) {
             console.log(`🔒 Calling updateLockboxStateLocked for ${guestData.lockboxId}...`);
             await updateLockboxStateLocked(guestData.lockboxId);
             console.log("✅ updateLockboxStateLocked completed successfully.");
          } else {
             console.error("❌ CRITICAL: No lockboxId found in guestData during expiry!");
          }

          // 2. Mark request as EXPIRED with timestamp
          console.log(`📝 Updating request ${guestData.requestId} status to EXPIRED...`);
          const requestRef = ref(database, `lockboxes/${guestData.lockboxId}/requests/${guestData.requestId}`);
          
          await update(requestRef, {
            status: 'EXPIRED',
            expiredAt: serverTimestamp()
          });
          console.log("✅ Request status updated to EXPIRED.");

          toast({
            title: "Access Expired",
            description: "Your access time has ended. The lockbox is now locked.",
            variant: "default"
          });
        } catch (error) {
          console.error("❌ Auto-lock sequence FAILED:", error);
          toast({
            title: "Error",
            description: "Failed to process expiration. Please contact support.",
            variant: "destructive"
          });
        }
      }
    };

    // Check every 1 second to ensure prompt locking
    const intervalId = setInterval(checkExpiry, 1000);
    
    // Initial check immediately
    checkExpiry();

    return () => clearInterval(intervalId);
  }, [activeRequest, guestData.lockboxId, guestData.requestId, toast]);

  return (
    <>
      <Helmet>
        <title>Guest Portal - Smart Lock</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <Card className="p-8 bg-white/10 backdrop-blur-md border-white/10 shadow-2xl text-center">
             <h1 className="text-3xl font-bold text-white mb-6">Guest Portal</h1>
             
             {hasActiveRequest ? (
                <div className="space-y-6">
                   <div className="p-6 bg-blue-500/20 rounded-xl border border-blue-500/30">
                      <p className="text-blue-200 mb-2">You have an active request.</p>
                      <h2 className="text-xl font-bold text-white">Request #{guestData.requestId.slice(-6)}</h2>
                      {activeRequest && (
                        <p className="text-sm text-blue-300 mt-2">Status: {activeRequest.status}</p>
                      )}
                   </div>
                   
                   <Button 
                    onClick={() => navigate('/guest-waiting-screen')}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl text-lg font-bold"
                   >
                     View Status
                   </Button>
                </div>
             ) : (
               <div className="space-y-6">
                 <p className="text-slate-300 text-lg">
                   Request temporary access to a Smart Lockbox.
                 </p>
                 
                 <Button 
                    onClick={() => navigate('/lockbox-id-input')}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white py-6 rounded-xl text-lg font-bold shadow-lg shadow-green-500/20"
                   >
                     <PlusCircle className="w-5 h-5 mr-2" />
                     New Request
                   </Button>
               </div>
             )}
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default GuestDashboard;