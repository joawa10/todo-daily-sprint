# Daily Sprint — Update: Backup & Restore (carry your data to a new install)

You are updating an **existing, working** Daily Sprint app (Expo SDK 54, Expo Router, Zustand + AsyncStorage, TypeScript strict). Earlier updates (widget, fast startup, History) may already be applied. This document adds one feature:

**Export / Import backup.** The user can save all their tasks to a single `.json` file, and later import that file into a fresh install of the app, so reinstalling the app never loses data.

Everything stays fully offline. No accounts, no backend, no cloud service. The user keeps the backup file wherever they like (Files, Google Drive, a message to themselves) using Android's normal share sheet.

---

## 0. How to work (read first)

1. **One step at a time.** Finish a step, check its **Acceptance criteria**, report, then continue. Do not build ahead.
2. After each step run `npx tsc --noEmit`. It must pass with zero errors.
3. After each step report: **Done** (files created or changed), **Verified** (which criteria, and how), **Issues** (any deviation and why).
4. Do not add features that are not in this document. Do not change existing behavior or visuals, except where a step says so.
5. Existing files from earlier builds are assumed: `constants/theme.ts`, `store/useTasks.ts`, `types/task.ts`, `utils/dates.ts`, `hooks/useTheme.ts`, `hooks/useRolloverGuard.ts`, `components/GroupLabel.tsx`, `components/ScreenTitle.tsx`, `app/_layout.tsx`, `app/(tabs)/backlog.tsx`. If one is missing, stop and report.
6. Copy UI strings character for character (including curly apostrophes).
7. This feature adds three native modules, so it needs **one native rebuild**. The rebuilt app must be **installed over the existing app, never after uninstalling it** (see the Appendix).

### Out of scope

Automatic or scheduled backups, cloud sync, accounts, password-protected or encrypted backups, replacing all data on import, importing from other apps, backup reminders, a general settings screen.

---

## 1. Files (target)

```
daily-sprint/
├── app.json                          EDIT (Step 1)   android.versionCode
├── app/
│   ├── _layout.tsx                   EDIT (Step 5)   register the backup route
│   ├── backup.tsx                    NEW  (Step 5)
│   └── (tabs)/
│       └── backlog.tsx               EDIT (Step 6)   backup button in the header
├── components/
│   ├── BackupIcon.tsx                NEW  (Step 4)
│   └── Dialog.tsx                    NEW  (Step 4)
├── hooks/
│   └── useRolloverGuard.ts           EDIT (Step 5)   do not open the review over Backup
├── store/
│   └── useTasks.ts                   EDIT (Step 3)   importTasks action
└── utils/
    └── backup.ts                     NEW  (Step 2)   build and parse backup files
```

---

# STEP 1 — Dependencies and version code

```bash
npx expo install expo-file-system expo-sharing expo-document-picker
```

Use the **legacy** file API, imported as `import * as FileSystem from 'expo-file-system/legacy';`. In SDK 54 the default `expo-file-system` import is the new object-based API, and this document uses the stable legacy functions (`writeAsStringAsync`, `readAsStringAsync`, `cacheDirectory`).

In `app.json`, inside `expo.android`, add `"versionCode": 2` (keep the existing `package` and `adaptiveIcon` fields untouched). Add this line to `README.md`: *"Increase `android.versionCode` by 1 for every APK you install by hand; Android refuses to update an app to a lower or equal version in some install methods."*

**Never change `android.package`** (`com.dailysprint.app`). A different package name is a different app and cannot reuse the old app's data.

### Acceptance criteria
- Install succeeds and `package.json` lists the three packages. If there is a peer dependency conflict, do not use `--force`. Report it.
- `app.json` is valid JSON and still contains the same `package`. `npx expo config --type public` runs without errors.
- `npx tsc --noEmit` passes.

---

# STEP 2 — Backup file format: `utils/backup.ts`

**Goal:** pure logic with no UI. It builds the file text and safely reads it back.

