import {test,expect} from '@playwright/test';
const snap=page=>page.evaluate(()=>window.__PILOT442__.snapshot());
async function ready(page){await page.goto('/');await page.locator('[data-ready=true]').waitFor({timeout:45000});}
async function press(page,id,touch=false){const button=page.locator('[data-part="'+id+'"]');if(touch)await button.tap();else await button.click();}
function joints(s){
 expect(Math.hypot(...s.positions.rodSmall.map((v,i)=>v-s.positions.piston[i]))).toBeLessThan(1e-8);
 expect(s.positions.pin).toEqual(s.positions.piston);
 expect(Math.hypot(...s.positions.rodSmall.map((v,i)=>v-s.positions.rodBig[i]))).toBeCloseTo(1.45,8);
 expect(s.positions.cap).toEqual(s.positions.rodBig);
}
for(const touch of [false,true])test((touch?'phone touch':'desktop mouse')+' chooses order, explains dependencies, installs, inspects, moves and replays',async({browser})=>{
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:1100},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 expect((await snap(page)).state.installed).toEqual({crank:false,piston:false,rod:false,pin:false});await expect(page.locator('#hint-content')).toBeHidden();await expect(page.locator('#play')).toBeDisabled();
 await press(page,'pin',touch);expect(Object.values((await snap(page)).state.installed).some(Boolean)).toBe(false);await expect(page.locator('#feedback')).toContainText('needs');await expect(page.locator('#scene-kicker')).toHaveText('CONNECTION NOT READY');await expect(page.locator('#scene-description')).toContainText('needs');
 await page.locator('#hint').click();await expect(page.locator('#hint-content')).toContainText('Still needed');await page.locator('#hint').click();await expect(page.locator('#hint-content')).toBeHidden();
 await press(page,'rod',touch);expect(Object.values((await snap(page)).state.installed).some(Boolean)).toBe(false);
 for(const id of touch?['crank','piston','rod','pin']:['piston','crank','rod','pin']){
  await press(page,id,touch);expect((await snap(page)).state.installed[id]).toBe(true);await expect(page.locator('#status-'+id)).toContainText('Added');
  const before=(await snap(page)).state.installed;await press(page,id,touch);expect((await snap(page)).state.installed).toEqual(before);
 }
 let s=await snap(page);joints(s);expect(Object.values(s.visible).every(Boolean)).toBe(true);await expect(page.locator('#play')).toBeEnabled();expect(s.state.hint).toBe(false);
 await press(page,'piston',touch);await page.locator('#inspect').click();s=await snap(page);expect(s.inspection).toBe('piston');await expect(page.locator('#side-view')).toBeDisabled();expect(s.visible).toEqual({block:false,crank:false,piston:true,rod:false,pin:false});await expect(page.locator('#play')).toBeDisabled();await expect(page.locator('.feature-label')).toHaveCount(2);
 const boxes=await page.locator('.feature-label').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));expect(boxes[0].y+boxes[0].h<=boxes[1].y||boxes[1].y+boxes[1].h<=boxes[0].y||boxes[0].x+boxes[0].w<=boxes[1].x||boxes[1].x+boxes[1].w<=boxes[0].x).toBe(true);
 await page.locator('#back-view').click();expect((await snap(page)).inspection).toBeNull();
 for(const angle of [0,45,90,135,180,225,270,315,360]){await page.locator('#angle').fill(String(angle));s=await snap(page);joints(s);expect(s.state.angle).toBeCloseTo((angle%360)*Math.PI/180,8);}
 await page.locator('#play').click();await expect.poll(async()=>(await snap(page)).state.angle).toBeGreaterThan(.05);await page.locator('#play').click();expect((await snap(page)).state.playing).toBe(false);
 await page.locator('#section').click();expect((await snap(page)).section).toBe(false);await page.locator('#section').click();
 await page.locator('#reset').click();s=await snap(page);expect(s.state.installed).toEqual({crank:false,piston:false,rod:false,pin:false});expect(s.state.angle).toBe(0);expect(s.state.hint).toBe(false);expect(s.state.selected).toBeNull();expect(s.inspection).toBeNull();
 for(const id of touch?['piston','crank','rod','pin']:['crank','piston','rod','pin'])await press(page,id,touch);
 await page.locator('#step').click();s=await snap(page);joints(s);expect(s.state.angle).toBeCloseTo(Math.PI/12,8);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const targets=await page.locator('button').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({id:el.id||el.dataset.part,h:el.getBoundingClientRect().height})));expect(targets.filter(t=>t.h<44)).toEqual([]);
 expect(errors).toEqual([]);await context.close();
});
test('keyboard, reduced motion, background pause and landscape keep the same assembly',async({page})=>{
 await ready(page);await page.emulateMedia({reducedMotion:'reduce'});
 for(const id of ['piston','crank','rod','pin']){await page.locator('[data-part="'+id+'"]').focus();await page.keyboard.press('Enter');}
 await expect(page.locator('#play')).toBeDisabled();await page.locator('#step').focus();await page.keyboard.press('Enter');joints(await snap(page));await expect(page.locator('#motion-explanation')).toContainText('Reduced motion');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#play').click();expect((await snap(page)).state.playing).toBe(true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});expect((await snap(page)).state.playing).toBe(false);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 const before=(await snap(page)).state.installed;await page.setViewportSize({width:844,height:390});expect((await snap(page)).state.installed).toEqual(before);await page.locator('#side-view').click();expect((await snap(page)).side).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('graphics loss and failed application download offer recovery',async({browser})=>{
 const c=await browser.newContext();const page=await c.newPage();await ready(page);
 await page.locator('canvas').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#reset')).toBeDisabled();await expect(page.locator('#retry')).toBeEnabled();expect((await snap(page)).state.playing).toBe(false);
 const broken=await c.newPage();await broken.route('**/assets/pilot-*.js',route=>route.abort('failed'));await broken.goto('/');await expect(broken.locator('#fallback')).toBeVisible();await expect(broken.locator('#fallback-detail')).toContainText('files could not load');await expect(broken.locator('#retry')).toBeEnabled();await c.close();
});
test('historical Prototype005 entry remains available',async({page})=>{
 await page.goto('/prototype-005.html');await page.locator('[data-ready=true]').waitFor({timeout:45000});await expect(page.locator('h1')).toContainText('Make a connection');expect(await page.evaluate(()=>window.__PROJECT442__.snapshot().state.parts.rod.roll)).toBe(30);
});
