import type {Task} from '@/types/task';
import {toKey} from '@/utils/dates';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
export function buildBackup(tasks:Task[]){return JSON.stringify({app:'daily-sprint',version:1,exportedAt:Date.now(),tasks},null,2)}
export function backupFileName(d:Date=new Date()){return `daily-sprint-backup-${toKey(d)}.json`}
export type ParseResult={ok:true;tasks:Task[]}|{ok:false};
export function parseBackup(text:string):ParseResult{let data:{tasks?:unknown;state?:{tasks?:unknown}}|null;try{data=JSON.parse(text)}catch{return {ok:false}}const raw=Array.isArray(data?.tasks)?data.tasks:Array.isArray(data?.state?.tasks)?data.state.tasks:null;if(!raw)return {ok:false};const seen=new Set<string>();const tasks:Task[]=[];for(const r of raw){if(!r||typeof r!=='object')continue;const item=r as Record<string,unknown>;if(typeof item.id!=='string'||!item.id||typeof item.title!=='string'||!item.title.trim()||seen.has(item.id))continue;seen.add(item.id);const done=item.done===true;tasks.push({id:item.id,title:item.title.trim(),notes:typeof item.notes==='string'?item.notes:'',sprintDate:typeof item.sprintDate==='string'&&DATE.test(item.sprintDate)?item.sprintDate:null,done,createdAt:typeof item.createdAt==='number'?item.createdAt:Date.now(),completedAt:done&&typeof item.completedAt==='number'?item.completedAt:undefined})}return {ok:true,tasks}}
