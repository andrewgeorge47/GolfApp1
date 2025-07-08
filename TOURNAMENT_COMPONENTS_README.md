# Tournament Management Components

This document outlines the new modular tournament management system that breaks down the large `Admin.tsx` component into focused, reusable components.

## Component Overview

### 1. UserRegistration Component (`UserRegistration.tsx`)
**Purpose**: Handle manual user registration for tournaments

**Features**:
- Search and filter users by name, email, or club
- Club-based registration restrictions
- Bulk registration of multiple users
- Registration progress tracking by club
- User table with registration status

**Props**:
```typescript
interface UserRegistrationProps {
  tournamentId: number;
  tournamentParticipants: any[];
  onUserRegistered: () => void;
  onUserUnregistered: () => void;
  clubRestriction?: string;
  isSuperAdmin?: boolean;
  currentUserClub?: string;
}
```

### 2. MatchGenerator Component (`MatchGenerator.tsx`)
**Purpose**: Generate and manage tournament matches

**Features**:
- Multiple match generation formats (optimized, random, seeded, round robin)
- Match status tracking (pending, completed)
- Match result updates
- Match progress visualization
- Bulk match operations

**Props**:
```typescript
interface MatchGeneratorProps {
  tournamentId: number;
  tournamentMatches: Match[];
  tournamentParticipants: any[];
  onMatchesGenerated: () => void;
  onMatchUpdated: () => void;
}
```

### 3. ScoreSubmission Component (`ScoreSubmission.tsx`)
**Purpose**: Submit scores for individual and team events

**Features**:
- Score submission for individual matches
- Hole-by-hole scoring (optional)
- Support for different tournament formats
- Score validation and winner determination
- Completed vs pending match tracking

**Props**:
```typescript
interface ScoreSubmissionProps {
  tournamentId: number;
  tournamentMatches: Match[];
  tournamentFormat: string;
  onScoreSubmitted: () => void;
}
```

### 4. AdminNew Component (`AdminNew.tsx`)
**Purpose**: Main tournament management interface that orchestrates the other components

**Features**:
- Tournament selection and overview
- Tabbed interface for different management functions
- Tournament statistics and progress tracking
- Integration with all sub-components

## Usage

### Basic Implementation
```tsx
import AdminNew from './components/AdminNew';

function App() {
  return (
    <div>
      <AdminNew />
    </div>
  );
}
```

### Individual Component Usage
```tsx
import UserRegistration from './components/UserRegistration';
import MatchGenerator from './components/MatchGenerator';
import ScoreSubmission from './components/ScoreSubmission';

// User Registration
<UserRegistration
  tournamentId={1}
  tournamentParticipants={participants}
  onUserRegistered={handleUserRegistered}
  onUserUnregistered={handleUserUnregistered}
  clubRestriction="open"
  isSuperAdmin={true}
  currentUserClub="Pine Valley"
/>

// Match Generation
<MatchGenerator
  tournamentId={1}
  tournamentMatches={matches}
  tournamentParticipants={participants}
  onMatchesGenerated={handleMatchesGenerated}
  onMatchUpdated={handleMatchUpdated}
/>

// Score Submission
<ScoreSubmission
  tournamentId={1}
  tournamentMatches={matches}
  tournamentFormat="match_play"
  onScoreSubmitted={handleScoreSubmitted}
/>
```

## API Integration

All components use the existing API service functions from `services/api.ts`:

- `getUsers()` - Fetch all users
- `registerUserForTournament()` - Register user for tournament
- `unregisterUserFromTournament()` - Unregister user from tournament
- `generateTournamentMatches()` - Generate tournament matches
- `updateTournamentMatch()` - Update match results
- `getTournamentParticipants()` - Get tournament participants
- `getTournamentMatches()` - Get tournament matches

## Benefits of This Structure

1. **Modularity**: Each component has a single responsibility
2. **Reusability**: Components can be used independently
3. **Maintainability**: Easier to debug and update individual features
4. **Testability**: Each component can be tested in isolation
5. **Scalability**: New features can be added as separate components

## Migration from Original Admin.tsx

The original `Admin.tsx` (2,775 lines) contained:
- Tournament creation/editing forms
- User registration management
- Check-in system
- Match generation and management
- Score submission
- Course selection
- Statistics and analytics

The new structure separates these concerns into focused components while maintaining all functionality.

## Future Enhancements

1. **Tournament Creation Component**: Extract tournament creation/editing forms
2. **CheckIn Component**: Extract check-in functionality
3. **Tournament Analytics Component**: Extract statistics and analytics
4. **Course Selection Component**: Extract course selection functionality

## File Structure
```
client/src/components/
├── Admin.tsx (original - 2,775 lines)
├── AdminNew.tsx (new simplified version)
├── UserRegistration.tsx (new)
├── MatchGenerator.tsx (new)
├── ScoreSubmission.tsx (new)
└── ... (other existing components)
``` 