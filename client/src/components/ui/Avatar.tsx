import React from 'react';
import { User } from 'lucide-react';

// ============================================================
// Avatar Component
// ============================================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type AvatarVariant = 'circular' | 'rounded' | 'square';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  status?: 'online' | 'offline' | 'away' | 'busy';
  showStatus?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; icon: string; status: string }> = {
  xs: {
    container: 'h-6 w-6',
    text: 'text-xs',
    icon: 'h-3 w-3',
    status: 'h-1.5 w-1.5 border'
  },
  sm: {
    container: 'h-8 w-8',
    text: 'text-sm',
    icon: 'h-4 w-4',
    status: 'h-2 w-2 border'
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-base',
    icon: 'h-5 w-5',
    status: 'h-2.5 w-2.5 border-2'
  },
  lg: {
    container: 'h-12 w-12',
    text: 'text-lg',
    icon: 'h-6 w-6',
    status: 'h-3 w-3 border-2'
  },
  xl: {
    container: 'h-16 w-16',
    text: 'text-xl',
    icon: 'h-8 w-8',
    status: 'h-3.5 w-3.5 border-2'
  },
  '2xl': {
    container: 'h-24 w-24',
    text: 'text-2xl',
    icon: 'h-12 w-12',
    status: 'h-4 w-4 border-2'
  }
};

const variantStyles: Record<AvatarVariant, string> = {
  circular: 'rounded-full',
  rounded: 'rounded-lg',
  square: 'rounded-none'
};

const statusColors = {
  online: 'bg-success-500',
  offline: 'bg-gray-400',
  away: 'bg-warning-500',
  busy: 'bg-error-500'
};

// Helper to get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Helper to generate color from name
const getColorFromName = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500'
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      size = 'md',
      variant = 'circular',
      status,
      showStatus = false,
      className = '',
      onClick
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);

    const sizes = sizeStyles[size];
    const displayName = alt || name || 'User';
    const initials = name ? getInitials(name) : '';
    const bgColor = name ? getColorFromName(name) : 'bg-gray-400';

    const shouldShowImage = src && !imageError;
    const shouldShowInitials = !shouldShowImage && name;
    const shouldShowIcon = !shouldShowImage && !name;

    return (
      <div
        ref={ref}
        className={`
          relative inline-flex items-center justify-center
          ${sizes.container}
          ${variantStyles[variant]}
          ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
          ${className}
        `}
        onClick={onClick}
      >
        {/* Image */}
        {shouldShowImage && (
          <img
            src={src}
            alt={displayName}
            className={`
              ${sizes.container}
              ${variantStyles[variant]}
              object-cover
            `}
            onError={() => setImageError(true)}
          />
        )}

        {/* Initials */}
        {shouldShowInitials && (
          <div
            className={`
              ${sizes.container}
              ${variantStyles[variant]}
              ${bgColor}
              flex items-center justify-center
              text-white font-semibold
              ${sizes.text}
            `}
          >
            {initials}
          </div>
        )}

        {/* Icon fallback */}
        {shouldShowIcon && (
          <div
            className={`
              ${sizes.container}
              ${variantStyles[variant]}
              ${bgColor}
              flex items-center justify-center
              text-white
            `}
          >
            <User className={sizes.icon} />
          </div>
        )}

        {/* Status indicator */}
        {showStatus && status && (
          <span
            className={`
              absolute bottom-0 right-0
              ${sizes.status}
              ${statusColors[status]}
              ${variantStyles[variant]}
              border-white
            `}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

// ============================================================
// Avatar Group Component
// ============================================================

export interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  children,
  max = 5,
  size = 'md',
  className = ''
}) => {
  const childrenArray = React.Children.toArray(children);
  const visibleChildren = childrenArray.slice(0, max);
  const remainingCount = childrenArray.length - max;

  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      {visibleChildren.map((child, index) => (
        <div
          key={index}
          className="ring-2 ring-white rounded-full"
          style={{ zIndex: visibleChildren.length - index }}
        >
          {child}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={`
            ${sizeStyles[size].container}
            rounded-full
            bg-gray-200 text-gray-600
            flex items-center justify-center
            font-semibold
            ${sizeStyles[size].text}
            ring-2 ring-white
          `}
          style={{ zIndex: 0 }}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

AvatarGroup.displayName = 'AvatarGroup';

// ============================================================
// Avatar with Text Component
// ============================================================

export interface AvatarWithTextProps extends AvatarProps {
  title: string;
  subtitle?: string;
  textPosition?: 'right' | 'bottom';
}

export const AvatarWithText: React.FC<AvatarWithTextProps> = ({
  title,
  subtitle,
  textPosition = 'right',
  ...avatarProps
}) => {
  if (textPosition === 'bottom') {
    return (
      <div className="flex flex-col items-center gap-2">
        <Avatar {...avatarProps} />
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">{title}</div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar {...avatarProps} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 truncate">{subtitle}</div>}
      </div>
    </div>
  );
};

AvatarWithText.displayName = 'AvatarWithText';