### File format
```json
{
  "app": "daily-sprint",
  "version": 1,
  "exportedAt": 1760000000000,
  "tasks": [ { "id": "...", "title": "...", "notes": "", "sprintDate": "2026-10-13", "done": true, "createdAt": 1760000000000, "completedAt": 1760000100000 } ]
}
```
All tasks are included (backlog, scheduled, today, and completed ones).

### Code
```ts
import type { Task } from '@/types/task';
import { toKey } from '@/utils/dates';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function buildBackup(tasks: Task[]): string {
  return JSON.stringify(
    { app: 'daily-sprint', version: 1, exportedAt: Date.now(), tasks },
    null,
    2,
  );
}

export function backupFileName(d: Date = new Date()): string {
  return `daily-sprint-backup-${toKey(d)}.json`;
}

export type ParseResult = { ok: true; tasks: Task[] } | { ok: false };

/**
 * Reads backup text. Accepts BOTH:
 *  - the backup format above ({ tasks: [...] }), and
 *  - the app's raw stored format ({ state: { tasks: [...] }, version }), so data pulled straight
 *    from storage can also be imported.
 * Invalid tasks are skipped, duplicates by id are dropped, and missing fields are filled in.
 */
export function parseBackup(text: string): ParseResult {
  let data: { tasks?: unknown; state?: { tasks?: unknown } } | null;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }
  const raw = Array.isArray(data?.tasks)
    ? data.tasks
    : Array.isArray(data?.state?.tasks)
      ? data.state.tasks
      : null;
  if (!raw) return { ok: false };

  const seen = new Set<string>();
  const tasks: Task[] = [];
  for (const r of raw as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object') continue;
    if (typeof r.id !== 'string' || !r.id) continue;
    if (typeof r.title !== 'string' || !r.title.trim()) continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const done = r.done === true;
    tasks.push({
      id: r.id,
      title: r.title.trim(),
      notes: typeof r.notes === 'string' ? r.notes : '',
      sprintDate: typeof r.sprintDate === 'string' && DATE.test(r.sprintDate) ? r.sprintDate : null,
      done,
      createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
      completedAt: done && typeof r.completedAt === 'number' ? r.completedAt : undefined,
    });
  }
  return { ok: true, tasks };
}
```

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Temporary check (remove afterwards): `parseBackup(buildBackup(sampleTasks))` returns the same tasks. `parseBackup('not json')` → `{ ok: false }`. `parseBackup('{"foo":1}')` → `{ ok: false }`. `parseBackup('{"state":{"tasks":[{"id":"a","title":"x","done":false,"sprintDate":null}]}}')` → one task with `notes: ''`. A task with an empty title or a missing id is skipped.

---

# STEP 3 — Store action: `importTasks` (merge, never overwrite)

**Goal:** add backup tasks without touching or duplicating what is already in the app.

In `store/useTasks.ts`:

1. The store creator currently receives `(set)`. Change it to `(set, get)`.
2. Add to the `TasksState` type:
   ```ts
   importTasks: (incoming: Task[]) => { added: number; skipped: number };
   ```
3. Add the action:
   ```ts
   importTasks: (incoming) => {
     const existing = new Set(get().tasks.map((t) => t.id));
     const fresh = incoming.filter((t) => !existing.has(t.id));
     if (fresh.length > 0) set((s) => ({ tasks: [...s.tasks, ...fresh] }));
     return { added: fresh.length, skipped: incoming.length - fresh.length };
   },
   ```

Rules:
- **Merge by task `id`.** A task already in the app (same id) is **left exactly as it is**. Only tasks whose id is missing are added. Importing the same file twice adds nothing the second time.
- Imported tasks keep their `sprintDate`, `done` and `completedAt`. Past-dated unfinished tasks will naturally trigger the daily review screen. That is the expected behavior.
- The widget (if installed) updates automatically, because its sync hook listens to the store.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Temporary check (remove afterwards): importing 3 tasks into an empty store returns `{ added: 3, skipped: 0 }`. Importing the same 3 again returns `{ added: 0, skipped: 3 }`, and the task count is unchanged.

