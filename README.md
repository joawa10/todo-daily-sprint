# Daily Sprint

Daily Sprint is a fully offline Expo todo app where each day is a sprint. Tasks can live in a backlog, be assigned to today or a future date, reordered, completed, and reviewed when a new day begins.

## Run

```bash
npm install
npx expo start
```

## Structure

- `app/`: Expo Router screens, tabs, and full-screen modals
- `components/`: reusable UI and calendar/editor/review components
- `constants/`, `hooks/`, `store/`, `types/`, `utils/`: theme, state, domain types, and date helpers

Set `SEED_SAMPLE_DATA` in `constants/config.ts` to `true` for development sample data when implementing a seed (it is `false` for release).
