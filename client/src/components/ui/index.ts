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

// Floating Action Button & Circle Button Components
export {
  FloatingActionButton,
  CircleButton,
  type FloatingActionButtonProps,
  type CircleButtonProps
} from './FloatingActionButton';

// Segmented Control Components
export {
  SegmentedControl,
  ViewToggle,
  type SegmentedControlProps,
  type SegmentedControlOption,
  type ViewToggleProps
} from './SegmentedControl';

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

// Form Input Components
export {
  Input,
  PasswordInput,
  SearchInput,
  Textarea,
  Select,
  type InputProps,
  type PasswordInputProps,
  type SearchInputProps,
  type TextareaProps,
  type SelectProps,
  type SelectOption
} from './Input';

// Checkbox, Radio, and Switch Components
export {
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  Switch,
  type CheckboxProps,
  type CheckboxGroupProps,
  type CheckboxGroupOption,
  type RadioProps,
  type RadioGroupProps,
  type RadioGroupOption,
  type SwitchProps
} from './Checkbox';

// Modal Components
export {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  ConfirmationDialog,
  FormDialog,
  Drawer,
  type ModalProps,
  type ModalHeaderProps,
  type ModalContentProps,
  type ModalFooterProps,
  type ConfirmationDialogProps,
  type FormDialogProps,
  type DrawerProps,
  type ModalSize,
  type ConfirmationVariant,
  type DrawerPosition
} from './Modal';

// Tabs Components
export {
  Tabs,
  TabPanel,
  TabsSystem,
  type TabsProps,
  type TabPanelProps,
  type TabsSystemProps,
  type Tab,
  type TabContent,
  type TabsVariant,
  type TabsSize
} from './Tabs';

// Table Components
export {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  DataTable,
  type TableProps,
  type TableHeadProps,
  type TableBodyProps,
  type TableRowProps,
  type TableHeaderProps,
  type TableCellProps,
  type DataTableProps,
  type Column,
  type SortDirection
} from './Table';

// Dropdown Components
export {
  Dropdown,
  DropdownItem,
  DropdownDivider,
  DropdownLabel,
  SelectDropdown,
  MenuButton,
  type DropdownProps,
  type DropdownItemProps,
  type DropdownDividerProps,
  type DropdownLabelProps,
  type SelectDropdownProps,
  type SelectDropdownOption,
  type MenuButtonProps,
  type DropdownPosition
} from './Dropdown';

// Tooltip Components
export {
  Tooltip,
  InfoTooltip,
  type TooltipProps,
  type InfoTooltipProps,
  type TooltipPosition,
  type TooltipVariant
} from './Tooltip';

// Avatar Components
export {
  Avatar,
  AvatarGroup,
  AvatarWithText,
  type AvatarProps,
  type AvatarGroupProps,
  type AvatarWithTextProps,
  type AvatarSize,
  type AvatarVariant
} from './Avatar';
export { SimpleLoading } from './SimpleLoading';
export { PageContainer, type PageContainerProps } from './PageContainer';
export { CalendarStyles } from './CalendarStyles';

// Testimonial Components
export {
  Testimonial,
  TestimonialSection,
  type TestimonialProps,
  type TestimonialSectionProps
} from './Testimonial';

// Feed Item Components
export {
  FeedItem,
  type FeedItemProps,
  type FeedItemVariant,
  type FeedItemStatus
} from './FeedItem';
