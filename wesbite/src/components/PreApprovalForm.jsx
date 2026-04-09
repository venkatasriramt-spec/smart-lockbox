
import React, { useState, useEffect } from 'react';
import { ref, push, set, update, get, serverTimestamp } from 'firebase/database';
import { database } from '@/config/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Calendar, Clock, User, Phone, Save } from 'lucide-react';
import Modal from '@/components/ui/modal';

const PreApprovalForm = ({ isOpen, onClose, lockboxId, initialData = null }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    approvalDate: '',
    duration: '0'
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const rawPhone = initialData.phone || initialData.guestPhone || '';
        const displayPhone = rawPhone.replace(/^\+91/, '');
        
        setFormData({
          name: initialData.name || initialData.guestName || '',
          phone: displayPhone,
          approvalDate: initialData.approvalDate || '',
          duration: initialData.duration || '0'
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          name: '',
          phone: '',
          approvalDate: today,
          duration: '0'
        });
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 10) {
        setFormData(prev => ({ ...prev, [name]: digitsOnly }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Guest name is required", variant: "destructive" });
      return false;
    }
    
    if (!/^\d{10}$/.test(formData.phone)) {
      toast({ title: "Error", description: "Please enter only 10-digit phone number", variant: "destructive" });
      return false;
    }

    if (!formData.approvalDate) {
      toast({ title: "Error", description: "Date is required", variant: "destructive" });
      return false;
    }

    const today = new Date().toISOString().split('T')[0];
    if (formData.approvalDate < today) {
       toast({ title: "Error", description: "Approval date cannot be in the past", variant: "destructive" });
       return false;
    }

    if (!formData.duration || parseInt(formData.duration) <= 0) {
      toast({ title: "Error", description: "Duration must be valid and greater than 0", variant: "destructive" });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const formattedPhone = `+91${formData.phone}`;
      
      const payload = {
        name: formData.name,
        phone: formattedPhone,
        approvalDate: formData.approvalDate,
        duration: parseInt(formData.duration),
        updatedAt: serverTimestamp()
      };

      if (initialData && initialData.id) {
        const itemRef = ref(database, `lockboxes/${lockboxId}/preApprovals/${initialData.id}`);
        const snapshot = await get(itemRef);

        if (!snapshot.exists()) {
          throw new Error("This pre-approval no longer exists (it may have been used or expired).");
        }

        await update(itemRef, payload);
        toast({ title: "Success", description: "Pre-approval updated successfully." });
      } else {
        const listRef = ref(database, `lockboxes/${lockboxId}/preApprovals`);
        const newItemRef = push(listRef);
        await set(newItemRef, {
          ...payload,
          createdAt: serverTimestamp(),
          status: 'ACTIVE'
        });
        toast({ title: "Success", description: `✅ Pre-approval created: ${formData.name} on ${formData.approvalDate}` });
      }

      onClose();
    } catch (error) {
      console.error("Submission Error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Edit Pre-Approval" : "New Pre-Approval"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400"
              placeholder="John Doe"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-gray-900 placeholder-gray-400"
              placeholder="Enter 10-digit phone number"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="date"
                name="approvalDate"
                value={formData.approvalDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="0"
                className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PreApprovalForm;
