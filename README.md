# Poker Manager

Track points and standings for your home poker league. PWA installable on iOS/Android, ready to wrap with Capacitor for native app store deployment.

## Quick Start

1. **Install dependencies:**
   ```
   npm install
   ```

2. **Set up Supabase:**
   - Create a free project at [supabase.com](https://supabase.com)
   - Open SQL Editor and run `supabase/migrations/001_initial_schema.sql`
   - Get your Project URL and anon key from Settings → API
   - Update `.env` with your values:
     ```
     VITE_SUPABASE_URL=your-project-url
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Run the dev server:**
   ```
   npm run dev
   ```

4. **Build for production:**
   ```
   npm run build
   ```

## Testing on Mobile

- Run `npm run dev` and open your computer's local IP on your phone (same WiFi)
- Or use `ngrok http 5173` for external access
- In Safari (iOS) or Chrome (Android): Share → Add to Home Screen to install as a PWA

## Future: Native App Store Deployment

To wrap as native iOS/Android apps:
1. `npm install @capacitor/core @capacitor/cli`
2. `npx cap init PokerManager com.yourname.pokermanager`
3. `npx cap add ios` / `npx cap add android`
4. `npm run build && npx cap copy`
5. Open in Xcode / Android Studio to publish

## Tech Stack

- React + Vite + TypeScript
- TailwindCSS v4 (dark poker theme)
- Supabase (PostgreSQL + Auth + Realtime)
- Zustand (state management)
- Recharts (player stats charts)
- vite-plugin-pwa (offline support, installable)
