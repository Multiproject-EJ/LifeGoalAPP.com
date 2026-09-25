import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import type {Session} from '@supabase/supabase-js';
import {lockFullscreenPageScroll} from '../../utils/scrollLock';
import {NewDailySpinWheel} from './NewDailySpinWheel';
export function DevDailySpinPreviewModal({session,onClose}:{session:Session;onClose:()=>void}){
 useEffect(()=>lockFullscreenPageScroll({root:true}),[]);
 return createPortal(<div style={{position:'fixed',inset:0,zIndex:100100}} role="dialog" aria-modal="true" aria-label="Developer daily spin rehearsal"><NewDailySpinWheel session={session} onClose={onClose} devPreview/></div>,document.body);
}
