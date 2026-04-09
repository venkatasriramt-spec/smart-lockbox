import React, { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { database } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, MapPin, Activity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const OwnerLockboxSelector = ({ onSelect, selectedLockbox }) => {
  const [lockboxes, setLockboxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const { currentUser } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const lockboxesRef = ref(database, 'lockboxes');
    const unsubscribe = onValue(lockboxesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const ownerLockboxes = Object.entries(data)
          .filter(([, lockbox]) => lockbox.ownerId === currentUser.uid)
          .map(([id, value]) => ({
            id,
            ...value
          }));
        setLockboxes(ownerLockboxes);
        
        ownerLockboxes.forEach(lb => {
          if (lb.requests) {
            Object.values(lb.requests).forEach(req => {
              if (req.status === 'APPROVED' && req.keyReturned === true) {
                update(ref(database, `lockboxes/${lb.id}/requests/${req.id}`), {
                  status: 'COMPLETED',
                  completedAt: Date.now()
                }).catch(err => console.error("Error auto-completing session:", err));
              }
            });
          }
        });
      } else {
        setLockboxes([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getLockboxStatus = (lockbox) => {
    if (lockbox.lockbox && lockbox.lockbox.state === 'UNLOCKED' && lockbox.lockbox.unlockedUntil > currentTime) {
         return { state: 'UNLOCKED', expiresAt: lockbox.lockbox.unlockedUntil };
    }
    if (lockbox.requests) {
      const activeReq = Object.values(lockbox.requests).find(r => 
        r.status === 'APPROVED' && r.expiresAt && r.expiresAt > currentTime && !r.keyReturned
      );
      if (activeReq) {
        return { state: 'UNLOCKED', expiresAt: activeReq.expiresAt };
      }
    }
    return { state: 'LOCKED' };
  };

  const formatTimeRemaining = (expiresAt) => {
    const remaining = expiresAt - currentTime;
    if (remaining <= 0) return '00:00';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-sm text-gray-500 animate-pulse">Scanning network for lockboxes...</div>;
  }

  if (lockboxes.length === 0) {
    return (
      <Card className="text-center py-12 border-dashed border-2 border-gray-300 bg-gray-50/50">
        <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-bold mb-2 text-gray-900 font-poppins">No Lockboxes Found</h3>
        <p className="text-gray-500">You don't have any devices registered to your account.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-teal-600" />
        <h2 className="text-xl font-bold font-poppins text-gray-900">Your Devices</h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lockboxes.map((lockbox, index) => {
          const status = getLockboxStatus(lockbox);
          const isUnlocked = status.state === 'UNLOCKED';

          return (
            <motion.div
              key={lockbox.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer modern-card overflow-hidden group ${
                  selectedLockbox?.id === lockbox.id
                    ? 'ring-2 ring-teal-500 bg-teal-50/30'
                    : ''
                }`}
                onClick={() => onSelect(lockbox)}
              >
                <div className={`h-2 w-full ${isUnlocked ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div className="p-5 flex items-start gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 ${
                      isUnlocked ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white'
                    }`}>
                      {isUnlocked ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-bold font-poppins truncate text-gray-900 pr-2">{lockbox.name || lockbox.id}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500 text-xs mb-3">
                       <MapPin className="w-3 h-3" />
                       <span className="truncate">{lockbox.address || 'Address not set'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <Badge variant={isUnlocked ? 'success' : 'danger'} className={`px-2 py-0.5 text-[10px] ${isUnlocked ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                         {status.state}
                       </Badge>
                       <AnimatePresence>
                         {isUnlocked && (
                           <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                             <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-mono tracking-wider animate-pulse shadow-sm">
                               {formatTimeRemaining(status.expiresAt)}
                             </Badge>
                           </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default OwnerLockboxSelector;