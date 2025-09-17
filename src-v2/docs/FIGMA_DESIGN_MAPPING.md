# FitWithPari: Figma Design to UX/UI Stories Mapping

## Overview
This document provides a comprehensive mapping between every UI element, button, state, and interaction in Figma designs to their corresponding UX/UI stories. Use this as a reference during design reviews, development, and quality assurance.

---

## 🎓 Coach Interface Mapping

### Top Navigation Bar
**Figma Component: `TopBar`** | **Code: `TopBar.tsx`**

| Figma Element | Story Reference | Design Specs | Component State |
|---------------|----------------|--------------|-----------------|
| **"FitWithPari" Logo** | Story 13: Brand-Consistent Visual Language | `color: fitness-green (#00ff88)`, `font-weight: medium (500)` | Static branding |
| **Mode Toggle Buttons** | Story 1: Coach Mode Switching Interface | Active: `bg-fitness-green text-black`, Inactive: `bg-fitness-gray text-white` | `coachMode: 'teach' \| 'workout'` |
| **"🎓 Teach Mode" Button** | Story 1: Coach Mode Switching Interface | `min-height: 44px`, `border-radius: 8px`, `font-weight: medium` | `active={classSession.coachMode === 'teach'}` |
| **"💪 Workout Mode" Button** | Story 1: Coach Mode Switching Interface | `min-height: 44px`, `border-radius: 8px`, `font-weight: medium` | `active={classSession.coachMode === 'workout'}` |
| **Class Timer Display** | Story 4: Exercise Assignment Interface | `font-size: 16px`, `color: white`, `format: MM:SS` | `formatTime(elapsedTime)` |
| **Participant Count** | Story 2: Student Level Group Management | `color: muted-foreground`, format: "X participants" | `participants.length` |
| **Settings Icon** | Story 3: Real-Time Student Monitoring Dashboard | `size: 20px`, `color: muted-foreground`, hover: `opacity: 0.8` | Opens settings modal |

### Coach Video Area - Teach Mode
**Figma Component: `TeachModeView`** | **Code: `TeachModeView.tsx`**

| Figma Element | Story Reference | Design Specs | Component State |
|---------------|----------------|--------------|-----------------|
| **Coach Video (Large)** | Story 1: Coach Mode Switching Interface | `aspect-ratio: 4/3`, `width: 75% mobile, 66% desktop`, `border-radius: 12px` | `spotlightedParticipant` video |
| **Exercise Demo Overlay** | Story 4: Exercise Assignment Interface | `position: absolute bottom-4 left-4`, `bg: black/80`, `text: white` | `currentExerciseContent.name` |
| **Student Thumbnail Grid** | Story 5: Adaptive Mode Interface for Students | `grid-cols-2 md:grid-cols-1`, `gap-2`, `max-height: 400px overflow-y-auto` | `participants.filter(p => !p.isHost)` |
| **Exercise Instructions Panel** | Story 7: Fitness Level Personalization | `bg-fitness-gray`, `p-4`, `rounded-lg`, dynamic content by level | `currentExerciseContent` object |
| **"Switch to Workout Mode" Button** | Story 1: Coach Mode Switching Interface | `bg-fitness-orange`, `text-white`, `w-full`, `py-3` | Triggers mode switch |

### Coach Video Area - Workout Mode
**Figma Component: `VideoArea`** | **Code: `VideoArea.tsx`**

