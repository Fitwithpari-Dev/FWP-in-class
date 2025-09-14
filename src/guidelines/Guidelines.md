# FitWithPari Design Guidelines

## Brand Identity
FitWithPari is a professional fitness platform that combines energy with accessibility. Our design should feel motivating, inclusive, and technically sophisticated.

## Color System
- **Fitness Green (#00ff88)**: Primary brand color for success states, achievements, positive feedback, and call-to-action elements
- **Fitness Orange (#ff6b35)**: Secondary brand color for attention, warnings, active states, and energy indicators
- **Fitness Dark (#0a0a0a)**: Primary background color for the application
- **Fitness Gray (#1a1a1a)**: Secondary surfaces, card backgrounds, and content areas

## Typography Guidelines
- Maintain the default typography hierarchy defined in globals.css
- Only override font size, weight, or line-height when specifically required for fitness platform functionality
- Use medium weight (500) for headings and important UI elements
- Use normal weight (400) for body text and inputs

## Component Standards

### Video Components
- Video tiles must use 4:3 aspect ratio for consistency across all participants
- Connection quality indicators are mandatory for all video-enabled components
- Video loading states should use fitness-green spinner animation
- Muted participants show subtle visual indicators (not intrusive overlays)

### Fitness-Specific Elements
- Rep counters always use fitness-green for incremental progress
- Form alerts use fitness-orange for warnings, red variants for critical issues
- Exercise badges and achievements use fitness-green background with black text
- Student level indicators use consistent color coding: beginner (green), intermediate (orange), advanced (blue)

### Layout Principles
- Mobile-first responsive design with vertical stacking priority
- Video grids adapt dynamically based on participant count (1-4 columns max)
- Coach video gets spotlight priority (75% mobile, 66% desktop) in teach mode
- Sidebar panels collapse gracefully on smaller screens

### Interaction Guidelines
- Touch targets minimum 44px for mobile accessibility
- Hover states use subtle opacity changes (0.8) rather than color shifts
- Loading states preserve layout space to prevent content jumping
- Error states provide clear recovery actions, not just error messages

## Platform-Specific Rules

### Coach Experience
- Coach controls always visible and accessible
- Mode switching (teach/workout) prominently displayed
- Participant management actions require confirmation for destructive operations
- Coach video automatically spotlighted in teach mode

### Student Experience  
- Exercise instructions clearly visible and contextual to fitness level
- Rep counters accessible and encourage progression
- Health considerations respected in all exercise recommendations
- Hand raise and interaction tools easily discoverable

### Real-Time Features
- State changes reflect immediately in UI (optimistic updates)
- Connection quality affects video quality, not functionality
- Offline/reconnection states handled gracefully
- Real-time sync conflicts resolved by coach authority

## Accessibility Requirements
- All video tiles include participant names and status indicators
- Color is never the only way to convey information
- Focus management works correctly during video sessions
- Screen reader support for all fitness metrics and progress indicators

## Performance Guidelines
- Video streams limited to 25 concurrent for optimal performance
- Image assets optimized for fast loading on mobile networks
- Animations use hardware acceleration where possible
- State updates batched to prevent UI thrashing

Some of the base components you are using may have styling(eg. gap/typography) baked in as defaults.
So make sure you explicitly set any styling information from the guidelines in the generated react to override the defaults.