
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { Filter } from 'lucide-react';
import OwnerNav from '@/components/OwnerNav';
import { Card } from '@/components/ui/card';
import Badge from '@/components/ui/badge';
import { maskIndianPhoneNumber } from '@/utils/phoneUtils';

const OwnerHistory = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('All');
  const { currentUser } = useAuth();

  useEffect(() => {
    const lockboxesRef = ref(database, 'lockboxes');
    const unsubscribe = onValue(lockboxesRef, (snapshot) => {
      const data = snapshot.val();
      const allRequests = [];

      if (data) {
        Object.entries(data).forEach(([lockboxId, lockbox]) => {
          if (lockbox.ownerId === currentUser?.uid && lockbox.requests) {
            Object.entries(lockbox.requests).forEach(([requestId, request]) => {
              if (request.status !== 'PENDING') {
                allRequests.push({
                  id: requestId,
                  lockboxId,
                  lockboxName: lockbox.name,
                  ...request
                });
              }
            });
          }
        });
      }

      allRequests.sort((a, b) => {
        const timeA = a.approvedAt || a.rejectedAt || a.timestamp;
        const timeB = b.approvedAt || b.rejectedAt || b.timestamp;
        return timeB - timeA;
      });
      setRequests(allRequests);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const filteredRequests = requests.filter(request => {
    if (filter === 'All') return true;
    return request.status === filter.toUpperCase();
  });

  return (
    <>
      <Helmet>
        <title>Request History - Owner Portal</title>
        <meta name="description" content="View all processed lockbox access requests" />
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
                <h1 className="text-3xl font-bold mb-2">Request History</h1>
                <p className="text-gray-600">View all processed access requests</p>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900"
                >
                  <option>All</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <Card className="text-center py-12">
                <h3 className="text-xl font-semibold mb-2 text-gray-900">No requests found</h3>
                <p className="text-gray-600">
                  {filter === 'All' 
                    ? 'No processed requests yet' 
                    : `No ${filter.toLowerCase()} requests found`}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-xl transition-shadow p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">{request.guestName}</h3>
                            <Badge variant={request.status.toLowerCase()}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-3">{request.lockboxName}</p>
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Phone:</span>
                              <span className="ml-2 font-mono font-bold text-gray-800">{maskIndianPhoneNumber(request.guestPhone || request.phone)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Duration:</span>
                              <span className="ml-2 font-medium">{request.duration} mins</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Reason:</span>
                              <span className="ml-2 font-medium">{request.reason}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Requested:</span>
                              <span className="ml-2 font-medium">
                                {new Date(request.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Processed:</span>
                              <span className="ml-2 font-medium">
                                {new Date(request.approvedAt || request.rejectedAt).toLocaleDateString()}
                              </span>
                            </div>
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
    </>
  );
};

export default OwnerHistory;
