import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Mail, Lock, Key, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { checkFirebaseConnection, getReadableAuthError } from '@/utils/firebaseStatus';

const OwnerLogin = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login, signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check connection on mount
    const status = checkFirebaseConnection();
    if (!status.isReady) {
      setError(status.error);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const status = checkFirebaseConnection();
    if (!status.isReady) {
      setError(status.error);
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        await signup(email, password, 'owner');
        toast({
          title: 'Account created!',
          description: 'Welcome to the owner portal'
        });
      } else {
        await login(email, password);
        toast({
          title: 'Welcome back!',
          description: 'Successfully logged in'
        });
      }
      navigate('/owner/dashboard');
    } catch (authError) {
      const errorMessage = getReadableAuthError(authError);
      setError(errorMessage);
      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Owner Login - Lockbox Management</title>
        <meta name="description" content="Login to manage lockbox access requests" />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to portal selection</span>
          </button>

          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-purple-600 flex items-center justify-center">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2">
                {isSignUp ? 'Create Owner Account' : 'Owner Login'}
              </h1>
              <p className="text-gray-600">
                {isSignUp ? 'Sign up to manage your lockboxes' : 'Welcome back! Please login to continue'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-purple-600 hover:from-green-600 hover:to-purple-700 text-white py-3 rounded-lg font-medium transition-all duration-200"
              >
                {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Login')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-green-600 hover:text-green-700 font-medium transition-colors"
                disabled={loading}
              >
                {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default OwnerLogin;