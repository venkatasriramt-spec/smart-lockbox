
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { checkFirebaseConfigStatus } from '@/utils/firebaseStatus';
import ProtectedOwnerRoute from '@/components/ProtectedOwnerRoute';
import ProtectedGuestRoute from '@/components/ProtectedGuestRoute';
import RoleSelection from '@/pages/RoleSelection';
import FirebaseDebugPanel from '@/components/FirebaseDebugPanel';

// Guest Flow
import GuestPortal from '@/pages/GuestPortal';
import GuestInfoForm from '@/components/GuestInfoForm';
import GuestPhoneVerification from '@/components/GuestPhoneVerification';
import GuestWaitingScreen from '@/pages/GuestWaitingScreen';
import GuestAccessSession from '@/pages/GuestAccessSession';
import BoxClosedByOwner from '@/pages/BoxClosedByOwner';

// Owner Flow
import OwnerLoginSimple from '@/pages/OwnerLoginSimple';
import OwnerPendingRequestsComplete from '@/pages/OwnerPendingRequestsComplete';
import RequestHistory from '@/pages/RequestHistory';

function App() {
  useEffect(() => {
    const configStatus = checkFirebaseConfigStatus();
    if (!configStatus.isReady) {
      console.error('❌ Application Startup Error: Firebase not ready', configStatus.error);
    } else {
      console.log('✅ Application Startup: Firebase Config Validated');
    }
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RoleSelection />} />
          
          {/* Guest Flow Routes */}
          <Route path="/guest-portal" element={<GuestPortal />} />
          <Route path="/box-closed-by-owner" element={<BoxClosedByOwner />} />
          
          {/* Backward compatibility aliases */}
          <Route path="/guest/lockbox-id" element={<Navigate to="/guest-portal" replace />} />
          <Route path="/lockbox-id-input" element={<Navigate to="/guest-portal" replace />} />
          <Route path="/guest-info" element={<Navigate to="/guest/info" replace />} />
          <Route path="/guest-phone-verification" element={<Navigate to="/guest/verify" replace />} />
          <Route path="/guest-waiting-screen" element={<Navigate to="/guest/waiting" replace />} />
          <Route path="/guest-session" element={<Navigate to="/guest/access" replace />} />

          {/* Standardized Guest Flow Routes */}
          <Route 
            path="/guest/info" 
            element={
              <ProtectedGuestRoute>
                <GuestInfoForm />
              </ProtectedGuestRoute>
            } 
          />
          <Route 
            path="/guest/verify" 
            element={
              <ProtectedGuestRoute>
                <GuestPhoneVerification />
              </ProtectedGuestRoute>
            } 
          />
          {/* Waiting screen is not protected so users can view the error state if redirected */}
          <Route path="/guest/waiting" element={<GuestWaitingScreen />} />
          <Route 
            path="/guest/access" 
            element={
              <ProtectedGuestRoute>
                <GuestAccessSession />
              </ProtectedGuestRoute>
            } 
          />

          {/* Owner Flow Routes */}
          <Route path="/owner/login" element={<OwnerLoginSimple />} />
          <Route path="/owner-login" element={<Navigate to="/owner/login" replace />} />
          
          {/* Protected Owner Dashboard */}
          <Route 
            path="/owner/dashboard" 
            element={
              <ProtectedOwnerRoute>
                <OwnerPendingRequestsComplete />
              </ProtectedOwnerRoute>
            } 
          />
          <Route path="/owner-dashboard" element={<Navigate to="/owner/dashboard" replace />} />
          
          {/* Protected Owner Request History */}
          <Route 
            path="/owner/history" 
            element={
              <ProtectedOwnerRoute>
                <RequestHistory />
              </ProtectedOwnerRoute>
            } 
          />
          <Route path="/owner-dashboard/request-history" element={<Navigate to="/owner/history" replace />} />

          {/* Catch all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
        <FirebaseDebugPanel />
      </Router>
    </AuthProvider>
  );
}

export default App;
