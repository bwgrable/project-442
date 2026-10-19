import {test,expect} from '@playwright/test';
import {ready,snapshot,place,secure,assemble} from './helpers.mjs';

test('unaided desktop: choose, seat, secure, hand-turn and replay',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
  expect((await snapshot(page)).state.selected).toBeNull();
  await expect(page.locator('.location-marker:visible')).toHaveCount(0);
  await expect(page.locator('#cutaway-explanation')).toContainText('OPENS ONE BANK');
  await page.locator('#section').click();await expect(page.locator('#scene-badge')).toContainText('FULL CASTING');await page.locator('#section').click();
  await assemble(page);
  let s=(await snapshot(page)).state;
  expect(s.hintRequests).toBe(0);expect(s.selected).toBe('rodCap');
  expect(s.parts).toEqual({crank:'seated',mainCaps:'secured',piston:'seated',rodCap:'secured'});
  await page.locator('#test').click();
  for(const angle of [0,45,90,135,180,225,270,315,360]){
    await page.locator('#angle').fill(String(angle));const {positions:p}=await snapshot(page);
    expect(Math.hypot(...p.rodSmall.map((v,i)=>v-p.piston[i]))).toBeLessThan(1e-9);
    expect(Math.hypot(...p.rodBig.map((v,i)=>v-p.rodCap[i]))).toBeLessThan(1e-9);
    expect(Math.hypot(...p.rodSmall.map((v,i)=>v-p.rodBig[i]))).toBeCloseTo(1.45,9);
  }
  expect((await snapshot(page)).state.tested).toBe(true);
  await expect(page.locator('#completion')).toBeVisible();
  await page.locator('#play').click();const angle=(await snapshot(page)).state.angle;
  await expect.poll(async()=>(await snapshot(page)).state.angle).not.toBe(angle);
  await page.locator('#play').click();expect((await snapshot(page)).state.playing).toBe(false);
  await page.locator('#replay').click();s=(await snapshot(page)).state;
  expect(s).toMatchObject({selected:null,phase:'inspect',tool:null,location:null,playing:false,testStarted:false,tested:false,testTravel:0,hintRequests:0,hints:{},section:true});
  expect(Object.values(s.parts)).toEqual(['bench','bench','bench','bench']);
  expect(s.fasteners).toEqual({mainCaps:[false,false],rodCap:[false,false]});expect(errors).toEqual([]);
});

test('wrong order, location, cap and tool preserve progress; unsecured test blocked',async({page})=>{
  await ready(page);await place(page,'piston','cylinder');
  expect((await snapshot(page)).state.parts.piston).toBe('bench');await expect(page.locator('#feedback')).toContainText('main cap');
  await page.locator('#cancel').click();await place(page,'crank','cylinder');await expect(page.locator('#feedback')).toContainText('does not match');
  await page.locator('#location-list [data-location="mainLine"]').click();await page.locator('#seat').dblclick();
  expect((await snapshot(page)).state.parts.crank).toBe('seated');
  await place(page,'mainCaps','crankpin');expect((await snapshot(page)).state.parts.mainCaps).toBe('bench');
  await page.locator('#location-list [data-location="mainCaps"]').click();await page.locator('#seat').click();
  await page.locator('[data-tool="mallet"]').click();await page.locator('[data-fastener="0"]').click();
  expect((await snapshot(page)).state.fasteners.mainCaps).toEqual([false,false]);
  await page.locator('[data-tool="socket"]').click();await page.locator('[data-fastener="0"]').dblclick();
  expect((await snapshot(page)).state.fasteners.mainCaps).toEqual([true,false]);await page.locator('#test').click();
  expect((await snapshot(page)).state.testStarted).toBe(false);await expect(page.locator('#motion-controls')).toBeHidden();
  await page.locator('[data-fastener="1"]').click();await place(page,'piston','otherCylinders');
  await expect(page.locator('#feedback')).toContainText('outside this challenge');expect((await snapshot(page)).state.parts.mainCaps).toBe('secured');
});

