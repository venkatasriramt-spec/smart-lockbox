/**
 * Phone Normalization Utility
 * Removes all non-digit characters and strips +91 country code for consistent 10-digit comparison
 */

export const normalizePhone = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Convert to string and remove all non-digit characters
  let digitsOnly = String(phoneNumber).replace(/\D/g, '');
  
  // Strip '91' prefix if it's a 12-digit number starting with 91
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    digitsOnly = digitsOnly.substring(2);
  }
  
  return digitsOnly;
};

export const phonesMatch = (phone1, phone2) => {
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);
  
  if (!normalized1 || !normalized2) return false;
  
  return normalized1 === normalized2;
};

export const phonesMatchFlexible = (phone1, phone2) => {
  // With the new normalization stripping 91, flexible match is mostly exact match
  // but we keep the suffix logic just in case there are other prefixes
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);
  
  if (!normalized1 || !normalized2) return false;
  
  if (normalized1 === normalized2) return true;
  
  if (normalized1.length < normalized2.length) {
    if (normalized2.endsWith(normalized1)) return true;
  } else if (normalized2.length < normalized1.length) {
    if (normalized1.endsWith(normalized2)) return true;
  }
  
  return false;
};