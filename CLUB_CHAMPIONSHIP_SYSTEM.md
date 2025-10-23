# Club Championship & National Tournament System

## Overview

This system implements a hierarchical championship structure where:
1. **Club Championships** are organized by member clubs from user profiles
2. **Small clubs** are automatically combined until they have enough participants for 3 matches
3. **National Championship** is populated from club championship winners

## System Hierarchy

```
National Championship (Single Elimination)
    ↓
Club Championships (3 match play matches per group)
    ↓
Club Groups (Auto-grouped small clubs)
    ↓
Individual Members (Grouped by club from profile)
```

## Database Schema Updates

### New Tables Created:
- `championship_groups` - Groups related championship tournaments
- `club_groups` - Manages club groupings within tournaments
- `championship_progression` - Tracks progression from club to national

### New Columns Added to `tournaments`:
- `championship_type` - 'single_club', 'multi_club', 'regional'
- `participating_clubs` - Comma-separated list of clubs
- `min_club_participants` - Minimum participants per club
- `auto_group_clubs` - Auto-combine small clubs
- `auto_seed_champions` - Auto-seed from club champions
- `championship_group_id` - Links to championship group

## Tournament Types

### 1. Club Championship
**Purpose**: 3 match play matches per club group
**Grouping**: Players grouped by their club from user profile
**Auto-Grouping**: Small clubs combined until minimum participant threshold met
**Format**: Match play (head-to-head matches)
**Scoring**: 
  - Primary: Match play record (wins, losses, ties)
  - Tiebreaker: Cumulative holes won across all matches
  - Example: "3up with 2 to play" = 3 tiebreaker points
**Winner**: Club champion advances to National Championship

**Configuration Options**:
- Single Club Championship
- Multi-Club Championship (Combined)
- Regional Championship
- Minimum participants per club (default: 4)
- Auto-group small clubs checkbox

### 2. National Championship
**Purpose**: Single-elimination tournament for club champions
**Seeding**: Automatically seeded from completed club championships
**Format**: Match play elimination bracket

**Configuration Options**:
- Parent Championship ID
- Auto-seed from club champions checkbox

## User Flow

### 1. Creating Club Championships
1. Admin creates "Club Championship" tournament
2. System automatically groups players by their club (from user profile)
3. Small clubs (< min participants) are combined into groups
4. 3 match play matches are generated for each group
5. Winner of each group becomes "Club Champion"

### 2. Creating National Championship
1. Admin creates "National Championship" tournament
2. System automatically seeds all club champions
3. Single-elimination bracket is generated
4. Tournament proceeds until one champion remains

## Key Features

### Automatic Club Grouping
- Clubs with insufficient participants are automatically combined
- Minimum participant threshold is configurable
- Groups are named systematically (e.g., "Combined Group 1")

### Club-Based Registration
- Players are automatically placed in their club's championship
- No manual club selection required
- Uses existing `club` field from user profiles

### Championship Progression
- Club champions automatically qualify for National Championship
- Progression is tracked in `championship_progression` table
- Seeding is automatic based on club championship results

## API Endpoints Needed

### Club Championship Management
- `GET /api/tournaments/:id/club-participants` - Get club participant counts
- `POST /api/tournaments/:id/club-groups` - Create club group
- `POST /api/tournaments/:id/determine-champions` - Determine club champions

### National Championship Seeding
- `GET /api/tournaments/:id/available-champions` - Get available club champions
- `POST /api/tournaments/:id/seed-champions` - Seed national tournament

## Frontend Components

### TournamentForm.tsx
- Updated with championship configuration options
- New fields for club grouping and auto-seeding
- Conditional UI based on tournament type

### ClubChampionshipManager.tsx
- Manages club grouping and participant counts
- Auto-grouping functionality for small clubs
- Club champion determination interface

## Implementation Steps

### Phase 1: Database Setup
1. Run `club_championship_schema_update.sql` in pgAdmin4
2. Verify new tables and columns are created
3. Test database connectivity

### Phase 2: Backend API
1. Add new API endpoints for club management
2. Implement auto-grouping logic
3. Add championship progression tracking

### Phase 3: Frontend Integration
1. Update TournamentForm with new fields
2. Create ClubChampionshipManager component
3. Integrate with existing tournament management

### Phase 4: Testing
1. Create test club championships
2. Test auto-grouping functionality
3. Test national championship seeding
4. Verify complete championship flow

## Configuration Examples

### Single Club Championship
```json
{
  "type": "club_championship",
  "championship_type": "single_club",
  "participating_clubs": "Pine Valley Golf Club",
  "min_club_participants": 4,
  "auto_group_clubs": false
}
```

### Multi-Club Championship
```json
{
  "type": "club_championship",
  "championship_type": "multi_club",
  "participating_clubs": "Pine Valley, Augusta National, Pebble Beach",
  "min_club_participants": 4,
  "auto_group_clubs": true
}
```

### National Championship
```json
{
  "type": "national_championship",
  "parent_tournament_id": 123,
  "auto_seed_champions": true
}
```

## Tiebreaker System

### Primary Ranking: Match Play Record
1. **Wins** (3 points each)
2. **Ties** (1 point each) 
3. **Losses** (0 points)

### Tiebreaker: Cumulative Holes Won
When players have identical match play records, ranking is determined by:
- **Total holes won** across all 3 matches
- **Net holes** (holes won - holes lost)
- **Example**: Player beats opponent "3up with 2 to play" = 3 tiebreaker points

### Ranking Logic
```sql
ORDER BY 
  match_wins DESC,
  match_ties DESC, 
  tiebreaker_points DESC,
  net_holes DESC
```

## Benefits

1. **Automatic Organization**: No manual club assignment needed
2. **Fair Grouping**: Small clubs get combined for competitive play
3. **Clear Progression**: Obvious path from club to national championship
4. **Scalable**: Works with any number of clubs and participants
5. **Configurable**: Flexible settings for different tournament types
6. **Fair Tiebreaking**: Cumulative holes won provides fair tiebreaker system

This system provides a complete championship hierarchy that automatically manages club-based tournaments and feeds into a national championship, exactly as requested.
