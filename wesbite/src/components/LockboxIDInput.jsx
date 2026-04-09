
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const LockboxIDInput = () => {
  const [lockboxId, setLockboxId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!lockboxId.trim()) {
      setError('Please enter a valid Lockbox ID');
      return;
    }
    // Navigate securely to the next step in the flow (GuestInfoForm)
    // ProtectedGuestRoute will intercept this, verify key presence, 
    // and either allow access to /guest/info or redirect to /guest/waiting with an error
    navigate('/guest/info', { state: { lockboxId: lockboxId.trim() } });
  };

  const handleDemoClick = (e) => {
    e.preventDefault();
    setLockboxId('SmartLock_123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EA580C] to-[#EC4899] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="bg-slate-900 shadow-2xl rounded-[16px] p-8 border border-slate-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner border border-slate-700">
              <Lock className="w-8 h-8 text-white drop-shadow-md" />
            </div>
            <h1 className="text-[28px] font-bold text-white font-poppins mb-2">Identify Lockbox</h1>
            <p className="text-slate-400 font-inter">Enter the unique ID found on the device</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2 font-inter">
                Lockbox ID
              </label>
              <input
                type="text"
                value={lockboxId}
                onChange={(e) => {
                  setLockboxId(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. SmartLock_123"
                className={`w-full px-4 py-3 bg-slate-800 border-2 rounded-[12px] text-[16px] text-white placeholder:text-slate-500 focus:outline-none transition-all ${
                  error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-[#EA580C] focus:bg-slate-950'
                }`}
              />
              <div className="text-center mt-3">
                <button 
                  onClick={handleDemoClick}
                  type="button"
                  className="text-xs text-slate-400 font-bold hover:text-white transition-colors bg-slate-800 px-4 py-1.5 rounded-full border border-slate-700 shadow-sm"
                >
                  Demo ID: SmartLock_123
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-2 font-bold text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
            </div>

            <Button 
              onClick={handleContinue}
              className="w-full py-6 text-lg font-bold bg-[#059669] hover:bg-[#047857] text-white rounded-[12px] transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-0"
            >
              Continue to Request
            </Button>

            <div className="text-center mt-6">
              <button 
                onClick={() => navigate('/')}
                className="text-slate-400 font-bold hover:text-white flex items-center justify-center mx-auto gap-2 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Portals
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LockboxIDInput;
