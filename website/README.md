# Smart Lockbox — Web Application

React + Vite web app for the Smart Lockbox system. Provides the Owner Dashboard (manage lockboxes, approve/deny requests, view audit logs) and the Guest Portal (request access, OTP verification, live status).

## Tech Stack

- React (Vite)
- Firebase Realtime Database + Firebase Auth (phone/OTP)
- Tailwind CSS + shadcn/ui components

## Setup

### 1. Requirements

Node version is pinned in `.nvmrc` (Node 22). If you use `nvm`:

```bash
nvm use
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

This repo ships with **placeholder** Firebase credentials in `src/config/firebase.js` — no real API keys are included. Create your own Firebase project (Realtime Database + Phone Authentication enabled) and replace the placeholders:

```js
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.YOUR_REGION.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};
```

Then deploy the included security rules (`database.rules.json`) to your Realtime Database via the Firebase console or CLI:

```bash
firebase deploy --only database
```

### 4. Run locally

```bash
npm run dev
```

Runs on `http://localhost:3000` by default.

### 5. Build for production

```bash
npm run build
```

## Project Structure

```
website/
├── src/
│   ├── components/     # Reusable UI + feature components
│   ├── pages/           # Route-level pages (Owner + Guest flows)
│   ├── context/          # Auth context provider
│   ├── hooks/            # Custom hooks (countdown timers, key detection, etc.)
│   ├── utils/            # Phone formatting, request/lockbox helpers
│   └── config/           # Firebase initialization
├── public/               # Static assets
└── database.rules.json  # Firebase Realtime Database security rules
```

## Roles

- **Owner** — manages one or more lockboxes, grants/revokes access, monitors key presence and audit history.
- **Guest** — requests access to a specific lockbox by ID, verifies identity via OTP, and unlocks/completes a visit.
