
import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/config/firebase';
import { maskIndianPhoneNumber } from '@/utils/phoneUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RecentPreApprovals = ({ lockboxId, onEdit }) => {
  const [preApprovals, setPreApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!lockboxId) return;

    const preApprovalsRef = ref(database, `lockboxes/${lockboxId}/preApprovals`);
    const unsubscribe = onValue(preApprovalsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
        }));
        list.sort((a, b) => new Date(b.approvalDate) - new Date(a.approvalDate));
        setPreApprovals(list);
      } else {
        setPreApprovals([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [lockboxId]);

  const recentList = preApprovals.slice(0, 5);

  if (loading) {
    return <div className="py-8 flex justify-center"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {recentList.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">No active pre-approvals.</p>
        </div>
      ) : (
        <div className="bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 relative"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentList.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.guestName}</div>
                    <div className="text-sm text-gray-500 font-mono">{maskIndianPhoneNumber(item.guestPhone)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.approvalDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Badge variant="purple">
                      {item.duration} mins
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Fixed visibility: Dark green text on light green background */}
                    <Badge variant="approved">
                      APPROVED
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => onEdit(item)} className="text-purple-600 hover:text-purple-900 font-bold">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preApprovals.length > 5 && (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/owner-dashboard/request-history')} 
            className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
          >
            View All History <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RecentPreApprovals;
