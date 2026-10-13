import Svg,{Path} from 'react-native-svg';
export function BackupIcon({color,size=22}:{color:string;size?:number}){return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 3v12"/><Path d="M7 10l5 5 5-5"/><Path d="M4 17v3h16v-3"/></Svg>}
