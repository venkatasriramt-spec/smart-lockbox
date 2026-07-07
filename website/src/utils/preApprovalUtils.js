import { ref, get, remove, update, push, child } from 'firebase/database';
import { database } from '@/config/firebase';
import { normalizePhone, phonesMatchFlexible } from './phoneNormalization';

export const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  }
  return digits; // Store as 10-digit
};

export const isPreApprovalExpired = (scheduledDate) => {
  if (!scheduledDate) return false;
  const todayStr = new Date().toISOString().split('T')[0];
  return scheduledDate < todayStr;
};

export const checkAndMarkExpiredPreApprovals = async (lockboxId) => {
  if (!lockboxId) return 0;
  try {
    const preApprovalsRef = ref(database, `lockboxes/${lockboxId}/preApprovals`);
    const snapshot = await get(preApprovalsRef);
    if (!snapshot.exists()) return 0;

    const preApprovals = snapshot.val();
    const updates = {};
    let markedCount = 0;

    Object.entries(preApprovals).forEach(([id, approval]) => {
      const isExpired = isPreApprovalExpired(approval.approvalDate);
      if (isExpired && approval.status !== 'EXPIRED' && approval.status !== 'USED' && approval.used !== true) {
        updates[`lockboxes/${lockboxId}/preApprovals/${id}`] = null;
        const newAuditLogKey = push(child(ref(database), `lockboxes/${lockboxId}/auditLogs`)).key;
        updates[`lockboxes/${lockboxId}/auditLogs/${newAuditLogKey}`] = {
          status: "EXPIRED",
          expiredAt: Date.now(),
          guestName: approval.guestName || approval.name || "Unknown",
          guestPhone: approval.guestPhone || approval.phone || "Unknown",
          scheduledDate: approval.approvalDate,
          duration: approval.duration || approval.requestedDuration || 15,
          type: "pre_approval_expired"
        };
        markedCount++;
      }
    });

    if (markedCount > 0) {
      await update(ref(database), updates);
    }
    return markedCount;
  } catch (error) {
    console.error("Error checking/marking expired pre-approvals:", error);
    return 0;
  }
};

