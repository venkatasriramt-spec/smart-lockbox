import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { User, Key } from 'lucide-react';
import { Card } from '@/components/ui/card';

const RoleSelection = () => {
  const handleGuestLog = () => {
    console.log('[RoleSelection] Guest Portal card clicked - Navigating to /guest-portal');
  };

  const handleOwnerLog = () => {
    console.log('[RoleSelection] Owner Portal card clicked - Navigating to /owner/login');
  };

  return (
    <>
      <Helmet>
        <title>Select Portal - Lockbox Access Management</title>
        <meta name="description" content="Choose between guest or owner portal to manage lockbox access" />
      </Helmet>
      
      {/* Background gradient from Orange (#EA580C) to Pink (#EC4899) */}
      <div className="min-h-screen bg-gradient-to-br from-[#EA580C] to-[#EC4899] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#0F172A]/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-5xl z-10 relative"
        >
          <div className="text-center mb-16 pointer-events-none">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-white drop-shadow-lg font-poppins">
              Lockbox Access Management
            </h1>
            <p className="text-lg text-white font-bold drop-shadow-md tracking-wide">
              Select your portal to continue
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 relative z-20">
            
            {/* Guest Portal Card - Standard Blue (#3B82F6) */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="h-full relative z-30">
              <Link 
                to="/guest-portal" 
                onClick={handleGuestLog}
                className="block h-full w-full cursor-pointer rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all"
                style={{ pointerEvents: 'auto' }}
              >
                <Card className="h-full border-0 shadow-2xl overflow-hidden group bg-[#3B82F6] pointer-events-none">
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
                  <div className="p-12 text-center relative z-10">
                    <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30 group-hover:rotate-6 transition-transform duration-500">
                      <User className="w-16 h-16 text-white" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 text-white font-poppins">Guest Portal</h2>
                    <p className="text-blue-100 text-lg font-medium leading-relaxed">
                      Request temporary access to properties securely and instantly.
                    </p>
                  </div>
                </Card>
              </Link>
            </motion.div>

            {/* Owner Portal Card - Updated to Emerald Green (#10B981) */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} className="h-full relative z-30">
              <Link 
                to="/owner/login" 
                onClick={handleOwnerLog}
                className="block h-full w-full cursor-pointer rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all"
                style={{ pointerEvents: 'auto' }}
              >
                <Card className="h-full border-0 shadow-2xl overflow-hidden group bg-[#10B981] pointer-events-none transition-colors duration-300">
                  {/* Hover overlay using a lighter Emerald Green shade (#34D399) via opacity */}
                  <div className="absolute inset-0 bg-[#34D399]/0 group-hover:bg-[#34D399]/20 transition-colors duration-300" />
                  <div className="p-12 text-center relative z-10">
                    <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30 group-hover:-rotate-6 transition-transform duration-500">
                      <Key className="w-16 h-16 text-white" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 text-white font-poppins">Owner Portal</h2>
                    <p className="text-emerald-50 text-lg font-medium leading-relaxed">
                      Manage devices, approve requests, and view detailed access logs.
                    </p>
                  </div>
                </Card>
              </Link>
            </motion.div>

          </div>
        </motion.div>
      </div>
    </>
  );
};

export default RoleSelection;