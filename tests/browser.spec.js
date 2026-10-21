import {test,expect} from '@playwright/test';
import {ready,snapshot,selectMesh,startDrag,moveScreen,moveToFit,moveTo,release,fitPart,insertPin,jointCenters,buildUnit,installUnit} from './helpers.mjs';

for(const touch of [false,true])test(`${touch?'phone touch':'desktop mouse'} builds at relocated piston, inserts pin, carries and pivots unit, installs and turns`,async({browser})=>{
 test.setTimeout(360000); // Two complete builds plus recovery on the cloud software renderer.
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:1080},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);await expect(page.locator('#fit-feedback')).toBeHidden();
 await buildUnit(page,touch);const before=await snapshot(page);await page.locator('#pivot').fill('45');const swung=await snapshot(page);jointCenters(swung);expect(swung.positions.rodBig).not.toEqual(before.positions.rodBig);expect(swung.positions.piston).toEqual(before.positions.piston);expect(swung.positions.pin).toEqual(before.positions.pin);
 const drag=await startDrag(page,'rod',touch);expect((await snapshot(page)).state.drag.part).toBe('piston');await moveTo(page,drag,1.2,1.1);jointCenters(await snapshot(page));await release(page,drag);jointCenters(await snapshot(page));expect((await snapshot(page)).state.parts.piston.x).toBeCloseTo(1.2,6);
 await installUnit(page,touch);expect((await snapshot(page)).state.hints).toEqual({});await page.locator('#motion-view').click();
 for(const angle of [0,45,90,180,270,360]){await page.locator('#angle').fill(String(angle));const s=await snapshot(page);jointCenters(s);expect(Math.hypot(...s.positions.rodBig.map((v,i)=>v-s.positions.rodCap[i]))).toBeLessThan(1e-8);}
 await expect(page.locator('#completion')).toBeVisible();const complete=(await snapshot(page)).state;
 const lifted=await startDrag(page,'piston',touch);expect((await snapshot(page)).state.parts.piston.status).toBe('loose');expect((await snapshot(page)).state.parts.rodCap.status).toBe('loose');await page.keyboard.press('Escape');await release(page,lifted);expect((await snapshot(page)).state.parts).toEqual(complete.parts);expect((await snapshot(page)).state.angle).toBe(complete.angle);
 await page.locator('#unpin').click();let s=(await snapshot(page)).state;expect(s.parts.pin.status).toBe('loose');expect(s.parts.rod.status).toBe('fitted');expect(s.parts.piston.status).toBe('loose');expect(s.parts.rodCap.status).toBe('loose');expect(s.angle).toBe(0);
 await page.locator('#home-view').click();await fitPart(page,'pin',touch);await insertPin(page,touch);jointCenters(await snapshot(page));await installUnit(page,touch);
 await page.locator('#reset').click();s=(await snapshot(page)).state;expect(s.history).toEqual([]);expect(s.hints).toEqual({});expect(Object.values(s.parts).every(p=>p.status==='loose')).toBe(true);
 if(touch){await page.setViewportSize({width:844,height:390});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('#home-view').click();}
 expect(errors).toEqual([]);await context.close();
});

test('wrong order, orientation, unpinned movement and partial insertion stay recoverable',async({page})=>{
 await ready(page);let d=await startDrag(page,'pin');await moveToFit(page,'pin',d);await release(page,d);expect((await snapshot(page)).state.parts.pin.status).toBe('loose');await page.locator('#recover').click();
 await selectMesh(page,'rod');for(let i=0;i<4;i++)await page.locator('#rotate-right').click();d=await startDrag(page,'rod');await moveToFit(page,'rod',d);await release(page,d);expect((await snapshot(page)).state.parts.rod.status).toBe('loose');await expect(page.locator('#fit-feedback')).toContainText('25°');await page.locator('#recover').click();
 await fitPart(page,'rod');let before=(await snapshot(page)).state.parts;d=await startDrag(page,'piston');await moveTo(page,d,2,1.5);expect((await snapshot(page)).state.parts.rod.status).toBe('loose');expect((await snapshot(page)).state.parts.rod.x).toBe(before.rod.x);await page.keyboard.press('Escape');await release(page,d);expect((await snapshot(page)).state.parts).toEqual(before);
 await page.locator('#engine-view').click();d=await startDrag(page,'piston');await moveToFit(page,'piston',d);await release(page,d);expect((await snapshot(page)).state.parts.piston.status).toBe('loose');await expect(page.locator('#feedback')).toContainText('wrist pin');await page.locator('#undo').click();await page.locator('#home-view').click();
 await fitPart(page,'pin');await insertPin(page,false,.45);expect((await snapshot(page)).state.parts.pin.status).toBe('aligned');expect((await snapshot(page)).state.parts.pin.depth).toBeCloseTo(.45,5);await expect(page.locator('#joint-controls')).toBeHidden();
 before=(await snapshot(page)).state.parts;d=await startDrag(page,'pin');await moveScreen(page,d,await page.evaluate(()=>window.__PROJECT442__.insertionPoint(.8)));await page.keyboard.press('Escape');await release(page,d);expect((await snapshot(page)).state.parts).toEqual(before);
 await insertPin(page);jointCenters(await snapshot(page));await page.locator('#undo').click();expect((await snapshot(page)).state.parts.pin.status).toBe('aligned');await insertPin(page);await page.locator('#pivot').fill('45');await page.locator('#engine-view').click();d=await startDrag(page,'piston');await moveToFit(page,'piston',d);await release(page,d);expect((await snapshot(page)).state.parts.piston.status).toBe('loose');await expect(page.locator('#feedback')).toContainText('Swing');await page.locator('#undo').click();
});

