// Firebase Configuration for Super Bowl Squares - PUBLIC VERSION
// Uses a separate data path from the Solvenna version

const firebaseConfig = {
    apiKey: "AIzaSyBN1q71-11-3S27FrXmR7EdPsfssgmOQr4",
    authDomain: "superbowl-squares-38d85.firebaseapp.com",
    databaseURL: "https://superbowl-squares-38d85-default-rtdb.firebaseio.com",
    projectId: "superbowl-squares-38d85",
    storageBucket: "superbowl-squares-38d85.firebasestorage.app",
    messagingSenderId: "515192815611",
    appId: "1:515192815611:web:1245bb6ee5d9d75ab7955e"
};

// ============================================================
// PUBLIC VERSION - Uses "game-public" path instead of "game"
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

        // Get database reference - PUBLIC version uses "game-public" path
        database = firebase.database();
        gameRef = database.ref('game-public');

        console.log("Firebase initialized successfully (PUBLIC version)");
        return true;
    } catch (error) {
        console.error("Firebase initialization error:", error);
        return false;
    }
}

// Save game data to Firebase
async function saveToFirebase(data) {
    if (!gameRef) {
        console.error('Cannot save: Firebase gameRef not initialized');
        return false;
    }

    try {
        console.log('Saving data to Firebase (PUBLIC)...');
        await gameRef.set({
            ...data,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        });
        console.log('Data saved to Firebase successfully');
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
    if (!gameRef) {
        console.error('Firebase gameRef not initialized');
        return null;
    }

    console.log('Setting up Firebase real-time listener (PUBLIC)...');

    // Listen for value changes
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        console.log('Firebase data received:', data ? 'data present' : 'no data');
        if (data) {
            callback(data);
        }
    }, (error) => {
        console.error('Firebase listener error:', error);
    });

    return true;
}

// Stop listening for updates
function offFirebaseUpdate() {
    if (gameRef) {
        gameRef.off('value');
    }
}
