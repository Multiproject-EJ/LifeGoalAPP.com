import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url), ts=require('typescript');
const source=await readFile('src/App.tsx','utf8');
const ast=ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const app=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='App');
const statements=app.body.statements;
const gate=statements.find(node=>ts.isIfStatement(node)&&node.expression.getText(ast)==='activeSession && portalEntry.showGameFirst');
assert(gate,'central entry gate exists as a top-level App guard');
const mobile=statements.find(node=>ts.isIfStatement(node)&&node.expression.getText(ast)==='isMobileExperience && showMobileHome');
const desktop=statements.filter(node=>ts.isReturnStatement(node)).at(-1);
assert(gate.pos<mobile.pos && gate.pos<desktop.pos,'gate precedes both app render branches');
const text=gate.getText(ast);
assert.match(text,/return <GameFirstShell key=\{activeSession.user.id\}/,'owner-keyed boundary');
assert.match(text,/account=\{activeWorkspaceNav === 'account' \? renderWorkspaceSection\(\) : null\}/,'only account workspace enters essential surface');
assert.match(text,/canExitToApp=\{portalEntry.access.canLeaveGameForToday\}/,'board receives same access decision');
assert.match(text,/if \(!portalEntry.access.canLeaveGameForToday\) return/,'exit handler rechecks access');
assert.match(text,/setActiveWorkspaceNav\('planning'\)/,'handover exit selects Today');
assert.match(text,/setShowMobileHome\(true\)/,'handover exit selects mobile Today');
assert.match(text,/setShowAiCoachModal\(false\)/,'discard gated AI launch before handover exit');
assert.match(text,/setIsStarterQuestSheetOpen\(false\)/,'discard gated habit editor before handover exit');
for(const name of ['MobileHabitHome','GoalWorkspace','AiCoach','StarterHabitPicker','GameBoardOverlay'])
  assert(!text.includes('<'+name),'blocked app subtree is not rendered inside gate: '+name);
const beforeGate=statements.filter(node=>ts.isIfStatement(node)&&node.pos<gate.pos);
for(const branch of beforeGate) {
  const returns=[];
  const walk=node=>{if(ts.isReturnStatement(node))returns.push(node);ts.forEachChild(node,walk)};
  walk(branch.thenStatement);
  for(const returned of returns) {
    if(!returned.expression)continue;
    const expression=returned.expression.getText(ast);
    assert(/PeaceBetween|LoadingReadinessScreen|HabitGameLandingShell/.test(expression),'unexpected pre-gate return: '+expression.slice(0,120));
  }
}
const board=await readFile('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx','utf8');
assert.match(board,/\{canExitToApp && <button\s+type="button"\s+className="island-run-board__topbar-menu-item island-run-board__topbar-menu-item--exit"/);
const shell=await readFile('src/features/onboarding/GameFirstShell.tsx','utf8');
assert.match(shell,/onRecover = \(\) => window.location.reload\(\)/);
assert(!/removeItem|localStorage.clear|resetIslandRun|runAccountLifecycleAction/.test(shell),'recover never deletes save data');
assert.match(shell,/createPortal\(overlays, document.body\)/,'allowed modals render at viewport root');
console.log('PASS App AST wiring: one owner-keyed gate before both layouts; only account workspace allowed; guarded Today exit; no recovery deletion; essential overlays portaled.');