test('optional hint levels never select or install; keyboard placement and cancel',async({page})=>{
  await ready(page);
  for(let level=1;level<=4;level++){
    await page.locator('#hint').click();const s=(await snapshot(page)).state;
    expect(s.hints.crank).toBe(level);expect(s.selected).toBeNull();expect(s.parts.crank).toBe('bench');
    await expect(page.locator('.location-marker:visible')).toHaveCount(level>=3?1:0);
  }
  await expect(page.locator('#hint')).toBeDisabled();
  await page.locator('[data-part="crank"]').focus();await page.keyboard.press('Enter');
  await page.locator('#primary-action').focus();await page.keyboard.press('Enter');await expect(page.locator('.location-marker:visible')).toHaveCount(5);
  await page.keyboard.press('Escape');expect((await snapshot(page)).state.phase).toBe('inspect');
  await page.locator('#primary-action').click();await page.locator('#location-list [data-location="mainLine"]').focus();await page.keyboard.press('Enter');
  await page.locator('#seat').focus();await page.keyboard.press('Enter');await expect(page.locator('#hint-content')).toBeHidden();
  expect((await snapshot(page)).state.selected).toBe('crank');await page.locator('#reset').click();await expect(page.locator('.hinted')).toHaveCount(0);
});

test('mobile touch journey, gesture separation, fixed controls and landscape',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();await ready(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const point=(await snapshot(page)).pistonScreen;await page.touchscreen.tap(point.x,point.y);expect((await snapshot(page)).state.selected).toBe('piston');
  await page.locator('[data-part="crank"]').tap();await page.locator('#primary-action').tap();
  await expect.poll(async()=>Math.abs((await page.locator('#viewport').boundingBox()).y)).toBeLessThan(3);
  const rect=await page.locator('canvas').first().boundingBox(),cdp=await context.newCDPSession(page);
  const x=rect.x+rect.width*.5,y=rect.y+rect.height*.32,before=(await snapshot(page)).camera;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-40,y,id:0},{x:x+40,y,id:1}]});
  for(let i=0;i<6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-40-i*5,y,id:0},{x:x+40+i*5,y,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  expect((await snapshot(page)).state.parts.crank).toBe('bench');expect((await snapshot(page)).camera).not.toEqual(before);
  await page.locator('.location-marker[data-location="mainLine"]').tap();
  await expect.poll(async()=>(await snapshot(page)).state.location).toBe('mainLine');
  await page.locator('#dock-seat').tap();expect((await snapshot(page)).state.parts.crank).toBe('seated');
  await place(page,'mainCaps','mainCaps');await secure(page);await place(page,'piston','cylinder');await place(page,'rodCap','crankpin');await secure(page);
  await page.locator('#test').tap();expect(await page.locator('#motion-controls').evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
  await page.locator('#play').tap();expect((await snapshot(page)).state.playing).toBe(true);await page.locator('#play').tap();await page.locator('#step').tap();expect((await snapshot(page)).state.playing).toBe(false);
  await page.setViewportSize({width:844,height:390});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#reset').click();expect((await snapshot(page)).state.testStarted).toBe(false);await context.close();
});

test('reduced motion supports step and slider completion; background and resume stay paused',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await ready(page);await assemble(page);await page.locator('#test').click();await expect(page.locator('#play')).toBeDisabled();
  await page.locator('#step').click();expect((await snapshot(page)).state.angle).toBeCloseTo(Math.PI/12);
  await page.locator('#angle').fill('360');expect((await snapshot(page)).state.tested).toBe(true);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#play').click();
  // Visibility event simulation, not evidence of real OS suspension.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});expect((await snapshot(page)).state.playing).toBe(false);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});expect((await snapshot(page)).state.playing).toBe(false);
});

test('WebGL failure and context loss provide recovery and disable actions',async({page})=>{
  await ready(page);await page.locator('canvas').first().evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.locator('#fallback')).toBeVisible();await expect(page.locator('#test')).toBeDisabled();
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return String(type).includes('webgl')?null:original.call(this,type,...args);};});
  await page.reload();await expect(page.getByRole('heading',{name:'The 3D view couldn’t start.'})).toBeVisible();await expect(page.getByRole('button',{name:'Reload workshop'})).toBeEnabled();
});

test('failed application bundle load shows reload recovery',async({page})=>{
  await page.route('**/assets/*.js',route=>route.abort('failed'));
  await page.goto('/');
  await expect(page.locator('#fallback')).toBeVisible();
  await expect(page.locator('#fallback-detail')).toContainText('files could not load');
  await expect(page.locator('#retry')).toBeEnabled();
  await expect(page.locator('#test')).toBeDisabled();
});
