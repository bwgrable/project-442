import { expect } from '@playwright/test';
export const ready=async page=>{await page.goto('/');await page.locator('[data-ready=true]').waitFor({timeout:45000});};
export const snapshot=page=>page.evaluate(()=>window.__PROJECT442__.snapshot());
export async function pointFor(page,part){await page.locator('#viewport').scrollIntoViewIfNeeded();const p=await page.evaluate(id=>window.__PROJECT442__.pickPoint(id),part);expect(p,`${part} has visible pickable geometry`).not.toBeNull();return p;}
export async function selectMesh(page,part,touch=false){const p=await pointFor(page,part);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);expect((await snapshot(page)).state.selected).toBe(part);}
export async function orient(page,part,targetRoll=0,touch=false){await selectMesh(page,part,touch);const roll=(await snapshot(page)).state.parts[part].roll,delta=targetRoll-roll;for(let i=0;i<Math.abs(delta)/15;i++){const button=page.locator(delta>0?'#rotate-right':'#rotate-left');if(touch)await button.tap();else await button.click();}}
export async function startDrag(page,part,touch=false){
 const p=await pointFor(page,part),initial=await snapshot(page);let cdp;
 if(touch){cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+8,y:p.y+2,id:0}]});}
 else {await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+8,p.y+2,{steps:2});}
 expect((await snapshot(page)).state.drag).not.toBeNull();expect((await snapshot(page)).camera).toEqual(initial.camera);
 return {p,before:initial.state,cdp,touch};
}
export async function moveScreen(page,drag,end){
 if(drag.touch){for(let i=1;i<=4;i++)await drag.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:drag.p.x+(end.x-drag.p.x)*i/4,y:drag.p.y+(end.y-drag.p.y)*i/4,id:0}]});}
 else await page.mouse.move(end.x,end.y,{steps:5});
}
export async function moveToFit(page,part,drag){const end=await page.evaluate(id=>window.__PROJECT442__.dropPoint(id),part);expect(end).not.toBeNull();await moveScreen(page,drag,end);}
export async function moveTo(page,drag,x,z){const end=await page.evaluate(([x,z])=>window.__PROJECT442__.movePoint(x,z),[x,z]);expect(end).not.toBeNull();await moveScreen(page,drag,end);}
export async function release(page,drag){if(drag.touch)await drag.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();}
export async function fitPart(page,part,touch=false,targetRoll=0){if(part!=='pin')await orient(page,part,targetRoll,touch);const d=await startDrag(page,part,touch);await moveToFit(page,part,d);await release(page,d);return snapshot(page);}
export async function insertPin(page,touch=false,depth=1){const d=await startDrag(page,'pin',touch);expect((await snapshot(page)).state.drag.mode).toBe('insert');const end=await page.evaluate(depth=>window.__PROJECT442__.insertionPoint(depth),depth);await moveScreen(page,d,end);await release(page,d);return snapshot(page);}
export function jointCenters(s){const p=s.positions;expect(Math.hypot(...p.rodSmall.map((v,i)=>v-p.piston[i]))).toBeLessThan(1e-8);expect(Math.hypot(...p.pin.map((v,i)=>v-p.piston[i]))).toBeLessThan(1e-8);expect(Math.hypot(...p.rodSmall.map((v,i)=>v-p.rodBig[i]))).toBeCloseTo(1.45,8);}
export async function buildUnit(page,touch=false){
 await selectMesh(page,'piston',touch);expect((await snapshot(page)).state.parts.piston.status).toBe('loose');
 const d=await startDrag(page,'piston',touch);await moveTo(page,d,1.8,1.4);await release(page,d);expect((await snapshot(page)).state.parts.piston.x).toBeCloseTo(1.8,6);
 await fitPart(page,'rod',touch);expect((await snapshot(page)).state.parts.rod.status).toBe('fitted');
 await fitPart(page,'pin',touch);expect((await snapshot(page)).state.parts.pin.status).toBe('aligned');
 await selectMesh(page,'pin',touch);expect((await snapshot(page)).state.parts.pin.status).toBe('aligned');
 await insertPin(page,touch);expect((await snapshot(page)).state.parts.pin.status).toBe('pinned');jointCenters(await snapshot(page));
}
export async function installUnit(page,touch=false){
 await page.locator('#pivot').fill('0');await page.locator('#engine-view').click();await fitPart(page,'piston',touch);expect((await snapshot(page)).state.parts.piston.status).toBe('installed');await fitPart(page,'rodCap',touch);expect((await snapshot(page)).state.parts.rodCap.status).toBe('joined');
}
export async function assemble(page,touch=false){await buildUnit(page,touch);await installUnit(page,touch);}
