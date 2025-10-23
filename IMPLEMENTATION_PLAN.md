# New Scoring System Implementation Plan

## Overview
This document outlines the implementation plan for the new 9-hole scoring system that replaces the current 3-hole match play format.

## Current System Analysis

### Existing Components
- **Database**: PostgreSQL with `tournament_matches`, `scorecards`, `user_profiles` tables
- **Backend**: Node.js/Express with scoring logic in `server.js`
- **Frontend**: React components for scoring (`Scoring.tsx`) and leaderboards (`MatchplayLeaderboard.tsx`)
- **Current Format**: 3-hole match play with simple win/loss/tie scoring

### New System Requirements
1. **9-hole scorecards** with live entry support
2. **Head-to-head comparisons** between all players
3. **Multi-level scoring**: Hole wins (0.5), Round wins (1.0), Match wins (1.0), Live bonuses
4. **Weekly leaderboards** with drill-down capabilities
5. **Live match tracking** with group-based bonuses

## Implementation Phases

### Phase 1: Database Schema (Week 1)
**Files to create/modify:**
- `new_scoring_system_schema.sql` ✅ (Created)
- `server.js` - Add new table creation logic

**Steps:**
1. Run the schema migration to create new tables
2. Add scoring configuration columns to tournaments table
3. Create indexes for performance
4. Test database connectivity

### Phase 2: Backend API (Week 1-2)
**Files to create/modify:**
- `new_scoring_api.js` ✅ (Created)
- `server.js` - Integrate new API endpoints

**Steps:**
1. Add new API endpoints to `server.js`
2. Implement scoring calculation logic
3. Add weekly leaderboard aggregation
4. Test API endpoints with Postman/curl

**New API Endpoints:**
- `POST /api/tournaments/:id/weekly-scorecard` - Submit 9-hole scorecard
- `GET /api/tournaments/:id/weekly-leaderboard` - Get weekly leaderboard
- `GET /api/tournaments/:id/weekly-matches/:userId` - Get player's matches
- `GET /api/tournaments/:id/weekly-scorecard/:userId` - Get player's scorecard

### Phase 3: Frontend Components (Week 2-3)
**Files to create/modify:**
- `client/src/components/NewWeeklyScoring.tsx` ✅ (Created)
- `client/src/components/NewWeeklyLeaderboard.tsx` ✅ (Created)
- `client/src/services/api.ts` - Add new API service functions
- `client/src/App.tsx` - Add routing for new components

**Steps:**
1. Create new scoring component with live entry support
2. Create new leaderboard component with drill-down
3. Add API service functions
4. Update routing and navigation

### Phase 4: Integration & Testing (Week 3-4)
**Files to modify:**
- `client/src/components/TournamentManagement.tsx` - Add scoring format selection
- `client/src/components/TournamentDetails.tsx` - Add new scoring display
- `client/src/services/api.ts` - Add new interfaces

**Steps:**
1. Add scoring format selection to tournament creation
2. Integrate new components into existing tournament flow
3. Add migration logic for existing tournaments
4. Comprehensive testing

## Database Migration Strategy

### Option 1: Parallel System (Recommended)
- Keep existing tables and add new ones
- Add `scoring_format` column to tournaments table
- Route to appropriate scoring system based on format
- Gradual migration of tournaments

### Option 2: Full Migration
- Migrate all existing data to new format
- Update all existing tournaments
- One-time migration script

## Frontend Integration Points

### Tournament Creation
```typescript
// Add to TournamentForm.tsx
const scoringFormats = [
  { value: 'traditional', label: 'Traditional 3-Hole Match Play' },
  { value: 'weekly_9_hole', label: 'Weekly 9-Hole Scoring' }
];
```

### Tournament Details
```typescript
// Add to TournamentDetails.tsx
const renderScoringComponent = () => {
  if (tournament.scoring_format === 'weekly_9_hole') {
    return <NewWeeklyScoring tournamentId={tournament.id} />;
  }
  return <Scoring />; // Existing component
};
```

### Leaderboard Display
```typescript
// Add to TournamentDetails.tsx
const renderLeaderboard = () => {
  if (tournament.scoring_format === 'weekly_9_hole') {
    return <NewWeeklyLeaderboard tournamentId={tournament.id} />;
  }
  return <MatchplayLeaderboard tournamentId={tournament.id} />;
};
```

## API Service Integration

