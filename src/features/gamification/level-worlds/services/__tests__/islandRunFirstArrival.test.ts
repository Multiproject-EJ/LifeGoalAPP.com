import {buildFreshIslandRunRecord} from '../islandRunProgressReset';
import {assertEqual,type TestCase} from './testHarness';
import {shouldPlayIsland001FirstArrival,arrivalBeat,FIRST_ARRIVAL_DURATION,advanceFirstArrivalTime,FIRST_ARRIVAL_WELCOME_TIME} from '../islandRunFirstArrival';
const fresh={currentIslandNumber:1,cycleIndex:0,storyPrologueSeen:false,welcomePackRewardBundleClaimed:false,tokenIndex:0};
export const islandRunFirstArrivalTests: TestCase[] = [
 {name:'welcome claim cannot end the arrival or launch crew until PLAY',run:()=>{
   assertEqual(shouldPlayIsland001FirstArrival({...fresh,welcomePackRewardBundleClaimed:true},true),true,'claimed supplies still await arrival handoff');
   const opts={hidden:false,skip:false,reducedMotion:false,waitForWelcome:true,welcomeComplete:false};
   assertEqual(advanceFirstArrivalTime(19.7,.2,opts),FIRST_ARRIVAL_WELCOME_TIME,'clamps at the cabin');
   assertEqual(advanceFirstArrivalTime(19.8,.2,opts),FIRST_ARRIVAL_WELCOME_TIME,'holds indefinitely');
   assertEqual(advanceFirstArrivalTime(19.8,.2,{...opts,welcomeComplete:true}),20.05,'PLAY resumes');
   assertEqual(advanceFirstArrivalTime(2,.2,{...opts,skip:true}),FIRST_ARRIVAL_WELCOME_TIME,'skip still presents supplies');
   assertEqual(advanceFirstArrivalTime(2,.2,{...opts,reducedMotion:true}),FIRST_ARRIVAL_WELCOME_TIME,'reduced motion still presents supplies');
   assertEqual(advanceFirstArrivalTime(19.8,.2,{...opts,welcomeComplete:true,reducedMotion:true}),29,'reduced motion ends only after PLAY');
 }},
 {name:'arrival waits for hydration, then runs for a fresh or reset player',run:()=>{
   assertEqual(shouldPlayIsland001FirstArrival(fresh,false),false,'hydrate first');
   assertEqual(shouldPlayIsland001FirstArrival(fresh,true),true,'fresh');
   assertEqual(shouldPlayIsland001FirstArrival(buildFreshIslandRunRecord({audioEnabled:true,onboardingDisplayNameLoopCompleted:true}),true),true,'real reset factory rearms arrival');
   const returning={...fresh,storyPrologueSeen:true};
   assertEqual(shouldPlayIsland001FirstArrival(returning,true),false,'completion suppresses replay');
   assertEqual(shouldPlayIsland001FirstArrival({...returning,storyPrologueSeen:false},true),true,'canonical reset rearms');
 }},
 {name:'arrival never replays for existing progress, later islands, cycles or visual previews',run:()=>{
   for(const patch of [{currentIslandNumber:2},{cycleIndex:1},{tokenIndex:1}])
     assertEqual(shouldPlayIsland001FirstArrival({...fresh,...patch},true),false,JSON.stringify(patch));
   assertEqual(shouldPlayIsland001FirstArrival(fresh,true,true),false,'preview cannot consume onboarding');
 }},
 {name:'cinematic beats retain landing before expansion and crew before handoff',run:()=>{
   assertEqual(arrivalBeat(0),'FAST TRAVEL','opening');
   assertEqual(arrivalBeat(11),'OCEAN LANDING','contact');
   assertEqual(arrivalBeat(14),'WELCOME HOME','expansion');
   assertEqual(arrivalBeat(20),'CREW · DISEMBARK','crew');
   assertEqual(arrivalBeat(FIRST_ARRIVAL_DURATION),'YOUR JOURNEY BEGINS','handoff');
 }}
];
