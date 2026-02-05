// Microsoft Authentication Configuration for Solvenna.com
//
// IMPORTANT: Before using this app, you must:
// 1. Register an app in Azure Portal (Microsoft Entra ID)
// 2. Replace the clientId and tenantId values below with your own
// 3. Add your redirect URI to the app registration
//
// See README for detailed setup instructions.

// ============================================================
// CONFIGURATION - UPDATE THESE VALUES WITH YOUR AZURE AD APP
// ============================================================

// Function to build MSAL config (deferred to avoid referencing msal before it loads)
function getMsalConfig() {
    return {
        auth: {
            // Application (client) ID from Azure Portal
            clientId: "56e3ad46-70d5-4c67-9a34-4528826fe90b",

            // Directory (tenant) ID from Azure Portal
            // Using tenant ID restricts login to only Solvenna.com users
            authority: "https://login.microsoftonline.com/73eda9f0-97b8-4dda-af52-6969663defef",

            // Must match the redirect URI registered in Azure Portal
            // Update this to your actual hosting URL
            redirectUri: window.location.origin + window.location.pathname,

            // Where to redirect after logout
            postLogoutRedirectUri: window.location.origin + window.location.pathname,
        },
        cache: {
            // Stores auth state in sessionStorage (cleared when browser closes)
            // Use "localStorage" if you want users to stay logged in
            cacheLocation: "sessionStorage",
            storeAuthStateInCookie: false,
        },
        system: {
            loggerOptions: {
                loggerCallback: (level, message, containsPii) => {
                    if (containsPii) return;
                    switch (level) {
                        case msal.LogLevel.Error:
                            console.error(message);
                            break;
                        case msal.LogLevel.Warning:
                            console.warn(message);
                            break;
                        case msal.LogLevel.Info:
                            console.info(message);
                            break;
                        case msal.LogLevel.Verbose:
                            console.debug(message);
                            break;
                    }
                },
                logLevel: msal.LogLevel.Warning,
            }
        }
    };
}

// Scopes for the token request
const loginRequest = {
    scopes: ["User.Read", "openid", "profile", "email"]
};

// ============================================================
// AUTHENTICATION CLASS
// ============================================================
class AuthManager {
    constructor() {
        this.msalInstance = null;
        this.account = null;
        this.isInitialized = false;
        this.onLoginCallback = null;
        this.onLogoutCallback = null;
    }

