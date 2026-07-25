# Aapno Rasto (આપણો રસ્તો)

> **Civic Complaint Management & Infrastructure Tracking Platform for the Government of Gujarat**

[![Live Website](https://img.shields.io/badge/Live_Website-Aapno_Rasto-blue?style=for-the-badge&logo=vercel)](https://aapno-rasto.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Parthh1002%2FAapno--Rasto-181717?style=for-the-badge&logo=github)](https://github.com/Parthh1002/Aapno-Rasto)
[![Creators](https://img.shields.io/badge/Creators-Parth_%26_Siddharth-orange?style=for-the-badge)](#core-contributors)

---

## Overview

[Aapno Rasto](https://aapno-rasto.vercel.app) is an enterprise-grade civic issue resolution platform developed for the Government of Gujarat. Built from the ground up by **Parth** and **Siddharth**, the platform bridges the gap between citizens, municipal field engineers, and civic administrators.

The application enables citizens to report road hazards and civic issues with precise GPS coordinates and camera evidence, while field engineers receive real-time work orders, capture before/after resolution proof, and administrators monitor spatial complaint heatmaps and automated duplicate detection metrics.

---

## Live Application & Presentation

- **Live Website**: [https://aapno-rasto.vercel.app](https://aapno-rasto.vercel.app)
- **GitHub Repository**: [https://github.com/Parthh1002/Aapno-Rasto](https://github.com/Parthh1002/Aapno-Rasto)
- **Project Presentation Slide Deck**: [`docs/presentation.pptx`](docs/presentation.pptx) *(Add your presentation file here or update this link to your Google Slides URL)*

---

## Key Modules & Roles

### 1. Citizen Portal ([`src/pages/CitizenDashboard.tsx`](src/pages/CitizenDashboard.tsx))
- Geo-tagged complaint submission with automated coordinate acquisition.
- Live camera evidence capture with hardware media stream constraints.
- Real-time resolution progress tracking and citizen reward incentives.

### 2. Field Engineer Portal ([`src/pages/EngineerDashboard.tsx`](src/pages/EngineerDashboard.tsx))
- Work order queue management and location navigation.
- On-site photo verification for before/after repair documentation ([`src/components/ResolutionCapture.tsx`](src/components/ResolutionCapture.tsx)).

### 3. Admin Command Center ([`src/pages/AdminDashboard.tsx`](src/pages/AdminDashboard.tsx))
- Spatial heatmap density layer for issue clustering ([`src/components/MapInner.tsx`](src/components/MapInner.tsx)).
- Automated duplicate complaint detection based on spatial proximity thresholds.
- Analytics charts detailing status distribution and municipal performance.

---

## Architectural Techniques

- **WebGL Fluid Simulation**: Interactive liquid particle physics rendered on an HTML5 canvas via [`src/components/FluidCursor.tsx`](src/components/FluidCursor.tsx) using the [HTMLCanvasElement.getContext()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) WebGL context for GPU-accelerated cursor animations.
- **Media Capture API Integration**: Live photo capturing implemented in [`src/components/LiveCameraCapture.tsx`](src/components/LiveCameraCapture.tsx) using [MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) to manage hardware camera streams directly in browser viewports.
- **Geospatial Duplicate Detection**: Proximity-based complaint filtering in [`src/services/duplicateDetectionService.ts`](src/services/duplicateDetectionService.ts) and [`src/hooks/useDuplicateDetection.ts`](src/hooks/useDuplicateDetection.ts) calculated using the Haversine distance formula against coordinate pairs.
- **Browser Geolocation API**: Location coordinate retrieval in [`src/pages/CitizenDashboard.tsx`](src/pages/CitizenDashboard.tsx) using the [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) (`navigator.geolocation.getCurrentPosition`) for automated location tagging.
- **Real-Time WebSocket Synchronization**: Live status updates in [`src/hooks/useComplaintsRealtime.ts`](src/hooks/useComplaintsRealtime.ts) using the [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket_API) via Supabase real-time subscriptions.
- **Hardware-Accelerated CSS Layering**: GPU-offloaded animation rendering in [`src/index.css`](src/index.css) using [`will-change`](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) and 3D transform matrices to eliminate layout thrashing during smooth scrolling.
- **Native CSS Smooth Scrolling**: In-page navigation configured in [`src/index.css`](src/index.css) via the [scroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior) property.

---

## Core Libraries & Dependencies

### External Libraries
- [Leaflet](https://leafletjs.com/): Open-source JavaScript library for interactive maps.
- [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat): Heatmap plugin for Leaflet used to render spatial issue density layers.
- [React Leaflet](https://react-leaflet.js.org/): React component bindings for Leaflet maps.
- [Supabase JS Client (`@supabase/supabase-js`)](https://supabase.com/docs/reference/javascript/introduction): Client library for PostgreSQL queries and real-time subscription channels.
- [Firebase SDK (`firebase`)](https://firebase.google.com/docs/web/setup): SDK used for authentication services and Cloud Storage uploads in [`src/lib/firebaseConfig.ts`](src/lib/firebaseConfig.ts).
- [TanStack React Query (`@tanstack/react-query`)](https://tanstack.com/query/latest): Asynchronous data fetching, caching, and server-state management.
- [Framer Motion](https://www.framer.com/motion/): Animation library for React used for UI component transitions and layout animations.
- [Recharts](https://recharts.org/): Charting library built with React and SVG for analytics visualization.
- [Vaul](https://emilkowal.ski/ui/vaul): Unstyled drawer component built on top of Radix UI primitives.
- [Embla Carousel (`embla-carousel-react`)](https://www.embla-carousel.com/): Carousel engine for media sliders.
- [Zod](https://zod.dev/): TypeScript-first schema validation library.
- [React Hook Form](https://react-hook-form.com/): Form state management library integrated with Zod resolvers.
- [Radix UI Primitives](https://www.radix-ui.com/): Collection of unstyled, accessible UI primitives.
- [Lucide React](https://lucide.dev/): SVG icon set for React applications.
- [Sonner](https://sonner.emilkowal.ski/): Toast notification library.

### Fonts
- [Poppins](https://fonts.google.com/specimen/Poppins): Primary sans-serif typography for interface elements.
- [Noto Sans Gujarati](https://fonts.google.com/specimen/Noto+Sans+Gujarati): Regional typography for Gujarati script rendering.

---

## Project Structure

```text
Aapno-Rasto/
├── backend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── admin/
│   │   ├── citizen/
│   │   ├── engineer/
│   │   └── ui/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   ├── test/
│   ├── types/
│   └── utils/
├── supabase/
├── components.json
├── eslint.config.js
├── firestore.rules
├── index.html
├── package.json
├── postcss.config.js
├── storage.rules
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

### Directory Overview

- [`src/components/`](src/components/): Modular UI components separated into role-specific subdirectories ([`src/components/admin/`](src/components/admin/), [`src/components/citizen/`](src/components/citizen/), [`src/components/engineer/`](src/components/engineer/)) and generic design system components ([`src/components/ui/`](src/components/ui/)).
- [`src/hooks/`](src/hooks/): Custom React hooks handling data fetching, real-time WebSocket listeners, camera streams, and spatial duplicate detection algorithms.
- [`src/services/`](src/services/): Isolated domain logic including duplicate complaint distance logic and database service abstraction wrappers.
- [`src/lib/`](src/lib/): Initialization modules and configuration settings for Firebase and Supabase integration.
- [`src/pages/`](src/pages/): Primary route views for the landing page, citizen dashboard, engineer dashboard, and admin management panel.
- [`backend/`](backend/) & [`supabase/`](supabase/): Database security rules, migrations, and backend service configurations.

---

## Core Contributors

This entire project was conceptualized, designed, and built by:

- **Parth** — Lead Developer & Architect ([@Parthh1002](https://github.com/Parthh1002))
- **Siddharth** — Lead Developer & Co-Creator
