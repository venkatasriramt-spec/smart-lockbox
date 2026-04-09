
/**
 * Utility functions for India-only (+91) phone number handling
 */

export const formatIndianPhoneNumber = (input) => {
  console.log('formatIndianPhoneNumber validation step - input:', input);
  if (!input) throw new Error("Please enter a valid 10-digit Indian mobile number");

  let clean = input.toString().replace(/[\s\-\(\)]/g, '');

  // If already correctly formatted (+91 + 10 digits), accept it
  if (/^\+91\d{10}$/.test(clean)) {
    console.log('formatIndianPhoneNumber output (already formatted):', clean);
    return clean;
  }

  // Reject invalid prefixes as per strict India-only rules
  if (clean.startsWith('+91') || clean.startsWith('0') || (clean.length > 10 && clean.startsWith('91'))) {
     console.error('Validation failed: Invalid prefix found in input', clean);
     throw new Error("Please enter a valid 10-digit Indian mobile number");
  }

  const digits = clean.replace(/\D/g, '');
  if (digits.length !== 10) {
    console.error('Validation failed: Not exactly 10 digits. Length:', digits.length);
    throw new Error("Please enter a valid 10-digit Indian mobile number");
  }

  const output = `+91${digits}`;
  console.log('formatIndianPhoneNumber output:', output);
  return output;
};

export const isValidIndianPhone = (phone) => {
  console.log('isValidIndianPhone validation step - input:', phone);
  if (!phone) return false;
  const clean = phone.toString().replace(/[\s\-\(\)]/g, '');
  
  if (/^\+91\d{10}$/.test(clean)) {
    console.log('isValidIndianPhone result: true (matched +91 format)');
    return true;
  }
  
  const digits = clean.replace(/\D/g, '');
  const valid = digits.length === 10;
  console.log('isValidIndianPhone result:', valid, '- Digit length:', digits.length);
  return valid;
};

// Maintained function name for backward compatibility, but now returns the FULL unmasked phone number
export const maskIndianPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = phone.toString().replace(/\D/g, '');
  
  // Extract the last 10 digits to ensure we just have the core number
  let coreDigits = digits;
  if (digits.length >= 10) {
    coreDigits = digits.slice(-10);
  }
  
  return `+91${coreDigits}`;
};
