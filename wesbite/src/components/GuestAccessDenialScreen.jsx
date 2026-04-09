
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock, User, Phone, Clock, MessageSquare, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ref, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { maskIndianPhoneNumber } from '@/utils/phoneUtils';

const GuestAccessDenialScreen = ({ lockboxId, onTryAgain, isExpired = false, requestStatus }) => {
  const navigate = useNavigate();
  const [lastGuest, setLastGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const ownerPhone = "+91 1234567890";

  useEffect(() => {
    const fetchLastGuest = async () => {
      if (!lockboxId) {
        setLoading(false);
        return;
      }
      try {
        const requestsRef = ref(database, `lockboxes/${lockboxId}/requests`);
        const snapshot = await get(requestsRef);
        
        if (snapshot.exists()) {
          const requests = Object.values(snapshot.val());
          const usedRequests = requests.filter(r => 
            r.status === 'APPROVED' || r.status === 'COMPLETED' || r.status === 'EXPIRED'
          );
          
          if (usedRequests.length > 0) {
            usedRequests.sort((a, b) => (b.approvedAt || b.timestamp) - (a.approvedAt || a.timestamp));
            setLastGuest(usedRequests[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching last guest info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastGuest();
  }, [lockboxId]);

  const handleTryAgain = () => {
    if (onTryAgain) onTryAgain();
    else navigate('/guest/lockbox-id');
  };

  const isRejected = requestStatus === 'REJECTED' || (!isExpired && !requestStatus);
  const showLastUser = !isRejected;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D2E33] via-[#081C24] to-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-[#EF4444]/15 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#0284C7]/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none" />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 sm:p-10 border-t-8 border-t-[#EF4444] shadow-[0_30px_60px_rgba(0,0,0,0.5)] bg-white text-center rounded-[24px] relative overflow-hidden">
          
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 relative border border-red-100 shadow-inner">
            <motion.div 
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }} 
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
            >
              <Lock className="w-12 h-12 text-[#EF4444]" />
            </motion.div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-md border border-gray-100">
              <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
            </div>
          </div>
          
          <h2 className="text-[28px] font-bold text-[#0F172A] mb-3 font-poppins tracking-tight leading-tight">
            {isExpired || requestStatus === 'EXPIRED' ? "Time Expired" : "Access Unavailable"}
          </h2>
          
          <p className="text-[#64748B] mb-6 font-medium text-[16px] leading-relaxed px-2">
            {isExpired || requestStatus === 'EXPIRED'
              ? "Your security token has expired. The lockbox is now secured." 
              : "The key is not available in the lockbox at the moment or your request was denied."}
          </p>

          {showLastUser && (
            <div className="bg-[#F8FAFC] rounded-[16px] p-5 border border-[#E2E8F0] mb-8 shadow-sm text-left">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3 border-b border-gray-200 pb-2">Last Known User</p>
              
              {loading ? (
                <p className="text-sm text-gray-500 italic text-center py-2">Loading user data...</p>
              ) : lastGuest ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-1.5 rounded-full"><User className="w-4 h-4 text-blue-600" /></div>
                    <span className="text-sm font-bold text-gray-900">{lastGuest.name || lastGuest.guestName || 'Unknown Guest'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-1.5 rounded-full"><Phone className="w-4 h-4 text-green-600" /></div>
                    <span className="text-sm font-mono font-medium text-gray-700">{maskIndianPhoneNumber(lastGuest.phone || lastGuest.guestPhone)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-1.5 rounded-full"><Clock className="w-4 h-4 text-purple-600" /></div>
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(lastGuest.approvedAt || lastGuest.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-2">No recent usage data available.</p>
              )}
            </div>
          )}

          <div className="mb-8 p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">CONTACT OWNER</p>
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-blue-900 font-medium">Please contact the owner if you require further assistance.</p>
              <a href={`tel:${ownerPhone}`} className="inline-flex items-center gap-2 font-mono font-bold text-blue-700 hover:text-blue-800 bg-blue-100/50 px-3 py-1.5 rounded-full">
                <PhoneCall className="w-4 h-4" /> {ownerPhone}
              </a>
            </div>
          </div>

          <Button 
            className="w-full py-7 text-[17px] font-bold bg-[#1E293B] hover:bg-[#334155] text-white rounded-[16px] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleTryAgain}
          >
            Return to Home
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};

export default GuestAccessDenialScreen;
