
export const initializeCaptcha = () => {
  // Firebase RecaptchaVerifier handles initialization internally.
  console.log("Captcha initialized via Firebase");
};

export const validateCaptcha = (action) => {
  // Placeholder for v3 logic if manually implemented outside Firebase
  return 0.9; 
};

export const isCaptchaScoreValid = (score) => {
  return score > 0.5;
};

export const generateCaptchaErrorMessage = (error) => {
  if (error?.code === 'auth/captcha-check-failed') {
    return "Security check failed. Please refresh the page and try again.";
  }
  return "reCAPTCHA verification failed. Please ensure you are not using a VPN or try again later.";
};