| Figma Element | Story Reference | Design Specs | Component State |
|---------------|----------------|--------------|-----------------|
| **Participant Grid Layout** | Story 3: Real-Time Student Monitoring Dashboard | Dynamic: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`, `gap-4` | Based on `participants.length` |
| **Individual Video Tiles** | Story 3: Real-Time Student Monitoring Dashboard | `aspect-ratio: 4/3`, `bg-fitness-gray`, `rounded-lg`, `relative` | Each `Participant` object |
| **Connection Quality Indicator** | Story 9: Real-Time Synchronization Feedback | `position: absolute top-2 right-2`, colors: green/orange/red | `participant.connectionQuality` |
| **Participant Name Label** | Story 7: Fitness Level Personalization | `position: absolute bottom-2 left-2`, `bg: black/60`, `text-white text-sm` | `participant.name` |
| **Fitness Level Badge** | Story 2: Student Level Group Management | Colors: beginner=green, intermediate=orange, advanced=blue | `participant.level` |
| **Rep Counter Display** | Story 6: Interactive Rep Counter System | `position: absolute bottom-2 right-2`, `bg-fitness-dark`, `text-fitness-green` | `participant.repCount` |
| **Spotlight Toggle Button** | Story 3: Real-Time Student Monitoring Dashboard | `hover overlay`, `spotlight icon`, `opacity: 0 → 1 on hover` | `onClick: spotlightParticipant(id)` |

### Coach Side Panel
**Figma Component: `SidePanel`** | **Code: `SidePanel.tsx`**

| Figma Element | Story Reference | Design Specs | Component State |
|---------------|----------------|--------------|-----------------|
| **Student Level Groups Section** | Story 2: Student Level Group Management | `space-y-4`, each group in card format | `getParticipantsByLevel()` |
| **Beginner Group Card** | Story 2: Student Level Group Management | `border-fitness-green`, `bg-fitness-green/10 when highlighted` | `level: 'beginner'` participants |
| **Intermediate Group Card** | Story 2: Student Level Group Management | `border-fitness-orange`, `bg-fitness-orange/10 when highlighted` | `level: 'intermediate'` participants |
| **Advanced Group Card** | Story 2: Student Level Group Management | `border-blue-500`, `bg-blue-500/10 when highlighted` | `level: 'advanced'` participants |
| **Group Highlight Toggle** | Story 2: Student Level Group Management | `cursor-pointer`, `transition-all duration-300`, border width changes | `highlightedLevel` state |
| **Exercise Assignment Panel** | Story 4: Exercise Assignment Interface | `bg-fitness-gray`, `p-4`, `rounded-lg`, `space-y-4` | Exercise selection interface |
| **Exercise Dropdown** | Story 4: Exercise Assignment Interface | `bg-input-background`, `min-height: 44px`, searchable | Exercise library data |
| **Target Audience Radio Group** | Story 4: Exercise Assignment Interface | `space-y-2`, radio buttons with level badges | Target selection state |
| **"Assign Exercise" Button** | Story 4: Exercise Assignment Interface | `bg-fitness-green text-black`, `w-full`, `py-3`, `font-medium` | Disabled until complete |

### Coach Control Bar
**Figma Component: `ControlBar`** | **Code: `ControlBar.tsx`**

| Figma Element | Story Reference | Design Specs | Component State |
|---------------|----------------|--------------|-----------------|
| **Mute/Unmute Button** | Story 9: Real-Time Synchronization Feedback | `size: 44px`, active: `bg-fitness-green`, muted: `bg-red-500` | `isLocalAudioOn` state |
| **Camera On/Off Button** | Story 9: Real-Time Synchronization Feedback | `size: 44px`, active: `bg-fitness-green`, off: `bg-red-500` | `isLocalVideoOn` state |
| **End Session Button** | Story 1: Coach Mode Switching Interface | `bg-destructive`, `text-destructive-foreground`, `size: 44px` | Ends class session |
| **Participants Button** | Story 3: Real-Time Student Monitoring Dashboard | Shows participant count, opens participant panel | Toggle side panel |
| **Settings Button** | Story 13: Brand-Consistent Visual Language | `text-muted-foreground`, `size: 20px`, hover effects | Opens settings modal |

---

## 👤 Student Interface Mapping

### Student View - Teach Mode Layout
**Figma Component: `StudentView` in Teach Mode** | **Code: `StudentView.tsx`**

| Figma Element | Story Reference | Design Specs | Component State |
|---------------|----------------|--------------|-----------------|
| **Coach Video (Large)** | Story 5: Adaptive Mode Interface for Students | `aspect-ratio: 4/3`, `width: 100% mobile, 75% desktop` | Coach spotlight view |
| **Student Self-View (Small)** | Story 5: Adaptive Mode Interface for Students | `position: fixed bottom-4 right-4`, `size: 120x90px`, `border-2 border-white` | Current user video |
| **Exercise Instructions Card** | Story 7: Fitness Level Personalization | `bg-fitness-gray`, `p-4`, `rounded-lg`, level-specific content | `currentExerciseContent` for user level |
| **Fitness Level Badge** | Story 7: Fitness Level Personalization | Top-right of instructions, color-coded by level | `currentUser.level` |
| **Other Students Thumbnails** | Story 5: Adaptive Mode Interface for Students | `grid-cols-2`, `gap-2`, small video tiles | Non-coach participants |
| **Hand Raise Button** | Story 8: Health Consideration Integration | `position: fixed bottom-4 left-4`, `bg-fitness-orange when active` | `hasRaisedHand` state |

### Student View - Workout Mode Layout
**Figma Component: `WorkoutModeStudentView`** | **Code: `WorkoutModeStudentView.tsx`**

| Figma Element | Story Reference | Design Specs | Component State |
|---------------|----------------|--------------|-----------------|
| **Three-Panel Layout Container** | Story 5: Adaptive Mode Interface for Students | `grid-cols-1 md:grid-cols-3`, `gap-4`, `h-full` | Workout mode active |
| **Self-View Panel** | Story 5: Adaptive Mode Interface for Students | `aspect-ratio: 4/3`, `bg-fitness-gray`, `rounded-lg` | User's own video feed |
| **Timer Panel** | Story 6: Interactive Rep Counter System | `bg-fitness-dark`, `text-center`, large timer display | Exercise timer countdown |
| **Coach View Panel** | Story 5: Adaptive Mode Interface for Students | `aspect-ratio: 4/3`, smaller coach video for reference | Coach monitoring view |
| **Rep Counter Component** | Story 6: Interactive Rep Counter System | `bg-fitness-dark`, `p-4`, `rounded-lg`, prominent display | Interactive counter |
| **Rep Count Display** | Story 6: Interactive Rep Counter System | `text-3xl font-bold text-fitness-green`, format: "15/20" | `repCount/repTarget` |
| **Progress Bar** | Story 6: Interactive Rep Counter System | `w-full h-2 bg-fitness-gray rounded-full` | Visual progress indicator |
| **Increment Button (+)** | Story 6: Interactive Rep Counter System | `bg-fitness-green`, `size: 44px`, `font-size: 20px`, `text-black` | Main interaction button |
| **Decrement Button (-)** | Story 6: Interactive Rep Counter System | `bg-gray-600`, `size: 44px`, `disabled when count=0` | Secondary action |
| **Reset Button** | Story 6: Interactive Rep Counter System | `bg-gray-600`, `size: 44px`, reset icon | Reset to zero |
| **Target Achievement Indicator** | Story 6: Interactive Rep Counter System | `text-fitness-green`, `font-medium`, "🎯 Target Achieved!" | Shows when target met |

### Student Control Elements
**Figma Component: Various control elements** | **Code: Various components**

| Figma Element | Story Reference | Design Specs | Component State |
|---------------|----------------|--------------|-----------------|
| **Audio Toggle** | Story 9: Real-Time Synchronization Feedback | `size: 44px`, active/muted states with color coding | Student audio control |
| **Video Toggle** | Story 9: Real-Time Synchronization Feedback | `size: 44px`, active/off states with color coding | Student video control |
| **Raise Hand Button** | Story 8: Health Consideration Integration | `bg-fitness-orange when active`, `size: 44px`, hand icon | Question/help request |
| **Leave Session Button** | Story 12: Accessibility and Inclusive Design | `bg-destructive`, `text-white`, confirmation required | Exit class safely |

---

## 🔄 Interactive States Mapping

### Mode Transition States
**Reference: Story 1 & Story 5**

| Figma State | Story Reference | Visual Treatment | Code Implementation |
|-------------|----------------|------------------|-------------------|
| **Teach → Workout Transition** | Story 1: Coach Mode Switching Interface | Layout slides/fades, duration 300ms | `coachMode` state change |
| **Loading State During Transition** | Story 14: Animation and Micro-Interactions | Subtle spinner on mode buttons | Disabled buttons during transition |
| **Student Interface Reorganization** | Story 5: Adaptive Mode Interface for Students | Three-panel layout emerges, rep counter activates | Layout component switching |
| **Coach Interface Update** | Story 1: Coach Mode Switching Interface | Grid view replaces spotlight, monitoring tools appear | Video area component switch |

### Connection Quality States
**Reference: Story 9**

| Figma State | Visual Indicator | Color Code | Code State |
|-------------|------------------|------------|------------|
| **Excellent (5 bars)** | 5 solid bars, green | `text-fitness-green` | `connectionQuality: 'excellent'` |
| **Good (3-4 bars)** | 3-4 solid bars, orange | `text-fitness-orange` | `connectionQuality: 'good'` |
| **Poor (1-2 bars)** | 1-2 solid bars, red | `text-red-500` | `connectionQuality: 'poor'` |
| **Reconnecting** | Spinning indicator | `text-yellow-500` | Connection state pending |
| **Disconnected** | X mark, red background | `bg-red-500 text-white` | Participant offline |

### Rep Counter States
**Reference: Story 6**

| Figma State | Visual Treatment | Trigger Condition | Code Implementation |
|-------------|------------------|-------------------|-------------------|
| **Default Counter** | Standard green increment button | Normal operation | `repCount < repTarget` |
| **Target Approaching** | Progress bar 80%+ filled | 4+ reps from target | Visual emphasis increase |
| **Target Achieved** | Gold/burst animation, celebration text | `repCount >= repTarget` | Achievement animation trigger |
| **Over Target** | Continued counting with different color | `repCount > repTarget` | Bonus achievement state |
| **Sync Pending** | Subtle loading indicator on counter | Network sync in progress | Optimistic update state |

### Form Alert States (Future)
**Reference: Story 10**

| Figma State | Alert Level | Visual Treatment | Code State |
|-------------|-------------|------------------|------------|
| **Good Form** | No alert | Clean interface | No form issues detected |
| **Minor Correction** | Info alert | `border-l-4 border-blue-500`, info icon | Low severity alert |
| **Form Warning** | Warning alert | `border-l-4 border-fitness-orange`, warning icon | Medium severity alert |
| **Critical Form Issue** | Critical alert | `bg-red-500/10 border-red-500`, stop icon | High severity, immediate attention |
| **Safety Risk** | Emergency alert | `bg-red-500 text-white`, flash animation | Exercise should stop |

---

## 📱 Responsive State Mapping

### Mobile Layout Adaptations
**Reference: Story 11**

| Desktop Figma State | Mobile Figma State | Breakpoint | Code Implementation |
|-------------------|-------------------|------------|-------------------|
| **Coach Three-Column Layout** | **Coach Vertical Stack** | `md:` breakpoint | `grid-cols-1 md:grid-cols-3` |
| **Student Grid 4-Column** | **Student Grid 2-Column** | `lg:` breakpoint | `grid-cols-2 lg:grid-cols-4` |
| **Side Panel Overlay** | **Bottom Sheet** | `sm:` breakpoint | Modal → drawer component |
| **Horizontal Button Bar** | **Vertical Button Stack** | Mobile viewport | `flex-col sm:flex-row` |
| **Exercise Instructions Card** | **Full-Width Instructions** | Mobile layout | `w-full p-4` |

### Touch Target Adaptations
**Reference: Story 12**

| Element Type | Desktop Size | Mobile Size | Accessibility Requirement |
|--------------|-------------|-------------|---------------------------|
| **Mode Toggle Buttons** | `h-10 px-4` | `h-11 px-6` | Minimum 44px touch target |
| **Rep Counter Buttons** | `size-10` | `size-12` | Large enough for thumbs |
| **Video Tile Controls** | `size-8` | `size-10` | Accessible on video overlay |
| **Navigation Elements** | `p-2` | `p-3` | Comfortable touch spacing |

---

## 🎨 Visual State Variations

### Color State Applications
**Reference: Story 13**

| UI Element | Default State | Active State | Disabled State | Error State |
|------------|---------------|--------------|----------------|-------------|
| **Primary Buttons** | `bg-fitness-green text-black` | `bg-fitness-green/80` | `bg-gray-400 text-gray-600` | `bg-red-500 text-white` |
| **Secondary Buttons** | `bg-fitness-gray text-white` | `bg-fitness-gray/80` | `bg-gray-600 text-gray-400` | `border-red-500 text-red-500` |
| **Mode Toggle Active** | `bg-fitness-green text-black` | N/A | N/A | N/A |
| **Mode Toggle Inactive** | `bg-fitness-gray text-white` | `hover:bg-fitness-gray/80` | N/A | N/A |
| **Level Badge Beginner** | `bg-fitness-green/20 text-fitness-green` | `bg-fitness-green text-black` | N/A | N/A |
| **Level Badge Intermediate** | `bg-fitness-orange/20 text-fitness-orange` | `bg-fitness-orange text-white` | N/A | N/A |
| **Level Badge Advanced** | `bg-blue-500/20 text-blue-500` | `bg-blue-500 text-white` | N/A | N/A |

### Typography State Applications
**Reference: Story 13**

| Text Element | Font Weight | Font Size | Color | Usage Context |
|--------------|-------------|-----------|-------|---------------|
| **Headings (h1-h4)** | `font-medium (500)` | `text-2xl` to `text-base` | `text-foreground` | Section headers |
| **Body Text** | `font-normal (400)` | `text-base` | `text-foreground` | General content |
| **Button Text** | `font-medium (500)` | `text-base` | Varies by button type | Interactive elements |
| **Labels** | `font-medium (500)` | `text-base` | `text-foreground` | Form labels |
| **Muted Text** | `font-normal (400)` | `text-sm` | `text-muted-foreground` | Secondary information |
| **Rep Counter** | `font-bold (700)` | `text-3xl` | `text-fitness-green` | Prominent displays |

---

## 🔗 Component Cross-References

### Component to Story Mapping
| Component File | Primary Stories | Secondary Stories |
|----------------|----------------|-------------------|
| **TopBar.tsx** | Story 1, Story 13 | Story 4 |
| **CoachView.tsx** | Story 1, Story 3 | Story 2, Story 4 |
| **StudentView.tsx** | Story 5, Story 7 | Story 6, Story 8 |
| **ParticipantTile.tsx** | Story 3, Story 9 | Story 2, Story 7 |
| **WorkoutModeStudentView.tsx** | Story 5, Story 6 | Story 7, Story 9 |
| **TeachModeView.tsx** | Story 1, Story 5 | Story 4, Story 7 |
| **ControlBar.tsx** | Story 9, Story 12 | Story 1, Story 8 |
| **SidePanel.tsx** | Story 2, Story 4 | Story 3, Story 8 |
| **StudentLevelGroups.tsx** | Story 2, Story 7 | Story 3, Story 4 |

### State Management to Story Mapping
| Hook/State | Related Stories | Visual Impact |
|------------|----------------|---------------|
| **useFitnessPlatform** | All stories | Core state management |
| **coachMode state** | Story 1, Story 5 | Layout transitions |
| **participants state** | Story 2, Story 3, Story 7 | Grid layouts, grouping |
| **repCount state** | Story 6 | Counter displays |
| **highlightedLevel state** | Story 2 | Group highlighting |
| **connectionQuality state** | Story 9 | Quality indicators |
| **currentUser state** | Story 5, Story 7, Story 8 | Personalization |

---

## 📋 Quality Assurance Checklist

### Design Review Checklist
- [ ] All buttons meet 44px minimum touch target (Story 12)
- [ ] Color usage follows fitness-green/orange system (Story 13)
- [ ] Typography uses medium (500) for interactive elements (Story 13)
- [ ] Video tiles maintain 4:3 aspect ratio (Guidelines)
- [ ] Connection indicators present on all video elements (Story 9)
- [ ] Mode transitions include proper loading states (Story 14)
- [ ] Mobile layouts stack vertically with proper spacing (Story 11)
- [ ] Rep counters use fitness-green for increment actions (Story 6)
- [ ] Error states provide recovery actions (Guidelines)
- [ ] Achievement states include celebration animations (Story 6)

### Development Implementation Checklist
- [ ] All Figma states have corresponding React component states
- [ ] Color classes use CSS custom properties from globals.css
- [ ] Animations respect `prefers-reduced-motion` (Story 14)
- [ ] Loading states preserve layout to prevent jumping
- [ ] Error boundaries handle component failures gracefully
- [ ] Real-time updates use optimistic UI patterns (Story 9)
- [ ] Accessibility attributes match Figma annotations (Story 12)
- [ ] Responsive breakpoints match Figma responsive variants (Story 11)

This comprehensive mapping ensures that every pixel in Figma has a clear connection to user experience reasoning and implementation requirements, maintaining consistency between design vision and delivered product.