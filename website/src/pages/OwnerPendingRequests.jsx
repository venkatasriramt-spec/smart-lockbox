import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ref, onValue, update, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { CheckCircle, XCircle, ArrowLeft, ShieldCheck, Phone } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OwnerNav from '@/components/OwnerNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Modal from '@/components/ui/modal';

const OwnerPendingRequests = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalType, setModalType] = useState(null);
  const { lockbox } = location.state || {};

  useEffect(() => {
    if (!lockbox) {
      navigate('/owner/dashboard');
      return;
    }

    const requestsRef = ref(database, `lockboxes/${lockbox.id}/requests`);
    const unsubscribe = onValue(requestsRef, async (snapshot) => {
      const data = snapshot.val();
      const pendingRequests = [];

      if (data) {
        // Use Promise.all to fetch guest phone numbers if not in request
        const entries = Object.entries(data);
        for (const [id, request] of entries) {
          if (request.status === 'PENDING') {
            // Check verification requirement (filter only verified phones per Task 7)
            if (request.verifiedPhone) {
              // Fetch user phone if not directly in request (optional, but good for completeness)
              let phone = request.guestPhone;
              if (!phone && request.guestUid) {
                 const userSnapshot = await get(ref(database, `users/${request.guestUid}`));
                 phone = userSnapshot.val()?.phoneNumber;
              }
              
              pendingRequests.push({ 
                id, 
                ...request, 
                displayPhone: phone 
              });
            }
          }
        }
      }

      pendingRequests.sort((a, b) => a.timestamp - b.timestamp);
      setRequests(pendingRequests);
    });

    return () => unsubscribe();
  }, [lockbox, navigate]);

  const handleAction = async (approve) => {
    if (!selectedRequest) return;

    try {
      const requestRef = ref(database, `lockboxes/${lockbox.id}/requests/${selectedRequest.id}`);
      await update(requestRef, {
        status: approve ? 'APPROVED' : 'REJECTED',
        [approve ? 'approvedAt' : 'rejectedAt']: Date.now()
      });

      toast({
        title: approve ? 'Request Approved' : 'Request Rejected',
        description: `Access request has been ${approve ? 'approved' : 'rejected'}`
      });

      setModalType(null);
      setSelectedRequest(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Pending Requests - Owner Portal</title>
        <meta name="description" content="Review and manage pending lockbox access requests" />
      </Helmet>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <OwnerNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => navigate('/owner/dashboard')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Dashboard</span>
                </button>
                <h1 className="text-3xl font-bold mb-2">Pending Requests</h1>
                <p className="text-gray-600">{lockbox?.name} - {lockbox?.address}</p>
              </div>
            </div>

            {requests.length === 0 ? (
              <Card className="text-center py-12">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">No pending requests</h3>
                <p className="text-gray-600">All verifiable requests have been processed</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-xl transition-shadow border-l-4 border-l-blue-500">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold">{request.guestName}</h3>
                              <Badge className="bg-green-100 text-green-800 flex items-center gap-1 border-green-200">
                                <ShieldCheck className="w-3 h-3" />
                                Verified Phone
                              </Badge>
                            </div>
                            <Badge variant="pending">PENDING</Badge>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <span className="text-gray-600 text-sm flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Phone:
                              </span>
                              <p className="font-medium font-mono">{request.displayPhone || 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600 text-sm">Duration:</span>
                              <p className="font-medium">{request.duration} hours</p>
                            </div>
                            <div className="md:col-span-2">
                              <span className="text-gray-600 text-sm">Reason:</span>
                              <p className="font-medium">{request.reason}</p>
                            </div>
                            <div>
                              <span className="text-gray-600 text-sm">Requested:</span>
                              <p className="font-medium">
                                {new Date(request.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button
                              onClick={() => {
                                setSelectedRequest(request);
                                setModalType('approve');
                              }}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedRequest(request);
                                setModalType('reject');
                              }}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <Modal
        isOpen={modalType === 'approve'}
        onClose={() => {
          setModalType(null);
          setSelectedRequest(null);
        }}
        title="Approve Request"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to approve access for <strong>{selectedRequest?.guestName}</strong>?
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => handleAction(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
            >
              Approve
            </Button>
            <Button
              onClick={() => {
                setModalType(null);
                setSelectedRequest(null);
              }}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalType === 'reject'}
        onClose={() => {
          setModalType(null);
          setSelectedRequest(null);
        }}
        title="Reject Request"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to reject access for <strong>{selectedRequest?.guestName}</strong>?
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => handleAction(false)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              Reject
            </Button>
            <Button
              onClick={() => {
                setModalType(null);
                setSelectedRequest(null);
              }}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default OwnerPendingRequests;