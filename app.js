// Super Bowl Squares Application
// Manages a 10x10 grid for Super Bowl squares contest

class SuperBowlSquares {
    constructor() {
        // Game state
        this.squares = Array(100).fill(null);
        this.rowNumbers = Array(10).fill(null); // NFC team numbers (left side)
        this.colNumbers = Array(10).fill(null); // AFC team numbers (top)
        this.teams = {
            afc: 'New England Patriots',
            nfc: 'Seattle Seahawks'
        };
        this.scores = {
            q1: { afc: null, nfc: null },
            q2: { afc: null, nfc: null },
            q3: { afc: null, nfc: null },
            q4: { afc: null, nfc: null }
        };
        this.winners = {
            q1: null,
            q2: null,
            q3: null,
            q4: null
        };

        // Player limits
        this.defaultLimit = 5;
        this.playerLimits = {}; // Custom limits per player

        // Current modal state
        this.currentSquareIndex = null;

        // Check if admin mode
        this.isAdmin = window.isAdminMode || false;

        // Firebase flag
        this.useFirebase = false;
        this.firebaseReady = false;

        // Initialize DOM first
        this.initializeDOM();

        // DON'T load from localStorage initially - wait for Firebase
        // This prevents race conditions where localStorage overwrites Firebase
        this.render();
        this.attachEventListeners();

        // Initialize Firebase (async, will load data when ready)
        this.initFirebase();
    }

