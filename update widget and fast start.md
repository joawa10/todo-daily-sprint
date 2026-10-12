# Daily Sprint — Update: Android Widget + Faster Startup

You are updating an **existing, working** Daily Sprint app (Expo SDK 54, Expo Router, Zustand + AsyncStorage, TypeScript strict). The original build instructions were already completed. This document adds two things:

- **Part A — Android home-screen widget** that shows today's tasks. It is **read-only**, and the task list is **scrollable**, so any number of tasks can be viewed. Tapping the widget opens the app.
- **Part B — Faster startup.** Remove the splash screen that shows the app logo. The app should open straight to the **Today** tab as fast as possible.

Everything stays fully offline. No accounts, no backend.

---

## 0. How to work (read first)

1. **One step at a time.** Finish a step, check its **Acceptance criteria**, report, then continue. Do not build ahead.
2. After each step run `npx tsc --noEmit`. It must pass with zero errors.
3. After each step report: **Done** (files created or changed), **Verified** (which criteria, and how), **Issues** (any deviation and why).
4. Do not add features that are not in this document. Do not change existing behavior or visuals, except where a step says so.
5. Existing file names and paths from the original build are assumed: `constants/theme.ts`, `constants/config.ts`, `store/useTasks.ts`, `types/task.ts`, `utils/dates.ts`, `hooks/useTheme.ts`, `app/_layout.tsx`, and so on. If one is missing, stop and report.
6. **Native changes need a rebuild.** The widget and splash changes do not work in Expo Go. They need a development or release build (`npx expo run:android`, or EAS). After changing native config you must run `npx expo prebuild --platform android --clean` before building.

### Out of scope

Checking tasks off from the widget, widget configuration screens, multiple widget types, iOS widgets, custom fonts inside the widget, replacing AsyncStorage with another storage library.

---

## 1. New and changed files (target)

```
daily-sprint/
├── index.ts                         NEW  (Step 4)  custom entry file
├── package.json                     EDIT (Step 4)  "main": "index.ts"
├── app.json                         EDIT (Steps 6, 8, 10)
├── assets/
│   ├── splash-blank.png             NEW  (Step 8)  fully transparent image (provided)
│   ├── widget-preview/
│   │   └── today.png                NEW  (Step 6)  picker preview image
│   └── fonts/                       NEW  (Step 10, optional)
├── widgets/
│   ├── TodayWidget.tsx              NEW  (Step 2)
│   ├── widget-task-handler.tsx      NEW  (Step 3)
│   └── syncWidget.tsx               NEW  (Step 5)
├── hooks/
│   └── useWidgetSync.ts             NEW  (Step 5)
└── app/
    └── _layout.tsx                  EDIT (Steps 5, 9, 10)
```

The old `assets/splash-icon.png` is no longer used after Step 8. Delete it.

---

# PART A — ANDROID WIDGET

## How the widget works (context)

- The widget is drawn by Android, not by React Native. It can only use the library's components (`FlexWidget`, `ListWidget`, `TextWidget`). It **must not use hooks**, and it cannot use `View`, `Text` or `Image`.
- When Android needs to draw the widget, it starts JavaScript in the background and calls a **task handler**. The handler reads tasks straight from AsyncStorage, under the same key as the Zustand store (`STORAGE_KEY`), and returns the widget.
- The app tells the widget to refresh whenever tasks change.
- The stored value looks like `{"state":{"tasks":[...]},"version":1}`. This is how Zustand's `persist` saves it.

---

# STEP 1 — Install dependencies

```bash
npm install react-native-android-widget
npx expo install expo-dev-client expo-build-properties
```

(`expo-build-properties` is only used if you choose to add the optional release-build settings in Step 11.)

### Acceptance criteria
- Both commands succeed. If `npm install` reports a peer dependency conflict, do **not** use `--force`. Report the error.
- `package.json` lists `react-native-android-widget`.
- `npx tsc --noEmit` passes.

---

# STEP 2 — Widget component: `widgets/TodayWidget.tsx`

**Goal:** the widget's look. Header stays fixed, and the task list scrolls.

