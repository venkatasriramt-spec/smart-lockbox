
export const validatePhoneNumber = (phone) => {
  if (!phone) return false;
  const digits = phone.toString().replace(/\D/g, '');
  return digits.length === 10;
};

export const formatPhoneForFirebase = (phone) => {
  if (!phone) throw new Error("Phone number is required");
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.length !== 10) throw new Error("Must be a 10-digit number");
  return `+91${digits}`;
};

export const validateOTPFormat = (otp) => {
  if (!otp) return false;
  return /^\d{6}$/.test(otp.toString());
};

export const isOTPExpired = (timestamp) => {
  if (!timestamp) return true;
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  return Date.now() - timestamp > TEN_MINUTES_MS;
};

export const isFirebaseTooManyRequestsError = (error) => {
  if (!error) return false;
  return error.code === 'auth/too-many-requests' || error.message?.includes('too-many-requests');
};

export const getFirebaseRateLimitMessage = (secondsRemaining) => {
  return `Too many attempts. Please wait ${secondsRemaining} seconds before trying again.`;
};

export const generateOTPErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/invalid-phone-number':
      return "The phone number entered is invalid.";
    case 'auth/too-many-requests':
      return "Too many attempts. Please try again later.";
    case 'auth/invalid-verification-code':
      return "The OTP entered is incorrect. Please try again.";
    case 'auth/code-expired':
      return "The OTP has expired. Please request a new one.";
    case 'auth/network-request-failed':
      return "Network error. Please check your connection.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
};
