import { initializeApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, onValue, serverTimestamp } from 'firebase/database';

/**
 * FIREBASE CONFIGURATION & INITIALIZATION
 */
// All of this is available by creating a Free Firebase Account for a web app
const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "AUTH_DOMAIN",
  databaseURL: "DATABASE_URL",
  projectId: "PROJECT_ID",
  storageBucket: "STORAGE_BUCKET",
  messagingSenderId: "MESSAGING_SENDER_ID",
  appId: "APP_ID"
};

const requiredKeys = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key] || firebaseConfig[key].includes("YOUR_"));

if (missingKeys.length > 0) {
  console.warn(`⚠️ FIREBASE CONFIG WARNING: Missing values for: ${missingKeys.join(', ')}.`);
}

let app;
let auth;
let database;
let initializationError = null;

try {
  try {
    app = getApp();
  } catch (error) {
    app = initializeApp(firebaseConfig);
  }
  
  auth = getAuth(app);
  database = getDatabase(app);
  
  console.log("Firebase initialized for India-only phone number handling (+91)", { 
    apiKey: firebaseConfig.apiKey, 
    authDomain: firebaseConfig.authDomain, 
    projectId: firebaseConfig.projectId 
  });

  const connectedRef = ref(database, ".info/connected");
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      console.log("🟢 Firebase Realtime Database Connected");
    }
  });

} catch (error) {
  console.error("❌ Critical: Firebase Initialization Error:", error);
  initializationError = error;
  auth = null;
  database = null;
}

export { auth, database, initializationError, firebaseConfig, serverTimestamp };
export default app;