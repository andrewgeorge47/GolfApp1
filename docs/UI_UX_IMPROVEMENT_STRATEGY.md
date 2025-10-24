# UI/UX Improvement Strategy
## Transform UAL League Components into Brand-Consistent Masterpieces

---

## Executive Summary

Your foundation is **excellent** - you have 19 well-structured, TypeScript-safe components with a consistent brand identity. This document outlines a comprehensive strategy to elevate them from "production-ready" to "UI/UX masterpieces."

**Current State**:
- ✅ Solid architecture and TypeScript safety
- ✅ Brand colors and design system established
- ✅ Consistent component patterns
- ✅ Comprehensive functionality

**Target State**:
- 🎯 Premium, modern, engaging user experience
- 🎯 Delightful micro-interactions and animations
- 🎯 Accessibility-first (WCAG 2.1 AA)
- 🎯 Mobile-first responsive design
- 🎯 Performance-optimized
- 🎯 Intuitive, friction-free workflows

---

## Part 1: Design System Enhancements

### 1.1 Color Palette Expansion

**Current Colors** (Good foundation):
```css
--brand-dark-green: #1a5f3c
--brand-muted-green: #2d7a4f
--brand-neon-green: #77dd3c
--brand-black: #1a1a1a
```

**Proposed Expansion** (Add semantic colors):
```css
/* Brand Colors - Extended */
--brand-forest-green: #0f4429      /* Darker variant for depth */
--brand-sage-green: #4a7c5f        /* Medium green for backgrounds */
--brand-mint-green: #a3e0c4        /* Light accent for success states */
--brand-lime-green: #9ef01a        /* Brighter neon for CTAs */

/* Semantic Colors */
--success: #10b981                 /* Confirmations, success states */
--warning: #f59e0b                 /* Warnings, pending states */
--error: #ef4444                   /* Errors, destructive actions */
--info: #3b82f6                    /* Information, neutral actions */

/* Neutral Grays - Extended */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-400: #9ca3af
--gray-500: #6b7280
--gray-600: #4b5563
--gray-700: #374151
--gray-800: #1f2937
--gray-900: #111827

/* Surface Colors */
--surface-primary: #ffffff
--surface-secondary: #f9fafb
--surface-tertiary: #f3f4f6
--surface-elevated: #ffffff        /* With shadow */

/* Interactive States */
--interactive-hover: rgba(26, 95, 60, 0.08)
--interactive-active: rgba(26, 95, 60, 0.12)
--interactive-focus: rgba(119, 221, 60, 0.20)
--interactive-disabled: rgba(26, 26, 26, 0.38)

/* Overlays */
--overlay-light: rgba(255, 255, 255, 0.95)
--overlay-dark: rgba(0, 0, 0, 0.6)
--overlay-scrim: rgba(0, 0, 0, 0.32)

/* Golf-specific Colors */
--golf-fairway: #2d7a4f           /* Fairway green */
--golf-rough: #5a7c65             /* Rough green */
--golf-sand: #daa520              /* Sand trap gold */
--golf-water: #1e40af             /* Water hazard blue */
--golf-flag: #dc2626              /* Flag red */
```

### 1.2 Typography System

**Proposed Type Scale**:
```css
/* Display - For hero sections, major headlines */
--font-display-xl: 4.5rem / 1.1 / 700      /* 72px */
--font-display-lg: 3.75rem / 1.1 / 700     /* 60px */
--font-display-md: 3rem / 1.2 / 700        /* 48px */

/* Heading - For section titles */
--font-heading-xl: 2.25rem / 1.2 / 700     /* 36px */
--font-heading-lg: 1.875rem / 1.3 / 600    /* 30px */
--font-heading-md: 1.5rem / 1.3 / 600      /* 24px */
--font-heading-sm: 1.25rem / 1.4 / 600     /* 20px */
--font-heading-xs: 1.125rem / 1.4 / 600    /* 18px */

/* Body - For content */
--font-body-lg: 1.125rem / 1.6 / 400       /* 18px */
--font-body-md: 1rem / 1.5 / 400           /* 16px - base */
--font-body-sm: 0.875rem / 1.5 / 400       /* 14px */
--font-body-xs: 0.75rem / 1.5 / 400        /* 12px */

/* Label - For form labels, buttons */
--font-label-lg: 1rem / 1.5 / 500          /* 16px */
--font-label-md: 0.875rem / 1.5 / 500      /* 14px */
--font-label-sm: 0.75rem / 1.5 / 500       /* 12px */

/* Mono - For stats, scores, numbers */
--font-mono: 'JetBrains Mono', 'Courier New', monospace
--font-mono-lg: 1.125rem / 1.5 / 500
--font-mono-md: 1rem / 1.5 / 500
--font-mono-sm: 0.875rem / 1.5 / 500
```