---

# STEP 4 — Icon and generic dialog

### 4.1 `components/BackupIcon.tsx`
`react-native-svg`, `viewBox="0 0 24 24"`, `fill="none"`, `strokeWidth={2}`, round caps and joins, stroke = `color` prop, size = `size` prop (default 22). A tray with a download arrow:
- `<Path d="M12 3v12" />`
- `<Path d="M7 10l5 5 5-5" />`
- `<Path d="M4 17v3h16v-3" />`

### 4.2 `components/Dialog.tsx`
A reusable popup. If a `ConfirmDialog` already exists from the History feature, leave it alone. This is a separate, generic component.

Props:
```ts
type DialogButton = { label: string; kind: 'primary' | 'secondary'; onPress: () => void };
type Props = { visible: boolean; title: string; message: string; buttons: DialogButton[]; onDismiss: () => void };
```
Layout (every color from `useTheme()`, fonts from `fonts.*`):
- React Native `Modal`: `transparent`, `animationType="fade"`, `statusBarTranslucent`, `onRequestClose={onDismiss}`.
- **Scrim:** full screen, `rgba(10,16,24,0.45)`, content centered, `padding: 24`. Pressing the scrim calls `onDismiss`.
- **Card:** background `card`, border 1 `line`, `borderRadius: 18`, `padding: 20`, `width: '100%'`, `maxWidth: 400`, shadow (`shadowColor: '#000'`, `shadowOpacity: 0.3`, `shadowRadius: 25`, `shadowOffset: {0, 20}`, `elevation: 16`). Pressing the card must **not** close the dialog.
- **Title:** 19 / `extrabold`, `ink`.
- **Message:** 14 / `regular`, `mute`, `lineHeight: 20`, `marginTop: 8`, `marginBottom: 18`.
- **Buttons:** row, `gap: 8`, each `flex: 1`, `paddingVertical: 11`, `paddingHorizontal: 8`, `borderRadius: 10`, 15 / `semibold`, centered text.
  - `secondary`: transparent, border 1 `line`, text `ink`.
  - `primary`: background `accent`, border 1 `accent`, text `accentInk`.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Temporarily render `Dialog` with one button and with two buttons, in light and dark mode. The scrim and the Android back button dismiss it, and tapping the card does not. Remove the temporary code afterwards.

---

# STEP 5 — Backup screen and route

**Goal:** the screen where the user exports and imports.

### 5.1 Route in `app/_layout.tsx`
Add inside the root `Stack`, next to the other modal routes:
```tsx
<Stack.Screen name="backup" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
```

### 5.2 Rollover guard
In `hooks/useRolloverGuard.ts`, add `/backup` to the list of paths where the guard does **not** open `/review` (the same list that contains `/review`, `/task-editor`, and `/history` if present). The review opens only after the user closes the Backup screen.

### 5.3 `app/backup.tsx`
Layout: `ScrollView`, background `theme.bg`, padding `paddingTop: insets.top + 22`, `paddingHorizontal: 20`, `paddingBottom: 24 + insets.bottom`.

1. **Top bar:** row, space-between, centered. Left: the title **"Backup"** (34 / `extrabold`, line-height 34, letter-spacing −0.68, `ink`). Right: text button **"Close"** (15 / `regular`, `mute`, `paddingVertical: 6`) → `router.back()`.
2. **Intro text:** **"Your tasks live only on this phone. Export a backup before you uninstall or reinstall the app, then import it into the new install."** 15 / `regular`, `mute`, `lineHeight: 22`, `marginTop: 10`, `marginBottom: 20`.
3. **Export card:** card style: background `card`, border 1 `line`, `borderRadius: 14`, `padding: 16`, `marginBottom: 12`.
   - Title **"Export backup"**, 16 / `semibold`, `ink`.
   - Description **"Saves all {n} {task|tasks}, including completed ones, to a file you can keep in Files, send to yourself, or store in Drive."**, 14 / `regular`, `mute`, `lineHeight: 20`, `marginTop: 4`, `marginBottom: 14`. `n` is the live number of tasks in the store.
   - Full-width **primary** button **"Export backup"** (background `accent`, text `accentInk` 16 / `semibold`, `paddingVertical: 14`, `borderRadius: 14`).
