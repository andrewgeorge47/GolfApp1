# Golf App Frontend Components Overview
## Phases 7-11: League Management System

---

## EXECUTIVE SUMMARY

The frontend consists of **89+ TSX/JSX components** (106 TypeScript files total) organized in `/home/user/GolfApp1/client/src/`. The project uses:
- **React 19** with **TypeScript**
- **Tailwind CSS** for styling (with custom brand colors)
- **Material-UI (MUI)** components and icons
- **React Router v6** for navigation
- **Axios** for API integration
- **Lucide React** for iconography
- **react-toastify** for notifications
- **react-big-calendar** for calendar functionality

---

## PHASE 7: ADMIN COMPONENTS (League Management)

### 1. **LeagueManagement.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/LeagueManagement.tsx`
- **Lines**: 713
- **Route**: `/admin/league-management`
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - League creation form with validation
  - Season and date range management
  - Teams per division configuration (4-16 teams)
  - Format selection (round-robin, playoff, hybrid)
  - Scoring rules configuration
  - League overview dashboard with statistics
  - Status management (draft/active/paused/completed)
  - Expandable league cards
  - Real-time status indicators

- **UI/UX Features**:
  - Tabbed interface (overview/create/divisions/schedule/teams)
  - Statistics cards with color-coded metrics
  - Modal forms for creation/editing
  - Responsive grid layout
  - Loading spinners and state indicators
  - Toast notifications for feedback

- **Dependencies**:
  - lucide-react (Trophy, Users, Calendar, Settings, Plus, Edit3, Trash2, Save, X, etc.)
  - react-toastify
  - API service (createTournament, getTournaments, updateTournament, deleteTournament)

