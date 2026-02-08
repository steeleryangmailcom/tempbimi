// Public Authentication - Simple name-based entry (no Microsoft login required)

// Store player name in localStorage
const PLAYER_NAME_KEY = 'superbowlSquaresPlayerName';

// Simple auth manager for public mode
const publicAuthManager = {
    playerName: null,

    // Initialize - check if name already stored
    initialize() {
        const savedName = localStorage.getItem(PLAYER_NAME_KEY);
        if (savedName) {
            this.playerName = savedName;
            return true;
        }
        return false;
    },

    // Set player name
    setName(name) {
        this.playerName = name.trim();
        localStorage.setItem(PLAYER_NAME_KEY, this.playerName);
    },

    // Get player name
    getName() {
        return this.playerName || 'Guest';
    },

    // Clear name (for changing)
    clearName() {
        this.playerName = null;
        localStorage.removeItem(PLAYER_NAME_KEY);
    },

    // Check if logged in (has name)
    isLoggedIn() {
        return this.playerName !== null && this.playerName.length > 0;
    }
};

// Override the getLoggedInUserName function for public mode
if (window.isPublicMode) {
    // Wait for DOM and app to load
    document.addEventListener('DOMContentLoaded', () => {
        const loginScreen = document.getElementById('login-screen');
        const mainApp = document.getElementById('main-app');
        const playerNameInput = document.getElementById('player-name-input');
        const joinButton = document.getElementById('join-button');
        const userNameElement = document.getElementById('user-name');
        const changeNameButton = document.getElementById('change-name-button');

        // Show main app
        function showMainApp() {
            loginScreen.style.display = 'none';
            mainApp.style.display = 'block';
            userNameElement.textContent = publicAuthManager.getName();

            // Update the game's getLoggedInUserName method
            if (window.game) {
                window.game.getLoggedInUserName = () => publicAuthManager.getName();
                window.game.render();
            }
        }

        // Show login screen
        function showLoginScreen() {
            loginScreen.style.display = 'flex';
            mainApp.style.display = 'none';
            playerNameInput.value = '';
            playerNameInput.focus();
        }

        // Check if already has name
        if (publicAuthManager.initialize()) {
            showMainApp();
        } else {
            showLoginScreen();
        }

        // Join button click
        joinButton.addEventListener('click', () => {
            const name = playerNameInput.value.trim();
            if (name.length < 2) {
                alert('Please enter your full name (at least 2 characters)');
                return;
            }
            publicAuthManager.setName(name);
            showMainApp();
        });

        // Enter key in name input
        playerNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinButton.click();
            }
        });

        // Change name button
        changeNameButton.addEventListener('click', () => {
            publicAuthManager.clearName();
            showLoginScreen();
        });

        // Override getLoggedInUserName in the game class
        const originalConstructor = window.SuperBowlSquares;
        if (originalConstructor) {
            const originalGetLoggedInUserName = originalConstructor.prototype.getLoggedInUserName;
            originalConstructor.prototype.getLoggedInUserName = function() {
                if (window.isPublicMode && publicAuthManager.isLoggedIn()) {
                    return publicAuthManager.getName();
                }
                return originalGetLoggedInUserName ? originalGetLoggedInUserName.call(this) : 'Guest';
            };
        }
    });
}
