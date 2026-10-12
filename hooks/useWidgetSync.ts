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
          if (useTasks.getState().hasHydrated) {
            void syncTodayWidget();
          }
        });
      }, delay);
    };

    schedule(1500);
    const unsubscribe = useTasks.subscribe(() => schedule());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') schedule(0);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      subscription.remove();
    };
  }, []);
}