export const checkPreApproval = async (lockboxId, guestName, guestPhone, guestDateString) => {
  const logs = [];
  const log = (msg) => {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}`;
    console.log(formattedMsg);
    logs.push(formattedMsg);
  };

  if (!lockboxId || !guestPhone) {
    log("Missing required info - lockboxId or guestPhone");
    return { found: false, preApproval: null, error: "Missing required info", logs };
  }

  const path = `lockboxes/${lockboxId}/preApprovals`;
  
  try {
    const preApprovalsRef = ref(database, path);
    const snapshot = await get(preApprovalsRef);

    if (!snapshot.exists()) {
      log(`No pre-approvals found at path: ${path}`);
      return { found: false, preApproval: null, error: "No pre-approvals found", logs };
    }

    const preApprovals = snapshot.val();
    log(`Retrieved ${Object.keys(preApprovals).length} pre-approvals from database`);

    const normalizedGuestPhone = normalizePhone(guestPhone);
    log(`Searching for normalized guest phone: ${normalizedGuestPhone} (original input: ${guestPhone})`);
    
    let validMatch = null;
    let failReason = "No matching phone found";

    for (const [id, approval] of Object.entries(preApprovals)) {
      if (!approval) continue;
      log(`--- Checking Pre-Approval ID: ${id} ---`);

      const rawDbPhone = approval.phone || approval.guestPhone || '';
      const normalizedDbPhone = normalizePhone(rawDbPhone);
      
      log(`Raw DB Phone: ${rawDbPhone}`);
      log(`Normalized DB Phone: ${normalizedDbPhone}`);
      
      if (!phonesMatchFlexible(guestPhone, rawDbPhone)) {
        log(`Phone check: FAIL (Guest: ${normalizedGuestPhone} !== DB: ${normalizedDbPhone})`);
        continue;
      }
      
      log(`Phone check: PASS`);
      
      const approvalDate = approval.approvalDate || '';
      const status = approval.status || 'PENDING';
      const isUsed = approval.used === true || status === 'USED';
      
      log(`Approval date: ${approvalDate || 'NULL'}, Current date: ${guestDateString}`);
      log(`Approval status: ${status}, isUsed: ${isUsed}`);

      let datePass = false;
      let statusPass = false;

      // Date check
      if (!approvalDate) {
        log(`Date check: FAIL (Missing approval date)`);
        failReason = "Missing approval date";
      } else if (approvalDate < guestDateString) {
        log(`Date check: FAIL (Approval date is in the past)`);
        failReason = "EXPIRED_DATE";
      } else {
        log(`Date check: PASS`);
        datePass = true;
      }

      // Status check
      if (isUsed) {
        log(`Status check: FAIL (Already used)`);
        failReason = "ALREADY_USED";
      } else if (status === 'EXPIRED') {
        log(`Status check: FAIL (Status is EXPIRED)`);
        failReason = "EXPIRED_STATUS";
      } else if (status === 'ACTIVE' || status === 'PENDING') {
        log(`Status check: PASS`);
        statusPass = true;
      } else {
        log(`Status check: FAIL (Unknown status: ${status})`);
        failReason = `INVALID_STATUS_${status}`;
      }

      if (datePass && statusPass) {
        log(`Overall validation: PASS for ID ${id}`);
        validMatch = { id, ...approval };
        break;
      } else {
        log(`Overall validation: FAIL for ID ${id}`);
      }
    }

    if (validMatch) {
      log(`Returning valid pre-approval match: ${validMatch.id}`);
      return { 
        found: true, 
        preApproval: {
          id: validMatch.id,
          guestName: validMatch.name || validMatch.guestName,
          guestPhone: validMatch.phone || validMatch.guestPhone,
          scheduledDate: validMatch.approvalDate,
          approvalDurationMinutes: parseInt(validMatch.duration || validMatch.requestedDuration || 15, 10),
          status: validMatch.status || 'PENDING',
          lockboxId: lockboxId
        },
        error: null,
        logs
      };
    }

    log(`No valid matching pre-approval found after checking all records. Last fail reason: ${failReason}`);
    return { found: false, preApproval: null, error: failReason, logs };

  } catch (error) {
    log(`Error checking pre-approval: ${error.message}`);
    return { found: false, preApproval: null, error: error.message, logs };
  }
};

export const markPreApprovalAsUsed = async (lockboxId, preApprovalId, requestId, usedByPhone = "unknown") => {
  if (!lockboxId || !preApprovalId) return { success: false, error: "Missing lockboxId or preApprovalId" };
  try {
    const preApprovalRef = ref(database, `lockboxes/${lockboxId}/preApprovals/${preApprovalId}`);
    await update(preApprovalRef, { status: "USED", used: true, usedAt: Date.now(), usedBy: usedByPhone });
    await remove(preApprovalRef);
    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting pre-approval after use:", error);
    return { success: false, error: error.message };
  }
};

export const deleteExpiredPreApprovals = async (lockboxId) => {
  if (!lockboxId) return 0;
  try {
    const preApprovalsRef = ref(database, `lockboxes/${lockboxId}/preApprovals`);
    const snapshot = await get(preApprovalsRef);
    if (!snapshot.exists()) return 0;
    const preApprovals = snapshot.val();
    let deletedCount = 0;
    const deletionPromises = [];
    Object.entries(preApprovals).forEach(([id, approval]) => {
      if (isPreApprovalExpired(approval.approvalDate) && approval.status !== 'USED' && !approval.used) {
        deletionPromises.push(remove(ref(database, `lockboxes/${lockboxId}/preApprovals/${id}`)));
        deletedCount++;
      }
    });
    await Promise.all(deletionPromises);
    return deletedCount;
  } catch (error) {
    console.error("Error deleting expired pre-approvals:", error);
    return 0;
  }
};