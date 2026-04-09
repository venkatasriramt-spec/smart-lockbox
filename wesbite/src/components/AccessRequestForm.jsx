
import React, { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { database } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { User, Phone, MessageSquare, Clock, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const AccessRequestForm = ({ lockbox, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    reason: '',
    duration: ''
  });
  const [loading, setLoading] = useState(false);
  const { currentUser, phoneVerified } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneVerified) {
      toast({
        title: "Verification Required",
        description: "Please verify your phone number before submitting a request.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const requestsRef = ref(database, `lockboxes/${lockbox.id}/requests`);
      const newRequestRef = push(requestsRef);
      
      const timestamp = Date.now();
      
      await set(newRequestRef, {
        guestId: currentUser.uid,
        guestName: formData.name,
        verifiedPhone: true, 
        reason: formData.reason,
        duration: parseInt(formData.duration),
        status: 'PENDING',
        closedByOwner: false,
        timestamp: timestamp,
        createdAt: timestamp,
        guestUid: currentUser.uid,
        lockboxName: lockbox.name,
        lockboxAddress: lockbox.address
      });

      toast({
        title: 'Request submitted!',
        description: 'Please wait for owner approval'
      });

      onSuccess(newRequestRef.key);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!phoneVerified) {
    return (
      <Card className="p-6 border-yellow-200 bg-yellow-50">
        <div className="flex items-center gap-4 mb-4">
          <ShieldAlert className="w-8 h-8 text-yellow-600" />
          <div>
            <h3 className="text-lg font-bold text-yellow-800">Verification Required</h3>
            <p className="text-yellow-700">You must verify your phone number to request access.</p>
          </div>
        </div>
        <Link to="/guest/verify-phone">
          <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
            Verify Phone Number
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-6">Request Access</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
              placeholder="Enter your full name"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Access</label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-900"
              placeholder="Explain why you need access"
              rows="4"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
              placeholder="How many hours do you need?"
              min="1"
              max="24"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 rounded-lg font-medium transition-all duration-200"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>
      </form>
    </Card>
  );
};

export default AccessRequestForm;
