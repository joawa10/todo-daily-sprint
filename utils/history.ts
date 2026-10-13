import type {Task} from '@/types/task';
import {addDays,formatNice,toKey,todayKey} from '@/utils/dates';
export type HistorySection={key:string;title:string;data:Task[]};
export function completionKey(t:Task){return t.completedAt?toKey(new Date(t.completedAt)):t.sprintDate??toKey(new Date(t.createdAt))}
export function buildHistory(tasks:Task[],today=todayKey()):HistorySection[]{const done=tasks.filter(t=>t.done).map(t=>({t,k:completionKey(t)})).sort((a,b)=>a.k!==b.k?(a.k<b.k?1:-1):(b.t.completedAt??0)-(a.t.completedAt??0));const yesterday=addDays(today,-1);const sections:HistorySection[]=[];for(const {t,k} of done){let s=sections[sections.length-1];if(!s||s.key!==k){const prefix=k===today?'Today · ':k===yesterday?'Yesterday · ':'';s={key:k,title:prefix+formatNice(k),data:[]};sections.push(s)}s.data.push(t)}return sections}
