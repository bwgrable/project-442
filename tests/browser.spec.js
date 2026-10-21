import {test,expect} from '@playwright/test';
import {ready,snapshot,selectMesh,orient,startDrag,moveToFit,release,connect,assemble} from './helpers.mjs';

test('direct desktop drag assembles the visible pile and preserves connected motion',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
 expect((await snapshot(page)).state.selected).toBeNull();await expect(page.locator('#fit-feedback')).toBeHidden();
 await selectMesh(page,'crank');expect((await snapshot(page)).state.parts.crank.status).toBe('loose');
 await assemble(page);expect((await snapshot(page)).state.hints).toEqual({});await expect(page.locator('#motion-controls')).toBeVisible();
 for(const angle of [0,45,90,180,270,360]){await page.locator('#angle').fill(String(angle));const p=(await snapshot(page)).positions;expect(Math.hypot(...p.rodSmall.map((v,i)=>v-p.piston[i]))).toBeLessThan(1e-9);expect(Math.hypot(...p.rodBig.map((v,i)=>v-p.rodCap[i]))).toBeLessThan(1e-9);expect(Math.hypot(...p.rodSmall.map((v,i)=>v-p.rodBig[i]))).toBeCloseTo(1.45,9);}
 await expect(page.locator('#completion')).toBeVisible();await page.locator('#play').click();expect((await snapshot(page)).state.playing).toBe(true);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});expect((await snapshot(page)).state.playing).toBe(false);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});expect((await snapshot(page)).state.playing).toBe(false);
 await page.locator('[data-part="mainCaps"]').click();await page.locator('canvas').focus();await page.keyboard.press('Space');expect((await snapshot(page)).state.drag.part).toBe('mainCaps');await page.locator('#undo').click();expect(Object.values((await snapshot(page)).state.parts).every(p=>p.status==='joined')).toBe(true);
 await page.locator('[data-part="mainCaps"]').click();await page.locator('#remove').click();let s=(await snapshot(page)).state;expect(s.parts.crank.status).toBe('joined');expect(s.parts.piston.status).toBe('loose');expect(s.parts.rodCap.status).toBe('loose');expect(s.angle).toBe(0);await expect(page.locator('#motion-controls')).toBeHidden();
 await page.locator('#undo').click();expect((await snapshot(page)).state.tested).toBe(true);await page.locator('#remove').click();await page.locator('#home-view').click();for(const p of ['mainCaps','piston','rodCap'])await connect(page,p);
 await page.locator('#reset').click();s=(await snapshot(page)).state;expect(s.selected).toBeNull();expect(s.hints).toEqual({});expect(s.history).toEqual([]);expect(s.tested).toBe(false);expect(Object.values(s.parts).every(p=>p.status==='loose')).toBe(true);expect(errors).toEqual([]);
});

test('wrong orientation, fit and order keep parts recoverable; cancel restores a move',async({page})=>{
 await ready(page);let d=await startDrag(page,'crank');await moveToFit(page,'crank',d);await expect(page.locator('#fit-feedback')).toContainText('Roll');await release(page,d);expect((await snapshot(page)).state.parts.crank.status).toBe('loose');
 await page.locator('#recover').click();await orient(page,'piston');d=await startDrag(page,'piston');await moveToFit(page,'piston',d);await expect(page.locator('#fit-feedback')).toContainText('first');await release(page,d);expect((await snapshot(page)).state.parts.piston.status).toBe('loose');
 await page.locator('#recover').click();const before=(await snapshot(page)).state.parts;d=await startDrag(page,'rodCap');await page.mouse.move(d.p.x+60,d.p.y+30,{steps:4});expect((await snapshot(page)).state.parts).not.toEqual(before);await page.keyboard.press('Escape');await page.mouse.up();expect((await snapshot(page)).state.parts).toEqual(before);
 d=await startDrag(page,'crank');await page.mouse.move(d.p.x-35,d.p.y+30,{steps:4});await release(page,d);expect((await snapshot(page)).state.parts.crank.status).toBe('loose');await expect(page.locator('#feedback')).toContainText('closer');await page.locator('#recover').click();await page.locator('#home-view').click();expect(await page.evaluate(()=>window.__PROJECT442__.pickPoint('crank'))).not.toBeNull();
});

