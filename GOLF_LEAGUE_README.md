# Golf League Application

This is a simple golf league management application that stores data locally and provides a way to save data to your GitHub repository.

## How to Use

### 1. Open the Application
- Simply open `index.html` in your web browser
- The application will load any previously saved data from your browser's localStorage

### 2. Using the Application
- **Add Players**: Enter player names and click "Add Player"
- **Check-in Players**: Click "Check In" next to player names when they arrive
- **Generate Matches**: Click "Generate Tonight's Matches" to create match pairings
- **Record Matches**: Select players and enter scores for each hole
- **View Leaderboard**: See current standings and statistics

### 3. Saving Data to GitHub
After making changes in the application:

1. **Download the Data**: A download link will appear at the bottom of the page saying "Download data.json (save this to your GitHub repo)"
2. **Click the Download Link**: This will download a `data.json` file with all your current data
3. **Replace the File**: Replace the existing `data.json` file in your GitHub repository with the downloaded file
4. **Commit and Push**: Commit the changes to your GitHub repository

### 4. Data Structure
The `data.json` file contains:
- `players`: Array of player names
- `matches`: Array of completed matches with scores and results
- `leaderboard`: Object with player statistics (points, matches, wins)
- `checkedInPlayers`: Array of currently checked-in players
- `matchQueue`: Array of scheduled matches
- `currentMatchIndex`: Index of the currently active match
- `lastUpdated`: Timestamp of last data update

### 5. Features
- **Player Management**: Add and remove players
- **Check-in System**: Track who's present for the evening
- **Match Generation**: Automatically create fair match pairings
- **Score Recording**: Record 3-hole match play scores
- **Leaderboard**: Track points, matches played, and win rates
- **Match History**: View all completed matches
- **Local Storage**: Data persists between browser sessions

### 6. Scoring System
- **Win**: 3 points
- **Loss**: 0 points  
- **Tie**: 1 point each

The application automatically calculates match results based on hole-by-hole scoring.

## Files
- `index.html` - The main application (open this in your browser)
- `data.json` - Data storage file (committed to GitHub)
- `save-data.js` - Helper script for data saving (optional)

## No Server Required
This application works entirely in the browser and saves data locally. The only external dependency is your GitHub repository for persistent data storage. 