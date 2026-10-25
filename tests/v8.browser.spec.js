import {test,expect} from '@playwright/test';
const ids=['A1','A2','A3','A4','B1','B2','B3','B4'];
const snap=page=>page.evaluate(()=>window.__V8442__.snapshot());
async function ready(page){await page.goto('/');await page.locator('[data-ready=true]').waitFor({timeout:45000});}
async function hit(page,selector,touch=false){if(touch)await page.locator(selector).tap();else await page.locator(selector).click();}
const select=(page,id,touch=false)=>hit(page,'[data-part="'+id+'"]',touch);
const focus=(page,id,touch=false)=>hit(page,'[data-cylinder="'+id+'"]',touch);
function joined(s,id){const u=s.units[id];expect(Math.hypot(...u.piston.map((v,i)=>v-u.rodSmall[i]))).toBeLessThan(1e-8);expect(Math.hypot(...u.pin.map((v,i)=>v-u.piston[i]))).toBeLessThan(1e-8);expect(Math.hypot(...u.cap.map((v,i)=>v-u.rodBig[i]))).toBeLessThan(1e-8);expect(Math.hypot(...u.piston.map((v,i)=>v-u.rodBig[i]))).toBeCloseTo(1.45,8);expect(u.piston[0]).toBeCloseTo((id[0]==='A'?1:-1)*u.piston[1],8);}
for(const touch of [false,true])test((touch?'touch':'mouse')+' builds all eight in alternate order, explains blocks, inspects, moves and replays',async({browser})=>{
 test.setTimeout(300000);const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:1100},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#hint-content')).toBeHidden();await select(page,'crank',touch);expect((await snap(page)).state.installed.crank).toBe(false);await expect(page.locator('#scene-description')).toContainText('bearings');
 await select(page,'pan',touch);await expect(page.locator('#scene-kicker')).toHaveText('CONNECTION NOT READY');expect((await snap(page)).state.installed.pan).toBe(false);await hit(page,'#hint',touch);await expect(page.locator('#hint-content')).toContainText('Still needed');await hit(page,'#hint',touch);
 const before=(await snap(page)).state.installed;await focus(page,'B4',touch);await expect(page.locator('.cylinder-label')).toHaveCount(4);await expect(page.locator('.cylinder-label.is-active')).toHaveText('B4');expect((await snap(page)).state.installed).toEqual(before);await select(page,'rod_B4',touch);expect((await snap(page)).state.installed.rod_B4).toBe(false);
 if(touch){await select(page,'pump',touch);for(const id of [...ids].reverse()){await focus(page,id,touch);await select(page,'piston_'+id,touch);}}
 for(const id of ['bearings','crank','mainCaps'])await select(page,id,touch);
 await focus(page,'A1',touch);await select(page,'piston_A1',touch);await select(page,'rod_A1',touch);await focus(page,'B4',touch);await select(page,'piston_B4',touch);
 let s=await snap(page),rest=s.units.B4.piston;await expect(page.locator('#play')).toBeEnabled();await page.locator('#angle').fill('90');s=await snap(page);joined(s,'A1');expect(s.units.B4.piston).toEqual(rest);expect(s.crankAngle).toBeCloseTo(-Math.PI/2,8);
 for(const id of touch?[...ids].reverse():ids){await focus(page,id,touch);await select(page,'piston_'+id,touch);await select(page,'rod_'+id,touch);}
 await select(page,'pan',touch);if(!touch){expect((await snap(page)).state.installed.pan).toBe(false);await expect(page.locator('#scene-description')).toContainText('pump');await select(page,'pump',touch);await select(page,'pan',touch);}
 s=await snap(page);expect(Object.values(s.state.installed).filter(Boolean)).toHaveLength(21);await expect(page.locator('#cylinder-count')).toHaveText('8 / 8 connected');expect(s.state.hint).toBe(false);
 const complete=s.state.installed;await select(page,'pan',touch);expect((await snap(page)).state.installed).toEqual(complete);
 for(const angle of [0,45,90,135,180,225,270,315,360]){await page.locator('#angle').fill(String(angle));s=await snap(page);for(const id of ids)joined(s,id);expect(s.crankAngle).toBeCloseTo(-(angle%360)*Math.PI/180,8);}
 await hit(page,'#play',touch);await expect.poll(async()=>(await snap(page)).state.angle).toBeGreaterThan(.05);await hit(page,'#play',touch);expect((await snap(page)).state.playing).toBe(false);
 for(const view of ['A','B','under','both']){await hit(page,'[data-view="'+view+'"]',touch);expect((await snap(page)).view).toBe(view);}
 expect((await snap(page)).sectionVisibleMeshes).toBe(0);await hit(page,'#section',touch);expect((await snap(page)).sectionVisibleMeshes).toBeGreaterThan(0);await hit(page,'#section',touch);expect((await snap(page)).sectionVisibleMeshes).toBe(0);
 for(const id of ['rod_B4','pan','pump']){if(id.startsWith('rod_'))await focus(page,'B4',touch);await select(page,id,touch);await hit(page,'#inspect',touch);s=await snap(page);expect(s.inspection).toBe(id);expect(Object.entries(s.visible).filter(([,v])=>v).map(([k])=>k)).toEqual([id]);await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('#section')).toBeDisabled();await hit(page,'#back-view',touch);expect((await snap(page)).state.installed).toEqual(complete);}
 await hit(page,'#reset',touch);s=await snap(page);expect(Object.values(s.state.installed).some(Boolean)).toBe(false);expect(s.state.angle).toBe(0);expect(s.state.hint).toBe(false);expect(s.state.activeCylinder).toBe('A1');
 await select(page,'pump',touch);await focus(page,'B3',touch);await select(page,'piston_B3',touch);for(const id of ['bearings','crank','mainCaps'])await select(page,id,touch);await select(page,'rod_B3',touch);await hit(page,'#step',touch);joined(await snap(page),'B3');expect((await snap(page)).state.angle).toBeCloseTo(Math.PI/12,8);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const bad=await page.locator('button').evaluateAll(els=>els.filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<44).map(e=>e.id||e.dataset.part));expect(bad).toEqual([]);expect(errors).toEqual([]);await context.close();
});
test('keyboard, reduced motion, background pause, resize and landscape preserve state',async({page})=>{
 await ready(page);await page.emulateMedia({reducedMotion:'reduce'});for(const id of ['bearings','crank','mainCaps']){await page.locator('[data-part='+id+']').focus();await page.keyboard.press('Enter');}
 await page.locator('[data-cylinder=B2]').focus();await page.keyboard.press('Enter');for(const id of ['piston_B2','rod_B2']){await page.locator('[data-part='+id+']').focus();await page.keyboard.press('Enter');}
 await expect(page.locator('#play')).toBeDisabled();await page.locator('#step').focus();await page.keyboard.press('Enter');joined(await snap(page),'B2');await expect(page.locator('#motion-explanation')).toContainText('Reduced motion');await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#play').click();expect((await snap(page)).state.playing).toBe(true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});expect((await snap(page)).state.playing).toBe(false);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 const installed=(await snap(page)).state.installed;await page.setViewportSize({width:844,height:390});await page.locator('[data-view=B]').click();expect((await snap(page)).state.installed).toEqual(installed);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('WebGL loss and failed module retain recovery',async({browser})=>{
 const context=await browser.newContext(),page=await context.newPage();await ready(page);await page.locator('canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#reset')).toBeDisabled();await expect(page.locator('#retry')).toBeEnabled();
 const broken=await context.newPage();await broken.route('**/assets/v8-*.js',route=>route.abort('failed'));await broken.goto('/');await expect(broken.locator('#fallback')).toBeVisible();await expect(broken.locator('#fallback-detail')).toContainText('files could not load');await context.close();
});
test('Pilot006 and Prototype005 entries remain runnable',async({page})=>{
 await page.goto('/pilot-006.html');await page.locator('[data-ready=true]').waitFor();await expect(page.locator('h1')).toContainText('Know the parts');for(const id of ['piston','crank','rod','pin'])await page.locator('[data-part='+id+']').click();expect(await page.evaluate(()=>Object.values(window.__PILOT442__.snapshot().state.installed).every(Boolean))).toBe(true);
 await page.goto('/prototype-005.html');await page.locator('[data-ready=true]').waitFor();await expect(page.locator('h1')).toContainText('Make a connection');expect(await page.evaluate(()=>window.__PROJECT442__.snapshot().state.parts.rod.roll)).toBe(30);
});
