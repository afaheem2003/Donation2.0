# GiveStream — Venmo for Nonprofits 🤝

A social donation platform: donate to verified nonprofits, get tax receipts, and share your impact on a community feed.

## Features

- **Donate** to nonprofits via Stripe Checkout (one-time payments)
- **Tax Center** — view donation history by year, export CSV receipts
- **Social Feed** — share donation moments, like & comment on posts
- **Nonprofit profiles** — search/filter nonprofits by category
- **Auth** via Google OAuth (NextAuth v5)

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth v5 + Google OAuth |
| Payments | Stripe Checkout |
| Styling | Tailwind CSS |
| Deploy | Vercel |

## Local Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd donation-mvp
npm install
```

### 2. Environment variables

Copy `.env.local.example` and fill in your credentials:

```bash
cp .env.local .env.local.example
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — [Google Cloud Console](https://console.cloud.google.com)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — [Stripe Dashboard](https://dashboard.stripe.com)

### 3. Database

```bash
# Push schema to DB (dev)
npm run db:push

# Or run migrations
npm run db:migrate

# Seed 10 nonprofits
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

### 5. Stripe webhook (local testing)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook secret into `STRIPE_WEBHOOK_SECRET`.

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/nonprofits` | List/search nonprofits |
| GET | `/api/nonprofits/:id` | Nonprofit detail + stats |
| POST | `/api/stripe/create-checkout-session` | Create Stripe session |
| POST | `/api/stripe/webhook` | Stripe webhook handler |
| GET | `/api/feed` | Paginated feed posts |
| POST | `/api/posts` | Create a post |
| POST | `/api/posts/:id/like` | Toggle like |
| GET/POST | `/api/posts/:id/comment` | Get/add comments |
| GET | `/api/donations/:id` | Get single donation |
| GET | `/api/tax` | Tax summary by year |
| GET | `/api/tax/export` | CSV export |
| GET | `/api/users/:username` | User profile + posts |

## Data Model

See [`prisma/schema.prisma`](prisma/schema.prisma) for the full schema.

Key models: `User`, `Nonprofit`, `Donation`, `Receipt`, `Post`, `Like`, `Comment`, `Follow`

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Add all environment variables
4. Set `NEXTAUTH_URL` to your production URL
5. Configure Stripe webhook endpoint to `https://yourdomain.com/api/stripe/webhook`

## Mobile (iOS/Android)

The API is fully RESTful and session-based. For mobile apps, use the API routes directly with cookie-based auth or migrate to JWT sessions in NextAuth config.
