
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Lock, LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';

const OwnerDashboardHeader = ({ lockboxState }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/owner-login');
  };

  return (
    <header className="bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/30 shadow-inner">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight font-poppins tracking-wide">Owner Dashboard</h1>
            <p className="text-sm text-teal-100 font-medium">SmartLock_123</p>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          <div className="hidden md:flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl border border-white/20 backdrop-blur-sm">
             <div className="bg-white/20 p-1.5 rounded-full">
               <User className="w-4 h-4 text-white" />
             </div>
             <span className="text-sm font-medium text-white">
               owner@example.com
             </span>
          </div>

          <div className="flex items-center gap-3">
             {lockboxState && (
                <div className="hidden sm:flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full mr-2 border border-white/30 backdrop-blur-md">
                  <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${lockboxState.state === 'UNLOCKED' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {lockboxState.state}
                  </span>
                </div>
             )}
             
            <Button 
              onClick={handleLogout} 
              className="bg-white text-teal-700 hover:bg-teal-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 font-semibold rounded-xl"
            >
              <LogOut className="w-4 h-4" /> 
              Logout
            </Button>
          </div>
        </motion.div>
      </div>
    </header>
  );
};

export default OwnerDashboardHeader;
