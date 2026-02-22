# GiveStream — Venmo for Nonprofits 💚

Donate to verified nonprofits, get tax receipts, and share your impact on a social feed.

## Project Structure

```
/                   ← Expo React Native app (iOS + Android)
  app/              ← Expo Router screens
    (tabs)/         ← Tab navigation (Feed, Discover, Tax, Profile)
    nonprofit/      ← Nonprofit detail screen
    donation/       ← Post-donation success screen
    auth/           ← Sign-in screen
  components/       ← Shared UI components (PostCard, NonprofitCard, DonateSheet)
  context/          ← Auth context
  lib/              ← API client, utils, colors
  assets/           ← App icons and images

backend/            ← Next.js API server (deploy to Vercel)
  app/api/          ← REST API routes
  prisma/           ← Database schema + seed script
  lib/              ← Prisma client, Stripe, receipt logic
```

## Running the app

### 1. Start the backend

```bash
cd backend
cp .env.local.example .env.local   # fill in your credentials
npm install
npm run db:push     # push Prisma schema to Postgres
npm run db:seed     # seed 10 nonprofits
npm run dev         # runs on http://localhost:3000
```

### 2. Start the mobile app

```bash
# from root
npm install
# set EXPO_PUBLIC_API_URL=http://localhost:3000 in .env
npm start           # scan QR with Expo Go
```

## Environment variables

### Backend (`backend/.env.local`)
| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console OAuth |
| `STRIPE_SECRET_KEY` | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard |

### Mobile (`.env`)
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Your backend URL (localhost or deployed) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## Stripe webhook (local dev)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Deploying

- **Backend**: Push `backend/` to Vercel, set all env vars
- **Mobile**: `eas build` with Expo EAS, set `EXPO_PUBLIC_API_URL` to your deployed backend URL
