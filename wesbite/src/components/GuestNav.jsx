import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, History, LogOut, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const GuestNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, phoneVerified } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged out successfully',
        description: 'See you next time!'
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const navItems = [
    { path: '/guest/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/guest/history', icon: History, label: 'History' }
  ];

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Guest Portal
            </h1>
            <div className="flex space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {phoneVerified ? (
              <span className="flex items-center px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-200">
                <ShieldCheck className="w-4 h-4 mr-1" />
                Phone Verified
              </span>
            ) : (
              <Link 
                to="/guest/verify-phone"
                className="flex items-center px-3 py-1 bg-yellow-50 text-yellow-700 text-sm font-medium rounded-full border border-yellow-200 hover:bg-yellow-100 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                Verify Phone
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default GuestNav;