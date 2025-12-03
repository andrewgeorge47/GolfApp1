# UI Color Standards

This document defines the color standards for the application to ensure consistency and proper contrast across all components.

## Background Context

The application uses a **dark green gradient background**:
```tsx
bg-gradient-to-br from-brand-dark-green to-brand-muted-green
```

All pages are rendered on this dark background, with content typically displayed in white Card components.

## Color Standards by Context

### 1. Page Headers (On Dark Background)

**Use: `PageHeader` or `PageHeaderWithBack` components**

Page headers are displayed directly on the dark green background and must use high-contrast colors:

- **Title**: `text-white` (white text for maximum contrast)
- **Subtitle**: `text-white/80` (80% opacity white for visual hierarchy)
- **Icons**: `text-brand-neon-green` (brand accent color)
- **Back buttons**: `text-white/90 hover:text-white`

```tsx
// ✅ CORRECT - Using PageHeader component
<PageHeader
  title="Event Signups"
  subtitle="Register for upcoming events"
  icon={Calendar}
/>

// ❌ WRONG - Dark text on dark background
<h1 className="text-gray-900">Event Signups</h1>
<p className="text-gray-600">Register for upcoming events</p>
```

### 2. Card Headers (Inside White Cards)

**Use: `CardHeader` component or manual implementation**

Content inside white cards should use dark text for contrast:

- **Title**: `text-brand-black` or `text-gray-900`
- **Subtitle**: `text-gray-600`
- **Icons**: `text-brand-neon-green` or contextual colors

```tsx
// ✅ CORRECT - Inside white card
<Card>
  <CardHeader
    title="Registration Details"  // Uses text-brand-black
    subtitle="Complete your registration"  // Uses text-gray-600
  />
</Card>

// ✅ ALSO CORRECT - Manual implementation
<Card>
  <h2 className="text-xl font-semibold text-brand-black">Registration Details</h2>
  <p className="text-sm text-gray-600 mt-1">Complete your registration</p>
</Card>
```

### 3. Brand Colors Reference

```css
/* Primary Brand Colors */
--brand-dark-green: #1a4d3a;      /* Dark green (primary brand color) */
--brand-muted-green: #2d6a4f;     /* Muted green (secondary) */
--brand-neon-green: #00ff88;      /* Neon green (accent) */
--brand-black: #1a1a1a;           /* Near-black (primary text on white) */

/* Text Colors on Dark Background */
text-white                         /* Primary text on dark backgrounds */
text-white/80                      /* Secondary text on dark backgrounds */
text-white/90                      /* Interactive elements on dark backgrounds */

/* Text Colors on Light Background */
text-brand-black or text-gray-900  /* Primary text on light backgrounds */
text-gray-600                      /* Secondary text on light backgrounds */
text-gray-500                      /* Tertiary text on light backgrounds */
```

## Component Usage Guide

### When to Use Each Component

1. **PageHeader** - For main page titles (tournaments list, dashboard, etc.)
   - Renders directly on dark background
   - Automatically uses white text
   - Optional icon and action button support

2. **PageHeaderWithBack** - For detail/form pages with navigation
   - Renders directly on dark background
   - Includes back button with proper styling
   - Automatically uses white text

3. **CardHeader** - For section titles inside white cards
   - Renders inside white Card component
   - Automatically uses dark text
   - Consistent with card content styling

## Common Mistakes to Avoid

### ❌ DON'T DO THIS:

```tsx
// Dark text on dark background (invisible!)
<h1 className="text-gray-900">Page Title</h1>

// Gray subtitle on dark background (poor contrast!)
<p className="text-gray-600">This is hard to read</p>

// Brand dark green on dark green background
<div className="text-brand-dark-green">Can't see this!</div>
```

### ✅ DO THIS INSTEAD:

```tsx
// Use the PageHeader component
<PageHeader
  title="Page Title"
  subtitle="This is easy to read"
  icon={Calendar}
/>

// Or manually with correct colors
<h1 className="text-white">Page Title</h1>
<p className="text-white/80">This is easy to read</p>
```

## Testing Your Colors

Before committing changes, verify:

1. **Contrast Check**: Can you clearly read the text on the background?
2. **Component Usage**: Are you using the right component for the context?
3. **Consistency**: Do similar elements use the same color patterns?

## Questions?

If you're unsure which color to use:
1. Check if you're rendering on the dark background or inside a white card
2. Look at similar existing components for reference
3. Use the provided PageHeader/CardHeader components when possible
4. Refer to this document for color standards

## Update History

- 2025-12-01: Initial documentation with PageHeader components
