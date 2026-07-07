import React from 'react';
import Modal from '@/components/ui/modal';
import PhoneVerification from '@/components/PhoneVerification';

const PhoneVerificationModal = ({ isOpen, onClose, onSuccess }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verify Your Phone"
      className="max-w-md"
    >
      <div className="mt-2">
        <PhoneVerification onSuccess={onSuccess} />
      </div>
    </Modal>
  );
};

export default PhoneVerificationModal;