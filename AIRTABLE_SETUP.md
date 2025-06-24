# 🏌️ Airtable Integration Setup Guide

This guide will help you set up Airtable as the backend for your Golf League Tournament app using Personal Access Tokens (required as of February 2024).

## 📋 Prerequisites

1. An Airtable account (free tier works great!)
2. Node.js installed on your computer
3. The golf league app files

## 🗄️ Step 1: Create Your Airtable Base

### 1.1 Create a New Base
1. Go to [airtable.com](https://airtable.com) and sign in
2. Click "Add a base" → "Start from scratch"
3. Name it "Golf League Tournament"

### 1.2 Create the Required Tables

You'll need to create **6 tables** in your Airtable base:

#### Table 1: Players
- **Name** (Single line text) - Primary field
- **Created** (Date) - When the player was added

#### Table 2: Matches
- **Player1** (Single line text) - First player
- **Player2** (Single line text) - Second player
- **Scores** (Long text) - JSON string of scores
- **Winner** (Single line text) - Winner name or "Tie"
- **Points** (Long text) - JSON string of points awarded
- **HoleResults** (Long text) - JSON string of hole results
- **PlayedAt** (Date) - When match was played

#### Table 3: Leaderboard
- **Player** (Single line text) - Player name
- **Points** (Number) - Total points
- **Matches** (Number) - Total matches played
- **Wins** (Number) - Total wins
- **Created** (Date) - When entry was created

#### Table 4: CheckedInPlayers
- **Player** (Single line text) - Player name
- **CheckedInAt** (Date) - When they checked in

#### Table 5: MatchQueue
- **Player1** (Single line text) - First player
- **Player2** (Single line text) - Second player
- **Status** (Single select) - Options: "pending", "active", "completed"
- **MatchNumber** (Number) - Match order number
- **CreatedAt** (Date) - When match was created

#### Table 6: Settings
- **TournamentName** (Single line text) - Tournament name
- **MinMatches** (Number) - Minimum matches per player
- **Notes** (Long text) - Tournament notes
- **CreatedAt** (Date) - When settings were created
- **UpdatedAt** (Date) - When settings were last updated

## 🔑 Step 2: Get Your Airtable Credentials

### 2.1 Get Your Personal Access Token
**⚠️ IMPORTANT: API Keys are deprecated as of February 2024. You must use Personal Access Tokens.**

1. Go to [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click "Create new token"
3. Give your token a name (e.g., "Golf League App")
4. Set the scope to "data.records:read" and "data.records:write"
5. Select your "Golf League Tournament" base
6. Click "Create token"
7. **Copy the token immediately** (it starts with `pat...`) - you won't be able to see it again!

### 2.2 Get Your Base ID
1. Go to [airtable.com/api](https://airtable.com/api)
2. Find your "Golf League Tournament" base
3. Click on it
4. Copy the Base ID (starts with `app...`)

## ⚙️ Step 3: Configure the App

### 3.1 Create Environment File
1. Copy `env.example` to `.env`
2. Edit `.env` and add your credentials:

```bash
AIRTABLE_PERSONAL_ACCESS_TOKEN=pat_your_personal_access_token_here
AIRTABLE_BASE_ID=app_your_base_id_here
PORT=3001
```

### 3.2 Install Dependencies
```bash
npm install
```

## 🚀 Step 4: Start the Server

### 4.1 Start the Airtable Server
```bash
npm run airtable-server
```

You should see:
```
🚀 Airtable Golf League Server running on port 3001
📊 API available at http://localhost:3001/api
🏥 Health check at http://localhost:3001/api/health
🔐 Using Personal Access Token authentication
```

### 4.2 Test the Connection
Visit `http://localhost:3001/api/health` in your browser. You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "airtable": {
    "configured": true,
    "authType": "Personal Access Token"
  }
}
```

## 🌐 Step 5: Update Your HTML Files

The HTML files need to be updated to use the Airtable API instead of localStorage. Here's how to modify them:

### 5.1 Add the API Script
Add this line to the `<head>` section of each HTML file:
```html
<script src="airtable-api.js"></script>
```

### 5.2 Update Data Loading
Replace the `loadData()` function with:
```javascript
async function loadData() {
    try {
        const data = await airtableAPI.syncData();
        players = data.players || [];
        matches = data.matches || [];
        leaderboard = data.leaderboard || {};
        checkedInPlayers = data.checkedInPlayers || [];
        matchQueue = data.matchQueue || [];
        currentMatchIndex = data.currentMatchIndex || 0;
        
        updateDisplay();
    } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback to localStorage
        const savedData = localStorage.getItem('golfLeagueData');
        if (savedData) {
            const data = JSON.parse(savedData);
            players = data.players || [];
            matches = data.matches || [];
            leaderboard = data.leaderboard || {};
            checkedInPlayers = data.checkedInPlayers || [];
            matchQueue = data.matchQueue || [];
            currentMatchIndex = data.currentMatchIndex || 0;
            updateDisplay();
        }
    }
}
```

### 5.3 Update Save Functions
Replace `saveData()` calls with API calls. For example:
```javascript
// Instead of saveData()
await airtableAPI.addPlayer(playerName);
await airtableAPI.toggleCheckin(playerName, true);
await airtableAPI.recordMatch(matchData);
```

## 📱 Step 6: Test the Integration

1. Start the server: `npm run airtable-server`
2. Open your HTML files in a browser
3. Try adding a player, checking them in, and recording a match
4. Check your Airtable base to see the data being saved

## 🔧 Troubleshooting

### Common Issues

**"Missing Airtable configuration" error**
- Make sure your `.env` file exists and has the correct Personal Access Token and Base ID
- Restart the server after creating the `.env` file
- **Important**: Personal Access Tokens start with `pat...`, not `key...`

**"Table not found" error**
- Make sure all 6 tables exist in your Airtable base
- Check that table names match exactly: "Players", "Matches", "Leaderboard", "CheckedInPlayers", "MatchQueue", "Settings"

**"Authentication failed" error**
- Verify your Personal Access Token is correct and starts with `pat...`
- Check that the token has the correct permissions (read/write access to your base)
- Make sure the token hasn't expired (they can be set to expire)

**CORS errors in browser**
- Make sure the server is running on port 3001
- Check that the API_BASE_URL in `airtable-api.js` matches your server

**Data not syncing**
- Check the browser console for API errors
- Verify your Personal Access Token has access to the base
- Make sure all required fields exist in your Airtable tables

### Personal Access Token Security

**⚠️ Security Best Practices:**
- Never commit your `.env` file to version control
- Use different tokens for development and production
- Set appropriate expiration dates for your tokens
- Regularly rotate your tokens
- Only grant the minimum required permissions

### Debug Mode
Add this to your `.env` file for more detailed logging:
```bash
DEBUG=airtable:*
```

## 🎯 Benefits of Airtable Integration

✅ **Real-time data sync** across multiple devices
✅ **Beautiful data interface** for manual review and editing
✅ **Automatic backups** and data persistence
✅ **Easy data export** to CSV, JSON, or other formats
✅ **Collaborative editing** - multiple people can view/edit data
✅ **Advanced filtering and sorting** in Airtable interface
✅ **Integration possibilities** with other tools (Zapier, etc.)
✅ **Secure authentication** with Personal Access Tokens

## 🔄 Migration from localStorage

If you have existing data in localStorage, you can migrate it:

1. Use the migration tool: `migrate-to-airtable.html`
2. Or manually add the data through the Airtable interface
3. Or use the Airtable API to import the data programmatically

## 📞 Support

If you run into issues:
1. Check the server console for error messages
2. Verify your Personal Access Token credentials
3. Test the health endpoint: `http://localhost:3001/api/health`
4. Check the browser console for API errors
5. Ensure your Personal Access Token has the correct permissions

## 🔐 Personal Access Token vs API Key

| Feature | Personal Access Token | API Key (Deprecated) |
|---------|---------------------|---------------------|
| **Security** | ✅ More secure, granular permissions | ❌ Less secure |
| **Expiration** | ✅ Configurable expiration | ❌ No expiration |
| **Scopes** | ✅ Fine-grained access control | ❌ All-or-nothing access |
| **Status** | ✅ Current standard | ❌ Deprecated as of Feb 2024 |

Happy golfing! 🏌️⛳ 