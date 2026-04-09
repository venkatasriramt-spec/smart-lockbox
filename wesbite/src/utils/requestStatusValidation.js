
/**
 * Utility for validating and debugging request states.
 */

export const logRequestState = (step, request, extraContext = {}) => {
  if (!request) {
    console.warn(`[VALIDATION] [${step}] Request object is null or undefined`, extraContext);
    return;
  }
  
  console.log(`[VALIDATION] [${step}] Request State Dump:`, {
    id: request.id,
    status: request.status,
    closedByOwner: request.closedByOwner,
    createdAt: request.createdAt,
    ageMs: request.createdAt ? (Date.now() - request.createdAt) : 'unknown',
    ...extraContext
  });
};

export const validateNewRequest = (requestData) => {
  const errors = [];
  
  if (requestData.status !== 'PENDING') {
    errors.push(`Invalid initial status: expected 'PENDING', got '${requestData.status}'`);
  }
  
  if (requestData.closedByOwner !== false) {
    errors.push(`Invalid initial closedByOwner flag: expected false, got ${requestData.closedByOwner}`);
  }
  
  if (!requestData.id) {
    errors.push(`Missing request ID`);
  }
  
  if (!requestData.createdAt || !requestData.timestamp) {
    errors.push(`Missing creation timestamps`);
  }

  if (errors.length > 0) {
    console.error("[VALIDATION] CRITICAL: New request validation failed!", errors, requestData);
    throw new Error(`Request Validation Failed: ${errors.join(', ')}`);
  }
  
  console.log("[VALIDATION] New request validated successfully.", requestData.id);
  return true;
};

export const isRequestStaleOrCorrupted = (request) => {
  if (!request) return true;
  
  // If a request is completely missing critical timestamps
  if (!request.createdAt && !request.timestamp) {
    console.warn("[VALIDATION] Request appears corrupted (missing timestamps):", request.id);
    return true;
  }
  
  return false;
};
