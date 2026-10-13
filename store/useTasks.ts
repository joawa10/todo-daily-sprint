import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { STORAGE_KEY, SEED_SAMPLE_DATA } from '@/constants/config';
import { buildSeed } from '@/utils/seed';
import { Task } from '@/types/task';
import { newId } from '@/utils/ids';
import { todayKey } from '@/utils/dates';

type NewTask = {
  title: string;
  notes?: string;
  sprintDate: string | null;
};

type State = {
  tasks: Task[];
  hasHydrated: boolean;
  addTask: (task: NewTask) => void;
  updateTask: (
    id: string,
    patch: Partial<Pick<Task, 'title' | 'notes' | 'sprintDate'>>,
  ) => void;
  deleteTask: (id: string) => void;
  toggleDone: (id: string) => void;
  assignToToday: (id: string) => void;
  resolveReview: (id: string, to: 'today' | 'backlog') => void;
  keepAllForToday: () => void;
  reorderToday: (ids: string[]) => void;
  restoreTask: (id: string, to: 'today' | 'backlog') => void;
  importTasks: (incoming: Task[]) => { added: number; skipped: number };
};

const persistTasks = (tasks: Task[]) => {
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks }));
};

export const useTasks = create<State>((set, get) => {
  const update = (recipe: (state: State) => Partial<State>) => {
    set((state) => {
      const next = recipe(state);
      const tasks = next.tasks ?? state.tasks;
      if (state.hasHydrated) persistTasks(tasks);
      return next;
    });
  };

  void AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      let tasks: Task[] = [];
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed === 'object' &&
            'tasks' in parsed &&
            Array.isArray(parsed.tasks)
          ) {
            tasks = parsed.tasks as Task[];
          }
        } catch {
          tasks = [];
        }
      }
      if (SEED_SAMPLE_DATA && tasks.length === 0) tasks = buildSeed();
      set({ tasks, hasHydrated: true });
      if (SEED_SAMPLE_DATA && tasks.length > 0) persistTasks(tasks);
    })
    .catch(() => {
      set({ hasHydrated: true });
    });

  return {
    tasks: [],
    hasHydrated: false,
    addTask: ({ title, notes = '', sprintDate }) =>
      update((state) => ({
        tasks: [
          ...state.tasks,
          {
            id: newId(),
            title: title.trim(),
            notes: notes.trim(),
            sprintDate,
            done: false,
            createdAt: Date.now(),
          },
        ],
      })),
    updateTask: (id, patch) =>
      update((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...patch } : task,
        ),
      })),
    deleteTask: (id) =>
      update((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      })),
    toggleDone: (id) =>
      update((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                done: !task.done,
                completedAt: !task.done ? Date.now() : undefined,
              }
            : task,
        ),
      })),
    assignToToday: (id) =>
      update((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, sprintDate: todayKey() } : task,
        ),
      })),
    resolveReview: (id, to) =>
      update((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? { ...task, sprintDate: to === 'today' ? todayKey() : null }
            : task,
        ),
      })),
    restoreTask: (id, to) =>
      update((state) => {
        const task = state.tasks.find((item) => item.id === id);
        if (!task) return {};
        const restored: Task = {
            ...task,
            done: false,
            completedAt: undefined,
            sprintDate: to === 'today' ? todayKey() : null,
        };
        return { tasks: [...state.tasks.filter((item) => item.id !== id), restored] };
      }),
    importTasks: (incoming) => {
      const existing = new Set(get().tasks.map((task) => task.id));
      const fresh = incoming.filter((task) => !existing.has(task.id));
      if (fresh.length > 0) {
        update((state) => ({ tasks: [...state.tasks, ...fresh] }));
      }
      return { added: fresh.length, skipped: incoming.length - fresh.length };
    },
    keepAllForToday: () =>
      update((state) => {
        const today = todayKey();
        return {
          tasks: state.tasks.map((task) =>
            task.sprintDate && task.sprintDate < today && !task.done
              ? { ...task, sprintDate: today }
              : task,
          ),
        };
      }),
    reorderToday: (ids) =>
      update((state) => {
        const today = todayKey();
        const slots: number[] = [];
        state.tasks.forEach((task, index) => {
          if (task.sprintDate === today) slots.push(index);
        });
        if (slots.length !== ids.length) return {};
        const byId = new Map(state.tasks.map((task) => [task.id, task]));
        const next = [...state.tasks];
        slots.forEach((slot, index) => {
          const task = byId.get(ids[index]);
          if (task) next[slot] = task;
        });
        return { tasks: next };
      }),
  };
});

export const isStale = (task: Task, today: string) =>
  !!task.sprintDate && task.sprintDate < today && !task.done;