Rules for this file:
- First line must be `'use no memo';`.
- No hooks. No React Native components. Only `FlexWidget`, `ListWidget`, `TextWidget` from `react-native-android-widget`.
- Colors come from the existing `Palette` (`constants/theme.ts`).
- Each list item's height must be **less than or equal to** the list's height. Keep each row about 44 dp tall.

```tsx
'use no memo';
import React from 'react';
import { FlexWidget, ListWidget, TextWidget } from 'react-native-android-widget';
import type { Palette } from '@/constants/theme';
import type { Task } from '@/types/task';
import { formatNice } from '@/utils/dates';

type Props = { tasks: Task[]; today: string; p: Palette };

export function TodayWidget({ tasks, today, p }: Props) {
  const done = tasks.filter((t) => t.done).length;

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: p.bg,
        borderRadius: 24,
        padding: 16,
      }}
    >
      {/* Fixed header */}
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 10,
        }}
      >
        <FlexWidget>
          <TextWidget text="Today" style={{ fontSize: 22, fontWeight: 'bold', color: p.ink }} />
          <TextWidget text={formatNice(today)} style={{ fontSize: 12, color: p.mute }} />
        </FlexWidget>
        <TextWidget text={`${done} of ${tasks.length} done`} style={{ fontSize: 13, color: p.mute }} />
      </FlexWidget>

      {/* Scrollable list (or empty text) */}
      {tasks.length === 0 ? (
        <TextWidget text="Nothing in today’s sprint yet." style={{ fontSize: 14, color: p.mute }} />
      ) : (
        <ListWidget style={{ width: 'match_parent', flex: 1 }}>
          {tasks.map((t) => (
            <FlexWidget
              key={t.id}
              clickAction="OPEN_APP"
              style={{ width: 'match_parent', paddingBottom: 6 }}
            >
              <FlexWidget
                style={{
                  width: 'match_parent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: p.card,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 10,
                }}
              >
                <FlexWidget
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    marginRight: 10,
                    borderWidth: 2,
                    borderColor: t.done ? p.sprint : p.mute,
                    backgroundColor: t.done ? p.sprint : p.card,
                  }}
                />
                <TextWidget
                  text={t.title}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 14, color: t.done ? p.mute : p.ink }}
                />
              </FlexWidget>
            </FlexWidget>
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}
```

Notes:
- **Every list item needs its own `clickAction="OPEN_APP"`** (a click on the container does not cover the items of a scrolling list).
- If TypeScript rejects a style prop (`flex`, `fontWeight`, `borderWidth`, `paddingVertical`, ...), check the library's types and use the supported equivalent or remove it. Do not cast to `any`.
- **Fallback layout** if `flex: 1` on the `ListWidget` is not accepted or the list overflows the widget: make `ListWidget` the **root** element (styled with `height/width: 'match_parent'`, `backgroundColor: p.bg`, `padding: 16`, `borderRadius: 24`) and render the header block as the **first item** of the list, so the header scrolls with the tasks. Report if you had to use this fallback.
- Done tasks are shown in the muted color with a yellow filled circle. No strikethrough (not supported).

### Acceptance criteria
- `npx tsc --noEmit` passes.
- The file has `'use no memo';` as the first line and contains no hooks.

---

# STEP 3 — Task handler: `widgets/widget-task-handler.tsx`

**Goal:** the background code that draws the widget.

```tsx
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { STORAGE_KEY } from '@/constants/config';
import { dark, light } from '@/constants/theme';
import type { Task } from '@/types/task';
import { todayKey } from '@/utils/dates';
import { TodayWidget } from './TodayWidget';

async function readToday() {
  let all: Task[] = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    all = raw ? JSON.parse(raw)?.state?.tasks ?? [] : [];
  } catch {
    all = [];
  }
  const today = todayKey();
  // Same order as the Today tab: store array order, only today's sprint.
  return { today, tasks: all.filter((t) => t.sprintDate === today) };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const { today, tasks } = await readToday();
      props.renderWidget({
        light: <TodayWidget tasks={tasks} today={today} p={light} />,
        dark: <TodayWidget tasks={tasks} today={today} p={dark} />,
      });
      break;
    }
    default:
      break; // WIDGET_DELETED, WIDGET_CLICK: nothing to do (read-only widget)
  }
}
```

