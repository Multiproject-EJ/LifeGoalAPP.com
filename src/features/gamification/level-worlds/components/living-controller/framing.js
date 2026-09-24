// Include the holographic pill and the handle tips, with room for its 44px hit target.
export function controllerFraming(aspect){
 const halfFov=Math.PI*16/180;
 return {y:.28,z:Math.max(8.15,3.25/Math.tan(halfFov)/Math.max(.1,aspect)+.5)};
}
