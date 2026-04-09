
import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { database } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit2, Calendar, Phone, Clock, User, Activity, AlertCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { maskIndianPhoneNumber } from '@/utils/phoneUtils';
import { checkAndMarkExpiredPreApprovals, isPreApprovalExpired } from '@/utils/preApprovalUtils';
import { motion, AnimatePresence } from 'framer-motion';

const PreApprovalsList = ({ lockboxId, onEdit }) => {
  const [preApprovals, setPreApprovals] = useState([]);
  const [lockboxState, setLockboxState] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const { toast } = useToast();

  useEffect(() => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  }, []);

  useEffect(() => {
    if (!lockboxId) {
      setLoading(false);
      return;
    }

    checkAndMarkExpiredPreApprovals(lockboxId).catch(console.error);

    const path = `lockboxes/${lockboxId}/preApprovals`;
    const preApprovalsRef = ref(database, path);

    try {
      const unsubscribePreApprovals = onValue(preApprovalsRef, (snapshot) => {
        try {
          if (snapshot.exists()) {
            const data = snapshot.val();
            checkAndMarkExpiredPreApprovals(lockboxId).catch(console.error);

            const list = Object.entries(data)
              .map(([id, val]) => ({ id, ...val }))
              .filter(item => item.status !== 'EXPIRED' && !isPreApprovalExpired(item.approvalDate));
            
            list.sort((a, b) => new Date(a.approvalDate) - new Date(b.approvalDate));
            setPreApprovals(list);
          } else {
            setPreApprovals([]);
          }
          setError(null);
        } catch (err) {
          console.error('Error processing pre-approvals snapshot:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }, (error) => {
        console.error('Error fetching pre-approvals:', error);
        setError(error.message);
        setLoading(false);
      });

      const lockboxStateRef = ref(database, `lockboxes/${lockboxId}/lockbox`);
      const unsubscribeLockbox = onValue(lockboxStateRef, (snapshot) => {
        setLockboxState(snapshot.val());
      });

      return () => {
        unsubscribePreApprovals();
        unsubscribeLockbox();
      };
    } catch (err) {
      console.error('Error setting up Firebase listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [lockboxId]);

  useEffect(() => {
    if (!lockboxId || !lockboxState || lockboxState.state !== 'UNLOCKED' || !lockboxState.activeRequestId) {
      setActiveRequest(null);
      return;
    }

    const requestRef = ref(database, `lockboxes/${lockboxId}/requests/${lockboxState.activeRequestId}`);
    const unsubscribeRequest = onValue(requestRef, (snapshot) => {
      setActiveRequest(snapshot.val());
    });

    return () => unsubscribeRequest();
  }, [lockboxId, lockboxState]);

  const currentSession = useMemo(() => {
    if (!lockboxState || !activeRequest) return null;
    
    const now = Date.now();
    if (lockboxState.state === 'UNLOCKED' && lockboxState.unlockedUntil > now) {
      return {
        name: activeRequest.name || activeRequest.guestName,
        phone: activeRequest.phone || activeRequest.guestPhone
      };
    }
    return null;
  }, [lockboxState, activeRequest]);

  const handleDeleteClick = (id, name) => {
    setItemToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      await remove(ref(database, `lockboxes/${lockboxId}/preApprovals/${itemToDelete.id}`));
      toast({ title: "Deleted", description: `🗑️ Pre-approval deleted: ${itemToDelete.name}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const isPreApprovalActive = (item) => {
    if (!currentSession) return false;
    const itemName = item.guestName || item.name;
    const itemPhone = item.guestPhone || item.phone;
    return itemPhone === currentSession.phone && itemName === currentSession.name;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-purple-600 font-bold">Loading pre-approvals...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-bold text-lg">Failed to load pre-approvals</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (preApprovals.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-purple-200 rounded-xl bg-purple-50/50">
        <User className="w-12 h-12 text-purple-300 mx-auto mb-3" />
        <p className="text-purple-600 font-bold text-lg">No active pre-approvals</p>
        <p className="text-sm text-purple-400 mt-1">Add a new guest to grant them future access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {deleteConfirmOpen && itemToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border-0 p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 font-poppins">Delete Pre-Approval?</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                This will permanently delete the pre-approval for <strong className="text-gray-900">{itemToDelete.name}</strong>. If they have an active session, they will be locked out immediately.
              </p>
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 py-7 rounded-xl font-bold text-lg border-2 border-gray-200 hover:bg-gray-50" 
                  onClick={cancelDelete}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 py-7 rounded-xl font-black text-lg shadow-xl shadow-red-500/30" 
                  onClick={confirmDelete}
                >
                  Yes, Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-xl">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              <th scope="col" className="py-4 pl-4 pr-3 text-left text-sm font-bold text-gray-900 w-1/5">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-500" /> Guest</div>
              </th>
              <th scope="col" className="px-3 py-4 text-left text-sm font-bold text-gray-900 w-1/5">
                <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-500" /> Phone</div>
              </th>
              <th scope="col" className="px-3 py-4 text-left text-sm font-bold text-gray-900 w-1/6">
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500" /> Date</div>
              </th>
              <th scope="col" className="px-3 py-4 text-left text-sm font-bold text-gray-900 w-1/6">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> Duration</div>
              </th>
              <th scope="col" className="px-3 py-4 text-left text-sm font-bold text-gray-900 w-1/6">
                <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-gray-500" /> Status</div>
              </th>
              <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6 w-1/6 text-right text-sm font-bold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {preApprovals.map((item) => {
              const isActive = isPreApprovalActive(item);
              const rawName = item.guestName || item.name || item.guest_name || item.GuestName;
              const displayName = rawName ? String(rawName).trim() : 'Unknown Guest';
              
              const rawPhone = item.guestPhone || item.phone || item.guest_phone || item.GuestPhone;
              const displayPhone = rawPhone ? String(rawPhone).trim() : '';

              return (
                <tr key={item.id} className="hover:bg-purple-50/50 transition-colors group">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {displayName}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600">
                    {displayPhone ? (
                      <span className="font-mono font-bold">{maskIndianPhoneNumber(displayPhone)}</span>
                    ) : (
                      <span className="text-gray-400 italic font-medium">No phone</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600 font-bold">
                    {item.approvalDate ? (
                      new Date(item.approvalDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                    ) : (
                      <span className="text-gray-400 italic">No date</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 shadow-sm font-black">
                       {item.duration || 0} mins
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {isActive ? (
                      <Badge variant="secondary" className="bg-[#059669] text-white border-0 shadow-sm font-black">
                        Active Now
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 bg-gray-100 border-gray-200 font-bold">
                        Pending
                      </Badge>
                    )}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end gap-2 transition-opacity opacity-80 group-hover:opacity-100">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => !isActive && onEdit(item)}
                        disabled={isActive}
                        title={isActive ? "This pre-approval is currently active and cannot be modified" : "Edit pre-approval"}
                        className={`h-9 w-9 p-0 rounded-lg ${isActive ? 'cursor-not-allowed text-gray-400 bg-transparent hover:bg-transparent hover:text-gray-400' : 'text-purple-600 hover:text-purple-700 hover:bg-purple-100'}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => !isActive && handleDeleteClick(item.id, displayName)}
                        disabled={isActive}
                        title={isActive ? "This pre-approval is currently active and cannot be modified" : "Delete pre-approval"}
                        className={`h-9 w-9 p-0 rounded-lg ${isActive ? 'cursor-not-allowed text-gray-400 bg-transparent hover:bg-transparent hover:text-gray-400' : 'text-red-600 hover:text-red-700 hover:bg-red-100'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PreApprovalsList;
