
import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, Key } from 'lucide-react';

const KeyPresenceIndicator = ({ keyPresent, loading }) => {
  return (
    <div className="w-full mb-6 py-4 px-3 bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-white/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-50"></div>
      
      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-600 mb-3 flex items-center justify-center gap-1.5">
        <Key className="w-3 h-3" /> Key Sensor
      </p>
      
      <div className="flex flex-col items-center gap-2">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 font-bold animate-pulse py-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm tracking-wide">SCANNING...</span>
          </div>
        ) : keyPresent ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3 text-green-700 bg-green-100 px-5 py-3 rounded-xl border-2 border-green-400 shadow-md w-full justify-center"
          >
            <div className="bg-green-500 rounded-full p-1.5 shadow-sm">
              <Check className="w-5 h-5 text-white stroke-[3px]" />
            </div>
            <span className="text-base font-black uppercase tracking-tight">Key Present: YES</span>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-3 text-red-700 bg-red-100 px-5 py-3 rounded-xl border-2 border-red-400 shadow-md w-full justify-center"
          >
            <div className="bg-red-500 rounded-full p-1.5 shadow-sm">
              <X className="w-5 h-5 text-white stroke-[3px]" />
            </div>
            <span className="text-base font-black uppercase tracking-tight">Key Present: NO</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default KeyPresenceIndicator;
