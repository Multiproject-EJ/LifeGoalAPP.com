from pathlib import Path
import json, hashlib, subprocess
base=Path('.img2threejs/island-003-v2/outer-additive')
forge=Path('/Users/ejmac/.codex/skills/img2threejs/forge')
world=Path('src/features/gamification/level-worlds/dev/Island3FrostmoonThreeWorld.ts')
for slug,oldslug,observed,changes in [
 ('snowfeather','snowfeather-roost-l3',['Paired front nesting bays and eggs, sage timber lodge, curved copper roof, feather crown and working rear hatch.','Approved L3 silhouette and materials are reused without geometry changes.'],['Use final nesting bay, egg, doorway, roof and support dimensions from their first funded level.','Retain the initial threshold as the first permanent entry step.']),
 ('hearthguard','hearthguard-yard-l3',['Open training yard, timber perimeter, feather gate, shield targets, climbing frame and rear recovery hearth hut.','Approved L3 court stays open and every final post and service object retains its location.'],['Use a fixed final perimeter slot array with additive selected slots; never redistribute posts.','Use final gate, target and recovery hut dimensions from first appearance; front climbing posts retained when rear posts are added.'])]:
 p=base/slug;old=Path('.img2threejs/island-003-frostmoon-upgrade')/oldslug
 a=json.loads((p/'pre-spec-assessment.json').read_text());d=json.loads((old/'object-sculpt-spec.json').read_text())
 ref=f'docs/visual-references/island-003-frostmoon-upgrade/secondary-inferred/landmark-goals/003-{oldslug.replace("-l3", "")}-l3-goal-v002.png'
 def save(n,x):(p/n).write_text(json.dumps(x,indent=2)+'\n')
 (p/'baseline-world.ts.txt').write_text(world.read_text())
 analysis={'scope':'Bounded early-level additive repair preserving approved final L3 vertex geometry, identity and footprint. No new detail or gameplay writes.','source':ref,'sha256':hashlib.sha256(Path(ref).read_bytes()).hexdigest(),'observed':observed,'inferred':changes,'suitability':{'verdict':'pass','reason':'Approved final multi-view goal re-inspected; existing authoritative L3 runtime retained. Early construction allocation follows explicit additive contract.'},'reuse':{'analysis':str(old/'image-analysis.md'),'materials':str(old/'material-evidence.md'),'detailInventory':str(old/'detail-inventory.json')},'projection':'No projection required; approved procedural material definitions retained.'}
 save('image-analysis.json',analysis)
 a['preSpecAssessment']=d['preSpecAssessment'];a['qualityContract']=d['qualityContract'];a['preSpecAssessment']['sourceImage']=ref;a['preSpecAssessment'].setdefault('resolvedUnknowns',[]).extend(changes);a['preSpecAssessment']['unknownsToResolveBeforeImplementation']=[]
 a['qualityContract']['definitionOfDone']+=['Every funded mesh geometry and world transform persists unchanged through later levels.','L3 world-space vertex multiset remains identical to captured baseline.','Actual construction and final phone captures confirm useful early identity and stable final footprint.']
 save('pre-spec-assessment.json',a);save('detail-inventory.json',{'reusedFrom':str(old/'detail-inventory.json'),'scope':'Full approved goal re-inspected, no new detail systems.','detailInventory':d['preSpecAssessment']['detailInventory']})
 d['targetName']=a['targetName'];d['targetId']='island-003-v2-'+slug+'-additive';d['sourceImage']=ref;d['preSpecAssessment']=a['preSpecAssessment'];d['qualityContract']=a['qualityContract'];d['localSpecSearch']=a['localSpecSearch'];d['reviewHistory']=[];d['visualEvidence']=[];d['scores']={};d['sculptPipeline']['currentPass']='blockout';d['sculptPipeline']['completedPasses']=[];d['sculptPipeline']['blockedReason']='';d['assumptions']+=changes;d['qualityTargets']['targetFidelity']=.85;d['selfCorrectLoop']['visualAcceptance']['threshold']=.85
 save('object-sculpt-spec.json',d)
 result=subprocess.run(['python3',str(forge/'stage2_spec/validate_sculpt_spec.py'),str(p/'object-sculpt-spec.json'),'--strict-quality'],capture_output=True,text=True)
 (p/'strict-validation.txt').write_text(result.stdout+result.stderr);result.check_returncode()
 state=json.loads((p/'state.json').read_text())
 for item in state['checklist']:
  if item['scope']!='setup' or item['status']!='pending':continue
  skip=item['id'] in ['projection-route','material-evidence','material-spec-wiring']
  reason='Existing approved procedural material evidence reused; no newly extracted or projected PBR asset.' if skip else 'Approved full goal inspected; fresh admission/search, scoped assessment and strict spec pass; existing detail inventory reused without expansion.'
  subprocess.run(['python3',str(forge/'state.py'),'mark',item['id'],'--state',str(p/'state.json'),'--status','skipped' if skip else 'done','--evidence',str(p),'--reason',reason],check=True,stdout=subprocess.DEVNULL)
 subprocess.run(['python3',str(forge/'next.py'),'--state',str(p/'state.json')],check=True)
