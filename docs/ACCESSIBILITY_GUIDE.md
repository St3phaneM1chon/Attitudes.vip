# Accessibility Guide for Attitudes.vip

## Overview

Attitudes.vip is committed to providing an accessible wedding planning experience for all users, including those with disabilities. This guide documents our WCAG 2.1 AA compliance implementation and provides guidelines for maintaining accessibility standards.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Implementation Overview](#implementation-overview)
3. [Using the Accessibility Service](#using-the-accessibility-service)
4. [React Components](#react-components)
5. [Testing](#testing)
6. [Wedding-Specific Features](#wedding-specific-features)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Core Principles

### WCAG 2.1 AA Compliance

We follow the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards:

- **Perceivable**: Information must be presentable in ways users can perceive
- **Operable**: Interface components must be operable
- **Understandable**: Information and UI operation must be understandable  
- **Robust**: Content must be robust enough for various assistive technologies

### Inclusive Design

- Support for screen readers (NVDA, JAWS, VoiceOver)
- Full keyboard navigation
- High contrast mode support
- Reduced motion options
- Multi-language support with RTL languages
- Mobile accessibility

## Implementation Overview

### Service Architecture

```javascript
// Main accessibility service
import accessibilityService from '@/services/accessibility';

// Initialize in your app
accessibilityService.initialize();

// Check current settings
const settings = accessibilityService.getSettings();
```

### Middleware Integration

```javascript
// Express middleware for server-side rendering
const { createAccessibilityMiddleware } = require('@/services/accessibility/middleware');

app.use(createAccessibilityMiddleware({
  enabled: true,
  level: 'AA',
  autoFix: true,
  enforceCompliance: false
}));
```

## Using the Accessibility Service

### Basic Usage

```javascript
// In React components
import { useAccessibility } from '@/components/accessibility/AccessibilityProvider';

function MyComponent() {
  const { announce, checkContrast, manageFocus } = useAccessibility();
  
  // Announce to screen readers
  const handleAction = () => {
    announce('Action completed successfully');
  };
  
  // Check color contrast
  const isContrastValid = checkContrast('#ffffff', '#000000', 'AA');
  
  return <div>...</div>;
}
```

### Settings Management

```javascript
// Update user preferences
accessibilityService.updateSettings({
  highContrastMode: true,
  fontSize: 'large',
  reducedMotion: true,
  keyboardNavigationMode: true
});

// Enable screen reader mode
accessibilityService.enableScreenReaderMode();

// Set color blind mode
accessibilityService.setColorBlindMode('deuteranopia');
```

### Focus Management

```javascript
// Trap focus in modal
const modal = document.querySelector('.modal');
accessibilityService.trapFocus(modal);

// Release focus trap
accessibilityService.releaseFocusTrap(modal);

// Manage focus with options
accessibilityService.manageFocus(container, {
  autoFocus: true,
  restoreFocus: true,
  initialFocus: '#first-input'
});
```

## React Components

### AccessibilityProvider

Wrap your app with the AccessibilityProvider:

```jsx
import { AccessibilityProvider } from '@/components/accessibility';

function App() {
  return (
    <AccessibilityProvider>
      <YourAppContent />
    </AccessibilityProvider>
  );
}
```

### AccessibleButton

```jsx
import { AccessibleButton } from '@/components/accessibility';

<AccessibleButton
  variant="primary"
  size="medium"
  onClick={handleClick}
  ariaLabel="Save wedding details"
  ariaPressed={isActive}
  loading={isLoading}
  shortcutKey="s"
>
  Save Changes
</AccessibleButton>
```

### SeatingChart

Fully accessible interactive seating chart:

```jsx
import { SeatingChart } from '@/components/accessibility';

<SeatingChart
  tables={tables}
  guests={guests}
  onGuestMove={handleGuestMove}
  editable={true}
/>
```

Features:
- Keyboard navigation with arrow keys
- Screen reader announcements
- Drag and drop with keyboard alternatives
- Clear focus indicators

### AccessibleGallery

Photo gallery with accessibility features:

```jsx
import { AccessibleGallery } from '@/components/accessibility';

<AccessibleGallery
  photos={weddingPhotos}
  albums={photoAlbums}
  onPhotoSelect={handlePhotoSelect}
  allowFullscreen={true}
  allowDownload={true}
/>
```

Features:
- Keyboard shortcuts (arrows, F for fullscreen, S for slideshow)
- Alt text for all images
- Screen reader announcements
- Touch-friendly controls

## Testing

### Automated Testing

```javascript
// Run accessibility tests
const { AccessibilityTester } = require('@/services/accessibility/testing');

const tester = new AccessibilityTester();
const results = await tester.testUrl('https://attitudes.vip/dashboard');

// Test React components
import { render } from '@testing-library/react';
import { toBeAccessible } from '@/services/accessibility/testing';

expect.extend({ toBeAccessible });

test('button is accessible', async () => {
  const { container } = render(<AccessibleButton>Click me</AccessibleButton>);
  const results = await axe(container);
  expect(results).toBeAccessible();
});
```

### CLI Testing

```bash
# Test single URL
npm run test:a11y https://attitudes.vip

# Test multiple URLs
npm run test:a11y https://attitudes.vip/dashboard https://attitudes.vip/vendors

# Generate HTML reports
npm run test:a11y https://attitudes.vip --output ./reports
```

### Manual Testing Checklist

- [ ] Navigate entire page using only keyboard
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] Verify color contrast ratios
- [ ] Check focus indicators are visible
- [ ] Test with 200% zoom
- [ ] Verify forms have proper labels
- [ ] Check error messages are announced
- [ ] Test in high contrast mode

## Wedding-Specific Features

### Seating Chart Accessibility

The seating chart includes:
- Table navigation with arrow keys
- Guest count announcements
- Dietary restriction notifications
- Keyboard-based guest assignment

### Guest List

- Sortable columns with keyboard support
- Filter announcements for screen readers
- Batch action confirmations
- Export functionality with accessible formats

### Photo Gallery

- Image descriptions and captions
- Keyboard navigation between photos
- Fullscreen mode with escape key
- Download announcements

### RSVP Forms

- Clear form labels and instructions
- Error message associations
- Progress indicators
- Confirmation announcements

### Timeline

- Chronological navigation
- Event time announcements
- Vendor association descriptions
- Print-friendly accessible version

## Best Practices

### Development Guidelines

1. **Always provide text alternatives**
   ```jsx
   <img src="venue.jpg" alt="Garden wedding venue with white chairs" />
   ```

2. **Use semantic HTML**
   ```jsx
   <nav aria-label="Main navigation">
   <main id="main-content">
   <button type="button">
   ```

3. **Ensure keyboard accessibility**
   ```jsx
   <div 
     role="button"
     tabIndex={0}
     onKeyDown={(e) => e.key === 'Enter' && handleClick()}
   >
   ```

4. **Provide clear focus indicators**
   ```css
   button:focus {
     outline: 3px solid #4A90E2;
     outline-offset: 2px;
   }
   ```

5. **Use ARIA appropriately**
   ```jsx
   <div
     role="region"
     aria-label="Guest seating assignments"
     aria-live="polite"
   >
   ```

### Color and Contrast

- Text contrast ratio: 4.5:1 for normal text, 3:1 for large text
- Non-text contrast: 3:1 for UI components
- Don't rely on color alone to convey information

### Forms

- Label all form fields
- Group related fields with fieldset/legend
- Provide clear error messages
- Mark required fields

### Dynamic Content

- Announce changes to screen readers
- Update page title on navigation
- Manage focus on route changes
- Provide loading states

## Troubleshooting

### Common Issues

**Issue**: Focus trapped in modal
```javascript
// Solution: Ensure proper cleanup
const cleanup = () => {
  accessibilityService.releaseFocusTrap(modal);
};
```

**Issue**: Screen reader not announcing changes
```javascript
// Solution: Use live regions
<div role="status" aria-live="polite">
  {statusMessage}
</div>
```

**Issue**: Color contrast failing
```javascript
// Solution: Use contrast checker
const result = accessibilityService.checkColorContrast('#777', '#fff');
if (!result.passes) {
  const suggestion = accessibilityService.suggestAccessibleColors('#777', '#fff');
}
```

### Testing Tools

- **axe DevTools**: Browser extension for accessibility testing
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Built into Chrome DevTools
- **NVDA**: Free screen reader for Windows
- **VoiceOver**: Built-in screen reader for macOS/iOS

### Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11y Project](https://www.a11yproject.com/)

## Support

For accessibility questions or to report issues:
- Email: accessibility@attitudes.vip
- Create an issue in our repository
- Use the in-app feedback tool with "Accessibility" tag

Remember: Accessibility is not a feature, it's a fundamental requirement. Every user deserves equal access to plan their perfect wedding day.