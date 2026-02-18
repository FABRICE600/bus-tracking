# 🚌 SafariBus — Rwanda Bus Tracker MVP

Real-time bus tracking web app for Rwanda, optimized for low data usage and mobile browsers.

## Features

- **Passengers**: View routes, see live bus locations, get ETA to stops — no login required
- **Drivers**: Start/stop trips, auto GPS tracking every 10 seconds
- **Admin**: Manage routes, buses, drivers, view live fleet

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Backend/DB | Convex (real-time) |
| Maps | Google Maps API (optional) |
| Styling | Tailwind CSS + Custom CSS |
| Icons | Lucide React |

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Convex
```bash
npx convex dev
```
This will:
- Prompt you to log in / create a Convex account
- Create a new project
- Generate types and sync your schema
- Set `NEXT_PUBLIC_CONVEX_URL` in `.env.local`

### 3. Start Development Server
```bash
npm run dev
```

### 4. Seed Demo Data
1. Open http://localhost:3000/login
2. First, go to http://localhost:3000/admin (the seed function creates initial users)
3. Or use the Convex dashboard to run the `seed:seedData` mutation

### 5. Test the Flow
1. **Admin** — Login with `admin` / `admin123` → Manage routes, buses, drivers
2. **Driver** — Login with `driver1` / `driver123` → Select bus & route → Start Trip
3. **Passenger** — Open home page → Select a route → See live bus location & ETA

## Environment Variables

```env
# Required: Convex deployment URL (set automatically by `npx convex dev`)
NEXT_PUBLIC_CONVEX_URL=

# Optional: Google Maps API key for map rendering
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
```

## Project Structure

```
├── convex/
│   ├── schema.ts          # Database schema (users, routes, buses, trips, locations)
│   ├── auth.ts            # Login, createUser, listDrivers
│   ├── routes.ts          # Route CRUD
│   ├── buses.ts           # Bus CRUD
│   ├── trips.ts           # Start/end trips, GPS updates, active trip queries
│   └── seed.ts            # Demo data seeder
├── src/app/
│   ├── layout.tsx         # Root layout with Inter font, PWA meta
│   ├── globals.css        # Mobile-first design system
│   ├── providers.tsx      # Convex + Auth providers
│   ├── page.tsx           # Passenger home (route list)
│   ├── route/[id]/page.tsx # Route detail with live buses & ETA
│   ├── login/page.tsx     # Driver/Admin login
│   ├── driver/page.tsx    # Driver interface with GPS tracking
│   └── admin/page.tsx     # Admin dashboard
└── public/
    └── manifest.json      # PWA manifest
```

## Database Schema

```
users        → username, password, role (admin|driver), name
routes       → name, description, stops[], color, isActive
buses        → plate, model, capacity, status
trips        → busId, driverId, routeId, startTime, endTime, status, lastLat/Lng
locations    → tripId, busId, lat, lng, speed, heading, timestamp
```

## ETA Calculation

Uses Haversine formula for distance + average speed:
- Default city speed: 20 km/h (realistic for Kigali)
- Updates with actual GPS speed when available
- `ETA (min) = distance (km) / speed (km/h) × 60`

## Deployment to Vercel

```bash
# Deploy Convex to production
npx convex deploy

# Deploy Next.js to Vercel
npx vercel
```

Set `NEXT_PUBLIC_CONVEX_URL` in Vercel environment variables.

## Design Principles

- ✅ Mobile-first, works on low-end Android phones
- ✅ Large touch targets (min 48px)
- ✅ Minimal animations for low data usage
- ✅ Works offline-tolerant (driver queues updates)
- ✅ No login required for passengers
- ✅ PWA-ready for home screen install
