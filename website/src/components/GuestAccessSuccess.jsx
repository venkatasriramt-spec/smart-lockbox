import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MapPin, Unlock, PartyPopper, KeyRound, Sparkles, User } from 'lucide-react';
import { Helmet } from 'react-helmet';

const GuestAccessSuccess = ({ lockboxId, request, onProceed }) => {
  const isAutoApproved = request?.autoApprovedViaPreApproval || request?.approvalReason === "Auto-approved via pre-approval";
  const guestName = request?.name || request?.guestName || "Guest";

  return (
    <>
      <Helmet><title>Access Approved - Smart Lock</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-[#065F46] to-[#047857] flex items-center justify-center p-4 font-sans relative overflow-hidden w-full">
        
        {/* Confetti Background Elements */}
        <div className="absolute inset-0 pointer-events-none opacity-40 flex flex-wrap justify-center content-center gap-10 overflow-hidden">
          {[...Array(15)].map((_, i) => (
             <motion.div
               key={i}
               initial={{ y: -100, opacity: 0, rotate: 0 }}
               animate={{ y: '100vh', opacity: [0, 1, 1, 0], rotate: 360 }}
               transition={{ duration: Math.random() * 3 + 2, repeat: Infinity, delay: Math.random() * 2 }}
               className="w-4 h-4 rounded-sm"
               style={{ backgroundColor: ['#FFF', '#FDE68A', '#A7F3D0', '#6EE7B7'][i % 4] }}
             />
          ))}
        </div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }} 
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-full max-w-md relative z-10"
        >
          <Card className="p-8 sm:p-10 text-center rounded-[24px] shadow-2xl border-0 bg-white">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 relative ${isAutoApproved ? 'bg-purple-100' : 'bg-emerald-100'}`}
            >
              {isAutoApproved ? (
                <Sparkles className="w-12 h-12 text-[#7C3AED]" />
              ) : (
                <PartyPopper className="w-12 h-12 text-[#059669]" />
              )}
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border border-gray-100">
                 <CheckCircle2 className={`w-6 h-6 ${isAutoApproved ? 'text-[#7C3AED]' : 'text-[#059669]'}`} />
              </div>
            </motion.div>
            
            <h2 className="text-[28px] font-extrabold text-[#0F172A] mb-2 font-poppins tracking-tight leading-tight">
              {isAutoApproved ? "Your pre-approval was matched! Access granted automatically" : "Access Approved!"}
            </h2>
            <p className="text-[#64748B] mb-8 font-medium text-lg">
              {isAutoApproved 
                ? "You have bypassed the verification process." 
                : "The property owner has granted you access."}
            </p>

            <div className={`rounded-2xl p-5 mb-8 border text-left space-y-4 ${isAutoApproved ? 'bg-purple-50/50 border-purple-100' : 'bg-[#F8FAFC] border-gray-200'}`}>
              
              {isAutoApproved && (
                <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                  <div className={`p-2 rounded-lg bg-purple-100`}>
                    <User className={`w-5 h-5 text-[#7C3AED]`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Approved Guest</p>
                    <p className="font-semibold text-gray-900">{guestName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className={`p-2 rounded-lg ${isAutoApproved ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                  <MapPin className={`w-5 h-5 ${isAutoApproved ? 'text-[#7C3AED]' : 'text-[#059669]'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Property Location</p>
                  <p className="font-semibold text-gray-900">Lockbox: {lockboxId}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className={`p-2 rounded-lg ${isAutoApproved ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                  <Unlock className={`w-5 h-5 ${isAutoApproved ? 'text-[#7C3AED]' : 'text-[#059669]'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Time Granted</p>
                  <p className="font-semibold text-gray-900">{request?.duration || (request?.approvedDuration ? Math.round(request.approvedDuration / 60) : 15)} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isAutoApproved ? 'bg-purple-100' : 'bg-emerald-100'}`}>
                  <KeyRound className={`w-5 h-5 ${isAutoApproved ? 'text-[#7C3AED]' : 'text-[#059669]'}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Instructions</p>
                  <p className="font-semibold text-gray-900">Take the key and secure the box</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={onProceed} 
              className={`w-full py-7 text-[17px] font-bold text-white rounded-[16px] shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isAutoApproved ? 'bg-[#7C3AED] hover:bg-[#6D28D9]' : 'bg-[#059669] hover:bg-[#047857]'}`}
            >
              Proceed to Access
            </Button>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default GuestAccessSuccess;