**Font Weights**:
```css
--font-thin: 100
--font-extralight: 200
--font-light: 300
--font-regular: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
--font-extrabold: 800
```

### 1.3 Spacing & Sizing System

**8px Base Grid** (consistent with Tailwind):
```css
--space-0: 0
--space-1: 0.25rem    /* 4px */
--space-2: 0.5rem     /* 8px */
--space-3: 0.75rem    /* 12px */
--space-4: 1rem       /* 16px */
--space-5: 1.25rem    /* 20px */
--space-6: 1.5rem     /* 24px */
--space-8: 2rem       /* 32px */
--space-10: 2.5rem    /* 40px */
--space-12: 3rem      /* 48px */
--space-16: 4rem      /* 64px */
--space-20: 5rem      /* 80px */
--space-24: 6rem      /* 96px */
```

### 1.4 Shadows & Elevation

**Shadow System** (for depth):
```css
/* Shadows */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Golf-themed shadows */
--shadow-green: 0 4px 14px 0 rgba(26, 95, 60, 0.15);
--shadow-neon: 0 0 20px 0 rgba(119, 221, 60, 0.3);

/* Focus shadows */
--shadow-focus: 0 0 0 3px rgba(119, 221, 60, 0.3);
```

### 1.5 Border Radius System

```css
--radius-none: 0
--radius-sm: 0.25rem    /* 4px */
--radius-md: 0.375rem   /* 6px */
--radius-lg: 0.5rem     /* 8px */
--radius-xl: 0.75rem    /* 12px */
--radius-2xl: 1rem      /* 16px */
--radius-3xl: 1.5rem    /* 24px */
--radius-full: 9999px   /* Pill shape */
```

### 1.6 Animation & Transitions

```css
/* Duration */
--duration-fast: 150ms
--duration-normal: 250ms
--duration-slow: 350ms
--duration-slower: 500ms

/* Easing */
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
--ease-smooth: cubic-bezier(0.25, 0.46, 0.45, 0.94)

/* Common transitions */
--transition-all: all var(--duration-normal) var(--ease-in-out)
--transition-opacity: opacity var(--duration-fast) var(--ease-out)
--transition-transform: transform var(--duration-normal) var(--ease-out)
--transition-colors: background-color, border-color, color var(--duration-fast) var(--ease-in-out)
```

---

## Part 2: Component-by-Component Improvements

### 2.1 Universal Component Patterns

**Apply to ALL components**:

#### A. Loading States
**Current**: Basic spinner
**Improved**: Skeleton screens + micro-animations

```tsx
// Skeleton Component
const Skeleton = ({ className, variant = 'text' }: { className?: string; variant?: 'text' | 'circular' | 'rectangular' }) => (
  <div
    className={`
      animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200
      bg-[length:200%_100%] animate-shimmer
      ${variant === 'text' ? 'h-4 w-full rounded' : ''}
      ${variant === 'circular' ? 'rounded-full' : ''}
      ${variant === 'rectangular' ? 'rounded-lg' : ''}
      ${className}
    `}
  />
);

// Usage in LeagueStandings
const StandingsTableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg">
        <Skeleton variant="circular" className="h-10 w-10" />
        <Skeleton className="h-6 flex-1" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    ))}
  </div>
);
```

#### B. Empty States
**Current**: Simple "No data" text
**Improved**: Illustrative empty states with CTAs

