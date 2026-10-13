# Daily Sprint — Update: History Screen (Completed Tasks + Restore)

You are updating an **existing, working** Daily Sprint app (Expo SDK 54, Expo Router, Zustand + AsyncStorage, TypeScript strict). The original build instructions, and any later updates (widget, fast startup), are already applied. This document adds one feature:

**A History screen** that lists every completed task with the date and time it was completed, and lets the user **restore** a task to **Today** or to the **Backlog**, after a confirmation popup.

Everything stays fully offline. No accounts, no backend. A clickable prototype of this exact design exists (reference, if reachable: https://claude.ai/artifact/7SVbj2cCGNp8jyR2B5didC). Everything you need to reproduce it is written below.

---

## 0. How to work (read first)

1. **One step at a time.** Finish a step, check its **Acceptance criteria**, report, then continue. Do not build ahead.
2. After each step run `npx tsc --noEmit`. It must pass with zero errors.
3. After each step report: **Done** (files created or changed), **Verified** (which criteria, and how), **Issues** (any deviation and why).
4. Do not add features that are not in this document. Do not change existing behavior or visuals, except where a step says so.
5. Existing files from the original build are assumed: `constants/theme.ts`, `store/useTasks.ts`, `types/task.ts`, `utils/dates.ts`, `hooks/useTheme.ts`, `hooks/useRolloverGuard.ts`, `components/TabIcon.tsx`, `components/GroupLabel.tsx`, `components/EmptyState.tsx`, `components/ScreenTitle.tsx`, `app/_layout.tsx`, `app/(tabs)/index.tsx`. If one is missing, stop and report.
6. This feature uses **no new dependencies and no native changes**. It works in Expo Go and in your existing development build, and no rebuild is needed.
7. Copy UI strings character for character (including the curly apostrophe in "today’s").

### Out of scope

Permanent deletion from History, search or filters, editing tasks from History, bulk restore, un-archiving by swiping, a History tab, statistics or streaks.

---

## 1. What already exists (no data changes needed)

- Completed tasks are **never deleted**. They stay in the store with `done: true`.
- `toggleDone` already sets `completedAt` (a millisecond timestamp) when a task is completed, and clears it when the task is un-completed.
- So **History is just a view** of tasks where `done === true`. No migration, no new storage keys, no change to the `Task` type.

---

## 2. Files (target)

```
daily-sprint/
├── app/
│   ├── _layout.tsx                  EDIT (Step 5)  register the history route
│   ├── history.tsx                  NEW  (Step 5)
│   └── (tabs)/
│       └── index.tsx                EDIT (Step 6)  history button in the Today header
├── components/
│   ├── HistoryIcon.tsx              NEW  (Step 3)
│   ├── TabIcon.tsx                  EDIT (Step 3)  optional size prop
│   ├── GroupLabel.tsx               EDIT (Step 4)  optional margin props
│   └── history/
│       ├── HistoryRow.tsx           NEW  (Step 4)
│       └── ConfirmDialog.tsx        NEW  (Step 4)
├── hooks/
│   └── useRolloverGuard.ts          EDIT (Step 5)  do not open the review over History
├── store/
│   └── useTasks.ts                  EDIT (Step 2)  new restoreTask action
└── utils/
    ├── dates.ts                     EDIT (Step 1)  formatTime
    └── history.ts                   NEW  (Step 1)  grouping and sorting
```

---

# STEP 1 — Time formatter and history grouping (pure logic)

**Goal:** the logic for ordering and grouping, with no UI.

### 1.1 Add to `utils/dates.ts`
Hand-written, so it looks identical on every device (do not use `toLocaleTimeString`):
```ts
/** "3:42 PM" from a millisecond timestamp, in the device's local time */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
```

### 1.2 Create `utils/history.ts`
```ts
import type { Task } from '@/types/task';
import { addDays, formatNice, toKey, todayKey } from '@/utils/dates';

export type HistorySection = { key: string; title: string; data: Task[] };

/** The day a task was completed (local date key). Falls back for tasks that have no completedAt. */
export function completionKey(t: Task): string {
  if (t.completedAt) return toKey(new Date(t.completedAt));
  return t.sprintDate ?? toKey(new Date(t.createdAt));
}

/**
 * Completed tasks grouped by the day they were COMPLETED (not the day they were planned).
 * Newest day first; inside a day, newest completion time first.
 */
export function buildHistory(tasks: Task[], today: string = todayKey()): HistorySection[] {
  const done = tasks
    .filter((t) => t.done)
    .map((t) => ({ t, k: completionKey(t) }))
    .sort((a, b) =>
      a.k !== b.k ? (a.k < b.k ? 1 : -1) : (b.t.completedAt ?? 0) - (a.t.completedAt ?? 0),
    );

  const yesterday = addDays(today, -1);
  const sections: HistorySection[] = [];
  for (const { t, k } of done) {
    let s = sections[sections.length - 1];
    if (!s || s.key !== k) {
      const prefix = k === today ? 'Today · ' : k === yesterday ? 'Yesterday · ' : '';
      s = { key: k, title: prefix + formatNice(k), data: [] };
      sections.push(s);
    }
    s.data.push(t);
  }
  return sections;
}
```

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Quick sanity check with a temporary `console.log` (remove afterwards): `formatTime(new Date(2026, 9, 13, 15, 42).getTime())` → `"3:42 PM"`; `formatTime` of 00:05 → `"12:05 AM"`; of 12:00 → `"12:00 PM"`.
- `buildHistory` on a small array gives sections sorted newest day first, with the title format `"Today · Tue, Oct 13"`, `"Yesterday · Mon, Oct 12"`, or just `"Fri, Oct 9"` for older days.
- A task completed on Tuesday but planned for Monday appears under **Tuesday**.

---

# STEP 2 — Store action: `restoreTask`

**Goal:** move a completed task back into the active lists.

In `store/useTasks.ts`:

1. Add to the `TasksState` type:
   ```ts
   restoreTask: (id: string, to: 'today' | 'backlog') => void;
   ```
2. Add to the store's actions (next to `resolveReview`):
   ```ts
   restoreTask: (id, to) =>
     set((s) => {
       const t = s.tasks.find((x) => x.id === id);
       if (!t) return s;
       const restored: Task = {
         ...t,
         done: false,
         completedAt: undefined,
         sprintDate: to === 'today' ? todayKey() : null,
       };
       // Move to the END of the array, so a task restored to today appears last in today's list.
       return { tasks: [...s.tasks.filter((x) => x.id !== id), restored] };
     }),
   ```

Behavior rules:
- Restoring clears `done` and `completedAt`, and sets `sprintDate` to today's date key (`to: 'today'`) or `null` (`to: 'backlog'`).
- The widget (if installed) updates automatically, because its sync hook listens to the store.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Temporary check (remove afterwards): complete a task, call `restoreTask(id, 'today')`. The task is back on the Today tab as not done, at the end of the list. Then complete it again and call `restoreTask(id, 'backlog')`. It appears in the Backlog tab.

---

# STEP 3 — Icons

**Goal:** the history button icon, and a size option for the existing tab icons (they are reused inside History rows).

### 3.1 `components/HistoryIcon.tsx`
`react-native-svg`, `viewBox="0 0 24 24"`, `fill="none"`, `strokeWidth={2}`, `strokeLinecap="round"`, `strokeLinejoin="round"`, stroke = `color` prop, size = `size` prop (default 22).

Content: three paths (a counter-clockwise arrow around a clock):
- `<Path d="M3 12a9 9 0 1 0 3-6.7" />`
- `<Path d="M3 4v5h5" />`
- `<Path d="M12 7v5l3 2" />`

### 3.2 `components/TabIcon.tsx`
Add an optional `size?: number` prop (default **26**, so existing usage is unchanged) and use it for the SVG width and height.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- The bottom tab bar looks exactly as before.
- Rendering `<HistoryIcon color="#16202C" />` temporarily on a screen shows a counter-clockwise arrow with clock hands. Remove the temporary code afterwards.

---

# STEP 4 — History components

**Goal:** the compact row and the confirmation dialog. Every color comes from `useTheme()` and every font from `fonts.*`.

### 4.1 `components/GroupLabel.tsx` (edit)
Add optional props `marginTop?: number` (default **22**) and `marginBottom?: number` (default **8**). Existing usage must not change.

### 4.2 `components/history/HistoryRow.tsx`
Props: `task: Task`, `onRestoreBacklog: () => void`, `onRestoreToday: () => void`.

A **single compact row**:
- Container: row, `alignItems: 'center'`, `gap: 8`, background `card`, border 1 `line`, `borderRadius: 12`, `paddingVertical: 7`, `paddingLeft: 12`, `paddingRight: 7`, `marginBottom: 6`.
- Left (`flex: 1`, `minWidth: 0`):
  - Title: 15 / `semibold`, color `ink`, `numberOfLines={1}`, ellipsize at the end.
  - Below it, only if `task.completedAt` exists: the time `formatTime(task.completedAt)`, 12 / `regular`, color `mute`, `marginTop: 1`.
  - **No notes** are shown in this row, and there are no long text buttons.
- Right: two icon buttons, each **36 × 36**, `borderRadius: 10`, centered icon, 20 px icons with stroke width 2:
  1. **Restore to backlog:** `TabIcon name="backlog" size={20}`; border 1 `line`, transparent background, icon color `ink`. `accessibilityLabel="Restore to backlog"`.
  2. **Restore to today:** `TabIcon name="today" size={20}`; background `accentSoft`, no border, icon color `accent`. `accessibilityLabel="Restore to today"`.
- Give both buttons `accessibilityRole="button"` and a `hitSlop` of 4.
- Keep a visible gap between the two buttons (`gap: 8` on the row) so they are hard to mis-tap.

### 4.3 `components/history/ConfirmDialog.tsx`
A React Native `Modal` (`transparent`, `animationType="fade"`, `statusBarTranslucent`, `onRequestClose` = cancel, so the Android back button cancels).

Props: `visible: boolean`, `taskTitle: string`, `to: 'today' | 'backlog'`, `onCancel`, `onConfirm`.

Layout:
- **Scrim:** full screen, background `rgba(10,16,24,0.45)`, content centered, `padding: 24`. Pressing the scrim calls `onCancel`.
- **Card:** background `card`, border 1 `line`, `borderRadius: 18`, `padding: 20`, `width: '100%'`, `maxWidth: 400`, shadow (`shadowColor: '#000'`, `shadowOpacity: 0.3`, `shadowRadius: 25`, `shadowOffset: {0, 20}`, `elevation: 16`). Pressing the card must **not** close the dialog (stop propagation, for example by wrapping the card in its own `Pressable`).
- **Title:** 19 / `extrabold`, `ink`: **"Restore to today?"** or **"Restore to backlog?"**.
- **Task name:** `taskTitle`, 15 / `semibold`, `ink`, `marginTop: 10`, wraps to multiple lines if long.
- **Message:** 14 / `regular`, `mute`, `lineHeight: 20`, `marginTop: 6`, `marginBottom: 18`:
  - to `today`: **"It will be marked as not done and moved to today’s sprint."**
  - to `backlog`: **"It will be marked as not done and moved to the backlog."**
- **Buttons:** row, `gap: 8`, two equal buttons (`flex: 1`, `paddingVertical: 11`, `paddingHorizontal: 8`, `borderRadius: 10`, 15 / `semibold`, centered text):
  - **"Cancel":** transparent background, border 1 `line`, text `ink`.
  - **"Restore":** background `accent`, border 1 `accent`, text `accentInk`.
- `accessibilityViewIsModal` on the card.

### Acceptance criteria
- `npx tsc --noEmit` passes.
- Temporarily render `HistoryRow` and `ConfirmDialog` with sample props in light and dark mode and compare to the specs. A row is about 52 px tall with a one-line title and a time. Remove the temporary code afterwards.
- Tapping inside the dialog card does not close it, tapping the scrim does, and the Android back button does.

---

# STEP 5 — History screen and route

**Goal:** the full History screen, as a full-screen modal route.

### 5.1 Register the route in `app/_layout.tsx`
Add next to `task-editor` and `review`, inside the root `Stack`:
```tsx
<Stack.Screen name="history" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
```

### 5.2 Do not open the daily review on top of History
In `hooks/useRolloverGuard.ts`, the guard currently skips opening `/review` when the path is `/review` or `/task-editor`. Add `/history` to that list, so the review opens only after the user closes History (same behavior as the editor).

### 5.3 `app/history.tsx`
Behavior:
- Data: `const tasks = useTasks((s) => s.tasks);` then `const sections = useMemo(() => buildHistory(tasks), [tasks]);` and `const count = sections.reduce((n, s) => n + s.data.length, 0);`. (Do not filter inside the Zustand selector.)
- Local state: `confirm: { id: string; to: 'today' | 'backlog' } | null`.
- Pressing a restore icon on a row sets `confirm`. **Nothing changes until the user presses "Restore" in the dialog.**
- "Restore" calls `restoreTask(confirm.id, confirm.to)` and clears `confirm`. The task disappears from the list.
- "Cancel" (or scrim, or Android back) only clears `confirm`.
- The dialog's task name comes from the store task matching `confirm.id`. If the task no longer exists, close the dialog.
- The list keeps its scroll position after cancelling or confirming.

Layout: a `SectionList` as the only scroller:
```tsx
<SectionList
  sections={sections}
  keyExtractor={(t) => t.id}
  stickySectionHeadersEnabled={false}
  renderSectionHeader={({ section }) => (
    <GroupLabel label={section.title} marginTop={16} marginBottom={6} />
  )}
  renderItem={({ item }) => (
    <HistoryRow
      task={item}
      onRestoreBacklog={() => setConfirm({ id: item.id, to: 'backlog' })}
      onRestoreToday={() => setConfirm({ id: item.id, to: 'today' })}
    />
  )}
  ListHeaderComponent={<Header count={count} />}
  ListEmptyComponent={<View style={{ marginTop: 20 }}><EmptyState line1="No completed tasks yet." line2="Tasks you finish will show up here." /></View>}
  contentContainerStyle={{ paddingTop: insets.top + 22, paddingHorizontal: 20, paddingBottom: 24 + insets.bottom }}
/>
<ConfirmDialog ... />
```
Background `theme.bg`.

`Header` (a component defined in the same file):
1. Top bar: row, space-between, centered. Left: the title **"History"** styled like `ScreenTitle` (34 / extrabold, line-height 34, letter-spacing −0.68). Right: text button **"Close"**, 15 / `regular`, `mute`, `paddingVertical: 6`, which calls `router.back()`.
2. Subtitle **"{count} completed"**: 15 / `regular`, `mute`, `marginTop: 6`.
3. **Legend** (only when `count > 0`): row, `alignItems: 'center'`, `gap: 10`, `marginTop: 14`, `marginBottom: 2`, text 12 / `regular`, color `mute`. Content: the text **"Restore to"**, then an item with the backlog icon (14 px) followed by **"Backlog"** (gap 4, color `mute`), then an item with the today icon (14 px) followed by **"Today"** (gap 4, color `accent`).

### Acceptance criteria
- `npx tsc --noEmit` passes.
- `router.push('/history')` opens a full-screen slide-up screen titled "History" with a "Close" button.
- Completed tasks are listed under day headers, newest day first: "Today · Tue, Oct 13", "Yesterday · Mon, Oct 12", then plain dates like "Fri, Oct 9". Within a day, the latest completion is first.
- Each row is one compact line: title, with the completion time beneath it in small muted text (like "3:42 PM"), and two small icon buttons on the right.
- Tapping either icon opens the confirmation dialog with the correct title and message. **The task is unchanged until "Restore" is pressed.**
- "Restore" removes the task from History and puts it in the right place. "Cancel" changes nothing.
- With no completed tasks, the dashed empty state is shown and the legend is hidden.
- Looks correct in light and dark mode.

---

# STEP 6 — History button on the Today tab

**Goal:** the entry point.

In `app/(tabs)/index.tsx`, in the `TodayHeader` component, replace the plain title block with a row:
- Row: `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'flex-start'`.
- Left: the existing `ScreenTitle` ("Today" plus the date subtitle), unchanged.
- Right: a **history button**: 40 × 40, `borderRadius: 12`, border 1 `line`, background `card`, centered `HistoryIcon` (size 22, color `ink`), `accessibilityLabel="History"`, `accessibilityRole="button"`. `onPress` → `router.push('/history')`.

Nothing else on the Today screen changes: the count line, hint, quick-add field, list, gestures and floating button stay as they are.

### Acceptance criteria
- A small clock-history button appears at the top right of the Today tab, vertically aligned with the "Today" title. Tapping it opens History.
- Closing History returns to the Today tab in the same state.
- The title and date are positioned exactly as before. `TodayHeader` is still its own component, so the quick-add `TextInput` doesn't lose focus on re-render.
- All Today gestures (tap, double-tap, hold to reorder) still work.

---

# STEP 7 — Final QA

Run all of these and report pass/fail:

1. Complete a task on the Today tab. Open History. It is under "Today · {date}" with the correct time.
2. Un-complete the same task on the Today tab. It disappears from History.
3. Complete three tasks at different times. Within the "Today" group they are ordered newest first.
4. Restore a task **to today**: confirm popup shows "Restore to today?" with the right message. Cancel changes nothing. Confirm moves it, not done, to the **end** of today's list.
5. Restore a task **to backlog**: popup shows "Restore to backlog?". Confirm moves it to the Backlog tab as not done.
6. Restored tasks no longer appear in History, and the count under the title goes down.
7. Dismiss the popup using the dimmed area and using the Android back button. Both cancel.
8. Plan a task for Monday and complete it on Tuesday (or temporarily test with the system date). It appears under Tuesday in History.
9. A completed task with no `completedAt` (for example from old data) still appears, under its planned date, with no time line.
10. With the device date moved to a new day while History is open and there are stale tasks, the daily review opens only after History is closed.
11. If the widget is installed: restoring a task to today updates the widget within about a second.
12. Dark mode: History, rows, legend and the popup all look correct.
13. Scroll a long History list, restore a task near the bottom. The scroll position doesn't jump.
14. Airplane mode: everything works (no network use).

### Final deliverable
- `npx tsc --noEmit` passes. No temporary debug code remains.
- Add a short "History" section to `README.md`: what it shows, how to open it (clock button on the Today tab), and that completed tasks are archived, not deleted.

---

# Appendix A — UI strings

| Where | Text |
|---|---|
| History title / close | History · Close |
| Count | `{n} completed` |
| Legend | Restore to · Backlog · Today |
| Group headers | `Today · Tue, Oct 13` · `Yesterday · Mon, Oct 12` · `Fri, Oct 9` |
| Row time | `3:42 PM` |
| Empty state | No completed tasks yet. / Tasks you finish will show up here. |
| Dialog titles | Restore to today? · Restore to backlog? |
| Dialog message (today) | It will be marked as not done and moved to today’s sprint. |
| Dialog message (backlog) | It will be marked as not done and moved to the backlog. |
| Dialog buttons | Cancel · Restore |
| Icon accessibility labels | History · Restore to backlog · Restore to today |

# Appendix B — Design tokens used (no new colors)

| Element | Spec |
|---|---|
| History title | 34 / extrabold, line-height 34, letter-spacing −0.68, `ink` |
| Count | 15 / regular, `mute`, margin-top 6 |
| Legend | 12 / regular, `mute`; "Today" item in `accent`; icons 14 px; gaps 10 and 4 |
| Group header | 14 / semibold, `mute`, margin-top 16, margin-bottom 6 |
| Row | `card` bg, border 1 `line`, radius 12, padding 7 / 7 / 7 / 12, margin-bottom 6, gap 8 |
| Row title | 15 / semibold, `ink`, one line, ellipsis |
| Row time | 12 / regular, `mute`, margin-top 1 |
| Icon buttons | 36 × 36, radius 10, 20 px icons; backlog = border `line` + `ink` icon; today = `accentSoft` bg + `accent` icon |
| History button (Today) | 40 × 40, radius 12, border 1 `line`, `card` bg, icon 22 px `ink` |
| Dialog scrim | `rgba(10,16,24,0.45)` |
| Dialog card | `card`, border 1 `line`, radius 18, padding 20, max-width 400 |
| Dialog title | 19 / extrabold, `ink` |
| Dialog task name | 15 / semibold, `ink`, margin-top 10 |
| Dialog message | 14 / regular, `mute`, line-height 20, margin 6 / 18 |
| Dialog buttons | radius 10, padding 11 / 8, 15 / semibold; Cancel = border `line` + `ink`; Restore = `accent` bg + `accentInk` |

# Appendix C — Behavior rules (single source of truth)

- History shows **every task with `done === true`**, including ones completed today. Nothing is ever deleted.
- Tasks are grouped by the **day they were completed** (`completedAt`), not the day they were planned. Fallback: planned date, then creation date.
- Order: newest day first, and inside a day, newest `completedAt` first.
- Restoring: `done = false`, `completedAt` cleared, `sprintDate` = today's date key or `null` (backlog). The task moves to the end of the task array.
- A confirmation popup is **always** shown before a restore. Cancelling never changes data.
- History is read-only apart from restoring. There is no delete, no edit, and no way to reorder.
- History is a full-screen modal route (`/history`), opened from the Today tab. It is not a tab.