4. **Import card:** same card style.
   - Title **"Import backup"**.
   - Description **"Adds the tasks from a backup file. Tasks already in the app are kept, and nothing is duplicated."** (same text style as above).
   - Full-width **secondary** button **"Import backup"** (transparent, border 1 `line`, text `ink` 16 / `semibold`, `paddingVertical: 14`, `borderRadius: 14`).
5. Buttons are disabled while an export or import is running (a local `busy` flag).

### Export flow
1. Read `useTasks.getState().tasks`. If the list is empty, show a `Dialog` with title **"Nothing to back up"**, message **"There are no tasks to back up yet."**, one primary button **"OK"**. Stop.
2. Build the text with `buildBackup(tasks)` and write it to `FileSystem.cacheDirectory + backupFileName()` using `FileSystem.writeAsStringAsync`.
3. If `await Sharing.isAvailableAsync()` is false, show a `Dialog` titled **"Can’t share"** with message **"Sharing isn’t available on this device."** and one **"OK"** button. Otherwise call `Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Save your Daily Sprint backup' })`.
4. No success popup. The system share sheet is the feedback.
5. Wrap everything in `try/catch`. On error show a `Dialog` titled **"Export failed"**, message **"Something went wrong while saving the backup. Please try again."**, one **"OK"** button.

### Import flow
1. `DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true })`. If `result.canceled`, do nothing.
2. Read the picked file with `FileSystem.readAsStringAsync(asset.uri)`.
3. `parseBackup(text)`. If `ok` is false or the list has 0 tasks, show a `Dialog` titled **"Couldn’t import"**, message **"This doesn’t look like a Daily Sprint backup file."**, one **"OK"** button. Stop.
4. Otherwise show the **confirmation** `Dialog`:
   - Title **"Import backup?"**
   - Message **"{n} {task|tasks} found in this backup. Tasks already in the app are kept, and only missing ones are added."**
   - Buttons: **"Cancel"** (secondary, does nothing), **"Import"** (primary).
5. On "Import": call `useTasks.getState().importTasks(tasks)`, then show a `Dialog`:
   - Title **"Import complete"**
   - Message **"{added} added, {skipped} already in the app."**
   - One primary button **"OK"**.
6. Wrap everything in `try/catch`. On error show a `Dialog` titled **"Import failed"**, message **"Something went wrong while reading the file. Please try again."**, one **"OK"** button.

Use correct singular and plural ("1 task", "2 tasks") everywhere a count appears.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- `router.push('/backup')` opens a full-screen slide-up screen titled "Backup" with a "Close" button and the two cards. The task count in the export description is correct and updates live.
- **Export** opens Android's share sheet with a file named like `daily-sprint-backup-2026-10-13.json`. Saving it to Files or Drive works. With no tasks, the "Nothing to back up" popup shows instead.
- **Import** of that same file shows "Import backup?" with the right count. After "Import", the result reads "0 added, N already in the app." Cancel changes nothing.
- Importing a random non-backup file (an image or a text file) shows "Couldn’t import" and changes nothing.
- Light and dark mode both look correct.

---

# STEP 6 — Entry point: button in the Backlog header

**Goal:** a way to open the Backup screen. (A general settings screen is out of scope, so the button lives on the Backlog tab.)

In `app/(tabs)/backlog.tsx`, replace the plain `ScreenTitle` ("Backlog" and the "{n} unscheduled" subtitle) with a row:
- Row: `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'flex-start'`.
- Left: the existing `ScreenTitle`, unchanged.
- Right: a **backup button**: 40 × 40, `borderRadius: 12`, border 1 `line`, background `card`, centered `BackupIcon` (size 22, color `ink`), `accessibilityLabel="Backup"`, `accessibilityRole="button"`. `onPress` → `router.push('/backup')`.

