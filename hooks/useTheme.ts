import {useColorScheme} from 'react-native'; import {dark,light,Palette} from '@/constants/theme'; export function useTheme():Palette{return useColorScheme()==='dark'?dark:light}
