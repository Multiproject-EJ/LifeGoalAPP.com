import {useState} from 'react';
import {CreatureCard} from './Card';
import {CreaturePopout} from './CreaturePopout';
import {BLOOM_STUDY_POSTER,hasStudyModel} from './studyEdition';
import type {Family} from './content';

export function StudyCreatureCard(props:{family:Family;owned?:{copies:number;form:number};affinity?:number;previewForm:number}){
  const [study,setStudy]=useState(false),[origin,setOrigin]=useState<DOMRect|null>(null);
  const available=hasStudyModel(props.family.id,props.previewForm);
  return <div>
    {available&&<div className="cs-study-switch" aria-label="Card art edition"><button type="button" aria-pressed={!study} onClick={()=>setStudy(false)}>Original art</button><button type="button" aria-pressed={study} onClick={()=>setStudy(true)}>Try 3D study</button></div>}
    <CreatureCard {...props} artOverride={study&&available?BLOOM_STUDY_POSTER:undefined} onArtClick={study&&available?element=>{
      const image=element.querySelector('img')!,box=image.getBoundingClientRect(),size=Math.min(box.width,box.height);
      // object-fit:contain letterboxes a square poster; lift its visible square, not the full image box.
      setOrigin(new DOMRect(box.x+(box.width-size)/2,box.y+(box.height-size)/2,size,size));
    }:undefined}/>
    {study&&available&&<p className="cs-note">Tap the image. This poster is rendered from the actual model, so its first live pose matches. Rough 4/10 prototype; original art is unchanged.</p>}
    {origin&&<CreaturePopout origin={origin} onClose={()=>setOrigin(null)}/>}
  </div>;
}