Nothing else on the Backlog screen changes.

### Acceptance criteria
- A small tray-and-arrow button appears at the top right of the Backlog tab, aligned with the title. Tapping it opens the Backup screen. Closing returns to the Backlog.
- The Backlog's quick-add, list, chips and floating button behave exactly as before.

---

# STEP 7 — Rebuild, test the real scenario, README

### 7.1 Rebuild and install OVER the existing app
```bash
npx expo prebuild --platform android --clean
npx expo run:android
```
`expo run:android` updates the installed app in place, so existing data is kept. **Do not uninstall the app first.** If the install is refused with a signature or "update incompatible" error, **stop and report it**. Do not uninstall (see the Appendix).

### 7.2 Full test script
Run all of these and report pass/fail:

1. After installing the update **over the old app**, all previous tasks are still there.
2. Open Backup (button on the Backlog tab) → **Export backup** → save the file to Files or Drive, or send it to yourself.
3. Clear the app's data (Android Settings → Apps → Daily Sprint → Storage → Clear data), or uninstall and reinstall. The app starts empty.
4. Open Backup → **Import backup** → choose the saved file → confirm. All tasks return, with their dates, notes, done status, and completion times. History shows the completed ones with their times.
5. Import the same file again: **"0 added, N already in the app."** No duplicates.
6. In a fresh install, add one task, then import the file: the new task stays, and the backup tasks are added next to it.
7. Import a non-backup file: "Couldn’t import".
8. Export with an empty app: "Nothing to back up".
9. After importing a backup that has unfinished tasks from past days, the daily review screen appears once the Backup screen is closed (not on top of it).
10. If the widget is installed, it shows the imported tasks within about a second.
11. Airplane mode: export to Files and import both work.

### 7.3 README
Add a "Backup" section: what Export and Import do, where the button is (Backlog tab, top right), that import merges and never overwrites, and the update rules from the Appendix below.

### Final deliverable
- `npx tsc --noEmit` passes. No temporary debug code remains.
- A short report with the results of the test script.

---

# Appendix — How to update the app without losing data (for the human)

Android keeps an app's data **as long as the app is updated in place**. Data is lost when the app is uninstalled, or when its storage is cleared.

**Updating in place works only if all three of these match the installed app:**
1. **Same package name:** `com.dailysprint.app`. Never change it.
2. **Same signing key:** the APK must be signed with the same key as the installed one. Mixing build methods (for example a local build, then an EAS build) usually gives different keys, and Android then refuses the update with an "app not installed / signature conflict" message. Pick one build method and stay with it. If you ever create your own keystore, keep a safe copy of it.
3. **Same or higher version code:** raise `android.versionCode` in `app.json` for each APK you install by hand.

**How to update:** open the new APK on the phone and tap **Update** (never Uninstall first), or run `adb install -r path/to/app.apk`. `npx expo run:android` already does this in place.

**The first update is special.** The version of the app you have installed now has no export button. Its data can only be carried forward by installing the new build **over it** (same key, no uninstalling). Once the new version is installed, open Backup and export a file straight away, so you have a safety copy for the future.

**If Android refuses the update (signature mismatch) and the old app is a debug build,** the data can still be pulled out before uninstalling. With the phone connected over USB and debugging enabled:
```bash
adb exec-out run-as com.dailysprint.app cat databases/RKStorage > RKStorage.db
sqlite3 RKStorage.db "select value from catalystLocalStorage where key='daily-sprint/tasks-v1';" > tasks.json
```
`tasks.json` can be imported with the new Import button (the importer understands this raw format). This works only if the old app is a debuggable build. It does not work for a release build.

**Not relied on:** Android's cloud auto-backup restores data only in some Play Store or phone-migration situations, and not reliably for hand-installed APKs. The export file is the dependable way.