test('touch camera separation, 44px pin target, cancellation and landscape',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});const page=await context.newPage();await ready(page);
 const center=await page.evaluate(()=>window.__PROJECT442__.screenCenter('pin'));await page.touchscreen.tap(center.x+19,center.y);expect((await snapshot(page)).state.selected).toBe('pin');
 let d=await startDrag(page,'piston',true);await d.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:d.p.x+20,y:d.p.y,id:0},{x:d.p.x+55,y:d.p.y+20,id:1}]});await d.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect((await snapshot(page)).state.drag).toBeNull();expect((await snapshot(page)).state.parts).toEqual(d.before.parts);
 const rect=await page.locator('canvas').boundingBox(),point=await page.evaluate(()=>window.__PROJECT442__.pickPoint('piston')),cdp=await context.newCDPSession(page),before=await snapshot(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+12,y:rect.y+115,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+12,y:rect.y+115,id:0},{x:point.x,y:point.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+14,y:rect.y+120,id:0},{x:point.x+25,y:point.y+15,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect((await snapshot(page)).state.parts).toEqual(before.state.parts);expect((await snapshot(page)).camera).not.toEqual(before.camera);
 await page.locator('#home-view').click();await page.setViewportSize({width:844,height:390});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});

test('keyboard fallback and optional progressive hints reach the same joint and motion',async({page})=>{
 await ready(page);for(let i=1;i<=4;i++){await page.locator('#hint').click();expect((await snapshot(page)).state.hints.rod).toBe(i);expect((await snapshot(page)).state.selected).toBeNull();}await expect(page.locator('.hinted')).toHaveCount(1);
 async function move(id,target,roll=0){await page.locator(`[data-part="${id}"]`).click();await page.locator('canvas').focus();await page.keyboard.press('Space');let s=(await snapshot(page)).state;for(let i=0;i<Math.abs(s.parts[id].roll-roll)/15;i++)await page.keyboard.press(s.parts[id].roll>roll?'q':'e');for(const [axis,negative,positive] of [['x','ArrowLeft','ArrowRight'],['z','ArrowUp','ArrowDown']]){const n=Math.round((target[axis]-s.parts[id][axis])/.2);for(let i=0;i<Math.abs(n);i++)await page.keyboard.press(n<0?negative:positive);}await page.keyboard.press('Enter');}
 await move('rod',{x:1.4,z:1});expect((await snapshot(page)).state.parts.rod.status).toBe('fitted');await move('pin',{x:1.4,z:1});expect((await snapshot(page)).state.parts.pin.status).toBe('aligned');await page.locator('canvas').focus();await page.keyboard.press('Space');for(let i=0;i<9;i++)await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');expect((await snapshot(page)).state.parts.pin.status).toBe('pinned');jointCenters(await snapshot(page));
 await move('piston',{x:-1.1,z:-1.3});expect((await snapshot(page)).state.parts.piston.status).toBe('installed');await move('rodCap',{x:-2.3,z:-1.3});expect((await snapshot(page)).state.parts.rodCap.status).toBe('joined');await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#play')).toBeDisabled();await page.locator('#step').click();await page.locator('#angle').fill('360');expect((await snapshot(page)).state.tested).toBe(true);
});

test('resize, capture loss, background and fallback switching cancel exact transactions',async({page})=>{
 await ready(page);await page.locator('[data-part="pin"]').click();await page.locator('canvas').focus();await page.keyboard.press('q');expect((await snapshot(page)).state.parts.pin.roll).toBe(0);await page.keyboard.press('Space');await page.keyboard.press('ArrowRight');const saved=(await snapshot(page)).state.drag.before.parts.pin;
 let d=await startDrag(page,'piston');expect((await snapshot(page)).state.parts.pin).toEqual(saved);await page.locator('#undo').focus();await page.keyboard.press('Enter');await page.mouse.up();expect((await snapshot(page)).state.parts).toEqual(d.before.drag.before.parts);expect((await snapshot(page)).state.history.length).toBe(0);
 const before=(await snapshot(page)).state.parts;d=await startDrag(page,'rod');await page.setViewportSize({width:1100,height:900});await expect.poll(async()=>(await snapshot(page)).state.drag).toBeNull();await page.mouse.up();expect((await snapshot(page)).state.parts).toEqual(before);
 for(const type of ['pointercancel','lostpointercapture']){d=await startDrag(page,'piston');await page.locator('canvas').evaluate((el,type)=>el.dispatchEvent(new PointerEvent(type,{pointerId:1,bubbles:true})),type);await page.mouse.up();expect((await snapshot(page)).state.drag).toBeNull();expect((await snapshot(page)).state.parts).toEqual(before);}
 d=await startDrag(page,'piston');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.mouse.up();expect((await snapshot(page)).state.parts).toEqual(before);expect((await snapshot(page)).state.playing).toBe(false);
});

