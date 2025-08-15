# Admin Scorecard Editing Feature

This document describes the new admin scorecard editing functionality added to the TournamentManagement component.

## Overview

Administrators can now edit scorecards for players in tournaments through the scoring tab. This feature supports different tournament formats with format-specific implementations.

## Features

### 1. Weekly Scoring Tournaments (par3_match_play, weekly)
- **Component**: `AdminScorecardEditor`
- **Backend Endpoints**:
  - `GET /api/tournaments/:id/admin/scorecards` - Get all scorecards for a week
  - `PUT /api/tournaments/:id/admin/scorecards/:scorecardId` - Update a scorecard
  - `DELETE /api/tournaments/:id/admin/scorecards/:scorecardId` - Delete a scorecard
- **Capabilities**:
  - View all player scorecards for a specific week
  - Edit hole-by-hole scores
  - Modify total scores
  - Add/edit notes
  - Delete scorecards
  - Week selector for viewing different weeks
  - Automatic recalculation of matches and leaderboard after updates

### 2. Strokeplay Tournaments (stroke_play)
- **Component**: `AdminStrokeplayScorecardEditor`
- **Backend Endpoints**:
  - `GET /api/tournaments/:id/admin/strokeplay-scorecards` - Get all strokeplay scorecards
  - `PUT /api/tournaments/:id/admin/strokeplay-scorecards/:scorecardId` - Update a scorecard
  - `DELETE /api/tournaments/:id/admin/strokeplay-scorecards/:scorecardId` - Delete a scorecard
- **Capabilities**:
  - View all player scorecards
  - Edit hole-by-hole scores
  - Modify total strokes
  - Add/edit notes
  - Delete scorecards

### 3. Matchplay Tournaments (match_play)
- **Component**: `AdminMatchplayEditor`
- **Backend Endpoints**:
  - `GET /api/tournaments/:id/admin/matchplay-matches` - Get all matchplay matches
  - `PUT /api/tournaments/:id/admin/matchplay-matches/:matchId` - Update a match
- **Capabilities**:
  - View all matchplay matches
  - Edit player scores
  - Set match winners
  - Update match status

## Access Control

- Only users with `role === 'admin'` or super admins (Andrew George) can access these features
- All admin endpoints include authentication and role verification
- Regular users cannot see or access the admin editing interfaces

## UI Integration

### TournamentManagement Component
The admin scorecard editors are integrated into the scoring tab of the TournamentManagement component:

1. **Weekly Scoring**: Shows below the NewWeeklyScoring component
2. **Strokeplay**: Shows below the StrokeplayScoring component  
3. **Matchplay**: Shows below the ScoreSubmission component (for non-3-hole tournaments)

### Admin Controls Section
Added new controls in the admin section:
- **Week Override**: For forcing calculations on specific weeks
- **Scorecard Editor Week**: For viewing/editing scorecards from specific weeks

## Data Flow

1. Admin selects a tournament and navigates to the scoring tab
2. Admin scorecard editor components load data from backend endpoints
3. Admin can edit scorecards/matches inline
4. Changes are saved to the database
5. For weekly tournaments, matches and leaderboard are automatically recalculated
6. UI refreshes to show updated data

## Error Handling

- All API calls include proper error handling
- Toast notifications for success/error states
- Loading states during operations
- Confirmation dialogs for destructive actions

## Security Considerations

- All admin endpoints require authentication
- Role-based access control (admin only)
- Input validation on both frontend and backend
- SQL injection protection through parameterized queries

## Future Enhancements

Potential improvements that could be added:
- Bulk editing of multiple scorecards
- Scorecard history/audit trail
- Export functionality for scorecard data
- Advanced filtering and search
- Scorecard templates for different tournament formats

## Usage Instructions

1. **For Admins**:
   - Navigate to Tournament Management
   - Select a tournament
   - Go to the Scoring tab
   - Use the appropriate admin editor based on tournament format
   - Make changes and save

2. **For Tournament Directors**:
   - Ensure you have admin role in the system
   - Use the week selector to view different weeks (for weekly tournaments)
   - Edit scores as needed to correct errors or update results

## Technical Notes

- Components use React hooks for state management
- API calls are made through the centralized api.ts service
- Styling uses Tailwind CSS with custom brand colors
- All components are TypeScript-based with proper interfaces
- Responsive design for mobile and desktop use 