import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import { dark, light } from '@/constants/theme';
import { STORAGE_KEY } from '@/constants/config';
import type { Task } from '@/types/task';
import { todayKey } from '@/utils/dates';
import { TodayWidget } from './TodayWidget';

async function readToday() {
  const today = todayKey();
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { today, tasks: [] as Task[] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { today, tasks: [] as Task[] };

    const record = parsed as { tasks?: unknown; state?: { tasks?: unknown } };
    const storedTasks = record.tasks ?? record.state?.tasks;
    const tasks = Array.isArray(storedTasks) ? (storedTasks as Task[]) : [];
    return { today, tasks: tasks.filter((task) => task.sprintDate === today) };
  } catch {
    return { today, tasks: [] as Task[] };
  }
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
      break;
  }
}
