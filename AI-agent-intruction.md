# Daily Sprint — Build Instructions for an AI Agent

You are building **Daily Sprint**, a fully offline React Native (Expo) todo app where every day is a "sprint". Users keep a **backlog**, pull tasks into a **daily sprint**, and each new day decide what happens to unfinished tasks.

You start with an **empty folder**. This document tells you every file to create, every dependency to install, and exactly how the UI must look and behave. A clickable HTML prototype exists and the UI must match it. Everything you need to reproduce it is written below, so do not depend on the prototype being accessible. (Reference, if reachable: https://claude.ai/artifact/LdgXDgSeZh5Bf83rZaVSEW)

---

## 0. How to work (read first)

1. **One step at a time.** Do Step 1 fully, verify it against its **Acceptance criteria**, report, then move on. Do not build ahead, and do not create files that belong to a later step (except empty route stubs where a step says so).
2. After each step run `npx tsc --noEmit`. It must pass with zero errors. Fix errors before moving on.
3. After each step, report in this format:
   - **Done:** files created or changed
   - **Verified:** which acceptance criteria you checked and how
   - **Issues:** anything that deviated from this document, and why
4. **Do not invent features.** If something is not in this document, do not add it. See "Out of scope".
5. **Match the specs exactly:** colors, sizes, strings, spacing. Copy the UI strings character for character (including the curly apostrophe in "today’s").
6. Use TypeScript in `strict` mode. No `any` unless unavoidable.
7. All native dependencies must be installed with `npx expo install` so versions match the Expo SDK.

### Product summary

- **Three tabs:** Today, Backlog, Calendar (icon-only bottom navigation).
- **Two full-screen modals:** Task editor, Daily review.
- **Data:** one flat list of tasks, stored on-device only. No accounts, no backend, no network.
- **A sprint is just a date.** A task is in the backlog if `sprintDate === null`, in a day's sprint if `sprintDate === "YYYY-MM-DD"`.

### Out of scope (do NOT build)

Notifications, recurring tasks, tags, priorities, history/stats, sync, accounts, themes picker, search, subtasks, swipe-to-delete, undo, onboarding, settings screen, "skip to next day" button, a progress bar on the Today screen, a separate "tomorrow" view or button.

---

## 1. Tech stack

| Concern | Choice |
|---|---|
| Framework | Expo (latest stable SDK, managed workflow), TypeScript |
| Navigation | Expo Router (file-based) with a custom bottom tab bar |
| State + persistence | Zustand + `persist` middleware + AsyncStorage |
| Drag to reorder | `react-native-draggable-flatlist` (needs `react-native-reanimated` and `react-native-gesture-handler`) |
| Icons | `react-native-svg` (hand-written paths, given below) |
| Date picker | `@react-native-community/datetimepicker` |
| Haptics | `expo-haptics` |
| Font | Bricolage Grotesque via `@expo-google-fonts/bricolage-grotesque` |
| Dates | Hand-written helpers in `utils/dates.ts` (no date library) |

---

## 2. Final folder structure (target)

Create files only in the step that owns them.

```
daily-sprint/
├── app.json
├── package.json
├── tsconfig.json
├── app/
│   ├── _layout.tsx                 (Step 4)
│   ├── (tabs)/
│   │   ├── _layout.tsx             (Step 4)
│   │   ├── index.tsx               (Today — Step 8)
│   │   ├── backlog.tsx             (Step 7)
│   │   └── calendar.tsx            (Step 10)
│   ├── task-editor.tsx             (Step 6)
│   └── review.tsx                  (Step 9)
├── components/
│   ├── TabBar.tsx                  (Step 4)
│   ├── TabIcon.tsx                 (Step 4)
│   ├── Fab.tsx                     (Step 5)
│   ├── Checkbox.tsx                (Step 5)
│   ├── Chip.tsx                    (Step 5)
│   ├── EmptyState.tsx              (Step 5)
│   ├── GroupLabel.tsx              (Step 5)
│   ├── ScreenTitle.tsx             (Step 5)
│   ├── QuickAdd.tsx                (Step 5)
│   ├── TaskCard.tsx                (Step 5, used by Backlog + Calendar)
│   ├── TodayTaskRow.tsx            (Step 8)
│   ├── editor/
│   │   └── SprintDayPicker.tsx     (Step 6)
│   ├── review/
│   │   └── ReviewCard.tsx          (Step 9)
│   └── calendar/
│       ├── ViewToggle.tsx          (Step 10)
│       ├── CalendarNav.tsx         (Step 10)
│       ├── MonthView.tsx           (Step 10)
│       └── WeekView.tsx            (Step 10)
├── constants/
│   ├── theme.ts                    (Step 2)
│   └── config.ts                   (Step 2)
├── hooks/
│   ├── useTheme.ts                 (Step 2)
│   ├── useToday.ts                 (Step 3)
│   └── useRolloverGuard.ts         (Step 9)
├── store/
│   ├── useTasks.ts                 (Step 3)
│   └── useUI.ts                    (Step 3)
├── types/
│   └── task.ts                     (Step 2)
└── utils/
    ├── dates.ts                    (Step 2)
    ├── ids.ts                      (Step 2)
    └── seed.ts                     (Step 12, optional)
```

---

# STEP 1 — Scaffold the project

**Goal:** a blank Expo + TypeScript + Expo Router project that runs.

### Instructions

1. In the empty folder, run:
   ```bash
   npx create-expo-app@latest . --template blank-typescript
   ```
   (If the folder is not empty or the tool refuses `.`, create `daily-sprint/` and work inside it.)
2. Install dependencies:
   ```bash
   npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar react-native-svg expo-font expo-splash-screen expo-haptics @react-native-async-storage/async-storage react-native-gesture-handler react-native-reanimated @react-native-community/datetimepicker @expo-google-fonts/bricolage-grotesque
   npm install zustand react-native-draggable-flatlist
   ```
   - If the installed `react-native-reanimated` is version 4 or higher, also run `npx expo install react-native-worklets`.
   - Do **not** add a Reanimated Babel plugin manually unless the installed version's docs require it. Current `babel-preset-expo` configures it automatically.
3. Delete the template's `App.tsx` and `index.ts` (or `index.js`).
4. Edit `package.json`: set `"main": "expo-router/entry"`.
5. Replace `app.json` with:
   ```json
   {
     "expo": {
       "name": "Daily Sprint",
       "slug": "daily-sprint",
       "scheme": "dailysprint",
       "version": "1.0.0",
       "orientation": "portrait",
       "userInterfaceStyle": "automatic",
       "newArchEnabled": true,
       "ios": { "supportsTablet": false },
       "android": { "package": "com.dailysprint.app" },
       "plugins": ["expo-router", "expo-font"]
     }
   }
   ```
   Keep any icon, splash or adaptive-icon fields the template generated. Merge them in rather than deleting them. If the template's `app.json` already has `newArchEnabled`, keep its value.
6. Replace `tsconfig.json` with:
   ```json
   {
     "extends": "expo/tsconfig.base",
     "compilerOptions": {
       "strict": true,
       "baseUrl": ".",
       "paths": { "@/*": ["./*"] }
     },
     "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
   }
   ```
7. Create a temporary `app/_layout.tsx` and `app/index.tsx`:
   ```tsx
   // app/_layout.tsx
   import { Slot } from 'expo-router';
   export default function Root() { return <Slot />; }
   ```
   ```tsx
   // app/index.tsx
   import { Text, View } from 'react-native';
   export default function Home() {
     return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Daily Sprint</Text></View>;
   }
   ```

### Acceptance criteria
- `npx expo start` launches and the app shows "Daily Sprint" in Expo Go or a simulator.
- `npx tsc --noEmit` passes.
- No `App.tsx` / `index.ts` remain.

---

# STEP 2 — Types, constants, theme, date utilities

**Goal:** the pure, UI-free foundation.

### 2.1 `types/task.ts`
```ts
export type Task = {
  id: string;
  title: string;
  notes: string;              // '' when empty
  sprintDate: string | null;  // 'YYYY-MM-DD' (local date) or null = backlog
  done: boolean;
  createdAt: number;
  completedAt?: number;
};
export type SprintDayChoice = 'backlog' | 'today' | 'date';
```

### 2.2 `utils/ids.ts`
```ts
export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
```

### 2.3 `utils/dates.ts`
All keys are **local** dates `YYYY-MM-DD`. Never use UTC (`toISOString`) for keys. Dates are constructed at **12:00 noon** to avoid DST edge cases. Do not use `toLocaleDateString`; use the arrays below so the output is identical on every device.

```ts
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const pad = (n: number) => String(n).padStart(2, '0');

export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}
export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const todayKey = () => toKey(new Date());
export function addDays(k: string, n: number): string {
  const d = parseKey(k); d.setDate(d.getDate() + n); return toKey(d);
}
/** "Wed, Oct 14" */
export function formatNice(k: string): string {
  const d = parseKey(k); return `${WD[d.getDay()]}, ${MO[d.getMonth()]} ${d.getDate()}`;
}
/** "Oct 14" */
export function formatShort(k: string): string {
  const d = parseKey(k); return `${MO[d.getMonth()]} ${d.getDate()}`;
}
/** "October 2026" */
export function monthTitle(k: string): string {
  const d = parseKey(k); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
/** Sunday of the week containing k */
export function weekStart(k: string): string {
  return addDays(k, -parseKey(k).getDay());
}
/** Month grid: number of blank cells before day 1 (Sunday = 0) and every day key of the month */
export function monthCells(k: string): { blanks: number; days: string[] } {
  const d = parseKey(k); const y = d.getFullYear(); const m = d.getMonth();
  const blanks = new Date(y, m, 1, 12).getDay();
  const dim = new Date(y, m + 1, 0).getDate();
  return { blanks, days: Array.from({ length: dim }, (_, i) => `${y}-${pad(m + 1)}-${pad(i + 1)}`) };
}
/** Move n months. Result = 1st of the target month, or today if today is in that month. */
export function shiftMonth(k: string, n: number, today: string): string {
  const d = parseKey(k); d.setDate(1); d.setMonth(d.getMonth() + n);
  const first = toKey(d);
  return today.slice(0, 7) === first.slice(0, 7) ? today : first;
}
```

### 2.4 `constants/theme.ts`
Light and dark palettes. The app follows the system color scheme.

```ts
export type Palette = {
  bg: string; card: string; ink: string; mute: string; line: string;
  accent: string; accentInk: string; accentSoft: string;
  sprint: string; sprintInk: string; danger: string; cardShadow: boolean;
};

export const light: Palette = {
  bg: '#F3F5F8', card: '#FFFFFF', ink: '#16202C', mute: '#6B7686', line: '#E1E6ED',
  accent: '#2F5BFF', accentInk: '#FFFFFF', accentSoft: 'rgba(47,91,255,0.14)',
  sprint: '#FFB400', sprintInk: '#16202C', danger: '#D6402F', cardShadow: true,
};
export const dark: Palette = {
  bg: '#10151C', card: '#1A212B', ink: '#EEF1F5', mute: '#8C97A8', line: '#2A3340',
  accent: '#6C8AFF', accentInk: '#0B1020', accentSoft: 'rgba(108,138,255,0.14)',
  sprint: '#FFB400', sprintInk: '#16202C', danger: '#D6402F', cardShadow: false,
};

/** Font families. Always set fontFamily; never rely on fontWeight with custom fonts. */
export const fonts = {
  regular: 'BricolageGrotesque_400Regular',
  semibold: 'BricolageGrotesque_600SemiBold',
  extrabold: 'BricolageGrotesque_800ExtraBold',
} as const;
```

### 2.5 `hooks/useTheme.ts`
```ts
import { useColorScheme } from 'react-native';
import { dark, light, Palette } from '@/constants/theme';
export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
```

### 2.6 `constants/config.ts`
```ts
/** Dev only: when true and storage is empty on first launch, load sample data. Keep false for release. */
export const SEED_SAMPLE_DATA = false;
export const STORAGE_KEY = 'daily-sprint/tasks-v1';
export const TAP_DELAY_MS = 260;        // window to detect a double tap
export const LONG_PRESS_MS = 420;       // hold time before drag starts
```

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Quick sanity check (a temporary `console.log`, removed afterwards): `formatNice('2026-10-14')` → `"Wed, Oct 14"`; `addDays('2026-10-31', 1)` → `"2026-11-01"`; `weekStart('2026-10-14')` → `"2026-10-11"`; `monthCells('2026-10-14')` → `blanks: 4, days.length: 31`.

---

# STEP 3 — Stores (tasks + UI state) and `useToday`

**Goal:** all app logic, no UI.

### 3.1 `store/useTasks.ts`
Persisted with Zustand + AsyncStorage. Tasks stay in **array order**. The order of a day's tasks on the Today screen is the order those tasks appear in this array.

```ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY } from '@/constants/config';
import { Task } from '@/types/task';
import { newId } from '@/utils/ids';
import { todayKey } from '@/utils/dates';

type NewTask = { title: string; notes?: string; sprintDate: string | null };

type TasksState = {
  tasks: Task[];
  hasHydrated: boolean;
  addTask: (t: NewTask) => void;
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'notes' | 'sprintDate'>>) => void;
  deleteTask: (id: string) => void;
  toggleDone: (id: string) => void;
  assignToToday: (id: string) => void;
  resolveReview: (id: string, to: 'today' | 'backlog') => void;
  keepAllForToday: () => void;
  reorderToday: (orderedIds: string[]) => void;
  _setHydrated: () => void;
};

export const useTasks = create<TasksState>()(
  persist(
    (set) => ({
      tasks: [],
      hasHydrated: false,
      addTask: ({ title, notes = '', sprintDate }) =>
        set((s) => ({
          tasks: [...s.tasks, { id: newId(), title: title.trim(), notes: notes.trim(), sprintDate, done: false, createdAt: Date.now() }],
        })),
      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      toggleDone: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined } : t),
        })),
      assignToToday: (id) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, sprintDate: todayKey() } : t)) })),
      resolveReview: (id, to) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, sprintDate: to === 'today' ? todayKey() : null } : t)),
        })),
      keepAllForToday: () =>
        set((s) => {
          const today = todayKey();
          return { tasks: s.tasks.map((t) => (t.sprintDate && t.sprintDate < today && !t.done ? { ...t, sprintDate: today } : t)) };
        }),
      reorderToday: (orderedIds) =>
        set((s) => {
          const today = todayKey();
          const slots: number[] = [];
          s.tasks.forEach((t, i) => { if (t.sprintDate === today) slots.push(i); });
          if (slots.length !== orderedIds.length) return s;
          const byId = new Map(s.tasks.map((t) => [t.id, t]));
          const next = [...s.tasks];
          slots.forEach((ix, k) => { const t = byId.get(orderedIds[k]); if (t) next[ix] = t; });
          return { tasks: next };
        }),
      _setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ tasks: s.tasks }),
      onRehydrateStorage: () => (state) => { state?._setHydrated(); },
    },
  ),
);

/** Helper: a task is stale if scheduled before today and not done. */
export const isStale = (t: Task, today: string) => !!t.sprintDate && t.sprintDate < today && !t.done;
```

**Rule for components using this store:** never return a freshly filtered array from a Zustand selector (it causes render loops). Select `s.tasks` and derive lists with `useMemo`.

### 3.2 `store/useUI.ts`
Non-persisted. Remembers the Calendar's mode and selected day while the app is open.

```ts
import { create } from 'zustand';
import { addDays, shiftMonth, todayKey } from '@/utils/dates';

type UIState = {
  calMode: 'month' | 'week';
  calSel: string; // selected day key
  setCalMode: (m: 'month' | 'week') => void;
  setCalSel: (k: string) => void;
  navCal: (n: -1 | 1) => void;
};

export const useUI = create<UIState>((set, get) => ({
  calMode: 'month',
  calSel: todayKey(),
  setCalMode: (calMode) => set({ calMode }),
  setCalSel: (calSel) => set({ calSel }),
  navCal: (n) => {
    const { calMode, calSel } = get();
    set({ calSel: calMode === 'week' ? addDays(calSel, 7 * n) : shiftMonth(calSel, n, todayKey()) });
  },
}));
```

### 3.3 `hooks/useToday.ts`
Returns the current local date key and updates it when the day changes (checked when the app returns to the foreground and every 30 seconds).

```ts
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayKey } from '@/utils/dates';

export function useToday(): string {
  const [key, setKey] = useState(todayKey());
  useEffect(() => {
    const check = () => setKey((prev) => { const n = todayKey(); return n === prev ? prev : n; });
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') check(); });
    const id = setInterval(check, 30000);
    return () => { sub.remove(); clearInterval(id); };
  }, []);
  return key;
}
```

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Temporarily call store actions from the temp `app/index.tsx` (add a task, toggle, reorder, relaunch) and confirm tasks **persist across an app reload**. Remove the temporary code afterwards.

---

# STEP 4 — Root layout, fonts, navigation shell, custom tab bar

**Goal:** the app boots into three empty tabs with the icon-only bottom bar, and two modal routes exist as stubs.

### 4.1 `app/_layout.tsx`
- Keep the splash screen visible until **fonts are loaded AND `useTasks.hasHydrated` is true** (`SplashScreen.preventAutoHideAsync()` at module level, `hideAsync()` when ready). Render `null` until ready.
- Load fonts with `useFonts({ BricolageGrotesque_400Regular, BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold })` from `@expo-google-fonts/bricolage-grotesque`.
- Wrap everything in `GestureHandlerRootView` (`style={{ flex: 1 }}`) and `SafeAreaProvider`.
- Render `<StatusBar style="auto" />`.
- Root `Stack` with `screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}` and screens:
  - `(tabs)`
  - `task-editor` with `options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}`
  - `review` with `options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }}`
- The rollover guard is added in Step 9. Leave a comment `// TODO Step 9: useRolloverGuard()`.

### 4.2 `components/TabIcon.tsx`
`react-native-svg` icons, 26×26, `viewBox="0 0 24 24"`, `fill="none"`, `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"`, stroke = a `color` prop.

| Name | SVG content |
|---|---|
| `today` | `<Circle cx="12" cy="12" r="9"/>` and `<Path d="M8 12.5l3 3 5-6"/>` |
| `backlog` | `<Path d="M4 7h16M4 12h16M4 17h10"/>` |
| `calendar` | `<Rect x="3.5" y="5" width="17" height="15.5" rx="3"/>` and `<Path d="M3.5 10h17M8 3v4M16 3v4"/>` |

### 4.3 `components/TabBar.tsx`
A custom `tabBar` for Expo Router `Tabs`. Props: `BottomTabBarProps` (`import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'`; if TypeScript can't resolve it, run `npx expo install @react-navigation/bottom-tabs`).

Spec:
- Container: `flexDirection: 'row'`, `gap: 8`, background `card`, top border 1px `line`, `paddingTop: 8`, `paddingHorizontal: 20`, `paddingBottom: 10 + insets.bottom`.
- Each tab: `flex: 1`, `height: 46`, `borderRadius: 14`, content centered, **icon only, no text, no badges**.
- Inactive: transparent background, icon color `mute`.
- Active: background `accent`, icon color `accentInk`.
- `accessibilityRole="button"`, `accessibilityLabel` = "Today" / "Backlog" / "Calendar", `accessibilityState={{ selected }}`.
- Tab order: Today (route `index`), Backlog (`backlog`), Calendar (`calendar`).
- On press: `navigation.navigate(route.name)`.

### 4.4 `app/(tabs)/_layout.tsx`
```tsx
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';
export default function TabsLayout() {
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="backlog" />
      <Tabs.Screen name="calendar" />
    </Tabs>
  );
}
```

### 4.5 Stub screens
Create `app/(tabs)/index.tsx`, `backlog.tsx`, `calendar.tsx`, `app/task-editor.tsx`, `app/review.tsx`, each returning a centered `Text` with its name on the theme `bg` background. Delete the temporary `app/index.tsx` from Step 1 (the tabs group now provides `/`).

### Acceptance criteria
- App opens on the Today tab; the bar shows three icons; tapping switches tabs; the active tab is a filled blue (light) / periwinkle (dark) rounded pill with a contrasting icon.
- Fonts are loaded (verify later when real text exists) and the splash screen hides only after loading.
- Switching the phone to dark mode changes background/bar colors.
- `router.push('/task-editor')` and `router.push('/review')` open full-screen slide-up stubs.

---

# STEP 5 — Shared UI components

**Goal:** small reusable components. Every color comes from `useTheme()`, and every font uses `fonts.*`.

### Global layout rules
- Screens use `paddingTop: insets.top + 22`, `paddingHorizontal: 20`, `paddingBottom: 100` (clears the FAB). The tab bar is laid out by the navigator, so the screen does not need to add its height.
- Background of all screens: `theme.bg`.

### 5.1 `components/ScreenTitle.tsx`
Props: `title: string`, `subtitle?: string`.
- Title: `fontFamily: extrabold`, `fontSize: 34`, `lineHeight: 34`, `letterSpacing: -0.68`, color `ink`.
- Subtitle: `fontFamily: regular`, `fontSize: 15`, color `mute`, `marginTop: 6`.

### 5.2 `components/Checkbox.tsx`
Props: `checked: boolean`. Visual only (the row handles taps).
- 26×26 circle, `borderWidth: 2`, `borderColor: mute`, content centered.
- Checked: `backgroundColor` and `borderColor` = `sprint` (#FFB400). Inside, a checkmark: a `View` 6 wide × 11 tall, `borderRightWidth: 2`, `borderBottomWidth: 2`, border color `sprintInk` (#16202C), `transform: [{ rotate: '45deg' }, { translateX: -1 }, { translateY: -1 }]`.

### 5.3 `components/Chip.tsx`
Props: `label: string`, `onPress?: () => void`, `variant?: 'action' | 'static'`.
- `paddingVertical: 6`, `paddingHorizontal: 10`, `borderRadius: 999`, text 13 / `semibold`.
- `action`: background `accentSoft`, text `accent`. Pressable.
- `static`: background `line`, text `mute`. Not pressable.

### 5.4 `components/GroupLabel.tsx`
Props: `label`. Text 14 / `semibold`, color `mute`, `marginTop: 22`, `marginBottom: 8`.

### 5.5 `components/EmptyState.tsx`
Props: `line1: string`, `line2: string`.
- Box: `borderWidth: 1`, `borderStyle: 'dashed'`, `borderColor: line`, `borderRadius: 14`, `paddingVertical: 30`, `paddingHorizontal: 12`, centered text.
- Text: 15 / `regular`, color `mute`, `lineHeight: 22`. The two lines are separated by a line break.

### 5.6 `components/QuickAdd.tsx`
Props: `placeholder: string`, `onAdd: (title: string) => void`, `marginTop?: number` (default 18), `marginBottom?: number` (default 16).
- Row, `gap: 8`, with the given margins.
- `TextInput`: `flex: 1`, `minWidth: 0`, background `card`, border 1 `line`, `borderRadius: 12`, `paddingVertical: 12`, `paddingHorizontal: 14`, font 16 / `regular`, color `ink`, `placeholderTextColor: mute`, `returnKeyType: 'done'`, `blurOnSubmit={false}`, `accessibilityLabel="New task"`.
- Button: "Add", background `accent`, text `accentInk`, 16 / `semibold`, `borderRadius: 12`, `paddingHorizontal: 16`, stretches to the input height.
- Submitting (button or keyboard "done"): if `trim()` is empty do nothing. Otherwise call `onAdd(trimmed)` and clear the input (keep the keyboard open).

### 5.7 `components/Fab.tsx`
Props: `onPress`.
- Absolutely positioned: `right: 20`, `bottom: 22`, 54×54, `borderRadius: 18`, background `accent`, centered "+" in `accentInk`, `fontSize: 28`, `accessibilityLabel="New task"`.
- Shadow: `shadowColor: accent`, `shadowOffset: {0, 8}`, `shadowOpacity: 0.35`, `shadowRadius: 20`, `elevation: 8`.
- Render it as a sibling **after** the scrolling content inside the screen's root `View` (so it floats above content).

### 5.8 `components/TaskCard.tsx`
A **non-draggable** task card used in Backlog (Step 7) and Calendar (Step 10).
Props: `task: Task`, `onPress: () => void` (opens editor), `trailing?: ReactNode`.
- Card: row, `alignItems: 'center'`, `gap: 12`, background `card`, border 1 `line`, `borderRadius: 14`, `padding: 12`, `marginBottom: 8`. If `theme.cardShadow`: `shadowColor: '#16202C'`, `shadowOpacity: 0.06`, `shadowRadius: 2`, `shadowOffset: {0, 1}`, `elevation: 1`.
- Body (`Pressable`, `flex: 1`, `minWidth: 0`): title 16 / `semibold`, color `ink`; if `task.done`, line-through and color `mute`. Below it, if `notes` is non-empty, one line 13 / `regular`, color `mute`, `marginTop: 2`, `numberOfLines={1}`.
- `trailing` renders at the right, `flex: 0`.
- **No checkbox** on this card.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Temporarily render each component on a stub screen in light and dark mode and compare against the specs. Remove the temporary code afterwards.

---

# STEP 6 — Task editor modal (`app/task-editor.tsx`)

**Goal:** create/edit a task. Full-screen modal.

### Route params
`id?: string` (edit mode), `def?: 'backlog' | 'today' | 'date'` (new-task default sprint day), `dv?: string` (default date key when `def === 'date'`).

### 6.1 `components/editor/SprintDayPicker.tsx`
Props: `value: SprintDayChoice`, `onChange`.
- Row of three equal buttons, `gap: 6`: **"Backlog"**, **"Today"**, **"Pick a date"**.
- Each: `flex: 1`, `paddingVertical: 11`, `paddingHorizontal: 4`, `borderRadius: 10`, border 1 `line`, background `card`, text 14 / `semibold` color `ink`, centered.
- Active: background `ink`, border `ink`, text color `bg`.

### 6.2 Screen layout
Wrap in `KeyboardAvoidingView` (`behavior="padding"` on iOS) + `ScrollView` (`keyboardShouldPersistTaps="handled"`). Padding: `paddingTop: insets.top + 22`, `paddingHorizontal: 20`, `paddingBottom: 24 + insets.bottom`.

Top bar: row, space-between, centered.
- Left: title text styled like `ScreenTitle` (34/extrabold): **"New task"** or **"Edit task"**.
- Right: text button **"Cancel"**, 15 / `regular`, color `mute`, `paddingVertical: 6`. It calls `router.back()`.

Then, in order:
1. Label **"Title"** (14 / `semibold`, `mute`, `marginTop: 18`, `marginBottom: 6`), field: `TextInput`, placeholder **"What needs doing?"**.
2. Label **"Notes"**, field: multiline, `numberOfLines={3}` (min height about 3 lines, `textAlignVertical: 'top'`), placeholder **"Optional"**.
3. Label **"Sprint day"**, then `SprintDayPicker`.
4. If choice is `date`: label **"Date"** and a date field (below).
5. Primary button **"Save task"**: full width, background `accent`, text `accentInk` 16 / `semibold`, `paddingVertical: 14`, `borderRadius: 14`, `marginTop: 28`.
6. **Edit mode only:** secondary button **"Delete task"**: full width, border 1 `line`, transparent background, text color `danger` 16 / `semibold`, `paddingVertical: 14`, `borderRadius: 14`, `marginTop: 8`.

Field style (Title, Notes, Date): background `card`, border 1 `line`, `borderRadius: 12`, `paddingVertical: 12`, `paddingHorizontal: 14`, font 16 / `regular`, color `ink`, `placeholderTextColor: mute`.

### 6.3 Initial values
- **Edit mode:** load the task by `id`. Title/notes prefilled. Choice = `backlog` if `sprintDate === null`; `today` if equal to today; otherwise `date` with the task's date prefilled. If the task is not found, `router.back()`.
- **New mode:** choice = `def` (default `backlog`); date = `dv` if given.

### 6.4 Date field
- A pressable field that shows `formatNice(dateKey)` (color `ink`) or the placeholder **"Select a date"** (color `mute`). Tapping opens the picker.
- Minimum selectable date = **tomorrow** (`parseKey(addDays(today, 1))`). Only future dates can be picked.
- **Android:** use `DateTimePickerAndroid.open({ value, minimumDate, mode: 'date', onChange })`.
- **iOS:** render `<DateTimePicker display="inline" mode="date" minimumDate=... value=... onChange=... />` directly under the field while the `date` choice is active. (Use `themeVariant` matching the color scheme.)
- Value passed to the picker: the selected date, or tomorrow if none selected yet.
- When the user picks a date, store it as a `YYYY-MM-DD` key via `toKey`.

### 6.5 Save behavior
- If the title is empty after `trim()`: focus the title field and stop (no alert).
- If choice is `date` and no date selected: open the date picker (Android) or do nothing visible (iOS inline picker is already shown) and stop.
- `sprintDate` = `null` for backlog, `todayKey()` for today, or the chosen date key.
- Edit mode: `updateTask(id, { title, notes, sprintDate })`. New mode: `addTask({ title, notes, sprintDate })`.
- If `sprintDate` is not null, also call `useUI.getState().setCalSel(sprintDate)`.
- Then `router.back()`.
- **Delete:** `deleteTask(id)` immediately (no confirmation), then `router.back()`.

### Acceptance criteria
- `router.push('/task-editor')` shows an empty editor. Saving without a title focuses the title field.
- Saving with each of the three choices creates a task with the correct `sprintDate` (verify via a temporary log).
- "Pick a date" does not allow today or past dates.
- Opening with `?id=<existing id>` prefills everything; Delete removes the task.
- Looks correct in light and dark mode, and the keyboard never covers the focused field.

---

# STEP 7 — Backlog tab (`app/(tabs)/backlog.tsx`)

**Goal:** list unscheduled tasks, quick-add, move to Today, show scheduled future tasks.

### Layout (`ScrollView`, `keyboardShouldPersistTaps="handled"`, root `View` with `bg`, plus `<Fab/>` as a sibling)
1. `ScreenTitle` title **"Backlog"**, subtitle **"{n} unscheduled"** where n = number of backlog tasks.
2. `QuickAdd` with placeholder **"Add a task to the backlog"** (default margins 18 / 16). On add: `addTask({ title, sprintDate: null })`.
3. If there are backlog tasks: a `TaskCard` per task in store array order.
   - Pressing the card body opens the editor: `router.push({ pathname: '/task-editor', params: { id } })`. (**Single tap** opens the editor on this tab.)
   - `trailing`: `Chip` (variant `action`) **"Today"** → `assignToToday(id)`. This is the **only** chip. There is no "Tmrw" chip.
4. If there are no backlog tasks: `EmptyState` with **"Backlog is empty."** / **"Add ideas here and plan them into a day later."**
5. If there are tasks with `sprintDate > today`: `GroupLabel` **"Scheduled"**, then those tasks sorted by date ascending (ties keep array order). Each is a `TaskCard` with `trailing` = `Chip` variant `static` showing `formatShort(sprintDate)` (e.g. "Oct 15"). Tapping opens the editor. Scheduled tasks have no "Today" chip.

### FAB
`<Fab onPress={() => router.push({ pathname: '/task-editor', params: { def: 'backlog' } })} />`

### Acceptance criteria
- Add tasks via the field (button and keyboard "done"); they appear immediately and persist after reload.
- "Today" chip moves a task out of the list (it will show on the Today tab in Step 8).
- Editing a task to a future date moves it into "Scheduled" with the right date chip.
- Subtitle count updates. Empty state appears when empty.
- Matches the spec in light and dark mode.

---

# STEP 8 — Today tab (`app/(tabs)/index.tsx`) + `components/TodayTaskRow.tsx`

**Goal:** today's sprint with the three gestures: **tap = complete, double-tap = edit, long-press then drag = reorder**.

### 8.1 Derived data
```tsx
const today = useToday();
const tasks = useTasks((s) => s.tasks);
const todays = useMemo(() => tasks.filter((t) => t.sprintDate === today), [tasks, today]);
const done = todays.filter((t) => t.done).length;
```
List order = store array order. **Done tasks stay in place** (no separate "Done" group, no re-sorting).

### 8.2 Screen layout
Use `DraggableFlatList` as the **only** scroller (do not nest it inside a `ScrollView`).

```tsx
<DraggableFlatList
  data={todays}
  keyExtractor={(t) => t.id}
  onDragEnd={({ data }) => reorderToday(data.map((t) => t.id))}
  renderItem={({ item, drag, isActive }) => <TodayTaskRow task={item} drag={drag} isActive={isActive} />}
  ListHeaderComponent={<TodayHeader done={done} total={todays.length} today={today} />}
  ListEmptyComponent={<EmptyState line1="Nothing in today’s sprint yet." line2="Add a task above or pull one from the backlog." />}
  keyboardShouldPersistTaps="handled"
  contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 20, paddingBottom: 100 }}
/>
<Fab ... />
```

`TodayHeader` (define as its own component in the same file, so the `TextInput` inside is not remounted on re-render):
1. `ScreenTitle` title **"Today"**, subtitle `formatNice(today)` (e.g. "Mon, Oct 12").
2. Count line, `marginTop: 20`, `marginBottom: 4`, 15 / `regular`, color `mute`: the bold part **"{done} of {total}"** (`extrabold`, color `ink`) followed by **" done"**. **No progress bar.**
3. If `total > 0`: hint, 13 / `regular`, `mute`, `marginBottom: 16`: **"Tap to complete · double-tap to edit · hold to reorder"**. If `total === 0`: a 16px spacer instead.
4. `QuickAdd` placeholder **"Add a task to today"**, `marginTop: 0`, `marginBottom: 16`. On add: `addTask({ title, sprintDate: today })` (appended at the end of today's list).

### 8.3 `components/TodayTaskRow.tsx`
Props: `task: Task`, `drag: () => void`, `isActive: boolean`.

Visual: same card as `TaskCard`, but the left element is `Checkbox` (checked = `task.done`) followed by the text body (title + optional single-line notes). Done title: line-through, `mute`. **The whole row is one `Pressable`**.

When `isActive` (being dragged): border color `accent`, `shadowColor: '#000'`, `shadowOffset: {0, 12}`, `shadowOpacity: 0.28`, `shadowRadius: 28`, `elevation: 12`, and scaled up to 1.02 (use `ScaleDecorator` from `react-native-draggable-flatlist` with `activeScale={1.02}`).

Gesture logic (implement exactly; constants from `constants/config.ts`):

```tsx
const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

const onPress = () => {
  if (timer.current) {                       // second tap within the window → edit
    clearTimeout(timer.current); timer.current = null;
    router.push({ pathname: '/task-editor', params: { id: task.id } });
    return;
  }
  timer.current = setTimeout(() => {         // no second tap → toggle done
    timer.current = null;
    toggleDone(task.id);
  }, TAP_DELAY_MS);
};

const onLongPress = () => {                  // hold → start drag, cancel pending tap
  if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  drag();
};

useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

<Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={LONG_PRESS_MS} disabled={isActive} ...>
```

Notes:
- A double tap must **not** toggle done (the second tap cancels the pending toggle).
- Long-press must **not** toggle done or open the editor.
- No ripple or press-highlight effect.
- Add `accessibilityHint="Double tap to edit. Hold to reorder."` and `accessibilityRole="button"`.

### 8.4 FAB
`router.push({ pathname: '/task-editor', params: { def: 'today' } })`.

### Acceptance criteria
- Tasks assigned from Backlog and added via quick-add appear here in the order added.
- Single tap toggles complete (checkmark + strikethrough) after a brief ~0.26 s delay. Double tap opens the editor with no toggle.
- Long-press (about 0.4 s) lifts the row (haptic + scale + accent border); dragging reorders; releasing saves the new order, and it **persists across reload**.
- The count line updates ("1 of 3 done"). No progress bar anywhere. Empty state is shown when empty.
- Typing in the quick-add field is not interrupted by re-renders (no keyboard flicker).
- Tested on a **real device or emulator** (drag does not work in a plain browser preview).
- If `react-native-draggable-flatlist` fails to run with the installed Reanimated/Gesture Handler versions, **stop and report** the exact error and propose `react-native-reorderable-list` as a replacement. Do not silently drop the reorder feature.

---

# STEP 9 — Daily rollover guard + Review modal

**Goal:** when there are unfinished tasks from a past day, a non-dismissible review screen forces a decision per task.

### 9.1 `hooks/useRolloverGuard.ts`
Mounted once in `app/_layout.tsx` (replace the TODO from Step 4).

Logic:
- Inputs: `hasHydrated`, `tasks`, `today = useToday()`, `pathname = usePathname()`, the router, and `useRootNavigationState()?.key` (navigation readiness).
- Run in an effect with dependencies `[hasHydrated, tasks, today, pathname, navReady]`:
  - If not hydrated or navigation not ready → return.
  - `hasStale = tasks.some((t) => isStale(t, today))`.
  - If `hasStale` and `pathname` is **not** `/review` and **not** `/task-editor` → `router.push('/review')`.
- Protect against double pushes: keep a ref `pushed` set to `true` when you push and reset to `false` whenever `pathname` changes.
- Behavior this produces:
  - On app launch (after storage loads) and whenever the app returns to the foreground on a new day (via `useToday`), review opens if needed.
  - If the editor is open when the day flips, review opens **after** the editor closes (the pathname change re-runs the effect).

### 9.2 `components/review/ReviewCard.tsx`
Props: `task: Task`, `onBacklog`, `onToday`.
- Card: background `card`, border 1 `line`, `borderRadius: 14`, `padding: 14`, `marginBottom: 10`.
- Title 16 / `semibold` `ink`.
- Line **"From {formatNice(task.sprintDate)}"**, 13 / `regular`, `mute`, `marginTop: 2`, `marginBottom: 12`.
- Button row, `gap: 8`, two equal buttons (`flex: 1`, `paddingVertical: 11`, `paddingHorizontal: 8`, `borderRadius: 10`, text 15 / `semibold`, centered):
  - **"Back to backlog"**: transparent background, border 1 `line`, text `ink`.
  - **"Keep for today"**: background `accent`, border 1 `accent`, text `accentInk`.

### 9.3 `app/review.tsx`
- `ScrollView`, background `bg`, padding `paddingTop: insets.top + 22`, `paddingHorizontal: 20`, `paddingBottom: 24 + insets.bottom`.
- Title **"New day"** (34 / extrabold style).
- Lead text: **"You have {n} unfinished {task|tasks} from earlier. Decide what happens to each one."** (15 / `regular`, `mute`, `lineHeight: 22`, `marginTop: 10`, `marginBottom: 20`). Use "task" when n = 1.
- One `ReviewCard` for each stale task, in store array order. "Back to backlog" → `resolveReview(id, 'backlog')`; "Keep for today" → `resolveReview(id, 'today')`.
- Bottom full-width primary button **"Keep all for today"** (same style as "Save task", `marginTop: 8`) → `keepAllForToday()`.
- When the stale list becomes empty, close the screen: `useEffect(() => { if (stale.length === 0) router.back(); }, [stale.length])`.
- **Not dismissible:** `gestureEnabled: false` is already set; also block Android hardware back using `useFocusEffect` + `BackHandler.addEventListener('hardwareBackPress', () => true)`. There is no Cancel/close button.
- Compute `stale` with `useMemo` from `tasks` + `today`.

### Acceptance criteria
- Create a task with a past date. The easiest way is to temporarily change the system date, or temporarily call `addTask` with yesterday's date key in dev. On next launch or foreground, the review screen opens automatically.
- Each decision updates the task immediately (today vs backlog). After the last decision the screen closes by itself.
- "Keep all for today" moves everything at once.
- Several skipped days show everything unfinished in one list.
- Completed old tasks are never shown and are left in storage untouched.
- Back gestures and the Android back button can't dismiss the screen.
- The review never appears on top of the editor; it appears after the editor closes.

---

# STEP 10 — Calendar tab

**Goal:** month view (default) and week view, with day selection. Only these two views.

State comes from `useUI` (`calMode`, `calSel`, `setCalMode`, `setCalSel`, `navCal`). All tasks from `useTasks`. Tasks on a day: `tasks.filter(t => t.sprintDate === dayKey)` (**includes completed tasks**).

### 10.1 `components/calendar/ViewToggle.tsx`
- Container: row, background `line`, `borderRadius: 10`, `padding: 3`.
- Two buttons: **"Month"**, **"Week"**: `paddingVertical: 6`, `paddingHorizontal: 12`, `borderRadius: 8`, text 14 / `semibold`, color `mute`.
- Active: background `card`, text `ink`.

### 10.2 `components/calendar/CalendarNav.tsx`
Props: `title: string`, `onPrev`, `onNext`.
- Row, space-between, centered, `marginTop: 20`, `marginBottom: 10`.
- Arrow buttons: 38×38, `borderRadius: 12`, border 1 `line`, background `card`, glyphs "‹" and "›" at `fontSize: 22`, color `ink`; `accessibilityLabel` "Previous" / "Next".
- Title: 18 / `extrabold`, `ink`.

### 10.3 `components/calendar/MonthView.tsx`
Props: `selected: string`, `tasks: Task[]`, `onSelect(key)`, `onOpenTask(id)`.
- Weekday header row: **Su Mo Tu We Th Fr Sa**, each cell 12 / `regular`, `mute`, centered, `paddingVertical: 4`.
- Grid from `monthCells(selected)`: 7 columns, 4px gap. Implement as a `flexDirection: 'row'`, `flexWrap: 'wrap'` container with `marginHorizontal: -2` and each cell `width: '14.2857%'` with `padding: 2`. Render `blanks` empty cells first, then one cell per day.
- Day cell (pressable): `height: 46`, `borderRadius: 12`, centered column, `gap: 3`; day number 15 / `semibold` `ink`; below it a dots row (height 5, `gap: 3`) with `min(taskCount, 3)` dots, each a 5×5 circle colored `accent`.
  - **Today** (and not selected): 2px ring in `sprint` (#FFB400) (`borderWidth: 2`, `borderColor: sprint`).
  - **Selected:** background `accent`, number color `accentInk`, dots color `accentInk`. (If today is also selected, selected style wins; the ring may stay.)
  - `accessibilityLabel` = `formatNice(key)`.
- Below the grid: `GroupLabel` with `formatNice(selected)`, then the selected day's tasks as `TaskCard`s (tap opens the editor; no trailing, no checkbox). If none: text **"Nothing scheduled."** (14 / `regular`, `mute`, `paddingVertical: 2`, `paddingBottom: 6`).

### 10.4 `components/calendar/WeekView.tsx`
Props: `selected`, `tasks`, `onSelect(key)`, `onOpenTask(id)`.
- Week starts on **Sunday**: `weekStart(selected)` through +6 days.
- For each day, in order:
  - A pressable header row (`onSelect(dayKey)`), `marginTop: 16`, `marginBottom: 8`, row, space-between, centered:
    - Left: label `formatNice(dayKey)`, 16 / `extrabold`, color `ink` (color `accent` if it is the selected day). If the day is **today**, a filled 8×8 circle in `sprint` precedes the label (`marginRight: 8`).
    - Right: if the day has tasks, **"{n} task"** or **"{n} tasks"**, 13 / `semibold`, `mute`. Otherwise nothing.
  - Then the day's `TaskCard`s, or **"Nothing scheduled."** (same style as Month view).

### 10.5 `app/(tabs)/calendar.tsx`
- `ScrollView` with the standard padding, plus `<Fab/>`.
- Header row (space-between, `alignItems: 'flex-start'`): left `ScreenTitle` title **"Calendar"** (no subtitle), right `ViewToggle`.
- `CalendarNav`:
  - Month mode title: `monthTitle(calSel)` (e.g. "October 2026").
  - Week mode title: `formatShort(weekStart(calSel)) + ' – ' + formatShort(addDays(weekStart(calSel), 6))` (en dash with spaces), e.g. "Oct 11 – Oct 17".
  - Prev/next call `navCal(-1)` / `navCal(1)`. (Month mode moves a month, week mode moves 7 days. This is handled in the store.)
- Body: `MonthView` or `WeekView` depending on `calMode`.
- FAB: choose params from `calSel`:
  - `calSel === today` → `{ def: 'today' }`
  - `calSel > today` → `{ def: 'date', dv: calSel }`
  - otherwise (past) → `{ def: 'backlog' }`

### Acceptance criteria
- Opens in Month view. Dots appear on days with tasks (max 3). Today has the yellow ring. Selected day is filled with the accent color.
- Tapping a day updates the list below the grid. Tapping a task opens the editor.
- Month/Week toggle keeps the same selected day. Arrows move months/weeks as specified. Switching tabs and returning keeps the mode and selected day.
- Week view lists all 7 days, with a yellow dot on today and the selected day highlighted in the accent color.
- FAB pre-fills the editor as specified. Saving a task with a date jumps the calendar selection to that date.
- Completed tasks appear struck through.
- Light and dark mode both look correct.

---

# STEP 11 — Polish and quality pass

**Goal:** make everything feel finished without adding features.

Checklist (fix anything that fails):
1. **Safe areas:** nothing is clipped by notches, the home indicator, or the Android system bars on any screen or modal.
2. **Keyboard:** quick-add fields on Today/Backlog stay visible while typing (scroll if needed). The editor is never covered by the keyboard.
3. **Typography:** every `Text` uses a `fonts.*` family (no default system font visible). Check titles, labels, buttons, chips, and the calendar.
4. **Colors:** no hard-coded colors outside `constants/theme.ts`, except the documented ones (checkmark `sprintInk`, shadow colors).
5. **Dark mode:** go through every screen and modal. Text must be readable, with no white flashes on navigation (stack `contentStyle` is set).
6. **Long text:** a very long task title wraps without breaking the layout. Notes are one line with an ellipsis.
7. **Performance:** typing in a quick-add field doesn't re-render the whole list noticeably. Lists use stable keys.
8. **Date edge cases:** a task added just before midnight rolls over properly; verify `todayKey()` uses local time.
9. **Accessibility:** every icon-only button has an `accessibilityLabel`. Minimum touch targets of about 44px (the tab buttons are 46px tall; check the 38px calendar arrows, and add `hitSlop` if needed).
10. **No leftover debug code:** no `console.log`, temporary buttons, or stub text.

### Acceptance criteria
- Every item above is checked and any fixes are listed in your report.
- `npx tsc --noEmit` passes. `npx expo-doctor` reports no blocking problems (warnings may be noted).

---

# STEP 12 — Optional dev sample data + final QA

**Goal:** make demo and testing easy, then run the full test script.

### 12.1 `utils/seed.ts` (optional)
Exports `buildSeed(): Task[]` which returns (using `todayKey()` / `addDays`):

| Title | Notes | sprintDate | done |
|---|---|---|---|
| Send invoice to client |  | today − 1 | false |
| Call mom |  | today − 2 | false |
| Reply to landlord about lease |  | today | true |
| Grocery run | Eggs, rice, coffee | today | false |
| Finish pitch slides |  | today | false |
| Book dentist |  | today + 1 | false |
| Team dinner |  | today + 3 | false |
| Submit report |  | today + 3 | false |
| Renew gym membership |  | today + 8 | false |
| Renew passport | Check requirements first | null | false |
| Clean out garage |  | null | false |
| Plan weekend hike |  | null | false |

Use `newId()` and `createdAt: Date.now()`. In `useTasks`'s `onRehydrateStorage`, if `SEED_SAMPLE_DATA` is `true` and the loaded `tasks` array is empty and nothing was stored before, set the seed tasks. `SEED_SAMPLE_DATA` must remain `false` in the delivered code.

### 12.2 Final manual test script
Run all of these and report pass/fail:

1. Fresh install (empty): Today and Backlog show their empty states; Calendar shows today selected with "Nothing scheduled."
2. Add 3 tasks to Backlog. Move 2 to Today with the "Today" chip. Backlog count updates.
3. On Today: single tap completes one task; double tap opens the editor; long-press and drag reorders. Count line shows e.g. "1 of 2 done". Fully close and reopen the app, and the order and done state persist.
4. FAB on Today → new task defaults to "Today". FAB on Backlog → defaults to "Backlog".
5. Edit a backlog task, choose "Pick a date", pick a date 3 days ahead, save. It appears under "Scheduled" with the right date. It appears on that day in Calendar (dot visible in Month view).
6. Calendar: toggle Month ↔ Week; navigate next/previous in both; tap days; FAB on a future selected day pre-fills "Pick a date" with that date.
7. Rollover: set the device date to tomorrow (or use the dev seed), then return to the app. The review screen opens automatically and cannot be dismissed. Resolve one task each way, then use "Keep all for today". The screen closes itself.
8. Skip two days ahead; review lists everything unfinished from both days.
9. Delete a task from the editor (immediate). It disappears everywhere.
10. Toggle the device between light and dark mode while the app is open; both look correct.
11. Airplane mode: everything works (the app never uses the network).

### Final deliverable
- Repository builds and runs with `npx expo start`.
- `npx tsc --noEmit` passes.
- A short `README.md` at the project root with: what the app is, how to run it (`npm install`, `npx expo start`), the folder structure, and the dev seed flag.

---

# Appendix A — Design tokens at a glance

| Token | Light | Dark |
|---|---|---|
| `bg` | `#F3F5F8` | `#10151C` |
| `card` | `#FFFFFF` | `#1A212B` |
| `ink` | `#16202C` | `#EEF1F5` |
| `mute` | `#6B7686` | `#8C97A8` |
| `line` | `#E1E6ED` | `#2A3340` |
| `accent` | `#2F5BFF` | `#6C8AFF` |
| `accentInk` | `#FFFFFF` | `#0B1020` |
| `accentSoft` | `rgba(47,91,255,0.14)` | `rgba(108,138,255,0.14)` |
| `sprint` | `#FFB400` | `#FFB400` |
| `danger` | `#D6402F` | `#D6402F` |

| Element | Spec |
|---|---|
| Screen title | 34 / extrabold, line-height 34, letter-spacing −0.68 |
| Subtitle | 15 / regular, `mute`, margin-top 6 |
| Task title | 16 / semibold |
| Task notes | 13 / regular, `mute`, 1 line, margin-top 2 |
| Labels / group labels | 14 / semibold, `mute` |
| Chips, hint, small meta | 13 |
| Card | radius 14, padding 12, border 1 `line`, gap 12, margin-bottom 8 |
| Inputs | radius 12, padding 12 / 14, border 1 `line`, background `card` |
| Primary button | radius 14, padding-vertical 14, background `accent`, 16 / semibold |
| Tab bar item | height 46, radius 14, icon 26, gap 8 between items |
| FAB | 54 × 54, radius 18, right 20, bottom 22 |
| Screen padding | top = safe-area + 22, horizontal 20, bottom 100 |

# Appendix B — Exact UI strings

| Where | Text |
|---|---|
| Tab titles (screen headings) | Today · Backlog · Calendar |
| Today count | `{done} of {total}` + ` done` |
| Today hint | Tap to complete · double-tap to edit · hold to reorder |
| Today quick-add placeholder | Add a task to today |
| Today empty | Nothing in today’s sprint yet. / Add a task above or pull one from the backlog. |
| Backlog subtitle | `{n} unscheduled` |
| Backlog quick-add placeholder | Add a task to the backlog |
| Backlog empty | Backlog is empty. / Add ideas here and plan them into a day later. |
| Backlog chip | Today |
| Backlog group | Scheduled |
| Quick-add button | Add |
| Calendar toggle | Month · Week |
| Calendar weekday headers | Su Mo Tu We Th Fr Sa |
| Calendar empty day | Nothing scheduled. |
| Calendar week count | `{n} task` / `{n} tasks` |
| Editor titles | New task · Edit task |
| Editor labels | Title · Notes · Sprint day · Date |
| Editor placeholders | What needs doing? · Optional · Select a date |
| Editor sprint choices | Backlog · Today · Pick a date |
| Editor buttons | Cancel · Save task · Delete task |
| Review title | New day |
| Review lead | You have `{n}` unfinished `{task/tasks}` from earlier. Decide what happens to each one. |
| Review card | From `{Wed, Oct 14}` |
| Review buttons | Back to backlog · Keep for today · Keep all for today |

# Appendix C — Behavior rules (single source of truth)

- **Backlog** = `sprintDate === null`. **Today** = `sprintDate === todayKey()`. **Scheduled** = `sprintDate > todayKey()`. **Needs review** = `sprintDate < todayKey() && !done`.
- Completed tasks from past days are never shown on Today, Backlog or Review. They remain in storage. They *do* show on their own day in the Calendar.
- "Keep for today" → `sprintDate = todayKey()`. "Back to backlog" → `sprintDate = null`.
- Completing a task does not move or reorder it.
- New tasks are appended to the end of the array (so they appear last in their list).
- Reordering applies only to today's tasks and is persisted.
- Calendar weeks start on Sunday. Month navigation lands on the 1st of the target month (or today if that month contains today). Week navigation moves ±7 days.
- Calendar selection and mode are kept in memory only (reset on app restart to Month view, today).
- Dates are always local, `YYYY-MM-DD`.