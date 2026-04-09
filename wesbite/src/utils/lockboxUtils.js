
import { database, serverTimestamp } from '@/config/firebase';
import { ref, update, push, get } from 'firebase/database';
import { markPreApprovalAsUsed } from './preApprovalUtils';
import { validateNewRequest, logRequestState } from './requestStatusValidation';

// Global debug flag
window.DEBUG_CLOSE_BOX = window.DEBUG_CLOSE_BOX ?? true;

const debugLog = (step, ...args) => {
  if (window.DEBUG_CLOSE_BOX) {
    const timestamp = new Date().toISOString();
    console.log(`[CLOSE_BOX_FLOW] [${timestamp}] ${step}`, ...args);
  }
};

export const updateLockboxStateUnlocked = async (lockboxId, requestId, approvedDurationSeconds) => {
  if (!lockboxId) throw new Error("Lockbox ID is required");

  const expiresAt = approvedDurationSeconds 
    ? Date.now() + (approvedDurationSeconds * 1000) 
    : Date.now() + 5 * 60 * 1000;

  try {
    const lockboxRef = ref(database, `lockboxes/${lockboxId}/lockbox`);
    await update(lockboxRef, {
      state: "UNLOCKED",
      unlockedUntil: expiresAt,
      activeRequestId: requestId || "MANUAL_OVERRIDE",
      closedByOwner: null,
      lastUpdated: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Failed to unlock lockbox:", error);
    throw error;
  }
};

export const updateLockboxStateLocked = async (lockboxId) => {
  if (!lockboxId) {
    throw new Error("Lockbox ID is required");
  }

  const updatePayload = {
    state: "LOCKED",
    unlockedUntil: 0,
    activeRequestId: null,
    lastUpdated: serverTimestamp()
  };

  try {
    const lockboxRef = ref(database, `lockboxes/${lockboxId}/lockbox`);
    await update(lockboxRef, updatePayload);
    return true;
  } catch (error) {
    console.error(`Failed to lock lockbox ${lockboxId}:`, error);
    throw error;
  }
};

export const manuallyUnlockLockbox = async (lockboxId) => {
  if (!lockboxId) throw new Error("Lockbox ID is required");
  const approvedDurationSeconds = 5 * 60;
  return updateLockboxStateUnlocked(lockboxId, "MANUAL_OVERRIDE", approvedDurationSeconds);
};

export const manuallyLockLockbox = async (lockboxId) => {
  return updateLockboxStateLocked(lockboxId);
};

export const closeBoxByOwner = async (lockboxId, requestId) => {
  if (!lockboxId) throw new Error("Lockbox ID is required");
  
  debugLog(`closeBoxByOwner called. Initiating database update.`, { lockboxId, providedRequestId: requestId });
  
  try {
    const lockboxRef = ref(database, `lockboxes/${lockboxId}/lockbox`);
    const snap = await get(lockboxRef);
    let activeReqId = requestId;
    
    if (!activeReqId && snap.exists() && snap.val().activeRequestId) {
      activeReqId = snap.val().activeRequestId;
      debugLog(`Fallback to lockbox activeRequestId:`, activeReqId);
    }
    
    debugLog(`Retrieved lockbox snap structure:`, snap.val());
    debugLog(`Determined activeReqId to close:`, activeReqId);

    const updates = {};
    updates[`lockboxes/${lockboxId}/lockbox/state`] = "LOCKED";
    updates[`lockboxes/${lockboxId}/lockbox/unlockedUntil`] = 0;
    updates[`lockboxes/${lockboxId}/lockbox/activeRequestId`] = null;
    updates[`lockboxes/${lockboxId}/lockbox/closedByOwner`] = true;
    updates[`lockboxes/${lockboxId}/lockbox/lastUpdated`] = serverTimestamp();
    
    // Explicitly update individual request status
    if (activeReqId && activeReqId !== "MANUAL_OVERRIDE") {
      const requestPath = `lockboxes/${lockboxId}/requests/${activeReqId}`;
      updates[`${requestPath}/status`] = "CLOSED_BY_OWNER";
      updates[`${requestPath}/closedByOwner`] = true;
      updates[`${requestPath}/closedAt`] = serverTimestamp();
      updates[`${requestPath}/completedAt`] = serverTimestamp();
      debugLog(`Adding request updates for path:`, requestPath);
    }

    debugLog(`Exact database paths being updated:`, Object.keys(updates));
    await update(ref(database), updates);
    debugLog(`Successfully updated database and completed write operation.`);
    
    return true;
  } catch (error) {
    debugLog(`Error updating database in closeBoxByOwner:`, error.message);
    throw error;
  }
};

export const setTheftAlert = async (lockboxId, requestId) => {
  if (!lockboxId) throw new Error("Lockbox ID is required");
  try {
    const updates = {};
    updates[`lockboxes/${lockboxId}/lockbox/state`] = "LOCKED";
    updates[`lockboxes/${lockboxId}/lockbox/unlockedUntil`] = 0;
    updates[`lockboxes/${lockboxId}/lockbox/activeRequestId`] = null;
    updates[`lockboxes/${lockboxId}/lockbox/alert`] = "KEY_NOT_RETURNED";
    updates[`lockboxes/${lockboxId}/lockbox/lastUpdated`] = serverTimestamp();
    
    if (requestId) {
      updates[`lockboxes/${lockboxId}/requests/${requestId}/status`] = "KEY_NOT_RETURNED";
      updates[`lockboxes/${lockboxId}/requests/${requestId}/completedAt`] = serverTimestamp();
      updates[`lockboxes/${lockboxId}/requests/${requestId}/keyReturned`] = false;
    }
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error("Failed to set theft alert:", error);
    throw error;
  }
};

export const completeSession = async (lockboxId, requestId) => {
  if (!lockboxId) throw new Error("Lockbox ID is required");
  try {
    const updates = {};
    updates[`lockboxes/${lockboxId}/lockbox/state`] = "LOCKED";
    updates[`lockboxes/${lockboxId}/lockbox/unlockedUntil`] = 0;
    updates[`lockboxes/${lockboxId}/lockbox/activeRequestId`] = null;
    updates[`lockboxes/${lockboxId}/lockbox/alert`] = null;
    updates[`lockboxes/${lockboxId}/lockbox/lastUpdated`] = serverTimestamp();
    
    if (requestId) {
      updates[`lockboxes/${lockboxId}/requests/${requestId}/status`] = "COMPLETED";
      updates[`lockboxes/${lockboxId}/requests/${requestId}/completedAt`] = serverTimestamp();
      updates[`lockboxes/${lockboxId}/requests/${requestId}/keyReturned`] = true;
    }
    await update(ref(database), updates);
    return true;
  } catch (error) {
    console.error("Failed to complete session:", error);
    throw error;
  }
};

export const submitAccessRequest = async (lockboxId, guestInfo, options = {}) => {
  debugLog("submitAccessRequest() CALLED", { lockboxId, guestInfo, options });
  
  if (!lockboxId) throw new Error("Lockbox ID is required to submit a request");
  if (!guestInfo) throw new Error("Guest information is required to submit a request");

  const name = guestInfo.name || guestInfo.guestName || `${guestInfo.firstName || ''} ${guestInfo.lastName || ''}`.trim();
  const phone = guestInfo.phone || guestInfo.guestPhone;
  const isPreApproved = options.isPreApproved !== undefined ? options.isPreApproved : (guestInfo.isPreApproved || false);
  const requestType = guestInfo.type || (isPreApproved ? "Pre-Approved" : "Normal");

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error("Guest name is required and cannot be empty");
  }

  if (!phone || typeof phone !== 'string' || phone.trim() === '') {
    throw new Error("Guest phone is required and cannot be empty");
  }

  try {
    const requestsRef = ref(database, `lockboxes/${lockboxId}/requests`);
    const newRequestRef = push(requestsRef);
    const requestId = newRequestRef.key;

    const timestamp = Date.now();
    
    const requestData = {
      id: requestId,
      lockboxId: lockboxId,
      name: name.trim(),
      phone: phone.trim(),
      reason: guestInfo.reason || (isPreApproved ? 'Pre-approved access' : 'No reason provided'),
      type: requestType,
      timestamp: timestamp,
      createdAt: timestamp,
      status: 'PENDING',        // MUST ALWAYS BE PENDING
      closedByOwner: false,     // MUST ALWAYS BE FALSE
      duration: options.duration || guestInfo.duration || guestInfo.requestedDuration || 15,
      isPreApproved: isPreApproved,
      preApprovalId: options.preApprovalId || guestInfo.preApprovalId || null
    };

    debugLog("Validating request object before write...");
    validateNewRequest(requestData);
    logRequestState("PRE-WRITE", requestData);

    const updates = {};
    updates[`lockboxes/${lockboxId}/requests/${requestId}`] = requestData;

    debugLog(`Executing database update for path: lockboxes/${lockboxId}/requests/${requestId}`);
    await update(ref(database), updates);

    debugLog("Write operation successful.");
    return requestData;
  } catch (error) {
    console.error("Failed to submit access request:", error);
    debugLog("Error submitting access request:", error.message);
    throw error;
  }
};

export const autoApprovePreApprovedRequest = async (lockboxId, requestId, preApprovalId, guestPhone, durationMinutes) => {
  if (!lockboxId || !requestId) throw new Error("Lockbox ID and Request ID are required");

  debugLog(`Auto-approving request: ${requestId}`);

  const timestamp = Date.now();
  const approvedDurationSeconds = (durationMinutes || 15) * 60;
  
  try {
    if (preApprovalId) {
      await markPreApprovalAsUsed(lockboxId, preApprovalId, requestId, guestPhone);
    }

    const requestRef = ref(database, `lockboxes/${lockboxId}/requests/${requestId}`);
    const requestSnap = await get(requestRef);
    
    let currentAuditLog = [];
    if (requestSnap.exists() && requestSnap.val().auditLog) {
      currentAuditLog = requestSnap.val().auditLog;
    }

    currentAuditLog.push({
      action: "AUTO_APPROVED",
      timestamp: timestamp,
      details: "Auto-approved via pre-approval after OTP verification"
    });

    const updates = {
      status: 'APPROVED',
      approvedAt: timestamp,
      approvedBy: "system/pre-approval",
      approvalReason: "Auto-approved via pre-approval after OTP verification",
      expiryAt: timestamp + (approvedDurationSeconds * 1000),
      approvedDuration: approvedDurationSeconds,
      auditLog: currentAuditLog
    };

    await update(requestRef, updates);
    await updateLockboxStateUnlocked(lockboxId, requestId, approvedDurationSeconds);

    const updatedSnap = await get(requestRef);
    debugLog(`Auto-approve complete. Final state:`, updatedSnap.val().status);
    return updatedSnap.val();
  } catch (error) {
    console.error("Failed to auto-approve request:", error);
    throw error;
  }
};
