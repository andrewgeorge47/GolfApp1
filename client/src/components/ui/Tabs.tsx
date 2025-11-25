import React from 'react';

// ============================================================
// Tabs Component
// ============================================================

export type TabsVariant = 'line' | 'pill' | 'enclosed';
export type TabsSize = 'sm' | 'md' | 'lg';

export interface Tab {
  id: string;
  label: string;
  disabled?: boolean;
  badge?: number | string;
}

export interface TabsProps {
  tabs: Tab[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  fullWidth?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-5 py-3'
};

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  value: controlledValue,
  defaultValue,
  onChange,
  variant = 'line',
  size = 'md',
  fullWidth = false,
  className = ''
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || tabs[0]?.id);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleTabChange = (tabId: string) => {
    if (!isControlled) {
      setInternalValue(tabId);
    }
    onChange?.(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = tabs.length - 1;
    } else {
      return;
    }

    // Skip disabled tabs
    while (tabs[newIndex]?.disabled) {
      if (e.key === 'ArrowLeft' || e.key === 'End') {
        newIndex = newIndex > 0 ? newIndex - 1 : tabs.length - 1;
      } else {
        newIndex = newIndex < tabs.length - 1 ? newIndex + 1 : 0;
      }
    }

    handleTabChange(tabs[newIndex].id);
  };

  return (
    <div className={className}>
      {variant === 'line' && (
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav
            className={`flex ${fullWidth ? '' : 'space-x-8'}`}
            role="tablist"
            aria-label="Tabs"
          >
            {tabs.map((tab, index) => {
              const isActive = currentValue === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  disabled={tab.disabled}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`
                    ${sizeStyles[size]}
                    ${fullWidth ? 'flex-1' : ''}
                    border-b-2 font-medium transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-brand-neon-green/50 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    whitespace-nowrap
                    ${
                      isActive
                        ? 'border-brand-dark-green text-brand-dark-green'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span
                      className={`
                        ml-2 px-2 py-0.5 text-xs font-semibold rounded-full
                        ${
                          isActive
                            ? 'bg-brand-dark-green text-white'
                            : 'bg-gray-200 text-gray-600'
                        }
                      `}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {variant === 'pill' && (
        <div className="bg-gray-100 p-1 rounded-lg inline-flex overflow-x-auto">
          <nav
            className="flex space-x-1"
            role="tablist"
            aria-label="Tabs"
          >
            {tabs.map((tab, index) => {
              const isActive = currentValue === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  disabled={tab.disabled}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`
                    ${sizeStyles[size]}
                    rounded-md font-medium transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-brand-neon-green/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    whitespace-nowrap
                    ${
                      isActive
                        ? 'bg-white text-brand-dark-green shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span
                      className={`
                        ml-2 px-2 py-0.5 text-xs font-semibold rounded-full
                        ${
                          isActive
                            ? 'bg-brand-dark-green text-white'
                            : 'bg-gray-200 text-gray-600'
                        }
                      `}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {variant === 'enclosed' && (
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav
            className={`flex ${fullWidth ? '' : 'space-x-2'}`}
            role="tablist"
            aria-label="Tabs"
          >
            {tabs.map((tab, index) => {
              const isActive = currentValue === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  disabled={tab.disabled}
                  onClick={() => handleTabChange(tab.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`
                    ${sizeStyles[size]}
                    ${fullWidth ? 'flex-1' : ''}
                    border border-gray-200 rounded-t-lg font-medium transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-brand-neon-green/50
                    disabled:opacity-50 disabled:cursor-not-allowed
                    whitespace-nowrap
                    ${
                      isActive
                        ? 'bg-white text-brand-dark-green border-b-white -mb-px'
                        : 'bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span
                      className={`
                        ml-2 px-2 py-0.5 text-xs font-semibold rounded-full
                        ${
                          isActive
                            ? 'bg-brand-dark-green text-white'
                            : 'bg-gray-200 text-gray-600'
                        }
                      `}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
};

Tabs.displayName = 'Tabs';

// ============================================================
// Tab Panel Component
// ============================================================

export interface TabPanelProps {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
  keepMounted?: boolean;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  value,
  activeValue,
  children,
  className = '',
  keepMounted = false
}) => {
  const isActive = value === activeValue;

  if (!isActive && !keepMounted) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      hidden={!isActive}
      className={`
        ${isActive ? 'animate-fade-in' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

TabPanel.displayName = 'TabPanel';

// ============================================================
// Complete Tabs System (Convenience Component)
// ============================================================

export interface TabContent {
  id: string;
  label: string;
  disabled?: boolean;
  badge?: number | string;
  content: React.ReactNode;
}

export interface TabsSystemProps {
  tabs: TabContent[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  fullWidth?: boolean;
  keepMountedPanels?: boolean;
  className?: string;
  panelClassName?: string;
}

export const TabsSystem: React.FC<TabsSystemProps> = ({
  tabs,
  value: controlledValue,
  defaultValue,
  onChange,
  variant = 'line',
  size = 'md',
  fullWidth = false,
  keepMountedPanels = false,
  className = '',
  panelClassName = ''
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || tabs[0]?.id);
  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleChange = (value: string) => {
    if (!isControlled) {
      setInternalValue(value);
    }
    onChange?.(value);
  };

  const tabItems: Tab[] = tabs.map(({ id, label, disabled, badge }) => ({
    id,
    label,
    disabled,
    badge
  }));

  return (
    <div className={className}>
      <Tabs
        tabs={tabItems}
        value={currentValue}
        onChange={handleChange}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
      />

      <div className={panelClassName}>
        {tabs.map((tab) => (
          <TabPanel
            key={tab.id}
            value={tab.id}
            activeValue={currentValue}
            keepMounted={keepMountedPanels}
          >
            {tab.content}
          </TabPanel>
        ))}
      </div>
    </div>
  );
};

TabsSystem.displayName = 'TabsSystem';