```tsx
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="rounded-full bg-gray-100 p-6 mb-4">
      <Icon className="h-12 w-12 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6 max-w-sm">{description}</p>
    {action && (
      <button
        onClick={action.onClick}
        className="px-6 py-2.5 bg-brand-dark-green text-white rounded-lg font-medium
                   hover:bg-brand-forest-green transition-colors duration-200
                   focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:ring-offset-2"
      >
        {action.label}
      </button>
    )}
  </div>
);
```

#### C. Error States
**Current**: Toast notifications
**Improved**: Inline errors + retry mechanisms

```tsx
const ErrorState = ({
  error,
  onRetry
}: {
  error: string;
  onRetry?: () => void;
}) => (
  <div className="rounded-lg border border-red-200 bg-red-50 p-6">
    <div className="flex items-start">
      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-sm font-medium text-red-600 hover:text-red-500
                       focus:outline-none focus:underline"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  </div>
);
```

#### D. Micro-interactions
**Add delightful hover/focus states**:

```css
/* Button hover effect */
.btn-primary {
  @apply bg-brand-dark-green text-white px-6 py-2.5 rounded-lg font-medium
         transition-all duration-200 ease-out
         hover:bg-brand-forest-green hover:shadow-lg hover:scale-[1.02]
         active:scale-[0.98]
         focus:outline-none focus:ring-2 focus:ring-brand-neon-green focus:ring-offset-2;
}

/* Card hover effect */
.card-interactive {
  @apply transition-all duration-200 ease-out
         hover:shadow-xl hover:-translate-y-1
         cursor-pointer;
}

/* Icon button with bounce */
.icon-btn {
  @apply transition-all duration-200
         hover:scale-110 active:scale-95;
}
```

---

### 2.2 Phase 7: Admin Components

#### LeagueManagement.tsx Improvements

**1. Hero Section Enhancement**
```tsx
const LeagueManagementHero = () => (
  <div className="relative bg-gradient-to-br from-brand-dark-green to-brand-forest-green
                  rounded-2xl p-8 mb-8 overflow-hidden">
    {/* Decorative background pattern */}
    <div className="absolute inset-0 opacity-10">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>

    <div className="relative z-10">
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          <Trophy className="h-8 w-8 text-brand-neon-green" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">League Management</h1>
          <p className="text-brand-mint-green">Create and manage your golf leagues</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <StatCard icon={Trophy} label="Active Leagues" value="3" />
        <StatCard icon={Users} label="Total Teams" value="24" />
        <StatCard icon={Calendar} label="Weeks Played" value="8" />
        <StatCard icon={Target} label="Matches" value="96" />
      </div>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
    <Icon className="h-5 w-5 text-brand-neon-green mb-2" />
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-brand-mint-green">{label}</div>
  </div>
);
```

