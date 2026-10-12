import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { dark, light } from '@/constants/theme';
import { useTasks } from '@/store/useTasks';
import { todayKey } from '@/utils/dates';
import { TodayWidget } from './TodayWidget';

export function syncTodayWidget() {
  const today = todayKey();
  const tasks = useTasks.getState().tasks.filter((task) => task.sprintDate === today);
  return requestWidgetUpdate({
    widgetName: 'TodaySprint',
    renderWidget: () => ({
      light: <TodayWidget tasks={tasks} today={today} p={light} />,
      dark: <TodayWidget tasks={tasks} today={today} p={dark} />,
    }),
    widgetNotFound: () => {},
  });
}
