# Aapno Rasto (આપણો રસ્તો)

[![Live Website](https://img.shields.io/badge/Live_Website-Aapno_Rasto-blue?style=for-the-badge&logo=vercel)](https://aapno-rasto.vercel.app)

[Aapno Rasto](https://aapno-rasto.vercel.app) is a civic complaint management platform designed for the Government of Gujarat. It provides a web application for citizens to report civic infrastructure issues (such as road damage and potholes), track resolution progress, and earn civic rewards. The platform also provides dedicated dashboards for field engineers to receive work orders and submit photo proof of completed work, and for administrators to manage work assignments and analyze spatial complaint distribution.

## Live Application

- **Live Website**: [https://aapno-rasto.vercel.app](https://aapno-rasto.vercel.app)
- **Repository**: [https://github.com/Parthh1002/Aapno-Rasto](https://github.com/Parthh1002/Aapno-Rasto)

## Architectural Techniques

- **WebGL Fluid Simulation**: Interactive liquid particle physics rendered on an HTML5 canvas via [`src/components/FluidCursor.tsx`](src/components/FluidCursor.tsx) using the [HTMLCanvasElement.getContext()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) WebGL context for GPU-accelerated cursor animations.
- **Media Capture API Integration**: Live photo capturing implemented in [`src/components/LiveCameraCapture.tsx`](src/components/LiveCameraCapture.tsx) using [MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) to handle native camera streams and media constraints directly in the browser.
- **Geospatial Duplicate Detection**: Proximity-based complaint filtering in [`src/services/duplicateDetectionService.ts`](src/services/duplicateDetectionService.ts) and [`src/hooks/useDuplicateDetection.ts`](src/hooks/useDuplicateDetection.ts) calculated using the Haversine formula against coordinate pairs.
- **Browser Geolocation API**: Location coordinate retrieval in [`src/pages/CitizenDashboard.tsx`](src/pages/CitizenDashboard.tsx) using the [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) (`navigator.geolocation.getCurrentPosition`) for automated location tagging.
- **Real-Time WebSocket Synchronization**: Live status updates in [`src/hooks/useComplaintsRealtime.ts`](src/hooks/useComplaintsRealtime.ts) using the [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket_API) via Supabase real-time subscriptions.
- **Hardware-Accelerated CSS Layering**: GPU-offloaded animation rendering in [`src/index.css`](src/index.css) using [`will-change`](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) and 3D transform matrices to avoid layout recalculation on scroll.
- **Native CSS Smooth Scrolling**: In-page navigation configured in [`src/index.css`](src/index.css) via the [scroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-behavior) property.

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
- [Poppins](https://fonts.google.com/specimen/Poppins): Sans-serif font family used for general interface typography.
- [Noto Sans Gujarati](https://fonts.google.com/specimen/Noto+Sans+Gujarati): Regional font family for Gujarati script rendering.

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
