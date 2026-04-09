import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';

const LockboxSelector = ({ onSelect, selectedLockbox }) => {
  const [lockboxes, setLockboxes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lockboxesRef = ref(database, 'lockboxes');
    const unsubscribe = onValue(lockboxesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lockboxArray = Object.entries(data).map(([id, value]) => ({
          id,
          ...value
        }));
        setLockboxes(lockboxArray);
      } else {
        setLockboxes([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="text-center py-8">Loading lockboxes...</div>;
  }

  if (lockboxes.length === 0) {
    return (
      <Card className="text-center py-12">
        <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold mb-2 text-gray-900">No lockboxes available</h3>
        <p className="text-gray-600">Please check back later</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Select a Lockbox</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {lockboxes.map((lockbox, index) => (
          <motion.div
            key={lockbox.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-200 ${
                selectedLockbox?.id === lockbox.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:shadow-xl'
              }`}
              onClick={() => onSelect(lockbox)}
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">{lockbox.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{lockbox.address}</p>
                  {lockbox.description && (
                    <p className="text-gray-500 text-sm">{lockbox.description}</p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LockboxSelector;