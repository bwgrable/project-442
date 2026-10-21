import { expect } from '@playwright/test';
export const ready=async page=>{await page.goto('/');await page.locator('[data-ready=true]').waitFor({timeout:45000});};
export const snapshot=page=>page.evaluate(()=>window.__PROJECT442__.snapshot());
export async function pointFor(page,part){await page.locator('#viewport').scrollIntoViewIfNeeded();const p=await page.evaluate(id=>window.__PROJECT442__.pickPoint(id),part);expect(p,`${part} has visible pickable geometry`).not.toBeNull();return p;}
export async function selectMesh(page,part,touch=false){const p=await pointFor(page,part);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);expect((await snapshot(page)).state.selected).toBe(part);}
export async function orient(page,part,touch=false){await selectMesh(page,part,touch);let roll=(await snapshot(page)).state.parts[part].roll;const button=page.locator(roll>0?'#rotate-left':'#rotate-right');for(let i=0;i<Math.abs(roll)/15;i++){if(touch)await button.tap();else await button.click();}}
export async function startDrag(page,part,touch=false){
 const p=await pointFor(page,part);const initial=await snapshot(page),before=initial.state.parts[part];let cdp;
 if(touch){cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+12,y:p.y+4,id:0}]});}
 else {await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+12,p.y+4,{steps:2});}
 expect((await snapshot(page)).state.drag?.part).toBe(part);expect((await snapshot(page)).camera).toEqual(initial.camera);
 return {p,before,cdp,touch};
}
export async function moveToFit(page,part,drag,offset={x:0,y:0}){
 const target=await page.evaluate(id=>window.__PROJECT442__.dropPoint(id),part);expect(target).not.toBeNull();
 const end={x:target.x+offset.x,y:target.y+offset.y};
 if(drag.touch){for(let i=1;i<=5;i++)await drag.cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:drag.p.x+(end.x-drag.p.x)*i/5,y:drag.p.y+(end.y-drag.p.y)*i/5,id:0}]});}
 else await page.mouse.move(end.x,end.y,{steps:6});
 const current=(await snapshot(page)).state.parts[part];expect(Math.hypot(current.x-drag.before.x,current.z-drag.before.z)).toBeGreaterThan(.05);return end;
}
export async function release(page,drag){if(drag.touch)await drag.cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();}
export async function connect(page,part,touch=false){await orient(page,part,touch);const d=await startDrag(page,part,touch);await moveToFit(page,part,d);await expect(page.locator('#fit-feedback')).toContainText('Fits here');await release(page,d);expect((await snapshot(page)).state.parts[part].status).toBe('joined');}
export async function assemble(page,touch=false){for(const part of ['crank','mainCaps','piston','rodCap'])await connect(page,part,touch);}
