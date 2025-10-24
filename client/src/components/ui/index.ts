// ============================================================
// UI Component Library - Barrel Export
// ============================================================
// This file provides centralized exports for all UI components
// Usage: import { Button, Card, Badge } from '@/components/ui';

// Button Components
export {
  Button,
  IconButton,
  type ButtonProps,
  type IconButtonProps,
  type ButtonVariant,
  type ButtonSize
} from './Button';

// Card Components
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  StatCard,
  type CardProps,
  type CardHeaderProps,
  type CardContentProps,
  type CardFooterProps,
  type StatCardProps,
  type CardVariant,
  type CardPadding
} from './Card';

// Badge Components
export {
  Badge,
  StatusBadge,
  CountBadge,
  type BadgeProps,
  type StatusBadgeProps,
  type CountBadgeProps,
  type BadgeVariant,
  type BadgeSize,
  type BadgeStyle,
  type StatusType
} from './Badge';

// Loading Components
export {
  Spinner,
  LoadingOverlay,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonListItem,
  SkeletonList,
  Loading,
  type SpinnerProps,
  type LoadingOverlayProps,
  type SkeletonProps,
  type LoadingProps,
  type SpinnerSize,
  type SkeletonVariant
} from './Loading';

// Empty State Components
export {
  EmptyState,
  EmptySearchResults,
  EmptyInbox,
  EmptyTeamMembers,
  EmptySchedule,
  EmptyMatches,
  EmptyLeaderboard,
  EmptyScores,
  EmptyData,
  EmptyTable,
  type EmptyStateProps,
  type PresetEmptyStateProps,
  type EmptyTableProps
} from './EmptyState';

// Error State Components
export {
  Alert,
  ErrorPage,
  NotFoundPage,
  ServerErrorPage,
  UnauthorizedPage,
  InlineError,
  FieldError,
  ErrorBoundaryFallback,
  ApiError,
  type AlertProps,
  type ErrorPageProps,
  type InlineErrorProps,
  type FieldErrorProps,
  type ErrorBoundaryFallbackProps,
  type ApiErrorProps,
  type AlertVariant
} from './ErrorState';