- **Styling Approach**:
  - Tailwind CSS classes (bg-white, rounded-lg, shadow-md, space-y-4, etc.)
  - Brand colors: brand-dark-green (#1a5f3c), brand-muted-green (#2d7a4f), brand-neon-green (#77dd3c)
  - Responsive design with flex layouts

---

### 2. **LeagueDivisionManager.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/LeagueDivisionManager.tsx`
- **Lines**: 666
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Division creation with team limit configuration
  - Team creation within divisions
  - Captain assignment from available users
  - Member add/remove functionality
  - Team capacity management
  - Expandable division cards
  - Visual member indicators

- **UI/UX Issues/Opportunities**:
  - Mock data currently used (TODO comments indicate need for actual API calls)
  - No real-time user list fetching
  - Simple form validation
  
- **UI/UX Opportunities**:
  - Batch operations for team creation
  - Drag-and-drop for member management
  - Search/filter for users
  - Team size balancing suggestions

- **Dependencies**:
  - lucide-react (Users, Plus, Edit3, Trash2, Save, X, ChevronRight, ChevronDown, UserPlus, UserMinus)
  - react-toastify

- **Styling**: Tailwind CSS with consistent brand colors

---

### 3. **LeagueScheduleBuilder.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/LeagueScheduleBuilder.tsx`
- **Lines**: 805
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Week creation with course assignment
  - Match generation (manual and auto)
  - Round-robin schedule generation
  - Match status tracking
  - Division-based matchmaking
  - Course assignment per week
  - Match editing and deletion
  - Schedule visualization

- **UI/UX Features**:
  - Expandable week cards
  - Course selector dropdowns
  - Match list with team names
  - Status indicators (scheduled/active/completed)
  - Visual feedback for user actions

- **API Endpoints Expected**:
  - GET /divisions
  - GET /courses
  - POST /schedule-weeks
  - GET /schedule-weeks
  - POST /matches
  - PUT /matches/:id
  - DELETE /matches/:id
  - POST /matches/generate-round-robin

- **Dependencies**:
  - lucide-react (Calendar, Plus, Edit3, Trash2, Save, X, MapPin, Clock, RotateCcw, CheckCircle)
  - react-toastify

---

### 4. **LeagueTeamManager.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/LeagueTeamManager.tsx`
- **Lines**: 754
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Team creation with captain assignment
  - Member add/remove operations
  - Advanced filtering (search, division filter)
  - Sorting (by points, wins, name, created date)
  - Team statistics display
  - Win rate calculations
  - Captain indicators (crown icons)
  - Expandable team details

- **UI/UX Features**:
  - Search input with real-time filtering
  - Division dropdown selector
  - Sort toggle with asc/desc options
  - Statistics cards showing points, wins, etc.
  - Visual member count indicators
  - Responsive table/card layout

- **UI/UX Opportunities**:
  - Bulk member operations
  - Team balancing suggestions
  - Import/export team rosters
  - Duplicate team detection

- **Dependencies**:
  - lucide-react (Users, Plus, Edit3, Trash2, Save, X, ChevronRight, ChevronDown, Crown, Search, Filter)
  - react-toastify

---

## PHASE 8: CAPTAIN COMPONENTS (Team Management)

### 1. **CaptainDashboard.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/CaptainDashboard.tsx`
- **Lines**: 511
- **Route**: `/captain-dashboard`
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Team overview with captain info
  - Upcoming matches display
  - Team statistics and standings
  - Tabbed navigation (overview/availability/lineup/strategy)
  - Quick stats cards (wins/losses/points)
  - Lineup submission status
  - Team member list with availability status

- **Sub-Components**:
  - AvailabilityView (embedded)
  - LineupSelector (embedded)
  - StrategyHelper (embedded)

- **API Integration Points**:
  - GET /captain/team (get captain's team)
  - GET /teams/:teamId/upcoming-matches
  - GET /teams/:teamId/stats

- **Dependencies**:
  - AvailabilityView, LineupSelector, StrategyHelper components
  - lucide-react icons
  - react-toastify

---

### 2. **AvailabilityView.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/AvailabilityView.tsx`
- **Lines**: 511
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Week selector for navigation
  - Team member availability display
  - Availability status (available/unavailable/pending)
  - Filter by status
  - Search functionality
  - Sort by name/handicap/status
  - Last update timestamps
  - Refresh availability data

- **UI/UX Features**:
  - Week navigation buttons (previous/next)
  - Color-coded availability status
  - Handicap information display
  - Member role badges
  - Loading and error states

- **UI/UX Opportunities**:
  - Availability timeline view
  - Export availability report
  - Set bulk availability
  - Availability predictions based on history

- **Dependencies**:
  - lucide-react (Users, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Filter, Search, RefreshCw)
  - useAuth context

---

### 3. **LineupSelector.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/LineupSelector.tsx`
- **Lines**: 626
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Week/match selection
  - Player lineup management
  - Three-player teams (holes 1-3, 4-6, 7-9)
  - Team handicap calculation
  - Lineup lock mechanism
  - Submission deadline tracking
  - Availability filtering (show only available members)
  - Save and submit functionality

- **UI/UX Features**:
  - Drag-and-drop capability (design pattern)
  - Player selection with handicap display
  - Holes assignment visualization
  - Team handicap summary
  - Deadline countdown
  - Lock/unlock indicators
  - Confirmation dialogs

- **UI/UX Opportunities**:
  - Course-specific player recommendations
  - Historical performance matchups
  - Head-to-head suggestions
  - Auto-balancing team strength

- **Dependencies**:
  - lucide-react (Target, Users, Lock, Unlock, Save, AlertCircle, CheckCircle, Clock, Calculator, Trophy, MapPin, X)
  - useAuth context

---

### 4. **StrategyHelper.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/StrategyHelper.tsx`
- **Lines**: 574
- **Current State**: COMPLETE with mock data, AI-ready foundation
- **Key Features**:
  - Course analysis (holes, par, handicap index, yardage)
  - Opponent team info with player details
  - Strategy recommendations per hole
  - Confidence levels (high/medium/low)
  - Alternative player suggestions
  - Team handicap comparisons
  - Handicap advantage calculation
  - Match details and course visualization

- **UI/UX Features**:
  - Course layout display
  - Hole-by-hole recommendations
  - Player strength/weakness profiles
  - Matching algorithm visualization
  - Confidence indicators
  - Expandable details panels
  - Course statistics summary

- **AI/ML Opportunities**:
  - ML-based player-hole matching
  - Historical performance analysis
  - Weather-adjusted recommendations
  - Opponent tendency analysis

- **Dependencies**:
  - lucide-react (MapPin, Target, Users, TrendingUp, TrendingDown, Calculator, AlertCircle, CheckCircle, Info, RefreshCw, Trophy, BarChart3, Lightbulb)
  - useAuth context

---

## PHASE 9: PLAYER COMPONENTS (Availability & Team View)

### 1. **PlayerAvailabilityForm.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/PlayerAvailabilityForm.tsx`
- **Lines**: 465
- **Route**: `/player/availability-form`
- **Current State**: COMPLETE with API integration
- **Key Features**:
  - Team selection (for multi-team players)
  - Week navigation
  - Availability toggle (Available/Not Available)
  - Notes field for additional context
  - Current availability display
  - Form validation
  - Real-time API calls

- **API Integration**:
  - getUserTeams()
  - getLeagueAvailableWeeks(leagueId)
  - submitPlayerAvailability(teamId, data)
  - getTeamAvailability(teamId, weekNumber, leagueId)

- **UI/UX Features**:
  - Responsive form layout
  - Week carousel navigation
  - Radio buttons for availability status
  - Textarea for notes
  - Last updated timestamp display
  - Success/error notifications
  - Loading states

- **UI/UX Opportunities**:
  - Calendar view for multiple weeks
  - Recurring availability patterns
  - Calendar sync (Google Calendar, Apple)
  - SMS/Email reminders

- **Dependencies**:
  - lucide-react (Calendar, CheckCircle, XCircle, Clock, Save, AlertCircle, ChevronLeft, ChevronRight, RefreshCw)
  - useAuth context
  - API service functions

---

### 2. **PlayerTeamView.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/PlayerTeamView.tsx`
- **Lines**: 585
- **Route**: `/player/team`
- **Current State**: COMPLETE with API integration
- **Key Features**:
  - Team selection (if on multiple teams)
  - Team overview with league position
  - Roster display with contact info
  - Upcoming matches schedule
  - Team statistics and standings
  - Tabbed interface (Roster/Schedule/Stats)
  - Captain information
  - Real-time data refresh

- **API Integration**:
  - getUserTeams()
  - getTeamDashboard(teamId, leagueId)

- **UI/UX Features**:
  - Team selector dropdown
  - Tab navigation (Roster, Schedule, Stats)
  - Member cards with:
    - First/Last name
    - Handicap
    - Email address
    - Phone (optional)
    - Captain badge
  - Match cards with:
    - Opponent name
    - Course details (rating, slope, par)
    - Match dates
    - Status badge
  - Statistics dashboard with:
    - Wins/Losses/Ties
    - Points breakdown
    - League position
    - Aggregate net scores

- **UI/UX Opportunities**:
  - Contact quick actions (call, email, message)
  - Team chemistry analysis
  - Historical team performance charts
  - Playoff probability tracker

- **Dependencies**:
  - lucide-react (Users, Calendar, Trophy, Target, Award, Clock, MapPin, Phone, Mail, RefreshCw, ChevronLeft, ChevronRight)
  - useAuth context
  - API service functions

---

## PHASE 10: SCORING COMPONENTS (Score Entry & Verification)

### 1. **HybridScoreEntry.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/HybridScoreEntry.tsx`
- **Lines**: 470
- **Current State**: COMPLETE, embedded in scoring flow
- **Key Features**:
  - Individual score entry (3 players, 3 holes each)
  - Alternate shot score entry
  - Score calculation (gross, net, strokes received)
  - Handicap adjustments
  - Course handicap calculations
  - Section completion tracking
  - Score validation
  - Submit with confirmation

- **Scoring Format**:
  - Hybrid = Individual scoring + Alternate shot
  - 3 players per team
  - 9 holes total (3 per player)
  - Net score calculations based on course handicap

- **UI/UX Features**:
  - Hole-by-hole score grid
  - Player assignment visualization
  - Gross/Net score display
  - Running totals
  - Course par display
  - Handicap index reference
  - Validation feedback
  - Save progress functionality

- **Props Interface**:
  ```typescript
  interface HybridScoreEntryProps {
    matchupId: number;
    teamId: number;
    lineup: Lineup;
    coursePar: number[];
    courseHandicapIndexes: number[];
    onScoreSubmitted?: () => void;
  }
  ```

- **Dependencies**:
  - lucide-react (Save, Calculator, Users, Target, CheckCircle, AlertCircle)
  - useAuth context

- **UI/UX Opportunities**:
  - Photo scorecard upload
  - Optical character recognition (OCR) for scorecards
  - Real-time validation
  - Offline mode with sync

---

### 2. **MatchScoringView.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/MatchScoringView.tsx`
- **Lines**: 705
- **Current State**: COMPLETE, display and verification
- **Key Features**:
  - Display both teams' scores
  - Individual scores per player
  - Alternate shot scores
  - Team totals and winners
  - Score breakdown visualization
  - Match details (course, week, teams)
  - Refresh/refetch scores
  - Real-time score updates

- **Props Interface**:
  ```typescript
  interface MatchScoringViewProps {
    matchupId: number;
    onVerify?: () => void;
  }
  ```

- **UI/UX Features**:
  - Split screen for both teams
  - Expandable player scores
  - Detailed hole breakdowns
  - Summary statistics
  - Loading indicators
  - Refresh button
  - Winner badge highlighting

- **UI/UX Opportunities**:
  - Mobile scorecard entry UI
  - Live scoring broadcast view
  - Scoreboard displays
  - Score comparison charts

- **Dependencies**:
  - lucide-react (Eye, CheckCircle, AlertCircle, Trophy, Users, Target, RefreshCw)

---

### 3. **ScoreVerification.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/ScoreVerification.tsx`
- **Lines**: 590
- **Current State**: COMPLETE, verification and dispute handling
- **Key Features**:
  - Display match scores for verification
  - Approve/reject scores
  - Dispute filing with reasons
  - Verification notes field
  - Score breakdown review
  - Team comparison view
  - Dispute reason selection
  - Comments on disputed holes

- **Props Interface**:
  ```typescript
  interface ScoreVerificationProps {
    matchupId: number;
    onVerificationComplete?: () => void;
  }
  ```

- **UI/UX Features**:
  - Side-by-side score comparison
  - Detailed hole review
  - Verification status badges
  - Dispute form with dropdown reasons
  - Notes field for comments
  - Confirmation dialogs
  - Success/error notifications

- **Dispute Workflow**:
  1. Player initiates dispute
  2. Selects reason from dropdown
  3. Adds detailed comments
  4. Submits for admin review
  5. Admin investigates and resolves

- **UI/UX Opportunities**:
  - Automated anomaly detection
  - Similar score pattern analysis
  - Photo evidence upload
  - Comment threads on disputed holes
  - Escalation path for complex disputes

- **Dependencies**:
  - lucide-react (CheckCircle, XCircle, MessageSquare, AlertTriangle, Eye, Save)
  - useAuth context

---

## PHASE 11: LEADERBOARD COMPONENTS (Standings & Results)

### 1. **LeagueStandings.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/LeagueStandings.tsx`
- **Lines**: 740
- **Route**: `/league-standings/:leagueId`
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - League overview with season info
  - Division tabs for navigation
  - Sortable standings table with columns:
    - Rank/Position
    - Team name
    - Wins/Losses/Ties
    - Points
    - Aggregate net score
    - Last match result
    - Recent form indicators (W/L/T badges)
  - Playoff qualification badges
  - Click-to-expand team details
  - Real-time refresh functionality
  - Tiebreaker information

- **API Endpoints Expected**:
  - GET /api/leagues/:id/standings?include_stats=true
  - GET /api/leagues/:id (league details)

- **UI/UX Features**:
  - Responsive table design
  - Color-coded row highlighting
  - Expandable rows for team stats
  - Column sort indicators
  - Loading skeleton
  - Sticky header on scroll
  - Mobile card view fallback

- **UI/UX Opportunities**:
  - Historical standings tracking
  - Head-to-head comparison tool
  - Playoff prediction tool
  - Schedule difficulty visualization
  - Points differential analysis

- **Dependencies**:
  - lucide-react (Trophy, Users, TrendingUp, TrendingDown, Minus, ChevronRight, ChevronDown, Award, Target, Calendar, BarChart3, RefreshCw)
  - react-toastify

---

### 2. **DivisionStandings.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/DivisionStandings.tsx`
- **Lines**: 699
- **Route**: `/league-standings/:leagueId/division/:divisionId`
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Division-specific standings
  - Detailed statistics table with:
    - Team rank in division
    - Matches played
    - W-L-T record
    - League points
    - Aggregate net score
    - Second half net score
    - Final week net score
    - Playoff qualification status
  - Head-to-head matrix showing team vs team results
  - Week-by-week match schedule/results
  - Match details (score, course, date)
  - Back navigation
  - Refresh functionality

- **API Endpoints Expected**:
  - GET /api/leagues/:leagueId/standings/division/:divisionId
  - GET /api/leagues/:leagueId/matchups?division_id=:divisionId
  - GET /api/leagues/:leagueId/standings/tiebreakers?division_id=:divisionId

- **UI/UX Features**:
  - Detailed standings table
  - H2H matrix grid
  - Match result cards
  - Collapsible match details
  - Navigation breadcrumbs
  - Status badges (qualified/eliminated)
  - Responsive design

- **UI/UX Opportunities**:
  - Tiebreaker visual explainer
  - Strength of schedule chart
  - Remaining schedule impact
  - Head-to-head tournament bracket
  - Division comparison view

- **Dependencies**:
  - lucide-react (Trophy, Users, TrendingUp, TrendingDown, Minus, Award, Target, Calendar, BarChart3, RefreshCw, ArrowLeft, Clock, MapPin)
  - react-toastify

---

### 3. **TeamDetailsPage.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/TeamDetailsPage.tsx`
- **Lines**: 802
- **Route**: `/team/:teamId` or `/team/:teamId/league/:leagueId`
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Team overview with key stats:
    - Team name and captain
    - League and division
    - League points
    - Aggregate net scores
    - Current standing/rank
  - Tabbed interface (Overview/Roster/Matches/Stats)
  - Complete roster with stats:
    - Player names and handicaps
    - Role (captain/member)
    - Match participation count
    - Average gross/net scores
    - Best scores
  - Match history:
    - Opponent names
    - Scores (team vs opponent)
    - Results (W/L/T)
    - Course information
    - Week numbers and dates
  - Statistics dashboard:
    - Wins/losses/ties
    - Win percentage
    - Points breakdown
    - Scoring trends
    - Best/worst matches
    - Player performance analysis
  - Tiebreaker breakdown

- **Props Interface**:
  ```typescript
  interface TeamDetailsPageProps {
    teamId: number;
    leagueId?: number;
    onBack?: () => void;
  }
  ```

- **API Endpoints Expected**:
  - GET /api/teams/:teamId/stats?league_id=:leagueId
  - GET /api/teams/:teamId/matches?league_id=:leagueId&limit=20
  - GET /api/teams/:teamId/players?league_id=:leagueId

- **UI/UX Features**:
  - Back button navigation
  - Multiple tabs (Overview/Roster/Matches/Stats)
  - Statistics cards with icons
  - Player performance table
  - Match history list with expandable details
  - Trend indicators (up/down arrows)
  - Color-coded results (green/red)
  - Responsive card layout

- **UI/UX Opportunities**:
  - Player performance comparison
  - Head-to-head records vs other teams
  - Scoring trend charts
  - Playoff path visualization
  - Team vs league average comparison
  - Upcoming schedule strength indicator

- **Dependencies**:
  - lucide-react (Users, Trophy, TrendingUp, TrendingDown, Minus, Award, Target, Calendar, BarChart3, RefreshCw, ArrowLeft, Clock, MapPin, User, Mail, Phone, Star, Activity)
  - react-toastify

---

### 4. **WeeklyResults.tsx**
- **Location**: `/home/user/GolfApp1/client/src/components/WeeklyResults.tsx`
- **Lines**: 817
- **Route**: `/weekly-results/:leagueId` or `/weekly-results/:leagueId/week/:weekNumber`
- **Current State**: COMPLETE with mock data, API-ready
- **Key Features**:
  - Week selector/navigation
  - All league matchups for selected week
  - Matchup details:
    - Team names
    - Scores (individual net, alternate shot, totals)
    - Winners highlighted
    - Course information
    - Division assignment
    - Match status
  - Standings changes tracking:
    - Previous rank
    - Current rank
    - Rank change arrows
    - Points change
  - Division breakdown:
    - Matches played per division
    - Completion percentage
  - Summary statistics:
    - Total matches
    - Completed/pending
    - Division highlights
  - Week summary
  - Back navigation

- **Props Interface**:
  ```typescript
  interface WeeklyResultsProps {
    leagueId: number;
    weekNumber?: number;
    onBack?: () => void;
  }
  ```

- **API Endpoints Expected**:
  - GET /api/leagues/:leagueId/matchups?week=:weekNumber
  - GET /api/leagues/:leagueId/standings?week=:weekNumber
  - GET /api/leagues/:leagueId (league info)

- **UI/UX Features**:
  - Week navigation (previous/current/next)
  - Week date range display
  - Matchup cards with:
    - Team names (clickable)
    - Scores and winner badge
    - Course name
    - Status (completed/pending)
  - Standings changes section with:
    - Team name
    - Rank progression
    - Points gained/lost
    - Visual indicators
  - Division summary
  - Responsive layout

- **UI/UX Opportunities**:
  - Week-by-week comparison
  - Historical results archive
  - Scoring records/highlights
  - Week MVP selection
  - Schedule difficulty per week
  - Live scoring view (during week)
  - Week summary emails/reports

- **Dependencies**:
  - lucide-react (Calendar, Trophy, TrendingUp, TrendingDown, Minus, Award, Target, BarChart3, RefreshCw, ArrowLeft, Clock, MapPin, Users, ChevronLeft, ChevronRight, Activity)
  - react-toastify

---

## DESIGN SYSTEM

### Brand Colors (Tailwind Extended)
**Location**: `/home/user/GolfApp1/client/tailwind.config.js`

```javascript
colors: {
  'brand': {
    'dark-green': '#1a5f3c',      // Primary dark color
    'muted-green': '#2d7a4f',     // Secondary/sidebar color
    'neon-green': '#77dd3c',      // Accent/highlight color
    'black': '#1a1a1a'            // Text color
  },
  'neutral': {
    '50': '#f9fafb',   // Light backgrounds
    '200': '#e5e7eb',  // Borders
    '400': '#9ca3af',  // Secondary text
    '600': '#4b5563'   // Dark text
  },
  'system': {
    'success-green': '#10b981'    // Success/positive states
  }
}
```

### Typography
- **Font Family**: Inter (system fonts fallback)
- **Font Smoothing**: Antialiased
- **Body Background**: White (with gradient wrapper)
- **Text Color**: brand-black (#1a1a1a)

### Spacing & Layout
- Max width containers: 7xl (80rem)
- Padding: Responsive (px-4 sm:px-6 lg:px-8)
- Grid gaps: 4 units (1rem) standard
- Section spacing: space-y-6, space-y-8

### Component Styling Patterns

1. **Buttons**:
   ```
   Tailwind classes: px-3 py-2 rounded-md font-medium
   Hover: hover:bg-brand-neon-green hover:text-brand-black
   Disabled: opacity-50 cursor-not-allowed
   ```

2. **Cards**:
   ```
   Tailwind classes: bg-white rounded-lg shadow-md
   Hover: hover:shadow-lg transition-shadow
   Padding: p-4 sm:p-6
   ```

3. **Forms**:
   ```
   @tailwindcss/forms plugin for inputs
   Labels: block text-sm font-medium mb-2
   Inputs: rounded border px-3 py-2 w-full
   Focus: focus:ring-2 focus:ring-brand-neon-green
   ```

4. **Tables**:
   ```
   Responsive design with scroll on mobile
   Borders: border-b border-neutral-200
   Hover rows: hover:bg-neutral-50
   Sticky headers: sticky top-0 bg-white
   ```

5. **Icons**:
   ```
   From lucide-react package
   Sizes: w-4 h-4 (small), w-5 h-5 (normal), w-6 h-6 (large)
   Colors: text-brand-neon-green, text-brand-black
   ```

---

## SHARED UTILITIES & HOOKS

### Custom Hooks
**Location**: `/home/user/GolfApp1/client/src/hooks/`

1. **useRealTimeUpdates.ts** (3.1 KB)
   - Real-time data refresh patterns
   - WebSocket integration foundation
   - Polling mechanism

2. **useScoreCalculator.ts** (6.7 KB)
   - Handicap calculations
   - Net score computation
   - Course handicap adjustments
   - Strokes received calculations

3. **useUserCourse.ts** (2.7 KB)
   - User course history
   - Course statistics
   - Performance tracking

### Role & Permission System
**Location**: `/home/user/GolfApp1/client/src/utils/roleUtils.ts`

**User Roles**:
- MEMBER
- ADMIN
- CLUB_PRO
- AMBASSADOR
- DEACTIVATED

**Key Functions**:
- `isAdmin(user)` - Check admin status
- `isClubPro(user)` - Check club pro status
- `isAdminOrClubPro(user)` - Combined role check
- `canEditCourses(user)` - Specific permission check
- `normalizeRole(role)` - Standardize role strings
- `getRoleBadgeColor(role)` - UI styling for roles

**Type System**:
**Location**: `/home/user/GolfApp1/client/src/types/permissions.ts`

```typescript
interface Permission {
  id: number;
  permission_key: string;
  permission_name: string;
  description: string;
  category: string;
}

interface Role {
  id: number;
  role_name: string;
  role_key: string;
  description: string;
  is_system_role: boolean;
  is_active: boolean;
}
```

---

## API INTEGRATION PATTERNS

### API Service Location
`/home/user/GolfApp1/client/src/services/api.ts` (43 KB)

### Core API Structure
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: environment.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor - adds auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handles errors
api.interceptors.response.use(
  (response) => response,
  (error) => { ... }
);
```

### League Management API Functions
- `createTournament(data)` - Create new league
- `getTournaments()` - Get all leagues
- `updateTournament(id, data)` - Update league
- `deleteTournament(id)` - Delete league
- `getTournament(id)` - Get single league

### Scoring API Functions
- `submitPlayerScores(matchupId, teamId, data)` - Submit scores
- `getMatchupScores(matchupId)` - Get match scores
- `verifyScores(matchupId, data)` - Verify/approve scores
- `disputeScore(matchupId, data)` - File score dispute

### Standings API Functions (Expected)
- `GET /api/leagues/:id/standings` - League standings
- `GET /api/leagues/:id/standings/division/:divId` - Division standings
- `GET /teams/:teamId/stats` - Team statistics
- `GET /teams/:teamId/matches` - Team match history
- `GET /leagues/:leagueId/matchups` - All matchups

### Availability API Functions
- `getUserTeams()` - Get user's teams
- `getLeagueAvailableWeeks(leagueId)` - Available weeks
- `submitPlayerAvailability(teamId, data)` - Submit availability
- `getTeamAvailability(teamId, weekNumber, leagueId)` - Get week availability

---

## AUTHENTICATION & CONTEXT

### AuthContext
**Location**: `/home/user/GolfApp1/client/src/AuthContext.tsx`

**Features**:
- Token-based authentication
- User session management
- View-as mode (admins viewing as other roles)
- Role-based access control
- Auto-refresh on token validation

**Methods**:
- `login(email, password)` - User login
- `logout()` - Clear session
- `refreshUser()` - Refresh user data
- `enterViewAsMode(role, club)` - Admin view-as
- `exitViewAsMode()` - Exit view-as

---

## ROUTING STRUCTURE

**Location**: `/home/user/GolfApp1/client/src/App.tsx` (616 lines)

### Admin Routes
- `/admin/league-management` - League management
- `/admin/permissions` - Permission management
- `/admin/users/:userId` - User profile
- `/booking-settings` - Booking configuration

### Captain Routes
- `/captain-dashboard` - Captain dashboard
- `/league-scoring` - Score entry
- `/league-scoring/:matchupId` - Specific match scoring

### Player Routes
- `/player/availability-form` - Availability submission
- `/player/availability` - Availability calendar
- `/player/team` - Team view

### Leaderboard Routes
- `/league-standings/:leagueId` - Overall standings
- `/league-standings/:leagueId/division/:divisionId` - Division standings
- `/team/:teamId` - Team details
- `/team/:teamId/league/:leagueId` - Team in specific league
- `/weekly-results/:leagueId` - Weekly results
- `/weekly-results/:leagueId/week/:weekNumber` - Specific week results

### Public Routes
- `/login` - Login page
- `/register` - Registration
- `/leaderboard` - Public leaderboard
- `/tournaments` - Available tournaments

---

## BRAND ASSETS

**Location**: `/home/user/GolfApp1/client/public/`

### Logo Variants
- `Logo_N_Dark.png` - Dark theme N logo (used in navbar)
- `Logo_N_Neon.png` - Neon green N logo
- `Logo_N_Light.png` - Light N logo
- `Logo_N_Black.png` - Black N logo
- `Logo_N_white.png` - White N logo
- `Logo_Full_Dark.png` - Full wordmark dark
- `Logo_Full_allwhite.png` - Full wordmark white
- `Logo_Full_allblack.png` - Full wordmark black
- `logo_full_Light.png` - Full wordmark light
- `logo-color.svg` - SVG variant

### Other Assets
- Favicon (favicon.ico, logo192.png, logo512.png)
- Mockup image (NN-Website-Mockup-13.png)
- SVG logo (Logo Color.svg, logo-color.svg)

---

## KEY STATISTICS

### Component Count
- **Total TSX/JSX files**: 89
- **Total TypeScript files**: 106
- **Phase 7 components**: 4 (LeagueManagement, DivisionManager, ScheduleBuilder, TeamManager)
- **Phase 8 components**: 4 (CaptainDashboard, AvailabilityView, LineupSelector, StrategyHelper)
- **Phase 9 components**: 2 (PlayerAvailabilityForm, PlayerTeamView)
- **Phase 10 components**: 3 (HybridScoreEntry, MatchScoringView, ScoreVerification)
- **Phase 11 components**: 4 (LeagueStandings, DivisionStandings, TeamDetailsPage, WeeklyResults)

### Code Size
- **API service**: 43 KB (1000+ lines)
- **Largest component**: Admin.tsx (143 KB)
- **Average component**: 500-800 lines
- **Total client src**: ~2 MB

### Dependencies
- **React**: 19.1.0
- **TypeScript**: 4.9.5
- **Tailwind CSS**: 3.4.17
- **Material-UI**: 7.2.0
- **Axios**: 1.10.0
- **React Router**: 6.23.1
- **Lucide React**: 0.523.0
- **React Toastify**: 11.0.5

---

## IMPLEMENTATION STATUS

### Phase 7: Admin Components
✅ **COMPLETE**
- All 4 components implemented with mock data
- Ready for API integration
- TypeScript validation complete
- Responsive design verified

### Phase 8: Captain Components
✅ **COMPLETE**
- All 4 components implemented with mock data
- Sub-components properly nested
- Tabbed interface functional
- Ready for API integration

### Phase 9: Player Components
✅ **COMPLETE**
- Both components with actual API calls
- Integration patterns established
- Form validation implemented
- Real-time data updates

### Phase 10: Scoring Components
✅ **COMPLETE**
- Score entry form functional
- Verification workflow implemented
- Dispute mechanism ready
- Hybrid format support

### Phase 11: Leaderboard Components
✅ **COMPLETE**
- All 4 standings/results components
- Mock data implementation
- Navigation patterns established
- Responsive tables/grids

---

## NEXT STEPS & RECOMMENDATIONS

### Immediate Priorities
1. **API Integration** - Replace all mock data with actual backend calls
2. **Form Validation** - Implement comprehensive client-side validation
3. **Error Handling** - Add error boundaries and graceful failure modes
4. **Loading States** - Skeleton screens for all data-loading components
5. **Mobile Optimization** - Test and refine mobile-first responsive design

### Performance Optimizations
1. **Code Splitting** - Lazy load components by phase/role
2. **Memoization** - Use React.memo for expensive renders
3. **Pagination** - Implement for large lists (teams, matches)
4. **Caching** - Add query caching for frequently accessed data
5. **Virtual Scrolling** - For long tables/lists

### UX Enhancements
1. **Real-time Updates** - WebSocket integration for live data
2. **Offline Support** - Service workers for offline mode
3. **Accessibility** - WCAG 2.1 AA compliance
4. **Drag & Drop** - Lineup and team formation interfaces
5. **Notifications** - Push notifications for match results

### Testing
1. **Unit Tests** - Component testing with React Testing Library
2. **Integration Tests** - API integration testing
3. **E2E Tests** - Cypress/Playwright for user workflows
4. **Visual Testing** - Storybook for component documentation

---

**Report Generated**: October 2025
**Frontend Status**: Production-Ready with Mock Data
**Backend Integration**: Required for all APIs
**Estimated Integration Time**: 2-3 weeks