**2. Enhanced League Cards**
```tsx
const LeagueCard = ({ league, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="group bg-white rounded-xl border border-gray-200
                    hover:border-brand-neon-green hover:shadow-green
                    transition-all duration-300 overflow-hidden">
      {/* Header with status indicator */}
      <div className="p-6 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            {/* League Icon */}
            <div className={`
              p-3 rounded-xl transition-all duration-300
              ${league.status === 'active'
                ? 'bg-green-100 group-hover:bg-green-200'
                : 'bg-gray-100 group-hover:bg-gray-200'
              }
            `}>
              <Trophy className={`h-6 w-6 ${
                league.status === 'active' ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{league.name}</h3>
                <StatusBadge status={league.status} />
              </div>
              <p className="text-sm text-gray-600">{league.season}</p>

              {/* Quick info chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Chip icon={Users} label={`${league.teams} Teams`} />
                <Chip icon={Calendar} label={`${league.weeks} Weeks`} />
                <Chip icon={MapPin} label={league.format} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <IconButton
              icon={Edit3}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <IconButton
              icon={Trash2}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              variant="danger"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            />
            <ChevronDown
              className={`h-5 w-5 text-gray-400 transition-transform duration-300
                         ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-100"
          >
            <div className="p-6 bg-gray-50">
              {/* Detailed stats and info */}
              <div className="grid grid-cols-3 gap-4">
                <DetailCard label="Total Points" value={league.totalPoints} />
                <DetailCard label="Matches Played" value={league.matchesPlayed} />
                <DetailCard label="Completion" value={`${league.completionPct}%`} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

**3. Enhanced Status Badges**
```tsx
const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
    active: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' }
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                      ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} mr-2 animate-pulse`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
```

---

### 2.3 Phase 8: Captain Dashboard

#### CaptainDashboard.tsx Improvements

**1. Dashboard Header with Team Identity**
```tsx
const DashboardHeader = ({ team }) => (
  <div className="relative bg-gradient-to-r from-brand-dark-green via-brand-muted-green to-brand-dark-green
                  rounded-2xl p-8 mb-8 overflow-hidden">
    {/* Animated background */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(119,221,60,0.3),transparent_50%)]
                      animate-pulse" />
    </div>

    <div className="relative z-10">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-6">
          {/* Team Avatar/Logo */}
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm
                            flex items-center justify-center border-2 border-white/30">
              <Users className="h-10 w-10 text-white" />
            </div>
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-500
                            rounded-full border-4 border-brand-dark-green" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{team.name}</h1>
            <div className="flex items-center space-x-4 text-brand-mint-green">
              <span className="flex items-center">
                <Trophy className="h-4 w-4 mr-1" />
                {team.division_name}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <Target className="h-4 w-4 mr-1" />
                #{team.current_standing} of {team.total_teams}
              </span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex space-x-3">
          <QuickActionButton icon={Users} label="View Roster" />
          <QuickActionButton icon={Calendar} label="Schedule" />
          <QuickActionButton icon={Settings} label="Settings" />
        </div>
      </div>

      {/* Performance metrics bar */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <MetricCard
          label="Win Rate"
          value={`${((team.wins / team.total_matches) * 100).toFixed(0)}%`}
          trend="+5%"
          trendUp={true}
        />
        <MetricCard
          label="Points"
          value={team.total_points}
          subtitle={`Avg ${(team.total_points / team.total_matches).toFixed(1)}/match`}
        />
        <MetricCard
          label="Matches"
          value={`${team.wins}-${team.ties}-${team.losses}`}
          subtitle="W-T-L"
        />
        <MetricCard
          label="Streak"
          value="W3"
          icon={TrendingUp}
        />
      </div>
    </div>
  </div>
);
```

**2. Upcoming Matches with Timeline**
```tsx
const UpcomingMatchesTimeline = ({ matches }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-6">Upcoming Matches</h2>

    <div className="space-y-4">
      {matches.map((match, index) => (
        <MatchTimelineCard
          key={match.id}
          match={match}
          isNext={index === 0}
        />
      ))}
    </div>
  </div>
);

const MatchTimelineCard = ({ match, isNext }) => {
  const daysUntil = differenceInDays(new Date(match.week_start_date), new Date());
  const isUrgent = daysUntil <= 2;

  return (
    <div className={`
      relative rounded-xl border-2 p-4 transition-all duration-300
      ${isNext
        ? 'border-brand-neon-green bg-green-50 shadow-green'
        : 'border-gray-200 bg-white hover:border-gray-300'
      }
    `}>
      {/* Urgency indicator */}
      {isUrgent && (
        <div className="absolute -top-2 -right-2 px-3 py-1 bg-red-500 text-white
                        text-xs font-bold rounded-full shadow-lg animate-bounce">
          {daysUntil === 0 ? 'TODAY' : `${daysUntil}d`}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Date badge */}
          <div className="text-center">
            <div className="text-2xl font-bold text-brand-dark-green">
              {format(new Date(match.week_start_date), 'dd')}
            </div>
            <div className="text-xs text-gray-600">
              {format(new Date(match.week_start_date), 'MMM')}
            </div>
          </div>

          <div className="h-12 w-px bg-gray-200" />

          {/* Match info */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-semibold text-gray-900">vs {match.opponent_team_name}</h3>
              {!match.lineup_submitted && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  Lineup Pending
                </span>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              {match.course_name}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div>
          {!match.lineup_submitted ? (
            <button className="px-4 py-2 bg-brand-dark-green text-white rounded-lg
                               hover:bg-brand-forest-green transition-colors
                               text-sm font-medium">
              Submit Lineup
            </button>
          ) : (
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg
                               hover:bg-gray-200 transition-colors
                               text-sm font-medium">
              View Lineup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

**3. Lineup Selector with Drag & Drop**
```tsx
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const LineupSelectorEnhanced = ({ team, onSubmit }) => {
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(team.members);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    // Handle drop logic
    if (over.id === 'lineup' && selectedPlayers.length < 3) {
      const player = availablePlayers.find(p => p.id === active.id);
      if (player) {
        setSelectedPlayers([...selectedPlayers, player]);
        setAvailablePlayers(availablePlayers.filter(p => p.id !== active.id));
      }
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 gap-6">
        {/* Available players */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Players</h3>
          <SortableContext items={availablePlayers} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {availablePlayers.map(player => (
                <DraggablePlayerCard key={player.id} player={player} />
              ))}
            </div>
          </SortableContext>
        </div>

        {/* Selected lineup */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Starting Lineup ({selectedPlayers.length}/3)
          </h3>
          <SortableContext items={selectedPlayers} strategy={verticalListSortingStrategy}>
            <div id="lineup" className="space-y-2 min-h-[300px] border-2 border-dashed
                                         border-gray-300 rounded-xl p-4">
              {selectedPlayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Users className="h-12 w-12 mb-2" />
                  <p className="text-sm">Drag players here</p>
                </div>
              ) : (
                selectedPlayers.map((player, index) => (
                  <DraggablePlayerCard
                    key={player.id}
                    player={player}
                    position={index + 1}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </DndContext>
  );
};

const DraggablePlayerCard = ({ player, position }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border-2 border-gray-200 rounded-lg p-4 cursor-move
                 hover:border-brand-neon-green hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {position && (
            <div className="h-8 w-8 rounded-full bg-brand-dark-green text-white
                            flex items-center justify-center font-bold text-sm">
              {position}
            </div>
          )}
          <div>
            <div className="font-semibold text-gray-900">
              {player.first_name} {player.last_name}
            </div>
            <div className="text-sm text-gray-600">
              Handicap: {player.handicap}
            </div>
          </div>
        </div>
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium
          ${player.availability_status === 'available'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700'
          }
        `}>
          {player.availability_status}
        </div>
      </div>
    </div>
  );
};
```

---

### 2.4 Phase 11: Leaderboards

#### LeagueStandings.tsx Improvements

**1. Interactive Standings Table**
```tsx
const StandingsTable = ({ standings, onTeamClick }) => {
  const [sortedStandings, setSortedStandings] = useState(standings);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <SortableHeader label="Rank" sortKey="rank" sortConfig={sortConfig} onSort={handleSort} />
            <SortableHeader label="Team" sortKey="team_name" sortConfig={sortConfig} onSort={handleSort} />
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Record
            </th>
            <SortableHeader label="Points" sortKey="total_points" sortConfig={sortConfig} onSort={handleSort} />
            <SortableHeader label="Agg Net" sortKey="aggregate_net_score" sortConfig={sortConfig} onSort={handleSort} />
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Form
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedStandings.map((team, index) => (
            <StandingsRow
              key={team.team_id}
              team={team}
              index={index}
              onClick={() => onTeamClick(team.team_id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const StandingsRow = ({ team, index, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const rankChange = team.previous_rank ? team.previous_rank - team.rank_in_division : 0;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`
        cursor-pointer transition-all duration-200
        ${isHovered ? 'bg-green-50' : 'bg-white'}
        ${team.playoff_qualified ? 'border-l-4 border-l-brand-neon-green' : ''}
      `}
    >
      {/* Rank with movement indicator */}
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-gray-900">{team.rank_in_division}</span>
          {rankChange !== 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`flex items-center ${
                rankChange > 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {rankChange > 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-xs ml-1">{Math.abs(rankChange)}</span>
            </motion.div>
          )}
        </div>
      </td>

      {/* Team name with captain */}
      <td className="px-6 py-4">
        <div>
          <div className="font-semibold text-gray-900 flex items-center space-x-2">
            <span>{team.team_name}</span>
            {team.playoff_qualified && (
              <Trophy className="h-4 w-4 text-brand-neon-green" />
            )}
          </div>
          <div className="text-sm text-gray-600">{team.captain_name}</div>
        </div>
      </td>

      {/* Record */}
      <td className="px-6 py-4">
        <div className="flex items-center space-x-1 font-mono text-sm">
          <span className="text-green-600 font-semibold">{team.wins}</span>
          <span className="text-gray-400">-</span>
          <span className="text-yellow-600 font-semibold">{team.ties}</span>
          <span className="text-gray-400">-</span>
          <span className="text-red-600 font-semibold">{team.losses}</span>
        </div>
      </td>

      {/* Points with progress bar */}
      <td className="px-6 py-4">
        <div>
          <div className="font-mono font-bold text-brand-dark-green">
            {team.total_points.toFixed(1)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-brand-neon-green h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(team.total_points / 15) * 100}%` }}
            />
          </div>
        </div>
      </td>

      {/* Aggregate net */}
      <td className="px-6 py-4">
        <div className="font-mono text-sm text-gray-700">
          {team.aggregate_net_score}
        </div>
      </td>

      {/* Form (last 5 matches) */}
      <td className="px-6 py-4">
        <FormIndicator form={team.recent_form} />
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        {team.playoff_qualified && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                           bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Qualified
          </span>
        )}
      </td>
    </motion.tr>
  );
};

const FormIndicator = ({ form }: { form?: string }) => {
  if (!form) return null;

  return (
    <div className="flex space-x-1">
      {form.split('').map((result, index) => (
        <div
          key={index}
          className={`
            h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold
            ${result === 'W' ? 'bg-green-500 text-white' : ''}
            ${result === 'L' ? 'bg-red-500 text-white' : ''}
            ${result === 'T' ? 'bg-yellow-500 text-white' : ''}
          `}
        >
          {result}
        </div>
      ))}
    </div>
  );
};
```

---

## Part 3: Shared Component Library

Create a centralized component library for consistency:

### 3.1 Button System
```tsx
// components/ui/Button.tsx
type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  children,
  onClick,
  className = ''
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-brand-dark-green text-white hover:bg-brand-forest-green focus:ring-brand-neon-green',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {!loading && Icon && iconPosition === 'left' && <Icon className="h-4 w-4 mr-2" />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon className="h-4 w-4 ml-2" />}
    </button>
  );
};
```

### 3.2 Card System
```tsx
// components/ui/Card.tsx
export const Card = ({
  children,
  hoverable = false,
  className = ''
}: {
  children: React.ReactNode;
  hoverable?: boolean;
  className?: string;
}) => (
  <div className={`
    bg-white rounded-xl border border-gray-200 p-6
    ${hoverable ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer transition-all duration-200' : ''}
    ${className}
  `}>
    {children}
  </div>
);

export const CardHeader = ({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);
```

### 3.3 Badge System
```tsx
// components/ui/Badge.tsx
type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

export const Badge = ({
  children,
  variant = 'default',
  dot = false
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
}) => {
  const variants = {
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    default: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const dotColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    default: 'bg-gray-500'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {dot && <span className={`w-2 h-2 rounded-full ${dotColors[variant]} mr-1.5 animate-pulse`} />}
      {children}
    </span>
  );
};
```

---

## Part 4: Accessibility Improvements

### 4.1 Keyboard Navigation
```tsx
// Add keyboard support to all interactive elements
const handleKeyPress = (event: React.KeyboardEvent, action: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

// Example usage
<div
  role="button"
  tabIndex={0}
  onKeyPress={(e) => handleKeyPress(e, () => handleClick())}
  onClick={handleClick}
>
  Interactive element
</div>
```

### 4.2 ARIA Labels
```tsx
// Add descriptive labels for screen readers
<button
  aria-label={`Edit ${team.name}`}
  aria-describedby={`team-${team.id}-description`}
>
  <Edit3 className="h-4 w-4" />
</button>
```

### 4.3 Focus Management
```tsx
// Focus trap for modals
import { FocusTrap } from '@headlessui/react';

const Modal = ({ isOpen, onClose, children }) => (
  <Dialog open={isOpen} onClose={onClose}>
    <FocusTrap>
      <div className="modal-content">
        {children}
      </div>
    </FocusTrap>
  </Dialog>
);
```

---

## Part 5: Performance Optimizations

### 5.1 Code Splitting
```tsx
// Lazy load components
const LeagueStandings = lazy(() => import('./components/LeagueStandings'));
const CaptainDashboard = lazy(() => import('./components/CaptainDashboard'));

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <LeagueStandings leagueId={1} />
</Suspense>
```

### 5.2 Memoization
```tsx
// Memoize expensive calculations
const sortedStandings = useMemo(() => {
  return standings.sort((a, b) => {
    if (sortConfig.key === 'points') {
      return sortConfig.direction === 'asc'
        ? a.total_points - b.total_points
        : b.total_points - a.total_points;
    }
    // ... other sort logic
  });
}, [standings, sortConfig]);

// Memoize callbacks
const handleTeamClick = useCallback((teamId: number) => {
  navigate(`/team/${teamId}`);
}, [navigate]);
```

### 5.3 Virtual Scrolling
```tsx
import { FixedSizeList } from 'react-window';

const VirtualizedStandings = ({ standings }) => (
  <FixedSizeList
    height={600}
    itemCount={standings.length}
    itemSize={72}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <StandingsRow team={standings[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

---

## Part 6: Animation & Motion

### 6.1 Page Transitions
```tsx
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const PageWrapper = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);
```

### 6.2 List Animations
```tsx
const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 }
};

<motion.ul variants={listVariants} initial="hidden" animate="show">
  {items.map(item => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.content}
    </motion.li>
  ))}
</motion.ul>
```

### 6.3 Micro-interactions
```tsx
// Hover scale
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  Click me
</motion.button>

// Success checkmark animation
<motion.div
  initial={{ scale: 0, rotate: -180 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
>
  <CheckCircle className="h-16 w-16 text-green-500" />
</motion.div>
```

---

## Part 7: Mobile Responsiveness

### 7.1 Responsive Breakpoints
```tsx
// Use Tailwind's responsive utilities consistently
<div className="
  grid
  grid-cols-1           /* Mobile: 1 column */
  md:grid-cols-2        /* Tablet: 2 columns */
  lg:grid-cols-3        /* Desktop: 3 columns */
  xl:grid-cols-4        /* Large desktop: 4 columns */
  gap-4
  md:gap-6
">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### 7.2 Mobile Navigation
```tsx
const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2"
        aria-label="Toggle menu"
      >
        {isOpen ? <X /> : <Menu />}
      </button>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-64 bg-white shadow-xl z-50 md:hidden"
          >
            {/* Mobile navigation items */}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
```

---

## Part 8: Implementation Priority

### Phase 1: Foundation (Week 1)
1. ✅ Implement enhanced color palette
2. ✅ Create typography system
3. ✅ Build shared component library (Button, Card, Badge)
4. ✅ Add loading states (skeletons)
5. ✅ Add empty states
6. ✅ Add error states

### Phase 2: Admin Components (Week 2)
1. ✅ LeagueManagement hero section
2. ✅ Enhanced league cards
3. ✅ Improved status badges
4. ✅ Better form layouts
5. ✅ Micro-interactions

### Phase 3: Captain Components (Week 3)
1. ✅ Dashboard header redesign
2. ✅ Match timeline component
3. ✅ Drag-and-drop lineup selector
4. ✅ Enhanced availability view
5. ✅ Strategy helper improvements

### Phase 4: Leaderboards (Week 4)
1. ✅ Interactive standings table
2. ✅ Form indicators
3. ✅ Team detail modals
4. ✅ Division comparisons
5. ✅ Playoff brackets

### Phase 5: Polish & Testing (Week 5)
1. ✅ Accessibility audit
2. ✅ Performance optimization
3. ✅ Animation polish
4. ✅ Mobile responsive testing
5. ✅ Cross-browser testing

---

## Conclusion

This strategy transforms your solid foundation into a premium, modern user experience. The key principles:

1. **Consistency**: Shared component library
2. **Delight**: Micro-interactions and animations
3. **Performance**: Code splitting and memoization
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Responsive**: Mobile-first design
6. **Modern**: Current UI/UX best practices

**Next Steps**:
1. Review and approve this strategy
2. I'll implement the changes component-by-component
3. Test and iterate based on feedback

Ready to start? Which phase would you like me to tackle first?
