import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const ProtectedOwnerRoute = ({ children }) => {
  const { isOwnerLoggedIn } = useAuth();

  if (!isOwnerLoggedIn) {
    return <Navigate to="/owner-login" replace />;
  }

  return children;
};

export default ProtectedOwnerRoute;