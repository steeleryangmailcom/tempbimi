// Live Score Updates for Super Bowl Squares
// Uses ESPN's public API to fetch live NFL scores

class LiveScoreUpdater {
    constructor() {
        // ESPN API endpoint for NFL scoreboard
        this.apiUrl = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

        // Team identifiers
        this.teams = {
            afc: {
                name: 'New England Patriots',
                espnId: '17',
                abbreviation: 'NE'
            },
            nfc: {
                name: 'Seattle Seahawks',
                espnId: '26',
                abbreviation: 'SEA'
            }
        };

        // Update interval (in milliseconds)
        this.updateInterval = 30000; // 30 seconds
        this.intervalId = null;
        this.isRunning = false;

        // Callbacks
        this.onScoreUpdate = null;
        this.onError = null;
        this.onStatusChange = null;
    }

    // Find the game between our two teams
    findGame(data) {
        if (!data || !data.events) {
            return null;
        }

        for (const event of data.events) {
            const competitors = event.competitions?.[0]?.competitors || [];

            const teamIds = competitors.map(c => c.team?.id);

            // Check if both our teams are in this game
            if (teamIds.includes(this.teams.afc.espnId) &&
                teamIds.includes(this.teams.nfc.espnId)) {
                return event;
            }

            // Also check by abbreviation
            const teamAbbrevs = competitors.map(c => c.team?.abbreviation);
            if (teamAbbrevs.includes(this.teams.afc.abbreviation) &&
                teamAbbrevs.includes(this.teams.nfc.abbreviation)) {
                return event;
            }
        }

        return null;
    }

    // Parse scores from the game data
    parseScores(game) {
        if (!game) {
            return null;
        }

        const competition = game.competitions?.[0];
        if (!competition) {
            return null;
        }

        const competitors = competition.competitors || [];
        const status = competition.status || {};

        let afcScore = null;
        let nfcScore = null;
        let afcTeam = null;
        let nfcTeam = null;

        for (const competitor of competitors) {
            const teamAbbrev = competitor.team?.abbreviation;
            const teamId = competitor.team?.id;
            const score = parseInt(competitor.score, 10);

            if (teamAbbrev === this.teams.afc.abbreviation || teamId === this.teams.afc.espnId) {
                afcScore = isNaN(score) ? 0 : score;
                afcTeam = competitor.team;
            } else if (teamAbbrev === this.teams.nfc.abbreviation || teamId === this.teams.nfc.espnId) {
                nfcScore = isNaN(score) ? 0 : score;
                nfcTeam = competitor.team;
            }
        }

        // Get quarter/period info
        const period = status.period || 0;
        const displayClock = status.displayClock || '';
        const statusType = status.type?.name || 'STATUS_SCHEDULED';
        const statusDescription = status.type?.description || 'Scheduled';

        // Get line scores (scores by quarter)
        const afcLineScores = competitors.find(c =>
            c.team?.abbreviation === this.teams.afc.abbreviation ||
            c.team?.id === this.teams.afc.espnId
        )?.linescores || [];

        const nfcLineScores = competitors.find(c =>
            c.team?.abbreviation === this.teams.nfc.abbreviation ||
            c.team?.id === this.teams.nfc.espnId
        )?.linescores || [];

        // Calculate cumulative scores by quarter
        const quarterScores = {
            q1: { afc: null, nfc: null },
            q2: { afc: null, nfc: null },
            q3: { afc: null, nfc: null },
            q4: { afc: null, nfc: null }
        };

        // Calculate cumulative scores for each quarter
        if (afcLineScores.length > 0 && nfcLineScores.length > 0) {
            let afcCumulative = 0;
            let nfcCumulative = 0;

            for (let i = 0; i < 4; i++) {
                if (afcLineScores[i] !== undefined) {
                    afcCumulative += parseInt(afcLineScores[i].value, 10) || 0;
                    quarterScores[`q${i + 1}`].afc = afcCumulative;
                }
                if (nfcLineScores[i] !== undefined) {
                    nfcCumulative += parseInt(nfcLineScores[i].value, 10) || 0;
                    quarterScores[`q${i + 1}`].nfc = nfcCumulative;
                }
            }
        }

        return {
            afcScore,
            nfcScore,
            afcTeam: afcTeam?.displayName || this.teams.afc.name,
            nfcTeam: nfcTeam?.displayName || this.teams.nfc.name,
            period,
            displayClock,
            status: statusType,
            statusDescription,
            quarterScores,
            isLive: statusType === 'STATUS_IN_PROGRESS',
            isComplete: statusType === 'STATUS_FINAL',
            isScheduled: statusType === 'STATUS_SCHEDULED',
            gameDate: game.date,
            gameName: game.name || 'Super Bowl'
        };
    }