    // Initialize MSAL instance
    async initialize() {
        try {
            this.msalInstance = new msal.PublicClientApplication(getMsalConfig());
            await this.msalInstance.initialize();

            // Handle redirect response (if returning from login)
            const response = await this.msalInstance.handleRedirectPromise();
            if (response) {
                // Verify the user is from solvenna.com
                if (!this.isValidDomain(response.account.username)) {
                    // Clear the invalid account and show error
                    sessionStorage.clear();
                    this.account = null;
                    alert("Only @solvenna.com accounts are allowed.");
                } else {
                    this.account = response.account;
                    if (this.onLoginCallback) {
                        this.onLoginCallback(this.account);
                    }
                }
            } else {
                // Check if user is already logged in
                const accounts = this.msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    // Verify domain for existing session too
                    if (this.isValidDomain(accounts[0].username)) {
                        this.account = accounts[0];
                        if (this.onLoginCallback) {
                            this.onLoginCallback(this.account);
                        }
                    } else {
                        // Clear invalid account
                        sessionStorage.clear();
                    }
                }
            }

            this.isInitialized = true;
            return this.account;
        } catch (error) {
            console.error("MSAL initialization error:", error);
            throw error;
        }
    }

    // Check if running in a popup or iframe
    isInPopupOrIframe() {
        try {
            return window.opener !== null || window.self !== window.top;
        } catch (e) {
            return true; // If we can't access, assume we're in restricted context
        }
    }

    // Login - uses redirect method for reliability
    async login() {
        if (!this.isInitialized) {
            throw new Error("Auth not initialized. Call initialize() first.");
        }

        try {
            // Always use redirect for most reliable behavior
            await this.msalInstance.loginRedirect({
                ...loginRequest,
                redirectUri: window.location.origin + window.location.pathname
            });
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        }
    }

    // Alias for backward compatibility
    async loginPopup() {
        return this.login();
    }

    // Login with redirect (alternative method)
    async loginRedirect() {
        return this.login();
    }

    // Logout
    async logout() {
        if (!this.isInitialized) {
            throw new Error("Auth not initialized.");
        }

        try {
            // Get the account before clearing
            const accountToLogout = this.account;
            const config = getMsalConfig();

            // Clear local state
            this.account = null;

            // Clear session storage
            sessionStorage.clear();

            if (this.onLogoutCallback) {
                this.onLogoutCallback();
            }

            // Logout from Microsoft using redirect (more reliable than popup)
            if (accountToLogout) {
                await this.msalInstance.logoutRedirect({
                    account: accountToLogout,
                    postLogoutRedirectUri: config.auth.postLogoutRedirectUri
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
            // Even if logout fails, clear local state and reload
            this.account = null;
            sessionStorage.clear();
            window.location.reload();
        }
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.account !== null;
    }

    // Get current user account
    getAccount() {
        return this.account;
    }

    // Get user's display name
    getDisplayName() {
        return this.account?.name || this.account?.username || "Unknown User";
    }

    // Get user's email
    getEmail() {
        return this.account?.username || "";
    }

    // Validate that email is from solvenna.com domain
    isValidDomain(email) {
        if (!email) return false;
        const domain = email.toLowerCase().split('@')[1];
        return domain === 'solvenna.com';
    }

    // Get access token for API calls (if needed in the future)
    async getAccessToken() {
        if (!this.account) {
            throw new Error("No account logged in");
        }

        const tokenRequest = {
            scopes: loginRequest.scopes,
            account: this.account
        };

        try {
            const response = await this.msalInstance.acquireTokenSilent(tokenRequest);
            return response.accessToken;
        } catch (error) {
            // If silent token acquisition fails, try popup
            if (error instanceof msal.InteractionRequiredAuthError) {
                const response = await this.msalInstance.acquireTokenPopup(tokenRequest);
                return response.accessToken;
            }
            throw error;
        }
    }

    // Set callback for successful login
    onLogin(callback) {
        this.onLoginCallback = callback;
    }

    // Set callback for logout
    onLogout(callback) {
        this.onLogoutCallback = callback;
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// ============================================================
// UI INTEGRATION
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');

    // Check if MSAL library is loaded
    if (typeof msal === 'undefined') {
        console.error("MSAL library failed to load");
        loginScreen.innerHTML = `
            <div class="login-container">
                <h1>🏈 Super Bowl Squares 🏈</h1>
                <p class="subtitle">Super Bowl LIX - February 9, 2025</p>
                <div class="login-box">
                    <div class="config-warning">
                        <h3>⚠️ Authentication Library Failed to Load</h3>
                        <p>The Microsoft authentication library could not be loaded. Please check your internet connection and refresh the page.</p>
                    </div>
                    <button onclick="location.reload()" class="btn btn-primary">Refresh Page</button>
                </div>
            </div>
        `;
        return;
    }

    // Check if MSAL is configured
    const config = getMsalConfig();
    const isConfigured = config.auth.clientId !== "YOUR_CLIENT_ID_HERE" &&
                         !config.auth.authority.includes("YOUR_TENANT_ID_HERE");

    if (!isConfigured) {
        // Show warning and allow access without login for development
        console.warn("MSAL not configured. Running in development mode without authentication.");
        loginScreen.innerHTML = `
            <div class="login-container">
                <h1>🏈 Super Bowl Squares 🏈</h1>
                <p class="subtitle">Super Bowl LIX - February 9, 2025</p>
                <div class="login-box">
                    <div class="config-warning">
                        <h3>⚠️ Authentication Not Configured</h3>
                        <p>To enable Microsoft login, update <code>auth.js</code> with your Azure AD app credentials:</p>
                        <ul>
                            <li>clientId: Your Application (client) ID</li>
                            <li>authority: Your Directory (tenant) ID</li>
                        </ul>
                        <p>For now, you can continue without authentication:</p>
                    </div>
                    <button id="dev-continue" class="btn btn-primary">Continue to App (Dev Mode)</button>
                </div>
            </div>
        `;

        document.getElementById('dev-continue').addEventListener('click', () => {
            loginScreen.style.display = 'none';
            mainApp.style.display = 'block';
            userNameElement.textContent = 'Development User';
            userEmailElement.textContent = 'dev@localhost';
        });
        return;
    }

    // Show/hide screens based on login state
    function showMainApp(account) {
        loginScreen.style.display = 'none';
        mainApp.style.display = 'block';
        userNameElement.textContent = account.name || 'User';
        userEmailElement.textContent = account.username;
    }

    function showLoginScreen() {
        loginScreen.style.display = 'flex';
        mainApp.style.display = 'none';
        userNameElement.textContent = '';
        userEmailElement.textContent = '';
    }

    // Set up auth callbacks
    authManager.onLogin(showMainApp);
    authManager.onLogout(showLoginScreen);

    // Initialize authentication
    try {
        const account = await authManager.initialize();
        if (account) {
            // Verify domain on page load too
            if (!authManager.isValidDomain(account.username)) {
                await authManager.logout();
                alert("Only @solvenna.com accounts are allowed.");
                showLoginScreen();
            } else {
                showMainApp(account);
            }
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error("Auth initialization failed:", error);
        showLoginScreen();
    }

    // Login button click handler
    loginButton.addEventListener('click', async () => {
        try {
            loginButton.disabled = true;
            loginButton.textContent = 'Redirecting to Microsoft...';
            // This will redirect the page to Microsoft login
            await authManager.login();
        } catch (error) {
            // Only shows if redirect fails immediately
            alert(error.message || "Login failed. Please try again.");
            loginButton.disabled = false;
            loginButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 21 21">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                Sign in with Microsoft
            `;
        }
    });

    // Logout button click handler
    logoutButton.addEventListener('click', async () => {
        try {
            logoutButton.disabled = true;
            logoutButton.textContent = 'Signing out...';
            // This will redirect the page for logout
            await authManager.logout();
        } catch (error) {
            console.error("Logout error:", error);
            // Only reached if redirect fails
            window.location.reload();
        }
    });
});
