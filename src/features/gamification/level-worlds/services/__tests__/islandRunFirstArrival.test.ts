import {buildFreshIslandRunRecord} from '../islandRunProgressReset';
import {assertEqual,type TestCase} from './testHarness';
import {shouldPlayIsland001FirstArrival,arrivalBeat,FIRST_ARRIVAL_DURATION} from '../islandRunFirstArrival';
const fresh={currentIslandNumber:1,cycleIndex:0,storyPrologueSeen:false,welcomePackRewardBundleClaimed:false,tokenIndex:0};
export const islandRunFirstArrivalTests: TestCase[] = [
 {name:'arrival waits for hydration, then runs for a fresh or reset player',run:()=>{
   assertEqual(shouldPlayIsland001FirstArrival(fresh,false),false,'hydrate first');
   assertEqual(shouldPlayIsland001FirstArrival(fresh,true),true,'fresh');
   assertEqual(shouldPlayIsland001FirstArrival(buildFreshIslandRunRecord({audioEnabled:true,onboardingDisplayNameLoopCompleted:true}),true),true,'real reset factory rearms arrival');
   const returning={...fresh,storyPrologueSeen:true};
   assertEqual(shouldPlayIsland001FirstArrival(returning,true),false,'completion suppresses replay');
   assertEqual(shouldPlayIsland001FirstArrival({...returning,storyPrologueSeen:false},true),true,'canonical reset rearms');
 }},
 {name:'arrival never replays for existing progress, later islands, cycles or visual previews',run:()=>{
   for(const patch of [{currentIslandNumber:2},{cycleIndex:1},{welcomePackRewardBundleClaimed:true},{tokenIndex:1}])
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
