export const CONTROLLER_THEMES=['ice','dark','light','christmas','snow','classic','gold','wood'];
export function islandControllerTheme(islandNumber,surface='island'){
 if(surface==='treasure')return 'gold';
 return islandNumber===2?'light':islandNumber===3?'snow':islandNumber===9?'dark':null;
}
// OS/app dark mode deliberately has no authority over controller cosmetics.
export function resolveControllerTheme(_dark,dev,selection,islandNumber=0,preferred='ice',surface='island'){
 if(dev&&CONTROLLER_THEMES.includes(selection))return selection;
 return islandControllerTheme(islandNumber,surface)||(['ice','dark'].includes(preferred)?preferred:'ice');
}
export function controllerSwipe(dx,dy,collapsed){
 if(Math.abs(dy)<44||Math.abs(dy)<Math.abs(dx)*1.4)return null;
 return collapsed&&dy<0?'show':!collapsed&&dy>0?'hide':null;
}