    // Fetch latest scores
    async fetchScores() {
        try {
            const response = await fetch(this.apiUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const game = this.findGame(data);

            if (!game) {
                return {
                    success: false,
                    error: 'Game not found. The game between Patriots and Seahawks may not be scheduled yet.',
                    data: null
                };
            }

            const scores = this.parseScores(game);

            return {
                success: true,
                error: null,
                data: scores
            };

        } catch (error) {
            console.error('Error fetching scores:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // Start auto-updating
    startAutoUpdate(intervalMs = null) {
        if (this.isRunning) {
            return;
        }

        const interval = intervalMs || this.updateInterval;
        this.isRunning = true;

        if (this.onStatusChange) {
            this.onStatusChange(true);
        }

        // Fetch immediately
        this.update();

        // Then fetch on interval
        this.intervalId = setInterval(() => {
            this.update();
        }, interval);

        console.log(`Live score updates started (every ${interval / 1000} seconds)`);
    }

    // Stop auto-updating
    stopAutoUpdate() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;

        if (this.onStatusChange) {
            this.onStatusChange(false);
        }

        console.log('Live score updates stopped');
    }

    // Perform a single update
    async update() {
        const result = await this.fetchScores();

        if (result.success && result.data) {
            if (this.onScoreUpdate) {
                this.onScoreUpdate(result.data);
            }
        } else {
            if (this.onError) {
                this.onError(result.error);
            }
        }

        return result;
    }

    // Set team configuration
    setTeams(afcTeam, nfcTeam) {
        // Common NFL team mappings
        const teamMappings = {
            'patriots': { espnId: '17', abbreviation: 'NE', name: 'New England Patriots' },
            'new england patriots': { espnId: '17', abbreviation: 'NE', name: 'New England Patriots' },
            'ne': { espnId: '17', abbreviation: 'NE', name: 'New England Patriots' },
            'seahawks': { espnId: '26', abbreviation: 'SEA', name: 'Seattle Seahawks' },
            'seattle seahawks': { espnId: '26', abbreviation: 'SEA', name: 'Seattle Seahawks' },
            'sea': { espnId: '26', abbreviation: 'SEA', name: 'Seattle Seahawks' },
            'chiefs': { espnId: '12', abbreviation: 'KC', name: 'Kansas City Chiefs' },
            'kansas city chiefs': { espnId: '12', abbreviation: 'KC', name: 'Kansas City Chiefs' },
            'kc': { espnId: '12', abbreviation: 'KC', name: 'Kansas City Chiefs' },
            'eagles': { espnId: '21', abbreviation: 'PHI', name: 'Philadelphia Eagles' },
            'philadelphia eagles': { espnId: '21', abbreviation: 'PHI', name: 'Philadelphia Eagles' },
            'phi': { espnId: '21', abbreviation: 'PHI', name: 'Philadelphia Eagles' },
            '49ers': { espnId: '25', abbreviation: 'SF', name: 'San Francisco 49ers' },
            'san francisco 49ers': { espnId: '25', abbreviation: 'SF', name: 'San Francisco 49ers' },
            'sf': { espnId: '25', abbreviation: 'SF', name: 'San Francisco 49ers' },
            'ravens': { espnId: '33', abbreviation: 'BAL', name: 'Baltimore Ravens' },
            'baltimore ravens': { espnId: '33', abbreviation: 'BAL', name: 'Baltimore Ravens' },
            'bal': { espnId: '33', abbreviation: 'BAL', name: 'Baltimore Ravens' },
            'bills': { espnId: '2', abbreviation: 'BUF', name: 'Buffalo Bills' },
            'buffalo bills': { espnId: '2', abbreviation: 'BUF', name: 'Buffalo Bills' },
            'buf': { espnId: '2', abbreviation: 'BUF', name: 'Buffalo Bills' },
            'lions': { espnId: '8', abbreviation: 'DET', name: 'Detroit Lions' },
            'detroit lions': { espnId: '8', abbreviation: 'DET', name: 'Detroit Lions' },
            'det': { espnId: '8', abbreviation: 'DET', name: 'Detroit Lions' },
            'cowboys': { espnId: '6', abbreviation: 'DAL', name: 'Dallas Cowboys' },
            'dallas cowboys': { espnId: '6', abbreviation: 'DAL', name: 'Dallas Cowboys' },
            'dal': { espnId: '6', abbreviation: 'DAL', name: 'Dallas Cowboys' },
            'packers': { espnId: '9', abbreviation: 'GB', name: 'Green Bay Packers' },
            'green bay packers': { espnId: '9', abbreviation: 'GB', name: 'Green Bay Packers' },
            'gb': { espnId: '9', abbreviation: 'GB', name: 'Green Bay Packers' }
        };

        const afcLower = afcTeam.toLowerCase();
        const nfcLower = nfcTeam.toLowerCase();

        if (teamMappings[afcLower]) {
            this.teams.afc = teamMappings[afcLower];
        }

        if (teamMappings[nfcLower]) {
            this.teams.nfc = teamMappings[nfcLower];
        }
    }
}

// Create global instance
const liveScores = new LiveScoreUpdater();
