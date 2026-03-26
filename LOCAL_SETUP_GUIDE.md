# Local Setup Guide

Follow this step-by-step guide to run the Community Resource Mapping System on your local machine.

## Prerequisites
Before you start, make sure you have the following installed on your computer:
1. **Node.js** (v18 or higher recommended) - [Download here](https://nodejs.org/)
2. **Git** (optional, but recommended for version control) - [Download here](https://git-scm.com/)
3. **Bun** (Optional, but your project currently uses it for database seeding) - [Download here](https://bun.sh/)

---

## Step-by-Step Instructions

### 1. Open your Terminal and navigate to the project folder
Open your terminal (Command Prompt, PowerShell, or VS Code terminal) and make sure you are inside the `Community Resource Mapping System CAPSTONE FINAL` folder.

### 2. Install Dependencies
Run the following command to download and install all the required Node.js packages (like React, Next.js, Prisma, Tailwind, etc.) listed in your `package.json`:
```bash
npm install
```

### 3. Set Up Environment Variables
The application needs certain environment variables to connect to the database and send emails/SMS.
1. Check if you have a `.env` file in the root directory. If you only have a `.env.example`, make a copy of it and name the new file `.env`.
2. Open the `.env` file and ensure your variables are set. For SQLite (the default in your project), your database URL should look like this:
```env
DATABASE_URL="file:./dev.db"

# Brevo Credentials (for emails/SMS)
BREVO_SMTP_LOGIN="a44675001@smtp-brevo.com"
BREVO_SMTP_KEY="your-brevo-smtp-key"
BREVO_FROM_EMAIL="legendxdplaciente@gmail.com"

# Next Auth (if applicable)
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Setup the Database
Since you are using Prisma with SQLite, you need to create the database tables based on your `schema.prisma` file. Run this command:
```bash
npx prisma db push
```
*(Alternatively, you can run `npm run db:migrate` if you are tracking migration history).*

### 5. Seed the Database (Optional but Recommended)
To populate your database with initial data (like the default Admin account or sample barangays), run the seed script:
```bash
npm run db:seed
```
*(Note: Your `package.json` currently uses `bun run prisma/seed.ts` for this command. If you don't have Bun installed, you can run `npx tsx prisma/seed.ts` instead).*

### 6. Start the Development Server
Now you are ready to start the application. Run the Next.js development server:
```bash
npm run dev
```

### 7. Open the App in your Browser
Once the terminal says something like `Ready in Xms`, open your web browser and go to:
[http://localhost:3000](http://localhost:3000)

---

## Common Troubleshooting
* **Database errors?** Make sure you ran `npx prisma db push` to initialize the `dev.db` file.
* **Port 3000 is already in use?** If you have another app running, close it first, or Next.js will ask to run on port 3001 instead.
* **Missing types/modules?** Re-run `npm install` and then run `npx prisma generate` to rebuild the Prisma client.