test('WebGL context loss and initialization failure provide recovery',async({page})=>{
 await ready(page);await page.locator('canvas').evaluate(el=>el.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#reset')).toBeDisabled();await expect(page.locator('#retry')).toBeEnabled();await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:original.call(this,type,...args);};});await page.reload();await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#retry')).toBeEnabled();
});
test('failed application bundle has independent recovery',async({page})=>{await page.route('**/assets/*.js',route=>route.abort('failed'));await page.goto('/');await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#fallback-detail')).toContainText('files could not load');await expect(page.locator('#retry')).toBeEnabled();});

for(const touch of [false,true])test(`${touch?'touch':'mouse'} visually aligned initial rod fits without hidden roll correction`,async({browser})=>{
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:1080},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});const page=await context.newPage();await ready(page);
 let d=await startDrag(page,'piston',touch);await moveTo(page,d,1.8,1.4);await release(page,d);
 d=await startDrag(page,'rod',touch,true);let cursor={x:d.p.x+8,y:d.p.y+2};
 // Align the actual projected small eye with the actual piston joint, without reading fit targets or changing roll.
 for(let i=0;i<4;i++){
  const [eye,bore]=await page.evaluate(()=>[window.__PROJECT442__.jointScreen('rod'),window.__PROJECT442__.jointScreen('piston')]);
  cursor={x:cursor.x+bore.x-eye.x,y:cursor.y+bore.y-eye.y};await moveScreen(page,d,cursor);await page.evaluate(()=>new Promise(requestAnimationFrame));
 }
 const before=await snapshot(page);expect(before.state.parts.rod.roll).toBe(30);await expect(page.locator('#fit-feedback')).toContainText('Release');
 const direction=before.positions.rodBig.map((v,i)=>v-before.positions.rodSmall[i]);await release(page,d);let s=await snapshot(page);expect(s.state.parts.rod.status).toBe('fitted');expect(s.state.pivot).toBe(30);expect(s.state.parts.pin.status).toBe('loose');
 expect(Math.hypot(...s.positions.rodBig.map((v,i)=>v-s.positions.rodSmall[i]-direction[i]))).toBeLessThan(1e-8);
 await expect(page.locator('#fit-feedback')).toBeVisible();await expect(page.locator('#fit-feedback')).toContainText('Rod fitted');await expect(page.locator('#fit-feedback')).toContainText('wrist pin');
 await page.screenshot({path:`/tmp/rod-fit-after-${touch?'mobile':'desktop'}.png`});
 await fitPart(page,'pin',touch);await insertPin(page,touch);s=await snapshot(page);jointCenters(s);expect(s.state.pivot).toBe(30);
 await page.locator('#unpin').click();s=await snapshot(page);expect(s.state.parts.rod.status).toBe('fitted');expect(s.state.pivot).toBe(30);
 await fitPart(page,'pin',touch);await insertPin(page,touch);await installUnit(page,touch);await page.locator('#angle').fill('360');jointCenters(await snapshot(page));expect((await snapshot(page)).state.tested).toBe(true);await context.close();
});

for(const touch of [false,true])test(`${touch?'touch':'mouse'} fresh scene single small-eye drag fits at initial angle`,async({browser})=>{
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:1080},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});const page=await context.newPage();await ready(page);
 const [p,eye,bore]=await page.evaluate(()=>[window.__PROJECT442__.pickPoint('rod',true),window.__PROJECT442__.jointScreen('rod'),window.__PROJECT442__.jointScreen('piston')]);
 expect(Math.hypot(p.x-eye.x,p.y-eye.y)).toBeLessThan(20);
 const end={x:p.x+bore.x-eye.x,y:p.y+bore.y-eye.y};let cdp;
 if(touch){cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:0}]});}
 else{await page.mouse.move(p.x,p.y);await page.mouse.down();}
 const d={p,cdp,touch};await moveScreen(page,d,end);await release(page,d);
 const s=await snapshot(page);expect(s.state.parts.rod.status).toBe('fitted');expect(s.state.pivot).toBe(30);expect(s.state.parts.pin.status).toBe('loose');await expect(page.locator('#fit-feedback')).toContainText('Rod fitted');await context.close();
});
