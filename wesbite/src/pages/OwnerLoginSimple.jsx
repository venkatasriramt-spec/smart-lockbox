
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Lock, KeyRound, ArrowLeft, AlertCircle, Loader, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const OwnerLoginSimple = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  
  const { hardcodedLogin, setOwnerLoggedIn, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDemoLogin = () => {
    setEmail('owner@example.com');
    setPassword('123');
    setError(null);
    toast({
      title: "Demo Credentials Loaded",
      description: "Click 'Authorize Access' to continue.",
      className: "bg-indigo-600 text-white border-none"
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Simple hardcoded credential validation exactly as requested
    if (email === "owner@example.com" && password === "123") {
      try {
        await hardcodedLogin(email, password);
        setOwnerLoggedIn(true);
        toast({ 
          title: 'Access Granted', 
          description: 'Welcome to your dashboard.', 
          className: "bg-[#059669] text-white border-none" 
        });
        navigate('/owner-dashboard');
      } catch (err) {
        setError("Invalid email or password");
        toast({ 
          title: 'Login Failed', 
          description: "Invalid email or password", 
          variant: 'destructive' 
        });
      }
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <>
      <Helmet>
        <title>Owner Access - Smart Lock</title>
        <meta name="description" content="Secure login for lockbox owners to manage access and devices." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-[#EA580C] to-[#EC4899] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-[100px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }} 
          className="w-full max-w-md z-10"
        >
          
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-[#0891B2] hover:text-[#0369a1] mb-8 transition-colors font-semibold text-lg bg-white/90 px-4 py-2 rounded-full shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Portal
          </button>

          <Card className="p-8 sm:p-10 bg-white shadow-2xl rounded-3xl relative overflow-hidden border-0">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[#EA580C] to-[#EC4899]" />
            
            <div className="text-center mb-10">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#059669] flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
                <KeyRound className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-gray-900 font-poppins">
                System Control
              </h1>
              <p className="text-gray-700 font-medium text-base">
                Authenticate to manage your lockboxes
              </p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm font-bold"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0891B2] transition-colors" />
                  <input
                    type="email" 
                    value={email} 
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[#0891B2] focus:ring-4 focus:ring-[#0891B2]/20 transition-all text-gray-900 font-bold outline-none placeholder:text-gray-400"
                    placeholder="admin@example.com" 
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Secure Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0891B2] transition-colors" />
                  <input
                    type="password" 
                    value={password} 
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-[#0891B2] focus:ring-4 focus:ring-[#0891B2]/20 transition-all text-gray-900 font-bold outline-none placeholder:text-gray-400"
                    placeholder="••••••••" 
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col items-center pt-2">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="px-6 py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 font-bold rounded-full transition-all flex items-center justify-center gap-2 group text-sm shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                  Demo ID: owner@example.com
                </button>
              </div>

              <Button
                type="submit" 
                disabled={loading}
                className="w-full py-7 text-base font-bold bg-[#EA580C] hover:bg-[#c2410c] text-white rounded-xl shadow-lg shadow-[#EA580C]/20 transition-all duration-300 transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader className="w-6 h-6 animate-spin text-white" /> : <span className="text-white">Authorize Access</span>}
              </Button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
              <p className="text-xs sm:text-sm font-semibold text-gray-500">
                Authorized access only. Use system credentials to manage your hardware.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default OwnerLoginSimple;
