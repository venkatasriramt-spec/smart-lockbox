
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound, XCircle, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet';

const KeyAvailabilityCheck = ({ lockboxId, onSuccess, request }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, available, missing

  useEffect(() => {
    const checkKey = async () => {
      try {
        const lockboxRef = ref(database, `lockboxes/${lockboxId}/lockbox/keyPresent`);
        const snapshot = await get(lockboxRef);
        const isPresent = snapshot.exists() ? snapshot.val() : false;
        
        // Add a slight delay for better UX
        setTimeout(() => {
          if (isPresent) {
            setStatus('available');
            onSuccess();
          } else {
            // Check request age to avoid false positives for newly created requests
            const requestAge = request ? Date.now() - (request.createdAt || request.timestamp || 0) : 10000;
            if (requestAge > 3000) {
              setStatus('missing');
            } else {
              setStatus('available'); // default to available if request is too new to prevent false blocks
              onSuccess();
            }
          }
        }, 1500);
      } catch (error) {
        console.error("Error checking key availability:", error);
        setStatus('missing');
      }
    };

    checkKey();
  }, [lockboxId, onSuccess, request]);

  const backgroundClasses = "min-h-screen bg-gradient-to-br from-[#0D2E33] via-[#081C24] to-[#050B10] flex items-center justify-center p-4 font-sans relative overflow-hidden w-full absolute inset-0 z-50";

  if (status === 'checking') {
    return (
      <div className={backgroundClasses}>
        <div className="flex flex-col items-center relative z-10">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="bg-white/10 backdrop-blur-md p-5 rounded-full shadow-2xl mb-4 border border-white/20"
          >
            <Loader2 className="w-10 h-10 text-[#0891B2]" />
          </motion.div>
          <p className="text-white/80 font-bold tracking-tight animate-pulse">Verifying key availability...</p>
        </div>
      </div>
    );
  }

  if (status === 'missing') {
    return (
      <div className={backgroundClasses}>
        <Helmet><title>Key Unavailable - Smart Lock</title></Helmet>
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#EF4444]/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="p-8 bg-white border-0 shadow-[0_30px_60px_rgba(0,0,0,0.3)] rounded-[24px] text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <KeyRound className="w-10 h-10 text-[#EF4444]" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                <XCircle className="w-6 h-6 text-[#EF4444]" />
              </div>
            </div>
            
            <h2 className="text-[24px] font-bold text-[#1E293B] mb-3 font-poppins leading-tight">Key Not Available</h2>
            <p className="text-[#64748B] mb-8 font-medium leading-relaxed">
              Your access request cannot be fulfilled at this time. The key is not currently available in the lockbox. Please contact the property owner or try again later.
            </p>
            
            <Button 
              onClick={() => navigate('/guest-portal')} 
              className="w-full bg-[#1E293B] hover:bg-[#334155] text-white py-6 text-lg font-bold rounded-[16px] border-0 transition-all shadow-lg active:scale-[0.98]"
            >
              Return to Home
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default KeyAvailabilityCheck;
