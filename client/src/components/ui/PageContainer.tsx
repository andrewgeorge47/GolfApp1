import React from 'react';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * PageContainer - Wrapper component for admin/dashboard pages
 * Provides consistent white background container with proper styling
 *
 * Usage:
 * <PageContainer>
 *   <PageHeader title="Page Title" subtitle="Description" action={<Button>Action</Button>} />
 *   <PageContent>...</PageContent>
 * </PageContainer>
 */
export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContainer.displayName = 'PageContainer';

// Page Header Component
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, subtitle, icon, action, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-between mb-6 ${className}`}
        {...props}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            {icon && <span className="mr-3">{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';

// Page Content Component - for organizing content sections
export interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PageContent = React.forwardRef<HTMLDivElement, PageContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`space-y-6 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContent.displayName = 'PageContent';

export default PageContainer;
