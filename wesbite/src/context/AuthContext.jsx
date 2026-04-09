
import React, { createContext, useContext, useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { formatIndianPhoneNumber } from '@/utils/phoneUtils';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwnerLoggedIn, setIsOwnerLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestData, setGuestData] = useState({
    lockboxId: '',
    name: '',
    phone: '',
    reason: '',
    duration: '',
    requestId: null
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('smartlock_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      if (user.role === 'owner') {
        setIsOwnerLoggedIn(true);
      }
    }
  }, []);

  const hardcodedLogin = async (email, password) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    if (email === "owner@example.com" && password === "123") {
      const user = {
        uid: "owner_hardcoded",
        email: email,
        role: "owner",
        name: "Owner"
      };
      setCurrentUser(user);
      localStorage.setItem('smartlock_user', JSON.stringify(user));
      setLoading(false);
      return user;
    } else {
      setLoading(false);
      throw new Error("Invalid email or password");
    }
  };

  const setOwnerLoggedIn = (status) => {
    setIsOwnerLoggedIn(status);
  };

  const startGuestFlow = () => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user = {
      uid: guestId,
      role: "guest",
      isAnonymous: true
    };
    setCurrentUser(user);
    localStorage.setItem('smartlock_user', JSON.stringify(user));
    return user;
  };

  const updateGuestData = (data) => {
    const validatedData = { ...data };
    
    if (validatedData.phone) {
      try {
        validatedData.phone = formatIndianPhoneNumber(validatedData.phone);
        console.log('AuthContext: Guest phone data strictly formatted to +91:', validatedData.phone);
      } catch (error) {
        console.error('AuthContext Phone Validation Error:', error.message);
        delete validatedData.phone;
      }
    }

    setGuestData(prev => ({ ...prev, ...validatedData }));
  };

  const clearGuestData = () => {
    console.log('AuthContext: Clearing guest data state completely (e.g., after request cancellation)');
    setGuestData({
      lockboxId: '',
      name: '',
      phone: '',
      reason: '',
      duration: '',
      requestId: null
    });
  };

  const logout = async () => {
    try {
      if (auth) await signOut(auth);
    } catch (e) {
      console.error("Firebase signout error", e);
    }
    setCurrentUser(null);
    setIsOwnerLoggedIn(false);
    clearGuestData();
    localStorage.removeItem('smartlock_user');
  };

  const setPhoneVerified = async (verified, phoneNumber) => {
     updateGuestData({ phone: phoneNumber, phoneVerified: verified });
  };

  const value = {
    currentUser,
    isOwnerLoggedIn,
    setOwnerLoggedIn,
    loading,
    guestData,
    updateGuestData,
    clearGuestData,
    hardcodedLogin,
    startGuestFlow,
    logout,
    setPhoneVerified
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
