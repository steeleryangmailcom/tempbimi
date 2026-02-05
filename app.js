// Super Bowl Squares Application
// Manages a 10x10 grid for Super Bowl squares contest

class SuperBowlSquares {
    constructor() {
        // Game state
        this.squares = Array(100).fill(null); // Player names for each square
        this.rowNumbers = Array(10).fill(null); // NFC team numbers (left side)
        this.colNumbers = Array(10).fill(null); // AFC team numbers (top)
        this.teams = {
            afc: 'AFC',
            nfc: 'NFC'
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

        // Current modal state
        this.currentSquareIndex = null;

        // Initialize
        this.loadFromStorage();
        this.initializeDOM();
        this.render();
        this.attachEventListeners();
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
        this.modalRow = document.getElementById('modal-row');
        this.modalCol = document.getElementById('modal-col');

        // Team inputs
        this.teamAfcInput = document.getElementById('team-afc');
        this.teamNfcInput = document.getElementById('team-nfc');
        this.afcLabel = document.getElementById('afc-label');
        this.nfcLabel = document.getElementById('nfc-label');

        // Score inputs
        this.scoreInputs = {
            q1: { afc: document.getElementById('q1-afc'), nfc: document.getElementById('q1-nfc') },
            q2: { afc: document.getElementById('q2-afc'), nfc: document.getElementById('q2-nfc') },
            q3: { afc: document.getElementById('q3-afc'), nfc: document.getElementById('q3-nfc') },
            q4: { afc: document.getElementById('q4-afc'), nfc: document.getElementById('q4-nfc') }
        };

        // Winner displays
        this.winnerDisplays = {
            q1: document.getElementById('q1-winner'),
            q2: document.getElementById('q2-winner'),
            q3: document.getElementById('q3-winner'),
            q4: document.getElementById('q4-winner')
        };

        // Stats
        this.squaresFilledElement = document.getElementById('squares-filled');
        this.squaresRemainingElement = document.getElementById('squares-remaining');
        this.uniquePlayersElement = document.getElementById('unique-players');
    }

    // Attach event listeners
    attachEventListeners() {
        // Save teams button
        document.getElementById('save-teams').addEventListener('click', () => this.saveTeams());

        // Randomize numbers button
        document.getElementById('randomize-numbers').addEventListener('click', () => this.randomizeNumbers());

        // Clear numbers button
        document.getElementById('clear-numbers').addEventListener('click', () => this.clearNumbers());

        // Reset all button
        document.getElementById('reset-all').addEventListener('click', () => this.resetAll());

        // Export button
        document.getElementById('export-data').addEventListener('click', () => this.exportData());

        // Import button
        document.getElementById('import-data').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        // Import file handler
        document.getElementById('import-file').addEventListener('change', (e) => this.importData(e));

        // Update scores button
        document.getElementById('update-scores').addEventListener('click', () => this.updateScores());

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
    }

    // Render the entire board
    render() {
        this.renderNumbers();
        this.renderGrid();
        this.renderTeamLabels();
        this.renderScores();
        this.updateStats();
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

        for (let i = 0; i < 100; i++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.dataset.index = i;

            const row = Math.floor(i / 10);
            const col = i % 10;

            if (this.squares[i]) {
                square.classList.add('taken');
                square.textContent = this.squares[i];
            }

            // Check if this square is a winner
            if (this.isWinningSquare(row, col)) {
                square.classList.add('winner');
            }

            square.addEventListener('click', () => this.openModal(i));
            this.gridElement.appendChild(square);
        }
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

    // Render team labels
    renderTeamLabels() {
        this.teamAfcInput.value = this.teams.afc;
        this.teamNfcInput.value = this.teams.nfc;
        this.afcLabel.textContent = this.teams.afc;
        this.nfcLabel.textContent = this.teams.nfc;
    }

    // Render scores
    renderScores() {
        for (const quarter of ['q1', 'q2', 'q3', 'q4']) {
            if (this.scores[quarter].afc !== null) {
                this.scoreInputs[quarter].afc.value = this.scores[quarter].afc;
            }
            if (this.scores[quarter].nfc !== null) {
                this.scoreInputs[quarter].nfc.value = this.scores[quarter].nfc;
            }

            // Update winner display
            this.updateWinnerDisplay(quarter);
        }
    }

    // Update winner display for a quarter
    updateWinnerDisplay(quarter) {
        const display = this.winnerDisplays[quarter];
        const winner = this.winners[quarter];

        if (winner && winner.player) {
            display.textContent = `Winner: ${winner.player}`;
            display.classList.add('has-winner');
        } else if (winner) {
            display.textContent = `Winning numbers: ${this.teams.afc} ${winner.afcNum}, ${this.teams.nfc} ${winner.nfcNum}`;
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

        this.squaresFilledElement.textContent = filled;
        this.squaresRemainingElement.textContent = 100 - filled;
        this.uniquePlayersElement.textContent = uniquePlayers;
    }

    // Get logged-in user's display name
    getLoggedInUserName() {
        if (typeof authManager !== 'undefined' && authManager.isLoggedIn()) {
            return authManager.getDisplayName();
        }
        return 'Guest';
    }

    // Open modal for a square
    openModal(index) {
        this.currentSquareIndex = index;
        const row = Math.floor(index / 10);
        const col = index % 10;
        const currentOwner = this.squares[index];
        const loggedInUser = this.getLoggedInUserName();

        this.modalRow.textContent = row + 1;
        this.modalCol.textContent = col + 1;
        this.modalPlayerName.textContent = loggedInUser;

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
            document.getElementById('save-player').style.display = 'inline-block';
            document.getElementById('clear-square').style.display = 'none';
        }

        this.modal.classList.add('active');
    }

    // Close modal
    closeModal() {
        this.modal.classList.remove('active');
        this.currentSquareIndex = null;
    }

    // Save player name from modal (uses logged-in user's name)
    savePlayer() {
        if (this.currentSquareIndex === null) return;

        const name = this.getLoggedInUserName();
        if (name && name !== 'Guest') {
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

    // Save teams
    saveTeams() {
        this.teams.afc = this.teamAfcInput.value.trim() || 'AFC';
        this.teams.nfc = this.teamNfcInput.value.trim() || 'NFC';
        this.saveToStorage();
        this.render();
    }

    // Randomize numbers
    randomizeNumbers() {
        // Confirm if numbers already exist
        if (this.colNumbers.some(n => n !== null) || this.rowNumbers.some(n => n !== null)) {
            if (!confirm('This will replace existing numbers. Are you sure?')) {
                return;
            }
        }

        // Fisher-Yates shuffle
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

    // Clear numbers
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

    // Reset all data
    resetAll() {
        if (!confirm('This will reset ALL data including squares, numbers, and scores. Are you sure?')) {
            return;
        }

        this.squares = Array(100).fill(null);
        this.rowNumbers = Array(10).fill(null);
        this.colNumbers = Array(10).fill(null);
        this.teams = { afc: 'AFC', nfc: 'NFC' };
        this.scores = {
            q1: { afc: null, nfc: null },
            q2: { afc: null, nfc: null },
            q3: { afc: null, nfc: null },
            q4: { afc: null, nfc: null }
        };
        this.winners = { q1: null, q2: null, q3: null, q4: null };

        // Clear score inputs
        for (const quarter of ['q1', 'q2', 'q3', 'q4']) {
            this.scoreInputs[quarter].afc.value = '';
            this.scoreInputs[quarter].nfc.value = '';
        }

        this.saveToStorage();
        this.render();
    }

    // Update scores and find winners
    updateScores() {
        // Read scores from inputs
        for (const quarter of ['q1', 'q2', 'q3', 'q4']) {
            const afcVal = this.scoreInputs[quarter].afc.value;
            const nfcVal = this.scoreInputs[quarter].nfc.value;

            this.scores[quarter].afc = afcVal !== '' ? parseInt(afcVal, 10) : null;
            this.scores[quarter].nfc = nfcVal !== '' ? parseInt(nfcVal, 10) : null;

            // Calculate winner for this quarter
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

        // Get last digit of each score
        const afcNum = afcScore % 10;
        const nfcNum = nfcScore % 10;

        // Find the square with matching numbers
        const colIndex = this.colNumbers.indexOf(afcNum);
        const rowIndex = this.rowNumbers.indexOf(nfcNum);

        if (colIndex === -1 || rowIndex === -1) {
            // Numbers not assigned yet
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

    // Export data to JSON file
    exportData() {
        const data = {
            squares: this.squares,
            rowNumbers: this.rowNumbers,
            colNumbers: this.colNumbers,
            teams: this.teams,
            scores: this.scores,
            winners: this.winners,
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

    // Import data from JSON file
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate data structure
                if (!data.squares || !Array.isArray(data.squares) || data.squares.length !== 100) {
                    throw new Error('Invalid data format');
                }

                // Import data
                this.squares = data.squares;
                this.rowNumbers = data.rowNumbers || Array(10).fill(null);
                this.colNumbers = data.colNumbers || Array(10).fill(null);
                this.teams = data.teams || { afc: 'AFC', nfc: 'NFC' };
                this.scores = data.scores || {
                    q1: { afc: null, nfc: null },
                    q2: { afc: null, nfc: null },
                    q3: { afc: null, nfc: null },
                    q4: { afc: null, nfc: null }
                };
                this.winners = data.winners || { q1: null, q2: null, q3: null, q4: null };

                this.saveToStorage();
                this.render();
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data: ' + error.message);
            }
        };
        reader.readAsText(file);

        // Reset file input
        event.target.value = '';
    }

    // Save to localStorage
    saveToStorage() {
        const data = {
            squares: this.squares,
            rowNumbers: this.rowNumbers,
            colNumbers: this.colNumbers,
            teams: this.teams,
            scores: this.scores,
            winners: this.winners
        };
        localStorage.setItem('superbowlSquares', JSON.stringify(data));
    }

    // Load from localStorage
    loadFromStorage() {
        const saved = localStorage.getItem('superbowlSquares');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.squares = data.squares || Array(100).fill(null);
                this.rowNumbers = data.rowNumbers || Array(10).fill(null);
                this.colNumbers = data.colNumbers || Array(10).fill(null);
                this.teams = data.teams || { afc: 'AFC', nfc: 'NFC' };
                this.scores = data.scores || {
                    q1: { afc: null, nfc: null },
                    q2: { afc: null, nfc: null },
                    q3: { afc: null, nfc: null },
                    q4: { afc: null, nfc: null }
                };
                this.winners = data.winners || { q1: null, q2: null, q3: null, q4: null };
            } catch (error) {
                console.error('Error loading from storage:', error);
            }
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new SuperBowlSquares();
});
