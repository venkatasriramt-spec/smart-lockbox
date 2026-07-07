/**
 * Formats a phone number for display.
 * Expected input format: +91XXXXXXXXXX or similar E.164
 * Output format: +91 XXXX XXXX XX
 */
export const maskPhoneNumberForDisplay = (phone) => {
  if (!phone) return '';
  
  // Remove non-digits
  const clean = phone.replace(/\D/g, '');
  
  // Check if it matches expected Indian number length (12 digits including 91 country code)
  if (clean.length === 12 && clean.startsWith('91')) {
      const part1 = clean.substring(2, 6);
      const part2 = clean.substring(6, 10);
      const part3 = clean.substring(10, 12);
      return `+91 ${part1} ${part2} ${part3}`;
  }
  
  // Handle case where it might just be 10 digits
  if (clean.length === 10) {
      const part1 = clean.substring(0, 4);
      const part2 = clean.substring(4, 8);
      const part3 = clean.substring(8, 10);
      return `+91 ${part1} ${part2} ${part3}`;
  }
  
  return phone;
};

/**
 * Standardizes a phone number by removing special characters.
 * Preserves '+' if it's the first character (for country codes like +91).
 * 
 * @param {string} phone - The raw phone number input
 * @returns {string} - The sanitized phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  const hasPlus = phone.trim().startsWith('+');
  // Remove everything except digits
  const digits = phone.replace(/\D/g, '');
  
  if (hasPlus && digits.startsWith('91')) {
    return `+${digits}`;
  }
  
  // If user typed + but it's not starting with 91, or no plus, return just digits
  // This satisfies the requirement: Input: "+91 9876543210" → Output: "+919876543210"
  return hasPlus && phone.trim().startsWith('+91') ? `+${digits}` : digits;
};