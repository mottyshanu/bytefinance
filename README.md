# ByteFinance

Premium finance tracking for ByteMedia agency.

## Features

- **Admin Dashboard**:
  - **Overview**: Real-time balances (Main Account, Retain Fund) and Pending Income.
  - **Transactions**: Record Income/Expense with Account and Client selection.
  - **Drawings**: Record Partner Drawings deducted from specific accounts.
  - **Pending Payments**: Track and mark client invoices as paid.
  - **Accounts**: Manage multiple bank accounts.
- **Partner Dashboard**:
  - Monthly expense analytics.
  - Personal Drawings and Salary status.
  - Client Receivables and Freelancer Payments.
  - Real-time Retain Fund balance.

## Tech Stack

- **Frontend**: React, Vite, Recharts, Framer Motion, Lucide React.
- **Backend**: Node.js, Express, Prisma.
- **Database**: SQLite (Development) / PostgreSQL (Supabase Ready).
- **Theme**: Mercedes-Benz Premium (Dark Mode, Corporate A font).

## Setup

1. **Install dependencies**:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Setup Database**:
   ```bash
   cd server
   npx prisma migrate dev --name init
   node prisma/seed.js
   ```

3. **Run Application**:
   - **Server**: `cd server && npm start` (Runs on port 5001)
   - **Client**: `cd client && npm run dev` (Runs on port 5173/5174)

## Supabase & Vercel Deployment

### 1. Database (Supabase)
Since Vercel is serverless, you cannot use the local SQLite file (`dev.db`). You must use a cloud database like Supabase.
1.  Create a project on [Supabase](https://supabase.com/).
2.  Go to **Project Settings > Database** and copy the **Connection String** (Use the Transaction Mode / Port 6543 string).
3.  Update `server/.env`:
    ```env
    DATABASE_URL="postgresql://postgres:[PASSWORD]@db.supabase.co:6543/postgres?pgbouncer=true"
    ```
4.  Update `server/prisma/schema.prisma`:
    ```prisma
    datasource db {
      provider = "postgresql"
      url      = env("DATABASE_URL")
    }
    ```
5.  Run the migration to push your schema to Supabase:
    ```bash
    cd server
    npx prisma migrate deploy
    ```

### 2. Deploy Server (Vercel)
1.  Install Vercel CLI: `npm i -g vercel`
2.  Deploy the server:
    ```bash
    cd server
    vercel
    ```
3.  Follow the prompts. When asked for Environment Variables, add `DATABASE_URL`.
4.  Note the **Production URL** (e.g., `https://bytefinance-server.vercel.app`).

### 3. Deploy Client (Vercel)
1.  Update the Client to point to your new Server URL.
    -   Create a file `client/.env.production`:
        ```env
        VITE_API_URL=https://bytefinance-server.vercel.app/api
        ```
2.  Deploy the client:
    ```bash
    cd client
    vercel
    ```

## Default Users

- **Admin**: `admin` / `adminpassword`
- **Partner**: `partner` / `partnerpassword`
