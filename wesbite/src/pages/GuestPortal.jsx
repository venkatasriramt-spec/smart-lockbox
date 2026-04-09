import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import LockboxIDInput from '@/components/LockboxIDInput';

const GuestPortal = () => {
  useEffect(() => {
    console.log('[GuestPortal] Component mounted successfully.');
  }, []);

  return (
    <>
      <Helmet>
        <title>Guest Portal - Access Request</title>
        <meta name="description" content="Enter your lockbox ID to request secure access." />
      </Helmet>
      {/* 
        The LockboxIDInput component contains the full-screen layout 
        for the guest entry point, so we simply render it here.
      */}
      <LockboxIDInput />
    </>
  );
};

export default GuestPortal;