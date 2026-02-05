// Firebase Configuration for Super Bowl Squares
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Click "Create a project" (or use existing)
// 3. Name it something like "superbowl-squares"
// 4. Disable Google Analytics (not needed) and create
// 5. Click "Build" > "Realtime Database" in the left menu
// 6. Click "Create Database"
// 7. Choose your region (us-central1 is fine)
// 8. Start in TEST MODE (we'll secure it later)
// 9. Click "Enable"
// 10. Go to Project Settings (gear icon) > General
// 11. Scroll down to "Your apps" > Click web icon (</>)
// 12. Register app with nickname "superbowl-squares-web"
// 13. Copy the firebaseConfig values below
//
// ============================================================

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ============================================================
// DO NOT EDIT BELOW THIS LINE
// ============================================================

// Check if Firebase is configured
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY" &&
           firebaseConfig.projectId !== "YOUR_PROJECT_ID";
}

// Initialize Firebase
let database = null;
let gameRef = null;

async function initializeFirebase() {
    if (!isFirebaseConfigured()) {
        console.warn("Firebase not configured. Using localStorage fallback.");
        return false;
    }

    try {
        // Initialize Firebase app
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }

        // Get database reference
        database = firebase.database();
        gameRef = database.ref('game');

        console.log("Firebase initialized successfully");
        return true;
    } catch (error) {
        console.error("Firebase initialization error:", error);
        return false;
    }
}

// Save game data to Firebase
async function saveToFirebase(data) {
    if (!gameRef) return false;

    try {
        await gameRef.set({
            ...data,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        });
        return true;
    } catch (error) {
        console.error("Error saving to Firebase:", error);
        return false;
    }
}

// Load game data from Firebase (one-time read)
async function loadFromFirebase() {
    if (!gameRef) return null;

    try {
        const snapshot = await gameRef.once('value');
        return snapshot.val();
    } catch (error) {
        console.error("Error loading from Firebase:", error);
        return null;
    }
}

// Listen for real-time updates from Firebase
function onFirebaseUpdate(callback) {
    if (!gameRef) return null;

    return gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            callback(data);
        }
    });
}

// Stop listening for updates
function offFirebaseUpdate() {
    if (gameRef) {
        gameRef.off('value');
    }
}
