# ASMEB EMS — Developer Setup Guide

## Step 1 — Clone the project
git clone git@github.com:adamzzjd/ameb-ems-react.git
cd ameb-ems-react

## Step 2 — Install dependencies
npm install

## Step 3 — Set up your environment variables
cp .env.example .env.local

Open .env.local and fill in the values 
you received from the project lead.

## Step 4 — Run the project locally
npm run dev

Open your browser at: http://localhost:5173

## Step 5 — Before writing any code
Always create a new branch first — never work on main:

git checkout -b feature/your-feature-name

## Step 6 — Saving your work
git add .
git commit -m "Brief description of what you changed"
git push origin feature/your-feature-name

Then open a Pull Request on GitHub for review.

## Important Rules
- Never commit .env.local to GitHub
- Never push directly to main branch
- Always pull latest changes before starting work:
  git pull origin main
- Ask the project lead before changing any 
  database tables
