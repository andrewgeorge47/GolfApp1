import React from 'react';
import {
  Search,
  Inbox,
  Users,
  Calendar,
  FileText,
  Database,
  Trophy,
  Flag,
  LucideIcon
} from 'lucide-react';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  } & Partial<ButtonProps>;
  secondaryAction?: {
    label: string;
    onClick: () => void;
  } & Partial<ButtonProps>;
  illustration?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
  children,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      {/* Icon or Illustration */}
      {illustration || (Icon && (
        <div className="mb-4 p-4 bg-brand-highlight-green bg-opacity-10 rounded-full">
          <Icon className="h-12 w-12 text-brand-dark-green" strokeWidth={1.5} />
        </div>
      ))}

      {/* Title */}
      <h3 className="text-heading-md text-brand-black font-semibold mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-base text-gray-600 max-w-md mb-6">
          {description}
        </p>
      )}

      {/* Custom Content */}
      {children}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              size={action.size || 'md'}
              icon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant={secondaryAction.variant || 'outline'}
              size={secondaryAction.size || 'md'}
              icon={secondaryAction.icon}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

// ============================================================
// Preset Empty States
// ============================================================

export interface PresetEmptyStateProps {
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

export const EmptySearchResults: React.FC<PresetEmptyStateProps> = ({
  onAction,
  actionLabel = 'Clear filters',
  className
}) => {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="We couldn't find any matches for your search. Try adjusting your filters or search terms."
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      className={className}
    />
  );
};

EmptySearchResults.displayName = 'EmptySearchResults';

export const EmptyInbox: React.FC<PresetEmptyStateProps> = ({
  onAction,
  actionLabel = 'Refresh',
  className
}) => {
  return (
    <EmptyState
      icon={Inbox}
      title="No messages"
      description="Your inbox is empty. You're all caught up!"
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      className={className}
    />
  );
};

EmptyInbox.displayName = 'EmptyInbox';

export const EmptyTeamMembers: React.FC<PresetEmptyStateProps & { canInvite?: boolean }> = ({
  onAction,
  actionLabel = 'Invite members',
  canInvite = true,
  className
}) => {
  return (
    <EmptyState
      icon={Users}
      title="No team members"
      description={
        canInvite
          ? "You haven't added any team members yet. Invite players to join your team."
          : 'This team has no members yet.'
      }
      action={
        canInvite && onAction
          ? { label: actionLabel, onClick: onAction }
          : undefined
      }
      className={className}
    />
  );
};

EmptyTeamMembers.displayName = 'EmptyTeamMembers';

export const EmptySchedule: React.FC<PresetEmptyStateProps> = ({
  onAction,
  actionLabel = 'Create schedule',
  className
}) => {
  return (
    <EmptyState
      icon={Calendar}
      title="No schedule available"
      description="There are no scheduled matches yet. Create a schedule to get started."
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      className={className}
    />
  );
};

EmptySchedule.displayName = 'EmptySchedule';

export const EmptyMatches: React.FC<PresetEmptyStateProps> = ({
  onAction,
  actionLabel = 'View schedule',
  className
}) => {
  return (
    <EmptyState
      icon={Flag}
      title="No matches found"
      description="There are no matches for this period. Check back later or view the full schedule."
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      className={className}
    />
  );
};

EmptyMatches.displayName = 'EmptyMatches';

export const EmptyLeaderboard: React.FC<PresetEmptyStateProps> = ({ className }) => {
  return (
    <EmptyState
      icon={Trophy}
      title="No standings yet"
      description="The leaderboard will be available once matches have been played and scores submitted."
      className={className}
    />
  );
};

EmptyLeaderboard.displayName = 'EmptyLeaderboard';

export const EmptyScores: React.FC<PresetEmptyStateProps> = ({
  onAction,
  actionLabel = 'Submit scores',
  className
}) => {
  return (
    <EmptyState
      icon={FileText}
      title="No scores submitted"
      description="Scores haven't been submitted for this match yet. Submit your scores to update the standings."
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      className={className}
    />
  );
};

EmptyScores.displayName = 'EmptyScores';

export const EmptyData: React.FC<PresetEmptyStateProps> = ({ className }) => {
  return (
    <EmptyState
      icon={Database}
      title="No data available"
      description="There is no data to display at this time."
      className={className}
    />
  );
};

EmptyData.displayName = 'EmptyData';

// ============================================================
// Empty State with Table Context
// ============================================================

export interface EmptyTableProps extends PresetEmptyStateProps {
  columns?: number;
}

export const EmptyTable: React.FC<EmptyTableProps> = ({
  onAction,
  actionLabel,
  columns,
  className
}) => {
  const content = (
    <EmptyState
      icon={Inbox}
      title="No data"
      description="There are no records to display."
      action={onAction ? { label: actionLabel || 'Add record', onClick: onAction } : undefined}
      className="py-8"
    />
  );

  if (columns) {
    return (
      <tr className={className}>
        <td colSpan={columns} className="text-center">
          {content}
        </td>
      </tr>
    );
  }

  return <div className={className}>{content}</div>;
};

EmptyTable.displayName = 'EmptyTable';
