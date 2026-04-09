
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lock, X, PhoneCall } from 'lucide-react';
import { ref, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { updateLockboxStateLocked } from '@/utils/lockboxUtils';
import { useKeyDetection } from '@/hooks/useKeyDetection';
import { clearBuzzer } from '@/utils/buzzerUtils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { maskIndianPhoneNumber } from '@/utils/phoneUtils';

const KeyNotReturnedAlert = ({ lockboxId, guestName, guestPhone, alertTimestamp }) => {
  const { keyPresent } = useKeyDetection(lockboxId);
  const { toast } = useToast();
  const [isLocking, setIsLocking] = useState(false);

  useEffect(() => {
    console.log("KeyNotReturnedAlert mounted with guest data:", { guestName, guestPhone, lockboxId });
  }, [guestName, guestPhone, lockboxId]);

  useEffect(() => {
    if (keyPresent && !isLocking) {
      handleAutoLockAndClear();
    }
  }, [keyPresent]);

  const handleAutoLockAndClear = async () => {
    setIsLocking(true);
    try {
      await updateLockboxStateLocked(lockboxId);
      await update(ref(database, `lockboxes/${lockboxId}/lockbox`), { alert: null });
      await clearBuzzer(lockboxId);
      toast({ 
        title: "Lockbox Secured", 
        description: "Key was returned. Lockbox auto-locked and alert cleared.", 
        variant: "success",
        className: "bg-green-600 text-white border-green-700"
      });
    } catch (err) {
      console.error("Auto-lock failed:", err);
      toast({ title: "Error", description: "Failed to auto-lock lockbox.", variant: "destructive" });
    } finally {
      setIsLocking(false);
    }
  };

  const handleManualOverride = async () => {
    setIsLocking(true);
    try {
      await updateLockboxStateLocked(lockboxId);
      await update(ref(database, `lockboxes/${lockboxId}/lockbox`), { alert: null, activeRequestId: null });
      await clearBuzzer(lockboxId);
      
      toast({ 
        title: "Lockbox Manually Locked", 
        description: "The lockbox has been securely locked by the owner.", 
        className: "bg-blue-600 text-white border-blue-700" 
      });
    } catch (err) {
      console.error("Manual override failed:", err);
      toast({ title: "Error", description: "Manual lock failed.", variant: "destructive" });
    } finally {
      setIsLocking(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await update(ref(database, `lockboxes/${lockboxId}/lockbox`), { alert: null });
      await clearBuzzer(lockboxId);
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  };

  const displayPhone = guestPhone && guestPhone !== 'Unknown Phone' 
    ? maskIndianPhoneNumber(guestPhone) 
    : 'Unknown Phone';

  const ownerPhone = "+91 1234567890";

  return (
    <div className="bg-red-600 text-white p-4 rounded-xl shadow-2xl mb-6 flex flex-col md:flex-row items-start md:items-center justify-between border-l-8 border-red-800 animate-in slide-in-from-top-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 rounded-full blur-3xl opacity-50 -mr-10 -mt-10" />
      
      <div className="flex items-center gap-4 mb-4 md:mb-0 relative z-10 w-full md:w-auto">
        <div className="p-3 bg-red-800 rounded-full shrink-0">
          <AlertTriangle className="w-8 h-8 text-yellow-300 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-xl tracking-wide uppercase">Critical Alert: Key Not Returned</h3>
          <p className="text-red-100 font-medium mt-1 break-words">
            <span className="font-bold text-white whitespace-normal">
              {guestName || 'Unknown Guest'}
            </span> 
            <span className="font-mono bg-red-900/50 px-2 py-0.5 rounded ml-2 inline-block">
              {displayPhone}
            </span>
          </p>
          <p className="text-sm text-red-200 mt-1">
            Time expired but the key is missing. The lockbox remains unlocked!
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-red-100 bg-red-800/50 p-2 rounded-lg w-fit">
             Owner Contact: <a href={`tel:${ownerPhone}`} className="inline-flex items-center gap-1 font-mono font-bold text-white hover:text-blue-200"><PhoneCall className="w-3 h-3"/> {ownerPhone}</a>
          </div>
          {alertTimestamp && (
            <p className="text-xs text-red-300 mt-2">Triggered at: {new Date(alertTimestamp).toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      <div className="flex w-full md:w-auto gap-3 relative z-10 mt-4 md:mt-0">
        <Button 
          onClick={handleManualOverride} 
          disabled={isLocking} 
          className="flex-1 md:flex-none bg-red-900 hover:bg-red-950 text-white border border-red-800 shadow-md"
        >
          <Lock className="w-4 h-4 mr-2" /> 
          {isLocking ? "Locking..." : "Manual Override Lock"}
        </Button>
        <Button 
          onClick={handleDismiss} 
          variant="ghost" 
          className="hover:bg-red-700 text-red-100 px-3 transition-colors"
          title="Dismiss Alert"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default KeyNotReturnedAlert;
