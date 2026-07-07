import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ProtectedGuestRoute = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const lockboxId = location.state?.lockboxId;
  const request = location.state?.request;
  const [isAllowed, setIsAllowed] = useState(null);

  useEffect(() => {
    if (!lockboxId) {
      setIsAllowed(false);
      return;
    }

    // If the request is already approved and passed in state, allow immediate entry
    if (request?.status === 'APPROVED') {
      setIsAllowed(true);
      return;
    }

    const checkKey = async () => {
      try {
        const snap = await get(ref(database, `lockboxes/${lockboxId}/lockbox/keyPresent`));
        if (snap.exists() && snap.val() === true) {
          setIsAllowed(true);
        } else {
          // Key is missing, redirect to waiting screen with error state
          navigate('/guest/waiting', { state: { lockboxId, error: 'key_missing' }, replace: true });
        }
      } catch (error) {
        console.error("Route protection error:", error);
        navigate('/guest/waiting', { state: { lockboxId, error: 'key_missing' }, replace: true });
      }
    };

    checkKey();
  }, [lockboxId, request, navigate]);

  if (isAllowed === null) {
    return (
      <div className="min-h-screen bg-[#0D2E33] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="bg-white/10 backdrop-blur-md p-5 rounded-full shadow-2xl mb-4 border border-white/20"
        >
          <Loader2 className="w-10 h-10 text-[#0891B2]" />
        </motion.div>
        <p className="text-white/80 font-bold tracking-tight animate-pulse">Securing route...</p>
      </div>
    );
  }

  if (!isAllowed) {
    return <Navigate to="/guest-portal" replace />;
  }

  return children;
};

export default ProtectedGuestRoute;