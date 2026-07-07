import { ref, get } from 'firebase/database';
import { database } from '@/config/firebase';
import { maskPhoneNumberForDisplay } from '@/utils/phoneFormatting';

/**
 * Fetches all requests and pre-approvals for a specific lockbox to build a complete history.
 * @param {string} lockboxId 
 * @returns {Promise<Array>} Sorted and normalized history records
 */
export const fetchRequestHistory = async (lockboxId) => {
  if (!lockboxId) return [];

  try {
    const requestsRef = ref(database, `lockboxes/${lockboxId}/requests`);
    const snapshot = await get(requestsRef);
    
    if (!snapshot.exists()) return [];

    const rawRequests = snapshot.val();
    const history = Object.entries(rawRequests).map(([id, data]) => {
      const timestamp = data.timestamp || data.createdAt || data.date || Date.now();
      
      let displayStatus = data.status || 'UNKNOWN';
      if (displayStatus === 'AWAITING_VERIFICATION') displayStatus = 'PENDING';

      let durationInSeconds = data.approvedDuration;
      if (durationInSeconds === undefined) {
        if (data.expiresAt && data.approvedAt) {
           durationInSeconds = Math.round((data.expiresAt - data.approvedAt) / 1000);
        } else if (data.duration) { 
           durationInSeconds = data.duration * 60;
        } else {
           durationInSeconds = 0;
        }
      }

      return {
        id,
        type: data.preApproved ? 'Pre-Approved' : data.type || 'Normal',
        name: data.name || data.guestName || 'Unknown',
        phone: data.phone || data.guestPhone || '',
        maskedPhone: maskPhoneNumberForDisplay(data.phone || data.guestPhone),
        status: displayStatus,
        timestamp: timestamp,
        duration: durationInSeconds,
        reason: data.reason || 'No reason provided',
        ...data
      };
    });

    return history.sort((a, b) => b.timestamp - a.timestamp);

  } catch (error) {
    console.error("Error fetching request history:", error);
    throw error;
  }
};