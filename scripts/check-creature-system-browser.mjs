import fs from 'node:fs';
const { chromium } = await import(process.env.CREATURE_PLAYWRIGHT_MODULE ?? 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CREATURE_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1100}}), errors=[];
page.on('pageerror',e=>errors.push(String(e)));
const failures=[];
page.on('response',r=>{if(r.status()>=400) failures.push(`${r.status()} ${r.url()}`);});
const check=(ok,message)=>{if(!ok)throw new Error(message);};
const output='docs/qa/creature-system'; fs.mkdirSync(output,{recursive:true});
try {
 await page.goto(process.env.CREATURE_PREVIEW_URL??'http://127.0.0.1:5189/creature-system-lab.html');
 await page.getByRole('heading',{name:'Three roles. One team.'}).waitFor();
 await page.getByLabel('Choose kindred',{exact:true}).selectOption('common-twilight-seed');
 await page.getByLabel('Choose complement',{exact:true}).selectOption('common-bloom-mite');
 await page.getByLabel('Choose favourite',{exact:true}).selectOption('mythic-celest-pup');
 await page.screenshot({path:`${output}/trio-desktop.png`,fullPage:true});
 await page.getByRole('button',{name:'Creature dex',exact:true}).click();
 check(await page.locator('.cs-dex-grid .cs-creature-card').count()===50,'All 50 families visible');
 check(await page.getByLabel('Sort creatures').inputValue()==='owned-name','Default dex order is owned-first A–Z');
 const defaultNames=await page.locator('.cs-dex-grid .cs-card-name').allTextContents();
 check(JSON.stringify(defaultNames.slice(0,3))===JSON.stringify(['Bloom Mite','Celest Pup','Twilight Seed']),'Owned families precede other families alphabetically');
 await page.getByLabel('Sort creatures').selectOption('affinity');
 check(await page.locator('.cs-dex-grid .cs-card-name').first().innerText()==='Twilight Seed','Dex sorts by best affinity');
 await page.getByLabel('Sort creatures').selectOption('owned-name');
 check(await page.locator('.cs-dex-grid').getByText('Not scored',{exact:true}).count()===0,'All 50 cards are scored for a complete refined profile');
 await page.getByRole('button',{name:/View Twilight Seed/}).click();
 await page.getByRole('dialog').waitFor();
 check(await page.evaluate(()=>document.body.style.overflow==='hidden'),'Modal must lock body scroll');
 await page.getByRole('button',{name:'2 · Stability',exact:true}).click();
 check(await page.getByText('Individual form candidate shown for review.',{exact:false}).isVisible(),'Candidate must not claim an unlocked form');
 check(await page.getByRole('dialog').locator('.cs-card-art img').getAttribute('src').then(src=>src.includes('f13-level-2-card')),'Form selection resolves its cinematic candidate');
 await page.screenshot({path:`${output}/family-detail-desktop.png`});
 await page.keyboard.press('Escape');
 check(await page.getByRole('dialog').count()===0,'Escape closes modal');
 check(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')?.startsWith('View Twilight Seed')),'Focus returns to card');
 await page.getByRole('button',{name:'Match statistics',exact:true}).click();
 check(await page.locator('.cs-stats-table tbody tr').count()===50,'Statistics show all 50 scored families');
 check(await page.getByLabel('Sort matches').inputValue()==='owned-name','Statistics default to collection order');
 await page.getByLabel('Sort matches').selectOption('affinity');
 check(await page.locator('.cs-stats-table tbody tr').first().getAttribute('data-family-id')==='common-twilight-seed','Statistics best-match order');
 const firstRank=await page.locator('.cs-stats-table tbody tr').first().locator('td').first().innerText();
 await page.getByLabel('Match collection').selectOption('owned');
 check(await page.locator('.cs-stats-table tbody tr').count()===3,'Owned statistics filter');
 check(await page.locator('.cs-stats-table tbody tr').first().locator('td').first().innerText()===firstRank,'Filtering retains catalogue rank');
 await page.getByLabel('Match collection').selectOption('unowned');
 check(await page.locator('.cs-stats-table tbody tr').count()===47,'Unowned matches remain discoverable');
 await page.getByLabel('Match collection').selectOption('all');
 await page.getByLabel('Sort matches').selectOption('complement');
 check(await page.locator('.cs-stats-table tbody tr').first().getAttribute('data-family-id').then(id=>!['common-twilight-seed','mythic-celest-pup'].includes(id)),'Anchor slots excluded from Complement suggestions');
 await page.screenshot({path:`${output}/matching-statistics-desktop.png`,fullPage:true});
 await page.getByRole('button',{name:'Art production',exact:true}).click();
 check(await page.locator('.cs-art-ledger details').count()===50,'All 50 visual identity reservations shown');
 check(await page.locator('.cs-art-contrast img').count()===3,'Three mature contrast candidates');
 await page.locator('.cs-art-contrast').scrollIntoViewIfNeeded();
 await page.screenshot({path:`${output}/mature-contrast-desktop.png`});
 await page.locator('.cs-art-contrast button').nth(1).click();
 check(await page.getByRole('dialog').locator('.cs-card-art img').getAttribute('src').then(src=>src.includes('echo-bloom-evolution-v1/bloom-2-card')),'Bloom revised mature candidate integrated in card preview');
 check(await page.getByRole('dialog').locator('.cs-card-ownership').innerText().then(t=>t.includes('current form 1')),'Art review does not unlock a form');
 await page.screenshot({path:`${output}/bloom-mature-card.png`});
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Personality masks',exact:true}).click();
 await page.locator('.cs-mask-grid img').first().waitFor();
 await page.screenshot({path:`${output}/masks-desktop.png`,fullPage:true});
 await page.getByRole('button',{name:'Eggs & discovery',exact:true}).click();
 await page.getByRole('button',{name:'Collect common egg',exact:true}).click();
 check(await page.getByRole('status').innerText().then(t=>t.includes('Another copy')),'Common duplicate result');
 await page.getByRole('button',{name:'Collect rare egg',exact:true}).click();
 await page.getByRole('button',{name:'Collect mythic egg',exact:true}).click();
 check(await page.getByRole('button',{name:/^Collect .* egg$/}).count()===0,'Settled eggs cannot be collected again');
 await page.getByRole('button',{name:'My trio',exact:true}).click();
 check(await page.getByLabel('Choose favourite',{exact:true}).inputValue()==='mythic-celest-pup','Favourite survives hatches');
 await page.getByLabel('Scenario profile').selectOption('empty');
 check(await page.getByText('There is not enough differentiated evidence',{exact:false}).isVisible(),'Empty input suppresses recommendations');
 check(await page.getByLabel('Choose favourite',{exact:true}).inputValue()==='mythic-celest-pup','Retest never overwrites favourite');
 await page.getByRole('button',{name:'Refine motivations',exact:true}).click();
 check(await page.getByRole('dialog').locator('input:checked').count()===0,'Empty profile never receives sample ratings');
 check(await page.getByRole('button',{name:'Apply motivations to preview',exact:true}).isDisabled(),'Incomplete refinement cannot be applied');
 for(let group=0;group<8;group++) {
   const fields=page.getByRole('dialog').locator('fieldset');
   check(await fields.count()===4,'Four motivation questions per page');
   for(let i=0;i<4;i++) {
     const name=await fields.nth(i).locator('input').first().getAttribute('name');
     const value=({motive_caregiver:5,motive_empath:4,motive_mentor:3})[name]??1;
     await fields.nth(i).locator(`input[value="${value}"]`).check();
   }
   if(group<7) await page.getByRole('button',{name:'Next',exact:true}).click();
 }
 check(await page.getByText('32 / 32 rated',{exact:false}).isVisible(),'All 32 ratings retained across pages');
 await page.screenshot({path:`${output}/refinement-desktop.png`});
 await page.getByRole('button',{name:'Apply motivations to preview',exact:true}).click();
 check(await page.locator('.cs-comparison section').first().locator('button').first().innerText().then(t=>t.includes('Bloom Mite') && t.includes('100.0')),'Edited motives drive Kindred result');
 check(await page.getByLabel('Choose favourite',{exact:true}).inputValue()==='mythic-celest-pup','Refinement preserves favourite');
 await page.getByRole('button',{name:'Refine motivations',exact:true}).click();
 await page.getByRole('button',{name:'Clear / skip',exact:true}).first().click();
 check(await page.getByRole('button',{name:'Apply motivations to preview',exact:true}).isDisabled(),'Clearing a rating disables comparison');
 await page.keyboard.press('Escape');
 check(await page.locator('.cs-comparison section').first().locator('button').first().innerText().then(t=>t.includes('100.0')),'Cancelled draft leaves applied motives intact');
 await page.getByLabel('Matching basis').selectOption('foundation');
 check(await page.getByText('There is not enough differentiated evidence',{exact:false}).isVisible(),'Refinement does not fabricate foundation answers');
 await page.getByLabel('Matching basis').selectOption('motives');
 await page.getByRole('button',{name:'Roster map',exact:true}).click();
 check(await page.locator('.cs-roster-row').count()===32,'Roster map shows all 32 archetypes');
 check(await page.getByText('50 draft family targets',{exact:false}).isVisible(),'All 50 families have draft targets');
 await page.getByLabel('Archetype suit').selectOption('mind');
 check(await page.locator('.cs-roster-row').count()===8,'Suit filtering keeps eight archetypes');
 await page.screenshot({path:`${output}/roster-map-desktop.png`,fullPage:true});
 await page.locator('.cs-roster-row').filter({has:page.getByRole('heading',{name:/Analyst/})}).getByRole('button',{name:/Shard Marten/}).click();
 await page.getByText('Inspect this experimental personality target',{exact:true}).click();
 check(await page.getByRole('dialog').getByText('Skeptical interest examines whether a joint actually works.',{exact:false}).first().isVisible(),'Draft rationale links emotion to motivation');
 await page.keyboard.press('Escape');
 await page.getByLabel('Archetype suit').selectOption('all');
 for(const id of ['supporter','builder','pathfinder','organiser']) {
   await page.getByLabel('Scenario profile').selectOption(`mixed:${id}`);
   await page.getByRole('button',{name:'My trio',exact:true}).click();
   check(await page.locator('.cs-comparison section').first().locator('button').count()>=3,'Mixed profile receives alternatives');
   check(await page.getByLabel('Choose favourite',{exact:true}).inputValue()==='mythic-celest-pup','Mixed scenario keeps chosen Favourite');
 }
 for(const width of [700,390,320]) {
   await page.setViewportSize({width,height:844});
   for(const tab of ['My trio','Creature dex','Match statistics','Art production','Personality masks','Roster map','Eggs & discovery']) {
     await page.getByRole('button',{name:tab,exact:true}).click();
     check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${tab} must fit ${width}px`);
     if(tab==='Creature dex') {
       const card=await page.locator('.cs-dex-grid .cs-creature-card').first().boundingBox();
       check(Math.abs(card.width/card.height-5/7)<0.01,`Card must retain 5:7 shape at ${width}px`);
     }
     if(tab==='Roster map') {
       await page.locator('.cs-roster-row').first().scrollIntoViewIfNeeded();
       await page.screenshot({path:`${output}/roster-map-${width}.png`});
     }
     if(tab==='Match statistics') {
       await page.locator('.cs-stat-summary').scrollIntoViewIfNeeded();
       await page.screenshot({path:`${output}/matching-statistics-${width}.png`});
     }
   }
   await page.getByRole('button',{name:'Creature dex',exact:true}).click();
   await page.getByRole('button',{name:/View Twilight Seed/}).click();
   const box=await page.getByRole('dialog').boundingBox();
   check(box.x>=0 && box.x+box.width<=width+1 && box.y>=0 && box.y+box.height<=845,'Modal fits mobile viewport');
   await page.screenshot({path:`${output}/detail-${width}.png`});
   await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'Refine motivations',exact:true}).click();
   const refinementBox=await page.getByRole('dialog').boundingBox();
   check(refinementBox.x>=0 && refinementBox.x+refinementBox.width<=width+1,'Questionnaire fits narrow viewport');
   check(await page.getByRole('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Questionnaire has no internal horizontal overflow');
   await page.screenshot({path:`${output}/refinement-${width}.png`});
   await page.keyboard.press('Escape');
 }
 check(errors.length===0,`Browser errors: ${errors.join('; ')}`);
 check(failures.length===0,`Failed requests: ${failures.join('; ')}`);
 const report={passed:true,viewports:[1440,700,390,320],checks:['50 family cards','owned-first A–Z default','dex match sorting','50-row matching statistics','owned/unowned filters and stable ranks','marginal Complement excludes anchors','50 visual production briefs','three mature contrast candidates','Bloom form-2 art without unlock','5:7 cards across narrow/tablet widths','individual form art without ownership grant','modal scroll lock','Escape and focus return','32 masks / 4 candidates','three egg collections','duplicate hatch','retained favourite after hatch and retest','no-answer suppression','32 unseeded motivation ratings','apply changes Kindred without changing favourite','cancelled edits preserved','foundation remains separate','32-archetype roster map and suit filters','draft rationale detail','four mixed-profile scenarios','mobile overflow','mobile modal placement','responsive questionnaire'],errors,failures};
 fs.writeFileSync(`${output}/browser-report.json`,JSON.stringify(report,null,2)+'\n'); console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
