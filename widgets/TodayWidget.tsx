'use no memo';

import React from 'react';
import { FlexWidget, ListWidget, TextWidget } from 'react-native-android-widget';
import type { Palette } from '@/constants/theme';
import type { Task } from '@/types/task';
import { formatNice } from '@/utils/dates';

type Props = { tasks: Task[]; today: string; p: Palette };

export function TodayWidget({ tasks, today, p }: Props) {
  const done = tasks.filter((task) => task.done).length;

  return (
    <ListWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: p.bg,
      }}
    >
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 16,
          paddingHorizontal: 20,
          paddingBottom: 10,
        }}
      >
        <FlexWidget>
          <TextWidget text="Today" style={{ fontSize: 22, fontWeight: 'bold', color: p.ink }} />
          <TextWidget text={formatNice(today)} style={{ fontSize: 12, color: p.mute }} />
        </FlexWidget>
        <TextWidget text={`${done} of ${tasks.length} done`} style={{ fontSize: 13, color: p.mute }} />
      </FlexWidget>

      {tasks.length === 0 ? (
        <TextWidget
          text="Nothing in today’s sprint yet."
          style={{ fontSize: 14, color: p.mute, paddingHorizontal: 20, paddingVertical: 16 }}
        />
      ) : (
        tasks.map((task) => (
          <FlexWidget
            key={task.id}
            clickAction="OPEN_APP"
            style={{ width: 'match_parent', paddingHorizontal: 20, paddingBottom: 6 }}
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
                  borderColor: task.done ? p.sprint : p.mute,
                  backgroundColor: task.done ? p.sprint : p.card,
                }}
              />
              <TextWidget
                text={task.title}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 14, color: task.done ? p.mute : p.ink }}
              />
              </FlexWidget>
          </FlexWidget>
        ))
      )}
    </ListWidget>
  );
}
