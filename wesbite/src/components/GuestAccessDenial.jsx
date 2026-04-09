
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CopyX as KeyX, PhoneCall } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GuestAccessDenial = ({ ownerPhone = "+91 1234567890" }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-red-500 shadow-red-500/20 shadow-2xl bg-red-50/50 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 shadow-inner">
          <KeyX className="w-10 h-10" />
        </div>
        
        <h2 className="text-2xl font-black text-red-700 mb-2 flex items-center justify-center gap-2">
          <AlertTriangle className="w-6 h-6" /> Access Unavailable
        </h2>
        
        <p className="text-red-900/80 mb-6 font-medium">
          The key is currently not available in the lockbox. 
          The previous user may not have returned it, or the owner has removed it.
        </p>

        <div className="bg-white rounded-lg p-4 border border-red-200 mb-8 shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Please contact the owner to resolve this issue:</p>
          <a href={`tel:${ownerPhone}`} className="flex items-center justify-center gap-2 text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors font-mono">
            <PhoneCall className="w-5 h-5 text-gray-400" />
            {ownerPhone}
          </a>
        </div>

        <Button 
          variant="outline"
          className="w-full border-red-300 text-red-700 hover:bg-red-50"
          onClick={() => navigate('/')}
        >
          Return to Home
        </Button>
      </Card>
    </div>
  );
};

export default GuestAccessDenial;