test('phone touch directly drags every mesh; second finger cancels and landscape stays usable',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});const page=await context.newPage();await ready(page);
 const capCenter=await page.evaluate(()=>window.__PROJECT442__.screenCenter('rodCap'));await page.touchscreen.tap(capCenter.x+19,capCenter.y);expect((await snapshot(page)).state.selected).toBe('rodCap');expect((await snapshot(page)).state.parts.rodCap.status).toBe('loose');
 let d=await startDrag(page,'crank',true);const before=d.before;await d.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:d.p.x+20,y:d.p.y,id:0},{x:d.p.x+55,y:d.p.y+20,id:1}]});await d.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect((await snapshot(page)).state.drag).toBeNull();expect((await snapshot(page)).state.parts.crank).toEqual(before);
 // A fresh camera gesture must retain both fingers even if finger two lands on a mesh.
 const rect=await page.locator('canvas').boundingBox(),point=await page.evaluate(()=>window.__PROJECT442__.pickPoint('crank'));
 const cdp=await context.newCDPSession(page),partsBefore=(await snapshot(page)).state.parts,cameraBefore=(await snapshot(page)).camera;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+12,y:rect.y+115,id:0}]});
 expect((await snapshot(page)).gesture).toBeNull();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+12,y:rect.y+115,id:0},{x:point.x,y:point.y,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+14,y:rect.y+120,id:0},{x:point.x+20,y:point.y+10,id:1}]});
 expect((await snapshot(page)).state.drag).toBeNull();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect((await snapshot(page)).state.parts).toEqual(partsBefore);expect((await snapshot(page)).camera).not.toEqual(cameraBefore);await page.locator('#home-view').click();
 await assemble(page,true);await page.locator('#step').tap();expect((await snapshot(page)).state.angle).toBeCloseTo(Math.PI/12);await page.locator('#angle').fill('360');expect((await snapshot(page)).state.tested).toBe(true);
 await page.setViewportSize({width:844,height:390});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('#home-view').click();await page.locator('#reset').click();expect((await snapshot(page)).state.drag).toBeNull();await context.close();
});

test('requested hints and keyboard fallback use the same spatial fit',async({page})=>{
 await ready(page);for(let i=1;i<=4;i++){await page.locator('#hint').click();const s=(await snapshot(page)).state;expect(s.hints.crank).toBe(i);expect(s.selected).toBeNull();expect(s.parts.crank.status).toBe('loose');}await expect(page.locator('.hinted')).toHaveCount(1);
 await page.locator('#alternative summary').click();
 for(const [id,xMoves,zMoves,rollMoves] of [['crank',11,-1,-2],['mainCaps',4,-12,1],['piston',-6,-2,-2],['rodCap',-11,11,-3]]){
  await page.locator(`[data-part="${id}"]`).click();await page.locator('#pickup').click();
  for(let i=0;i<Math.abs(rollMoves);i++)await page.keyboard.press(rollMoves<0?'q':'e');
  for(let i=0;i<Math.abs(xMoves);i++)await page.keyboard.press(xMoves<0?'ArrowLeft':'ArrowRight');
  for(let i=0;i<Math.abs(zMoves);i++)await page.keyboard.press(zMoves<0?'ArrowUp':'ArrowDown');
  await page.keyboard.press('Enter');expect((await snapshot(page)).state.parts[id].status).toBe('joined');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#play')).toBeDisabled();await page.locator('#step').click();await page.locator('#angle').fill('360');expect((await snapshot(page)).state.tested).toBe(true);await page.locator('#reset').click();await expect(page.locator('.hinted')).toHaveCount(0);
});

test('resize, visibility and pointer cancellation restore pending placement',async({page})=>{
 await ready(page);
 // Switching from a fallback-held crank to a directly dragged piston cancels the crank transaction.
 await page.locator('[data-part="crank"]').click();await page.locator('canvas').focus();await page.keyboard.press('Space');await page.keyboard.press('ArrowRight');
 const crankBefore=(await snapshot(page)).state.drag.before.parts.crank;
 let switched=await startDrag(page,'piston');expect((await snapshot(page)).state.parts.crank).toEqual(crankBefore);await page.keyboard.press('Escape');await page.mouse.up();
 await orient(page,'crank');let before=(await snapshot(page)).state.parts;let d=await startDrag(page,'crank');await moveToFit(page,'crank',d);await page.setViewportSize({width:1100,height:900});await expect.poll(async()=>(await snapshot(page)).state.drag).toBeNull();await page.mouse.up();expect((await snapshot(page)).state.parts).toEqual(before);
 d=await startDrag(page,'piston');await page.locator('canvas').evaluate(el=>el.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true})));await page.mouse.up();expect((await snapshot(page)).state.drag).toBeNull();
 d=await startDrag(page,'rodCap');await page.locator('canvas').evaluate(el=>el.dispatchEvent(new PointerEvent('lostpointercapture',{pointerId:1,bubbles:true})));await page.mouse.up();expect((await snapshot(page)).state.drag).toBeNull();
 d=await startDrag(page,'crank');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.mouse.up();expect((await snapshot(page)).state.drag).toBeNull();expect((await snapshot(page)).state.parts).toEqual(before);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});expect((await snapshot(page)).state.playing).toBe(false);
});

test('WebGL context loss and initialization failure provide recovery',async({page})=>{
 await ready(page);await page.locator('canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#reset')).toBeDisabled();await expect(page.locator('#retry')).toBeEnabled();
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:original.call(this,type,...args);};});await page.reload();await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#retry')).toBeEnabled();
});

test('failed application bundle has independent recovery',async({page})=>{
 await page.route('**/assets/*.js',route=>route.abort('failed'));await page.goto('/');await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#fallback-detail')).toContainText('files could not load');await expect(page.locator('#retry')).toBeEnabled();
});