Notes:
- Do **not** import `useTasks` here. The handler may run when the app is closed, so read AsyncStorage directly.
- Passing `{ light, dark }` to `renderWidget` gives automatic light/dark theming. If TypeScript or the library rejects that shape, pass a single `<TodayWidget ... p={light} />` instead and report it.

### Acceptance criteria
- `npx tsc --noEmit` passes.

---

# STEP 4 — Custom entry file

**Goal:** register the task handler when the app's JavaScript starts.

1. Create `index.ts` in the project root:
   ```ts
   import 'expo-router/entry';
   import { Platform } from 'react-native';
   import { registerWidgetTaskHandler } from 'react-native-android-widget';
   import { widgetTaskHandler } from './widgets/widget-task-handler';

   if (Platform.OS === 'android') {
     registerWidgetTaskHandler(widgetTaskHandler);
   }
   ```
   `import 'expo-router/entry'` must stay the **first** line.
2. In `package.json` change `"main": "expo-router/entry"` to `"main": "index.ts"`.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- `package.json` `main` is `index.ts`. The app still starts normally (verified in Step 7).

---

# STEP 5 — Keep the widget in sync with the app

**Goal:** when tasks change in the app, the widget updates within about a second.

### 5.1 `widgets/syncWidget.tsx`
```tsx
import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { dark, light } from '@/constants/theme';
import { useTasks } from '@/store/useTasks';
import { todayKey } from '@/utils/dates';
import { TodayWidget } from './TodayWidget';

export function syncTodayWidget() {
  const today = todayKey();
  const tasks = useTasks.getState().tasks.filter((t) => t.sprintDate === today);
  return requestWidgetUpdate({
    widgetName: 'TodaySprint',
    renderWidget: () => ({
      light: <TodayWidget tasks={tasks} today={today} p={light} />,
      dark: <TodayWidget tasks={tasks} today={today} p={dark} />,
    }),
    widgetNotFound: () => {}, // widget not added to the home screen: nothing to do
  });
}
```

