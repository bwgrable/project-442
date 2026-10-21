// Local production-build samples, never physical-phone acceptance.
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {assemble,startDrag,moveToFit,release} from './helpers.mjs';
const origin=process.env.PROOF_URL||'http://127.0.0.1:4174',directory=process.env.EVIDENCE_DIR||'/tmp/project442-pile-artifacts';
await mkdir(directory,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const result={origin,browser:browser.version(),gpu:'SwiftShader software rendering',physicalDevice:false,network:{megabitsPerSecond:10,latencyMs:100},scenarios:[]};
for(const [name,width,height,mobile] of [['desktop',1440,1080,false],['mobile',390,844,true]]){
 const context=await browser.newContext({baseURL:origin,viewport:{width,height},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:10_000_000/8,uploadThroughput:10_000_000/8});
 await page.goto(origin);await page.locator('[data-ready=true]').waitFor({timeout:45000});
 const initial=await page.evaluate(()=>({readyMs:window.__PROJECT442__.snapshot().metrics.readyMs,resourceTransferBytes:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.transferSize,0),overflow:document.documentElement.scrollWidth>innerWidth}));
 await page.screenshot({path:`${directory}/${name}-opening.png`,fullPage:!mobile});
 const drag=await startDrag(page,'crank',mobile);await moveToFit(page,'crank',drag);await page.screenshot({path:`${directory}/${name}-alignment.png`});await release(page,drag);
 await page.locator('#reset').click();await assemble(page,mobile);await page.locator('#angle').fill('135');
 if(mobile)await page.locator('#viewport').scrollIntoViewIfNeeded();await page.screenshot({path:`${directory}/${name}-connected.png`,fullPage:true});
 await page.locator('#play').click();if(mobile)await page.locator('#viewport').scrollIntoViewIfNeeded();
 const timing=await page.evaluate(async()=>{const start=performance.now(),frames=window.__PROJECT442__.snapshot().metrics.frames,samples=[];let previous=start;await new Promise(resolve=>{function frame(t){samples.push(t-previous);previous=t;if(t-start<5000)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});const elapsed=performance.now()-start,m=window.__PROJECT442__.snapshot().metrics;samples.sort((a,b)=>a-b);return{sampleElapsedMs:elapsed,renderedFrames:m.frames-frames,averageRenderedFps:(m.frames-frames)/(elapsed/1000),rafP95Ms:samples[Math.floor(samples.length*.95)],triangles:m.triangles,drawCalls:m.drawCalls};});
 await page.locator('#play').click();
 // Exercise lifting an installed mesh after motion, then restore the exact assembly by cancellation.
 const beforeLift=await page.evaluate(()=>window.__PROJECT442__.snapshot().state);
 const lifted=await startDrag(page,'piston',mobile);
 const lifting=await page.evaluate(()=>window.__PROJECT442__.snapshot().state);
 expect(lifting.parts.piston.status).toBe('loose');expect(lifting.parts.rodCap.status).toBe('loose');expect(lifting.angle).toBe(0);
 await page.screenshot({path:`${directory}/${name}-lifted.png`});
 await page.keyboard.press('Escape');await release(page,lifted);
 const restored=await page.evaluate(()=>window.__PROJECT442__.snapshot().state);
 expect(restored.parts).toEqual(beforeLift.parts);expect(restored.angle).toBe(beforeLift.angle);expect(restored.playing).toBe(false);
 result.scenarios.push({name,width,height,...initial,...timing,installedMeshLiftAndCancelPassed:true,errors});await context.close();
}
await browser.close();await writeFile(`${directory}/measurements.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