    // Initialize DOM elements
    initializeDOM() {
        // Get references to DOM elements
        this.gridElement = document.getElementById('squares-grid');
        this.numbersRowElement = document.getElementById('numbers-row');
        this.numbersColElement = document.getElementById('numbers-col');
        this.modal = document.getElementById('player-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.modalPlayerName = document.getElementById('modal-player-name');
        this.modalCurrentOwner = document.getElementById('modal-current-owner');
        this.modalLimitWarning = document.getElementById('modal-limit-warning');
        this.modalRow = document.getElementById('modal-row');
        this.modalCol = document.getElementById('modal-col');

        // Stats
        this.squaresFilledElement = document.getElementById('squares-filled');
        this.squaresRemainingElement = document.getElementById('squares-remaining');
        this.uniquePlayersElement = document.getElementById('unique-players');

        // Player info (player page only)
        this.mySquaresCountElement = document.getElementById('my-squares-count');
        this.mySquaresLimitElement = document.getElementById('my-squares-limit');
        this.mySquaresRemainingElement = document.getElementById('my-squares-remaining');
        this.myInvestmentElement = document.getElementById('my-investment');

        // Cost per square (configurable via window.costPerSquare)
        this.costPerSquare = window.costPerSquare || 5;

        // Sync status elements
        this.syncStatusElement = document.getElementById('sync-status');

        // Score displays (player page)
        this.scoreDisplays = {
            q1: document.getElementById('q1-score'),
            q2: document.getElementById('q2-score'),
            q3: document.getElementById('q3-score'),
            q4: document.getElementById('q4-score')
        };

        // Winner displays
        this.winnerDisplays = {
            q1: document.getElementById('q1-winner'),
            q2: document.getElementById('q2-winner'),
            q3: document.getElementById('q3-winner'),
            q4: document.getElementById('q4-winner')
        };

        // Admin-only elements
        if (this.isAdmin) {
            this.scoreInputs = {
                q1: { afc: document.getElementById('q1-afc'), nfc: document.getElementById('q1-nfc') },
                q2: { afc: document.getElementById('q2-afc'), nfc: document.getElementById('q2-nfc') },
                q3: { afc: document.getElementById('q3-afc'), nfc: document.getElementById('q3-nfc') },
                q4: { afc: document.getElementById('q4-afc'), nfc: document.getElementById('q4-nfc') }
            };
            this.defaultLimitInput = document.getElementById('default-limit');
            this.playerLimitsTable = document.getElementById('player-limits-table');
        }
    }

    // Attach event listeners
    attachEventListeners() {
        // Modal buttons
        document.getElementById('save-player').addEventListener('click', () => this.savePlayer());
        document.getElementById('clear-square').addEventListener('click', () => this.clearSquare());
        document.getElementById('cancel-modal').addEventListener('click', () => this.closeModal());

        // Close modal on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });

        // Admin-only event listeners
        if (this.isAdmin) {
            document.getElementById('randomize-numbers').addEventListener('click', () => this.randomizeNumbers());
            document.getElementById('clear-numbers').addEventListener('click', () => this.clearNumbers());
            document.getElementById('reset-all').addEventListener('click', () => this.resetAll());
            document.getElementById('export-data').addEventListener('click', () => this.exportData());
            document.getElementById('import-data').addEventListener('click', () => {
                document.getElementById('import-file').click();
            });
            document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));
            document.getElementById('update-scores').addEventListener('click', () => this.updateScores());
            // Player limit controls (only if elements exist - not used in unlimited picks mode)
            const saveDefaultLimitBtn = document.getElementById('save-default-limit');
            const addPlayerLimitBtn = document.getElementById('add-player-limit');
            if (saveDefaultLimitBtn) {
                saveDefaultLimitBtn.addEventListener('click', () => this.saveDefaultLimit());
            }
            if (addPlayerLimitBtn) {
                addPlayerLimitBtn.addEventListener('click', () => this.addPlayerLimit());
            }
        }
    }

    // Get logged-in user's display name
    getLoggedInUserName() {
        if (typeof authManager !== 'undefined' && authManager.isLoggedIn()) {
            return authManager.getDisplayName();
        }
        return 'Guest';
    }

    // Get player's square limit
    getPlayerLimit(playerName) {
        return this.playerLimits[playerName] || this.defaultLimit;
    }

    // Count squares owned by a player
    countPlayerSquares(playerName) {
        return this.squares.filter(s => s === playerName).length;
    }

    // Check if player can claim more squares
    canPlayerClaimMore(playerName) {
        // If unlimited picks mode is enabled, always allow
        if (window.unlimitedPicks) {
            return true;
        }
        const limit = this.getPlayerLimit(playerName);
        const count = this.countPlayerSquares(playerName);
        return count < limit;
    }

    // Render the entire board
    render() {
        this.renderNumbers();
        this.renderGrid();
        this.renderScores();
        this.updateStats();
        this.updatePlayerInfo();

        if (this.isAdmin) {
            this.renderPlayerLimitsTable();
            if (this.defaultLimitInput) {
                this.defaultLimitInput.value = this.defaultLimit;
            }
        }
    }

    // Update player info bar (player page only)
    updatePlayerInfo() {
        if (!this.mySquaresCountElement) return;

        const playerName = this.getLoggedInUserName();
        const count = this.countPlayerSquares(playerName);
        const limit = this.getPlayerLimit(playerName);
        const remaining = Math.max(0, limit - count);
        const investment = count * this.costPerSquare;

        this.mySquaresCountElement.textContent = count;
        if (this.mySquaresLimitElement) {
            this.mySquaresLimitElement.textContent = limit;
        }
        if (this.mySquaresRemainingElement) {
            this.mySquaresRemainingElement.textContent = remaining;
        }
        if (this.myInvestmentElement) {
            this.myInvestmentElement.textContent = '$' + investment;
        }
    }

    // Render row and column numbers
    renderNumbers() {
        // Clear and render column numbers (AFC - top)
        this.numbersRowElement.innerHTML = '<div class="corner"></div>';
        for (let i = 0; i < 10; i++) {
            const numCell = document.createElement('div');
            numCell.className = 'number-cell';
            numCell.textContent = this.colNumbers[i] !== null ? this.colNumbers[i] : '?';
            this.numbersRowElement.appendChild(numCell);
        }

        // Clear and render row numbers (NFC - left side)
        this.numbersColElement.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const numCell = document.createElement('div');
            numCell.className = 'number-cell';
            numCell.textContent = this.rowNumbers[i] !== null ? this.rowNumbers[i] : '?';
            this.numbersColElement.appendChild(numCell);
        }
    }

    // Render the 10x10 grid
    renderGrid() {
        this.gridElement.innerHTML = '';
        const loggedInUser = this.getLoggedInUserName();

        // Get unique players and assign colors
        const playerColors = this.getPlayerColors();

        for (let i = 0; i < 100; i++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.dataset.index = i;

            const row = Math.floor(i / 10);
            const col = i % 10;

            if (this.squares[i]) {
                square.classList.add('taken');
                square.textContent = this.squares[i];

                // Apply player-specific color
                const playerName = this.squares[i];
                if (playerColors[playerName]) {
                    square.style.background = playerColors[playerName].gradient;
                    square.style.borderColor = playerColors[playerName].border;
                }

                // Highlight user's own squares with a special indicator
                if (playerName === loggedInUser) {
                    square.classList.add('my-square');
                }
            }

            // Check if this square is a winner
            if (this.isWinningSquare(row, col)) {
                square.classList.add('winner');
            }

            square.addEventListener('click', () => this.openModal(i));
            this.gridElement.appendChild(square);
        }

        // Update player legend
        this.renderPlayerLegend(playerColors);
    }

    // Generate consistent colors for each player based on their name
    getPlayerColors() {
        const players = [...new Set(this.squares.filter(s => s !== null))];
        const colors = {};

        // Predefined color palette with good contrast
        const palette = [
            { hue: 210, name: 'blue' },      // Blue
            { hue: 150, name: 'green' },     // Green
            { hue: 280, name: 'purple' },    // Purple
            { hue: 30, name: 'orange' },     // Orange
            { hue: 340, name: 'pink' },      // Pink
            { hue: 180, name: 'teal' },      // Teal
            { hue: 60, name: 'yellow' },     // Yellow
            { hue: 0, name: 'red' },         // Red
            { hue: 240, name: 'indigo' },    // Indigo
            { hue: 120, name: 'lime' },      // Lime
        ];

        players.forEach((player, index) => {
            const colorIndex = index % palette.length;
            const hue = palette[colorIndex].hue;

            colors[player] = {
                gradient: `linear-gradient(135deg, hsl(${hue}, 70%, 65%) 0%, hsl(${hue}, 60%, 50%) 100%)`,
                border: `hsl(${hue}, 60%, 40%)`,
                solid: `hsl(${hue}, 70%, 60%)`,
                hue: hue
            };
        });

        return colors;
    }

    // Render player color legend
    renderPlayerLegend(playerColors) {
        let legendContainer = document.getElementById('player-legend');

        // Create legend container if it doesn't exist
        if (!legendContainer) {
            const legendSection = document.querySelector('.legend');
            if (legendSection) {
                const playerLegendDiv = document.createElement('div');
                playerLegendDiv.id = 'player-legend';
                playerLegendDiv.className = 'player-legend';
                legendSection.appendChild(playerLegendDiv);
                legendContainer = playerLegendDiv;
            }
        }

        if (!legendContainer) return;

        const players = Object.keys(playerColors);
        if (players.length === 0) {
            legendContainer.innerHTML = '';
            return;
        }

        let html = '<h4>Players</h4><div class="player-legend-items">';
        players.forEach(player => {
            const color = playerColors[player];
            const squareCount = this.squares.filter(s => s === player).length;
            html += `
                <div class="player-legend-item">
                    <div class="legend-color" style="background: ${color.gradient}; border-color: ${color.border};"></div>
                    <span>${player} (${squareCount})</span>
                </div>
            `;
        });
        html += '</div>';
        legendContainer.innerHTML = html;
    }

    // Check if a square at given row/col is a winning square
    isWinningSquare(row, col) {
        if (this.rowNumbers[row] === null || this.colNumbers[col] === null) {
            return false;
        }

        const nfcNum = this.rowNumbers[row];
        const afcNum = this.colNumbers[col];

        for (const quarter of ['q1', 'q2', 'q3', 'q4']) {
            if (this.winners[quarter] &&
                this.winners[quarter].nfcNum === nfcNum &&
                this.winners[quarter].afcNum === afcNum) {
                return true;
            }
        }
        return false;
    }

    // Render scores
    renderScores() {
        for (const quarter of ['q1', 'q2', 'q3', 'q4']) {
            // Ensure scores object exists for this quarter
            if (!this.scores || !this.scores[quarter]) {
                this.scores = this.scores || {};
                this.scores[quarter] = { afc: null, nfc: null };
            }

            // Admin: populate input fields
            if (this.isAdmin && this.scoreInputs && this.scoreInputs[quarter]) {
                if (this.scores[quarter].afc !== null) {
                    this.scoreInputs[quarter].afc.value = this.scores[quarter].afc;
                }
                if (this.scores[quarter].nfc !== null) {
                    this.scoreInputs[quarter].nfc.value = this.scores[quarter].nfc;
                }
            }

            // Player: show score display
            if (this.scoreDisplays && this.scoreDisplays[quarter]) {
                const afcScore = this.scores[quarter].afc;
                const nfcScore = this.scores[quarter].nfc;
                if (afcScore !== null && nfcScore !== null) {
                    this.scoreDisplays[quarter].textContent = `${afcScore} - ${nfcScore}`;
                } else {
                    this.scoreDisplays[quarter].textContent = '- vs -';
                }
            }

            // Update winner display
            this.updateWinnerDisplay(quarter);
        }
    }

    // Update winner display for a quarter
    updateWinnerDisplay(quarter) {
        const display = this.winnerDisplays[quarter];
        if (!display) return;

        const winner = this.winners[quarter];

        if (winner && winner.player) {
            display.textContent = `Winner: ${winner.player}`;
            display.classList.add('has-winner');
        } else if (winner) {
            display.textContent = `Numbers: NE ${winner.afcNum}, SEA ${winner.nfcNum}`;
            display.classList.remove('has-winner');
        } else {
            display.textContent = '';
            display.classList.remove('has-winner');
        }
    }

    // Update statistics
    updateStats() {
        const filled = this.squares.filter(s => s !== null).length;
        const uniquePlayers = new Set(this.squares.filter(s => s !== null)).size;

        if (this.squaresFilledElement) {
            this.squaresFilledElement.textContent = filled;
        }
        if (this.squaresRemainingElement) {
            this.squaresRemainingElement.textContent = 100 - filled;
        }
        if (this.uniquePlayersElement) {
            this.uniquePlayersElement.textContent = uniquePlayers;
        }
    }

    // Render player limits table (admin only)
    renderPlayerLimitsTable() {
        if (!this.playerLimitsTable) return;

        // Get all unique players
        const players = [...new Set(this.squares.filter(s => s !== null))];

        // Add players with custom limits who might not have squares yet
        Object.keys(this.playerLimits).forEach(p => {
            if (!players.includes(p)) players.push(p);
        });

        if (players.length === 0) {
            this.playerLimitsTable.innerHTML = '<p class="no-players">No players have claimed squares yet.</p>';
            return;
        }

        let html = `
            <table class="limits-table">
                <thead>
                    <tr>
                        <th>Player</th>
                        <th>Squares Owned</th>
                        <th>Limit</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        players.sort().forEach(player => {
            const count = this.countPlayerSquares(player);
            const limit = this.getPlayerLimit(player);
            const hasCustomLimit = this.playerLimits.hasOwnProperty(player);

            html += `
                <tr>
                    <td>${player}</td>
                    <td>${count}</td>
                    <td>
                        <input type="number" class="limit-input" data-player="${player}" value="${limit}" min="1" max="100">
                        ${hasCustomLimit ? '<span class="custom-badge">Custom</span>' : ''}
                    </td>
                    <td>
                        <button class="btn btn-small btn-primary save-limit-btn" data-player="${player}">Save</button>
                        ${hasCustomLimit ? `<button class="btn btn-small btn-secondary reset-limit-btn" data-player="${player}">Reset</button>` : ''}
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        this.playerLimitsTable.innerHTML = html;

        // Attach event listeners to buttons
        this.playerLimitsTable.querySelectorAll('.save-limit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                const input = this.playerLimitsTable.querySelector(`input[data-player="${player}"]`);
                const newLimit = parseInt(input.value, 10);
                if (newLimit >= 1) {
                    this.playerLimits[player] = newLimit;
                    this.saveToStorage();
                    this.render();
                }
            });
        });

        this.playerLimitsTable.querySelectorAll('.reset-limit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const player = e.target.dataset.player;
                delete this.playerLimits[player];
                this.saveToStorage();
                this.render();
            });
        });
    }

    // Save default limit (admin)
    saveDefaultLimit() {
        const newLimit = parseInt(this.defaultLimitInput.value, 10);
        if (newLimit >= 1) {
            this.defaultLimit = newLimit;
            this.saveToStorage();
            this.render();
            alert(`Default limit set to ${newLimit} squares per player.`);
        }
    }

    // Add player limit (admin)
    addPlayerLimit() {
        const nameInput = document.getElementById('new-player-name');
        const limitInput = document.getElementById('new-player-limit');
        const playerName = nameInput.value.trim();
        const limit = parseInt(limitInput.value, 10);

        if (!playerName) {
            alert('Please enter a player name.');
            return;
        }
        if (limit < 1) {
            alert('Limit must be at least 1.');
            return;
        }

        this.playerLimits[playerName] = limit;
        this.saveToStorage();
        this.render();
        nameInput.value = '';
        alert(`Limit for ${playerName} set to ${limit} squares.`);
    }

    // Open modal for a square
    openModal(index) {
        // Warn if Firebase isn't ready yet
        if (!this.firebaseReady) {
            alert('Please wait - connecting to server...');
            return;
        }

        this.currentSquareIndex = index;
        const row = Math.floor(index / 10);
        const col = index % 10;
        const currentOwner = this.squares[index];
        const loggedInUser = this.getLoggedInUserName();

        this.modalRow.textContent = row + 1;
        this.modalCol.textContent = col + 1;
        this.modalPlayerName.textContent = loggedInUser;

        // Check if player can claim more
        const canClaim = this.canPlayerClaimMore(loggedInUser);
        const playerLimit = this.getPlayerLimit(loggedInUser);
        const playerCount = this.countPlayerSquares(loggedInUser);

        // Clear limit warning
        if (this.modalLimitWarning) {
            this.modalLimitWarning.textContent = '';
            this.modalLimitWarning.style.display = 'none';
        }

        // Update modal based on square state
        if (currentOwner) {
            this.modalTitle.textContent = 'Square Already Claimed';
            this.modalCurrentOwner.textContent = `Currently owned by: ${currentOwner}`;
            this.modalCurrentOwner.style.display = 'block';
            document.getElementById('save-player').style.display = 'none';
            document.getElementById('clear-square').style.display = currentOwner === loggedInUser ? 'inline-block' : 'none';
        } else {
            this.modalTitle.textContent = 'Claim This Square';
            this.modalCurrentOwner.textContent = '';
            this.modalCurrentOwner.style.display = 'none';

            if (!canClaim && !this.isAdmin) {
                document.getElementById('save-player').style.display = 'none';
                if (this.modalLimitWarning) {
                    this.modalLimitWarning.textContent = `You've reached your limit of ${playerLimit} squares. Contact the admin to increase your limit.`;
                    this.modalLimitWarning.style.display = 'block';
                }
            } else {
                document.getElementById('save-player').style.display = 'inline-block';
                if (this.modalLimitWarning && !this.isAdmin) {
                    this.modalLimitWarning.textContent = `You have ${playerLimit - playerCount - 1} squares remaining after this claim.`;
                    this.modalLimitWarning.style.display = 'block';
                    this.modalLimitWarning.classList.remove('warning');
                    this.modalLimitWarning.classList.add('info');
                }
            }
            document.getElementById('clear-square').style.display = 'none';
        }

        this.modal.classList.add('active');
    }

    // Close modal
    closeModal() {
        this.modal.classList.remove('active');
        this.currentSquareIndex = null;
    }

    // Save player name from modal
    savePlayer() {
        if (this.currentSquareIndex === null) return;

        const name = this.getLoggedInUserName();
        if (name && name !== 'Guest') {
            // Check limit (admin can bypass)
            if (!this.isAdmin && !this.canPlayerClaimMore(name)) {
                alert(`You've reached your limit of ${this.getPlayerLimit(name)} squares.`);
                this.closeModal();
                return;
            }

            this.squares[this.currentSquareIndex] = name;
            this.saveToStorage();
            this.render();
        }
        this.closeModal();
    }

    // Clear a square
    clearSquare() {
        if (this.currentSquareIndex === null) return;

        this.squares[this.currentSquareIndex] = null;
        this.saveToStorage();
        this.render();
        this.closeModal();
    }

    // Randomize numbers (admin only)
    randomizeNumbers() {
        if (this.colNumbers.some(n => n !== null) || this.rowNumbers.some(n => n !== null)) {
            if (!confirm('This will replace existing numbers. Are you sure?')) {
                return;
            }
        }

        const shuffle = (array) => {
            const arr = [...array];
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        this.colNumbers = shuffle(numbers);
        this.rowNumbers = shuffle(numbers);

        this.saveToStorage();
        this.render();
    }

    // Clear numbers (admin only)
    clearNumbers() {
        if (!confirm('Are you sure you want to clear all numbers?')) {
            return;
        }

        this.colNumbers = Array(10).fill(null);
        this.rowNumbers = Array(10).fill(null);
        this.winners = { q1: null, q2: null, q3: null, q4: null };

        this.saveToStorage();
        this.render();
    }

    // Reset all data (admin only)
    resetAll() {
        if (!confirm('This will reset ALL data including squares, numbers, and scores. Are you sure?')) {
            return;
        }

        this.squares = Array(100).fill(null);
        this.rowNumbers = Array(10).fill(null);
        this.colNumbers = Array(10).fill(null);
        this.scores = {
            q1: { afc: null, nfc: null },
            q2: { afc: null, nfc: null },
            q3: { afc: null, nfc: null },
            q4: { afc: null, nfc: null }
        };
        this.winners = { q1: null, q2: null, q3: null, q4: null };
        this.playerLimits = {};
        this.defaultLimit = 5;

        if (this.scoreInputs) {
            for (const quarter of ['q1', 'q2', 'q3', 'q4']) {
                this.scoreInputs[quarter].afc.value = '';
                this.scoreInputs[quarter].nfc.value = '';
            }
        }

        this.saveToStorage();
        this.render();
    }

    // Update scores (admin only)
    updateScores() {
        if (!this.scoreInputs) return;

        for (const quarter of ['q1', 'q2', 'q3', 'q4']) {
            const afcVal = this.scoreInputs[quarter].afc.value;
            const nfcVal = this.scoreInputs[quarter].nfc.value;

            this.scores[quarter].afc = afcVal !== '' ? parseInt(afcVal, 10) : null;
            this.scores[quarter].nfc = nfcVal !== '' ? parseInt(nfcVal, 10) : null;

            this.calculateWinner(quarter);
        }

        this.saveToStorage();
        this.render();
    }

    // Calculate winner for a quarter
    calculateWinner(quarter) {
        const afcScore = this.scores[quarter].afc;
        const nfcScore = this.scores[quarter].nfc;

        if (afcScore === null || nfcScore === null) {
            this.winners[quarter] = null;
            return;
        }

        const afcNum = afcScore % 10;
        const nfcNum = nfcScore % 10;

        const colIndex = this.colNumbers.indexOf(afcNum);
        const rowIndex = this.rowNumbers.indexOf(nfcNum);

        if (colIndex === -1 || rowIndex === -1) {
            this.winners[quarter] = { afcNum, nfcNum, player: null };
            return;
        }

        const squareIndex = rowIndex * 10 + colIndex;
        const player = this.squares[squareIndex];

        this.winners[quarter] = {
            afcNum,
            nfcNum,
            player: player || '(Unclaimed square)',
            squareIndex
        };
    }

    // Export data (admin only)
    exportData() {
        const data = {
            squares: this.squares,
            rowNumbers: this.rowNumbers,
            colNumbers: this.colNumbers,
            teams: this.teams,
            scores: this.scores,
            winners: this.winners,
            defaultLimit: this.defaultLimit,
            playerLimits: this.playerLimits,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `superbowl-squares-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Import data (admin only)
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.squares || !Array.isArray(data.squares) || data.squares.length !== 100) {
                    throw new Error('Invalid data format');
                }

                this.squares = data.squares;
                this.rowNumbers = data.rowNumbers || Array(10).fill(null);
                this.colNumbers = data.colNumbers || Array(10).fill(null);
                this.teams = data.teams || { afc: 'New England Patriots', nfc: 'Seattle Seahawks' };
                this.scores = data.scores || {
                    q1: { afc: null, nfc: null },
                    q2: { afc: null, nfc: null },
                    q3: { afc: null, nfc: null },
                    q4: { afc: null, nfc: null }
                };
                this.winners = data.winners || { q1: null, q2: null, q3: null, q4: null };
                this.defaultLimit = data.defaultLimit || 5;
                this.playerLimits = data.playerLimits || {};

                this.saveToStorage();
                this.render();
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data: ' + error.message);
            }
        };
        reader.readAsText(file);

        event.target.value = '';
    }

    // Save to localStorage (and Firebase if available)
    saveToStorage() {
        const filledCount = this.squares.filter(s => s !== null).length;
        console.log('=== SAVE TRIGGERED ===');
        console.log('Filled squares:', filledCount);
        console.log('useFirebase:', this.useFirebase);
        console.log('firebaseReady:', this.firebaseReady);

        const data = {
            squares: this.squares,
            rowNumbers: this.rowNumbers,
            colNumbers: this.colNumbers,
            teams: this.teams,
            scores: this.scores,
            winners: this.winners,
            defaultLimit: this.defaultLimit,
            playerLimits: this.playerLimits
        };

        // Always save to localStorage as backup
        localStorage.setItem('superbowlSquares', JSON.stringify(data));
        console.log('Saved to localStorage');

        // Save to Firebase if available
        if (this.useFirebase && typeof saveToFirebase === 'function') {
            console.log('Calling saveToFirebase...');
            this.updateSyncStatus('connecting', 'Saving...');
            saveToFirebase(data).then(saved => {
                if (saved) {
                    console.log('Firebase save successful!');
                    this.updateSyncStatus('online', 'Saved (' + filledCount + ' squares)');
                } else {
                    console.error('Firebase save returned false');
                    this.updateSyncStatus('offline', 'Save failed!');
                }
            }).catch(err => {
                console.error('Firebase save error:', err);
                this.updateSyncStatus('offline', 'Save error!');
            });
        } else {
            console.log('Firebase not available: useFirebase=' + this.useFirebase);
        }
    }

    // Load from localStorage (or Firebase if available)
    loadFromStorage() {
        const saved = localStorage.getItem('superbowlSquares');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.applyData(data);
            } catch (error) {
                console.error('Error loading from storage:', error);
            }
        }
    }

    // Convert Firebase object format back to array
    // Firebase converts sparse arrays like [null, null, "name", null] to objects like {2: "name"}
    firebaseArrayToArray(obj, length) {
        if (Array.isArray(obj)) {
            return obj;
        }
        if (!obj || typeof obj !== 'object') {
            return Array(length).fill(null);
        }
        // Convert object with numeric keys to array
        const arr = Array(length).fill(null);
        for (const key in obj) {
            const index = parseInt(key, 10);
            if (!isNaN(index) && index >= 0 && index < length) {
                arr[index] = obj[key];
            }
        }
        return arr;
    }

    // Apply data from any source (localStorage or Firebase)
    applyData(data) {
        if (!data || typeof data !== 'object') {
            console.warn('Invalid data received, ignoring');
            return;
        }

        // Convert squares from Firebase object format if needed
        this.squares = this.firebaseArrayToArray(data.squares, 100);
        this.rowNumbers = this.firebaseArrayToArray(data.rowNumbers, 10);
        this.colNumbers = this.firebaseArrayToArray(data.colNumbers, 10);

        this.teams = data.teams || { afc: 'New England Patriots', nfc: 'Seattle Seahawks' };

        // Ensure scores object has all quarters with proper structure
        const defaultScores = {
            q1: { afc: null, nfc: null },
            q2: { afc: null, nfc: null },
            q3: { afc: null, nfc: null },
            q4: { afc: null, nfc: null }
        };
        this.scores = { ...defaultScores };
        if (data.scores) {
            for (const quarter of ['q1', 'q2', 'q3', 'q4']) {
                if (data.scores[quarter]) {
                    this.scores[quarter] = {
                        afc: data.scores[quarter].afc ?? null,
                        nfc: data.scores[quarter].nfc ?? null
                    };
                }
            }
        }

        // Ensure winners object has all quarters
        const defaultWinners = { q1: null, q2: null, q3: null, q4: null };
        this.winners = { ...defaultWinners, ...data.winners };

        this.defaultLimit = data.defaultLimit || 5;
        this.playerLimits = data.playerLimits || {};
    }

    // Update sync status indicator
    updateSyncStatus(status, message) {
        if (!this.syncStatusElement) return;

        const dot = this.syncStatusElement.querySelector('.status-dot');
        const text = this.syncStatusElement.querySelector('.status-text');

        if (dot) {
            dot.className = 'status-dot ' + status;
        }
        if (text) {
            text.textContent = message;
        }
    }

    // Handle real-time updates from Firebase
    onFirebaseDataUpdate(data) {
        console.log('=== Firebase Update Received ===');

        // Count filled squares (handle both array and object formats from Firebase)
        let filledSquares = 0;
        if (data.squares) {
            if (Array.isArray(data.squares)) {
                filledSquares = data.squares.filter(s => s !== null).length;
            } else {
                // Firebase converts sparse arrays to objects
                filledSquares = Object.keys(data.squares).length;
            }
        }
        console.log('Filled squares in update:', filledSquares);

        // Don't update if modal is open (user is in the middle of an action)
        if (this.modal && this.modal.classList.contains('active')) {
            console.log('Modal open, skipping update');
            return;
        }

        this.applyData(data);
        this.render();
        this.updateSyncStatus('online', 'Synced (' + filledSquares + ' squares)');
        console.log('UI updated from Firebase');
    }

    // Initialize Firebase connection
    async initFirebase() {
        this.updateSyncStatus('connecting', 'Connecting to Firebase...');

        if (typeof initializeFirebase !== 'function') {
            console.log('Firebase not available, using localStorage only');
            // Fall back to localStorage
            this.loadFromStorage();
            this.render();
            this.firebaseReady = true;
            this.updateSyncStatus('offline', 'Local storage only');
            return;
        }

        try {
            const initialized = await initializeFirebase();
            if (initialized) {
                this.useFirebase = true;
                this.updateSyncStatus('connecting', 'Loading data...');

                // Load initial data from Firebase
                const firebaseData = await loadFromFirebase();
                if (firebaseData) {
                    console.log('Loaded data from Firebase');
                    this.applyData(firebaseData);
                } else {
                    console.log('Firebase empty, starting fresh');
                    // Don't load from localStorage - start fresh for new games
                }

                this.render();
                this.firebaseReady = true;

                // Listen for real-time updates
                onFirebaseUpdate((data) => this.onFirebaseDataUpdate(data));

                const filledCount = this.squares.filter(s => s !== null).length;
                this.updateSyncStatus('online', 'Connected (' + filledCount + ' squares)');
                console.log('Firebase sync enabled - data will sync across all users');
            } else {
                // Fall back to localStorage
                this.loadFromStorage();
                this.render();
                this.firebaseReady = true;
                this.updateSyncStatus('offline', 'Firebase not configured');
            }
        } catch (error) {
            console.error('Firebase initialization failed, using localStorage:', error);
            this.useFirebase = false;
            // Fall back to localStorage
            this.loadFromStorage();
            this.render();
            this.firebaseReady = true;
            this.updateSyncStatus('offline', 'Firebase error - using local');
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new SuperBowlSquares();
});
