export function resolveControllerTheme(dark,dev,selection){
 const experimental=['light','christmas','snow','classic','gold','wood'];
 return dev&&experimental.includes(selection)?selection:dark?'dark':'ice';
}
export function controllerSwipe(dx,dy,collapsed){
 if(Math.abs(dy)<44||Math.abs(dy)<Math.abs(dx)*1.4)return null;
 return collapsed&&dy<0?'show':!collapsed&&dy>0?'hide':null;
}
