import Svg,{Path} from 'react-native-svg';
export function HistoryIcon({color,size=22}:{color:string;size?:number}){return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 12a9 9 0 1 0 3-6.7"/><Path d="M3 4v5h5"/><Path d="M12 7v5l3 2"/></Svg>}