### 5.2 `hooks/useWidgetSync.ts`
Updates are **debounced** (so dragging a task doesn't spam updates) and run **after interactions** (so they never slow down startup or scrolling). The first sync is delayed 1.5 seconds after launch.

```ts
import { useEffect } from 'react';
import { AppState, InteractionManager, Platform } from 'react-native';
import { useTasks } from '@/store/useTasks';
import { syncTodayWidget } from '@/widgets/syncWidget';

export function useWidgetSync() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (delay = 400) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        InteractionManager.runAfterInteractions(() => {
          if (useTasks.getState().hasHydrated) syncTodayWidget().catch(() => {});
        });
      }, delay);
    };

    schedule(1500); // first sync, after startup has settled
    const unsub = useTasks.subscribe(() => schedule());
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') schedule(0); // push latest state when the app goes to the background
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
      sub.remove();
    };
  }, []);
}
```

### 5.3 Call it once
In `app/_layout.tsx`, call `useWidgetSync();` once inside the component that renders the navigator (next to the existing `useRolloverGuard()` call). Hooks must run on every render, so do not put the call after a conditional early `return`. (Step 9 rewrites this file and shows the final structure.)

### Acceptance criteria
- `npx tsc --noEmit` passes.
- The hook is called exactly once, in `app/_layout.tsx`.

---

# STEP 6 — Register the widget in `app.json`

**Goal:** tell Expo about the widget.

1. Add this entry to the `plugins` array in `app.json`:
   ```json
   ["react-native-android-widget", {
     "widgets": [{
       "name": "TodaySprint",
       "label": "Today’s sprint",
       "description": "Your tasks for today",
       "minWidth": "250dp",
       "minHeight": "180dp",
       "targetCellWidth": 4,
       "targetCellHeight": 3,
       "previewImage": "./assets/widget-preview/today.png",
       "updatePeriodMillis": 1800000
     }]
   }]
   ```
   `name` must be exactly `TodaySprint` (it matches `widgetName` in `syncWidget.tsx`). `updatePeriodMillis: 1800000` is 30 minutes, the minimum Android allows.
2. Create the folder `assets/widget-preview/` and copy `assets/icon.png` to `assets/widget-preview/today.png` as a **temporary** preview image. (Replaced in Step 7.)

### Acceptance criteria
- `app.json` is valid JSON and contains the plugin entry.
- `assets/widget-preview/today.png` exists.
- `npx expo config --type public` runs without errors.

---

# STEP 7 — Build and verify the widget

**Goal:** the widget works on a real Android device or emulator.

1. Regenerate native code and build:
   ```bash
   npx expo prebuild --platform android --clean
   npx expo run:android
   ```
   This needs Android Studio with an SDK, and an emulator or a USB-connected phone with debugging enabled. If the developer prefers EAS: `eas build --profile development --platform android`.
2. Open the app and add a few tasks to today (more than 5, for example 8).
3. Long-press an empty spot on the home screen → **Widgets** → **Daily Sprint** → drag **Today’s sprint** onto the home screen.
4. Take a screenshot of the widget, crop it, and save it as `assets/widget-preview/today.png` (replacing the temporary one). It is used the next time the app is built.

### Acceptance criteria
- The widget appears in the picker with the label "Today’s sprint".
- It shows the "Today" title, the date (like "Mon, Oct 12"), the "X of Y done" count, and today's tasks in the same order as the Today tab.
- **With more than 5 tasks, the list scrolls vertically** with a swipe inside the widget, and every task can be reached. The header stays in place (or scrolls with the list only if the fallback layout from Step 2 was used).
- Done tasks have a filled yellow circle and muted text.
- Tapping the widget, including tapping a task row, opens the app.
- Adding, completing, deleting or reordering a task in the app updates the widget within about a second.
- With no tasks today, it shows "Nothing in today’s sprint yet."
- Switching the phone to dark mode switches the widget to the dark palette.
- With the app fully closed (swipe it away), the widget still shows correct data after the phone's launcher redraws it. You can force a redraw by resizing the widget.

---

# PART B — FASTER STARTUP

## What makes the app feel slow (context)

1. **The splash screen with the logo.** It is drawn by Android before any JavaScript runs. It cannot be removed completely on Android 12 and later: the system always draws a launch window, and without a splash image it falls back to the launcher icon. The fix is to make it **invisible**: a **fully transparent** splash image on a background that is **the same color as the app's own background** (light `#F3F5F8`, dark `#10151C`). Users then see a blank screen in the app's color, and then the Today tab. It never looks like a "loading screen".
2. **Waiting for fonts and storage before showing anything.** Keep this, but make the wait as short as possible, and hide the splash at the exact moment the first screen is drawn.
3. **Extra work at launch.** Anything not needed for the first frame (widget refresh) must wait until after the first screen shows. Step 5 already does this.
4. **Dev builds are slow.** Development builds load JavaScript from the Metro server. Judge startup speed only in a **release** build (Step 11).

---

# STEP 8 — Blank splash screen

**Goal:** no logo on launch.

1. Copy the provided file `splash-blank.png` (a fully transparent 512×512 PNG) to `assets/splash-blank.png`. If it was not provided, create one: any 512×512 PNG whose every pixel is fully transparent.
2. Delete `assets/splash-icon.png`.
3. In `app.json`, replace the existing `expo-splash-screen` plugin entry (or add it if missing) with:
   ```json
   ["expo-splash-screen", {
     "backgroundColor": "#F3F5F8",
     "image": "./assets/splash-blank.png",
     "imageWidth": 200,
     "dark": {
       "backgroundColor": "#10151C",
       "image": "./assets/splash-blank.png"
     }
   }]
   ```
4. **Final target for `app.json`** (after Steps 6 and 8). Merge with the existing file and **keep any other fields it already has**, such as `newArchEnabled`:
   ```json
   {
     "expo": {
       "name": "Daily Sprint",
       "slug": "daily-sprint",
       "scheme": "dailysprint",
       "version": "1.0.0",
       "orientation": "portrait",
       "userInterfaceStyle": "automatic",
       "icon": "./assets/icon.png",
       "ios": { "supportsTablet": false },
       "android": {
         "package": "com.dailysprint.app",
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon-foreground.png",
           "backgroundColor": "#2F5BFF"
         }
       },
       "plugins": [
         "expo-router",
         "expo-font",
         ["expo-splash-screen", {
           "backgroundColor": "#F3F5F8",
           "image": "./assets/splash-blank.png",
           "imageWidth": 200,
           "dark": { "backgroundColor": "#10151C", "image": "./assets/splash-blank.png" }
         }],
         ["react-native-android-widget", {
           "widgets": [{
             "name": "TodaySprint",
             "label": "Today’s sprint",
             "description": "Your tasks for today",
             "minWidth": "250dp",
             "minHeight": "180dp",
             "targetCellWidth": 4,
             "targetCellHeight": 3,
             "previewImage": "./assets/widget-preview/today.png",
             "updatePeriodMillis": 1800000
           }]
         }]
       ]
     }
   }
   ```
5. The splash colors must match the app's `bg` in `constants/theme.ts` (`#F3F5F8` light, `#10151C` dark). If those values were ever changed, use the current ones.

**Important:** Expo Go shows the app icon during launch, and development builds do not reflect every splash setting. Judge the splash only in a **release build** (Step 11).

### Acceptance criteria
- `app.json` is valid JSON and `npx expo config --type public` runs without errors.
- `assets/splash-blank.png` exists and `assets/splash-icon.png` does not.
- (Verified in Step 11) No logo is visible at launch in light or dark mode.

---

# STEP 9 — Show the Today tab the instant it's ready

**Goal:** hide the splash exactly when the first real screen is drawn, with no extra delay and no flash.

Replace `app/_layout.tsx` with the structure below. It keeps everything from the original Step 4 (fonts, gesture root, safe area provider, status bar, the three routes, the rollover guard) and adds the widget sync hook. Keep the `useRolloverGuard` import from the original build.

```tsx
import { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { useTheme } from '@/hooks/useTheme';
import { useRolloverGuard } from '@/hooks/useRolloverGuard';
import { useWidgetSync } from '@/hooks/useWidgetSync';
import { useTasks } from '@/store/useTasks';

SplashScreen.preventAutoHideAsync();

function Navigator() {
  const theme = useTheme();
  useRolloverGuard();
  useWidgetSync();
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task-editor" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="review" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const hasHydrated = useTasks((s) => s.hasHydrated);
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_800ExtraBold,
  });
  const ready = fontsLoaded && hasHydrated;

  // Hide the splash only after the first real frame has been laid out: no blank flash.
  const onLayout = useCallback(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <Navigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

Rules:
- Hooks (`useRolloverGuard`, `useWidgetSync`) live in `Navigator`, which is rendered only when `ready` is true. This is how the original Step 4 behavior is kept without breaking the rules of hooks.
- Do not add any `setTimeout`, artificial delay, animation or custom loading view.
- The Today tab must remain the first screen shown (route `index` in `app/(tabs)`). Do not add redirects.
- Storage hydration starts automatically when `store/useTasks.ts` is first imported. Do not delay importing it.
- Leave the Calendar and Backlog tabs on Expo Router's default lazy mounting (do not set `lazy: false`), so only Today is built at startup.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- The app starts on the Today tab. The rollover review still opens when there are stale tasks (unchanged behavior). The widget still updates after changing a task.
- There is no visible blank white flash between the splash and the first screen in light mode, nor a white or bright flash in dark mode.

---

# STEP 10 — OPTIONAL: Embed fonts at build time (Android)

**Goal:** remove the font loading from JavaScript startup on Android. Do this step only after Steps 8 and 9 work. If anything below fails, **revert this step entirely**. The app already works without it.

1. Copy the three font files into the project (verify the paths first with `ls node_modules/@expo-google-fonts/bricolage-grotesque`; each weight has its own folder):
   ```bash
   mkdir -p assets/fonts
   cp node_modules/@expo-google-fonts/bricolage-grotesque/400Regular/BricolageGrotesque_400Regular.ttf assets/fonts/
   cp node_modules/@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.ttf assets/fonts/
   cp node_modules/@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf assets/fonts/
   ```
2. In `app.json`, replace the plain `"expo-font"` plugin entry with:
   ```json
   ["expo-font", { "fonts": [
     "./assets/fonts/BricolageGrotesque_400Regular.ttf",
     "./assets/fonts/BricolageGrotesque_600SemiBold.ttf",
     "./assets/fonts/BricolageGrotesque_800ExtraBold.ttf"
   ] }]
   ```
3. In `app/_layout.tsx`, make the JavaScript font loading run only on non-Android platforms. Add `import { Platform } from 'react-native';` and replace the `useFonts({...})` call with:
   ```tsx
   const [fontsLoaded] = useFonts(
     Platform.OS === 'android'
       ? {}
       : { BricolageGrotesque_400Regular, BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold },
   );
   ```
   The font names in `constants/theme.ts` (`fonts.regular`, `fonts.semibold`, `fonts.extrabold`) stay unchanged. On Android, an embedded font is referenced by its file name without the extension, which is the same string.
4. Rebuild natively: `npx expo prebuild --platform android --clean` then `npx expo run:android`.

### Acceptance criteria
- On Android, all text still renders in Bricolage Grotesque, with distinctive letterforms in titles and weights that differ between regular, semibold and extrabold. If text falls back to the plain system font anywhere, **revert this step** by restoring the original `useFonts` call and the plain `"expo-font"` plugin entry, and report it.
- The app starts without errors.

---

# STEP 11 — Measure and final QA

**Goal:** prove startup is fast, and run the full test list.

### 11.1 Build a release version for testing
```bash
npx expo prebuild --platform android --clean
npx expo run:android --variant release
```
(The generated project signs release builds with a debug key, which is fine for testing.)

### 11.2 Measure cold start
With the phone connected over USB, run:
```bash
adb shell am force-stop com.dailysprint.app
adb shell am start -W -n com.dailysprint.app/.MainActivity
```
Note `TotalTime` and `WaitTime`. Run it 3 times and report the typical `TotalTime`. If the activity name differs, find it with `adb shell cmd package resolve-activity --brief com.dailysprint.app`.

### 11.3 Optional extra release settings
If the app is still slower than desired, add `expo-build-properties` to the plugins in `app.json` to shrink and optimize the release build:
```json
["expo-build-properties", { "android": {
  "enableMinifyInReleaseBuilds": true,
  "enableShrinkResourcesInReleaseBuilds": true
} }]
```
Rebuild, re-measure, and keep the setting only if the app still runs correctly and the time improves.

### 11.4 Final test script
Run all of these in the **release** build and report pass/fail:

1. **Light mode cold start:** after force-stopping, launch from the icon. No logo is shown. You see a plain light-gray screen (`#F3F5F8`), then the Today tab.
2. **Dark mode cold start:** same, with the phone in dark mode. A plain dark screen (`#10151C`), with no bright flash, then the Today tab.
3. The first screen after launch is always **Today** (never Backlog or Calendar).
4. With stale tasks present (an unfinished task from a previous day), the review screen opens after launch exactly as before.
5. All tabs, the editor, drag-to-reorder, tap/double-tap/long-press gestures, and the calendar behave exactly as before. Nothing regressed.
6. Widget: add it to the home screen, with more than 5 tasks today. The list scrolls, tapping opens the app, and data matches the Today tab.
7. Change tasks in the app (add, complete, delete, reorder). The widget updates within about a second.
8. Force-stop the app. The widget still displays the last data. Open the app and change a task. The widget updates.
9. Day change: set the phone date to tomorrow and wait for the widget's update (or resize it). The widget shows the new date and the new day's tasks only.
10. Airplane mode: everything works (the app never uses the network).
11. Cold-start `TotalTime` is reported (Step 11.2).

### Final deliverable
- The repository builds and runs. `npx tsc --noEmit` passes.
- Update the project `README.md`: add short sections explaining the widget (how to add it, that it is read-only, that it refreshes every time tasks change and at least every 30 minutes), and that native changes require `npx expo prebuild --platform android --clean` followed by a rebuild.
- A short report with the cold-start measurements and anything that deviated from this document.

---

# Appendix — Behavior rules for the widget

- Shows only tasks where `sprintDate === todayKey()`, in store array order, including completed ones (same as the Today tab).
- Header: "Today", the date from `formatNice`, and "{done} of {total} done".
- Read-only. The only interaction is opening the app (`OPEN_APP`) when the widget, header or any task row is tapped.
- Empty state text: "Nothing in today’s sprint yet." (with the curly apostrophe).
- Theme follows the phone's light/dark setting, using the same palette values as the app.
- Refresh: instantly (debounced about 0.4 s) when tasks change in the app or the app goes to the background, and at least every 30 minutes through Android's own schedule.