### Add to `client/src/services/api.ts`
```typescript
// New interfaces
export interface WeeklyScorecard {
  id: number;
  user_id: number;
  tournament_id: number;
  week_start_date: string;
  hole_scores: number[];
  total_score: number;
  is_live: boolean;
  group_id?: string;
}

export interface WeeklyLeaderboardEntry {
  user_id: number;
  first_name: string;
  last_name: string;
  club: string;
  total_hole_points: number;
  total_round_points: number;
  total_match_bonus: number;
  total_score: number;
  matches_played: number;
  matches_won: number;
  matches_tied: number;
  matches_lost: number;
  live_matches_played: number;
}

// New API functions
export const submitWeeklyScorecard = (tournamentId: number, data: {
  hole_scores: number[];
  is_live?: boolean;
  group_id?: string;
}) => api.post<WeeklyScorecard>(`/tournaments/${tournamentId}/weekly-scorecard`, data);

export const getWeeklyLeaderboard = (tournamentId: number, weekStartDate?: string) => 
  api.get<WeeklyLeaderboardEntry[]>(`/tournaments/${tournamentId}/weekly-leaderboard?week_start_date=${weekStartDate || ''}`);

export const getWeeklyMatches = (tournamentId: number, userId: number, weekStartDate?: string) =>
  api.get(`/tournaments/${tournamentId}/weekly-matches/${userId}?week_start_date=${weekStartDate || ''}`);
```

## Testing Strategy

### Backend Testing
1. **Unit Tests**: Test scoring calculation functions
2. **Integration Tests**: Test API endpoints
3. **Database Tests**: Test data integrity and constraints

### Frontend Testing
1. **Component Tests**: Test new React components
2. **Integration Tests**: Test API integration
3. **User Acceptance Tests**: Test live entry workflow

### Test Cases
1. **Score Entry**: 9-hole scorecard submission
2. **Live Entry**: Real-time scoring during play
3. **Match Calculation**: Head-to-head comparisons
4. **Leaderboard**: Weekly aggregation and display
5. **Drill-down**: Player match details
6. **Live Bonuses**: Group-based bonus calculation

## Deployment Strategy

### Staging Environment
1. Deploy database schema changes
2. Deploy backend API changes
3. Deploy frontend components
4. Test with sample data
5. Validate scoring calculations

### Production Environment
1. **Database Migration**: Run schema changes during maintenance window
2. **Backend Deployment**: Deploy API changes
3. **Frontend Deployment**: Deploy new components
4. **Feature Flag**: Enable new scoring format for specific tournaments
5. **Monitoring**: Monitor for errors and performance issues

## Rollback Plan

### Database Rollback
- Keep existing tables intact
- New tables are additive, not destructive
- Can disable new scoring format if issues arise

### Code Rollback
- Feature flag controls which scoring system to use
- Existing tournaments continue to use old system
- New tournaments can use new system

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Partitioning for weekly data (if needed)
- Query optimization for leaderboard calculations

### Frontend Optimization
- Lazy loading for match details
- Caching for leaderboard data
- Debounced live entry updates

## Monitoring & Analytics

### Key Metrics
- Scorecard submission rate
- Live entry usage
- Leaderboard calculation time
- User engagement with drill-down features

### Error Tracking
- API error rates
- Frontend error tracking
- Database constraint violations

## Future Enhancements

### Phase 5: Advanced Features
1. **Historical Data**: Multi-week leaderboards
2. **Statistics**: Player performance analytics
3. **Notifications**: Live match updates
4. **Mobile Optimization**: Touch-friendly live entry

### Phase 6: Integration Features
1. **External APIs**: Course data integration
2. **Social Features**: Match sharing and comments
3. **Advanced Analytics**: Predictive scoring models

## Success Criteria

### Technical Success
- [ ] All API endpoints return correct data
- [ ] Scoring calculations are accurate
- [ ] Live entry works without errors
- [ ] Leaderboard updates in real-time

### User Success
- [ ] Players can easily submit 9-hole scores
- [ ] Live entry improves user experience
- [ ] Leaderboard provides useful insights
- [ ] Drill-down features are intuitive

### Business Success
- [ ] Increased player engagement
- [ ] More accurate scoring representation
- [ ] Better tournament management capabilities
- [ ] Positive user feedback

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Database & Backend | Schema, API endpoints, scoring logic |
| 2 | Frontend Components | Scoring component, leaderboard component |
| 3 | Integration | API services, routing, tournament integration |
| 4 | Testing & Deployment | Testing, bug fixes, production deployment |

## Risk Mitigation

### Technical Risks
- **Database Performance**: Monitor query performance, add indexes as needed
- **API Complexity**: Thorough testing of scoring calculations
- **Frontend Complexity**: Component testing and error handling

### User Risks
- **Learning Curve**: Clear documentation and help text
- **Data Migration**: Gradual rollout with feature flags
- **User Adoption**: Training and support materials

### Business Risks
- **Timeline**: Phased approach allows for adjustments
- **Quality**: Comprehensive testing strategy
- **Support**: Documentation and training materials 