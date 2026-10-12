# Daily Sprint

Daily Sprint is a fully offline Expo todo app where each day is a sprint. Tasks can live in a backlog, be assigned to today or a future date, reordered, completed, and reviewed when a new day begins.

## Run

```bash
npm install
npx expo start
```

## Android build sizes

For a directly installable test APK, use the preview profile:

```bash
npm run build:android
```

or:

```bash
eas build --profile preview --platform android
```

The `preview` profile creates an internal-distribution APK without the Expo development
client. The `development` profile is intentionally larger because it includes the
development client, debugging tools, and unoptimized native libraries:

```bash
eas build --profile development --platform android
```

Use the development profile only when you need to connect the installed app to
`npx expo start`. For normal device testing, use `preview`. For store release builds,
use `eas build --profile production`; Android production builds are optimized for
distribution and are normally generated as an AAB.

## Structure

- `app/`: Expo Router screens, tabs, and full-screen modals
- `components/`: reusable UI and calendar/editor/review components
- `constants/`, `hooks/`, `store/`, `types/`, `utils/`: theme, state, domain types, and date helpers

Set `SEED_SAMPLE_DATA` in `constants/config.ts` to `true` for development sample data when implementing a seed (it is `false` for release).
