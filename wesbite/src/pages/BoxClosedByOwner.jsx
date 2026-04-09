
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertOctagon, PhoneCall, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';

const BoxClosedByOwner = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#450a0a] via-[#7f1d1d] to-[#000000] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <Helmet><title>Lockbox Closed - Smart Lock</title></Helmet>
      
      {/* Background Effects */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-[#EF4444]/20 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none" />

      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 sm:p-10 border-t-8 border-t-[#DC2626] shadow-[0_30px_60px_rgba(0,0,0,0.5)] bg-white text-center rounded-[24px] relative overflow-hidden">
          
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 relative border border-red-100 shadow-inner">
            <motion.div 
              animate={{ rotate: [0, -5, 5, -5, 5, 0] }} 
              transition={{ repeat: Infinity, duration: 3, repeatDelay: 1 }}
            >
              <ShieldAlert className="w-12 h-12 text-[#DC2626]" />
            </motion.div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-md border border-gray-100">
              <AlertOctagon className="w-6 h-6 text-[#DC2626]" />
            </div>
          </div>
          
          <h2 className="text-[28px] font-bold text-[#0F172A] mb-3 font-poppins tracking-tight leading-tight">
            Lockbox Closed
          </h2>
          
          <div className="bg-red-50 rounded-[16px] p-5 border border-red-100 mb-8 shadow-sm text-left">
            <p className="text-sm font-bold text-red-800 uppercase tracking-wider mb-2 border-b border-red-200 pb-2">Notice</p>
            <ul className="text-[#DC2626] text-sm space-y-2 font-medium">
              <li className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                Owner closed the lockbox
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                Your access has been ended by the owner
              </li>
            </ul>
          </div>

          <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Contact Owner</p>
            <a href="tel:+911234567890" className="inline-flex items-center justify-center gap-2 text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors font-mono">
              <PhoneCall className="w-5 h-5" />
              +91 1234567890
            </a>
          </div>

          <Button 
            className="w-full py-7 text-[17px] font-bold bg-[#1E293B] hover:bg-[#334155] text-white rounded-[16px] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};

export default BoxClosedByOwner;
