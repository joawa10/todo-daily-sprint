export type Task={id:string;title:string;notes:string;sprintDate:string|null;done:boolean;createdAt:number;completedAt?:number};
export type SprintDayChoice='backlog'|'today'|'date';
