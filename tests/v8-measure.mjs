import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.EVIDENCE_DIR||'review/v8-bottom-end',url=process.env.PROOF_URL||'http://127.0.0.1:4190/';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];
for(const touch of [false,true]){
 const name=touch?'phone':'desktop',context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1440,height:1100},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:10e6/8,uploadThroughput:10e6/8});
 await page.goto(url);await page.locator('[data-ready=true]').waitFor({timeout:45000});const initial=await page.evaluate(()=>window.__V8442__.snapshot());
 const hit=async sel=>touch?await page.locator(sel).tap():await page.locator(sel).click();
 const shot=async state=>{if(!touch)await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/'+name+'-'+state+'.png',fullPage:!touch,animations:'disabled'});};
 if(!touch)await shot('opening');await hit('[data-part=pan]');if(touch)await shot('blocked');
 for(const id of ['bearings','crank','mainCaps','pump'])await hit('[data-part='+id+']');
 for(const bank of ['A','B'])for(let i=1;i<=4;i++){const id=bank+i;await hit('[data-cylinder='+id+']');for(const type of ['piston','rod'])await hit('[data-part='+type+'_'+id+']');}
 await hit('[data-part=pan]');await page.locator('#angle').fill('135');await hit('[data-view=both]');if(!touch)await shot('assembly');
 for(const id of ['A3','B2']){await hit('[data-cylinder='+id+']');await hit('[data-part=piston_'+id+']');if(touch||id==='B2')await shot('bank-'+id[0]);}
 await hit('[data-part=pump]');await shot('underside');await hit('[data-part=pan]');await hit('#section');if(!touch)await shot('pan-full');
 if(touch){await hit('#inspect');await shot('pan-detail');await hit('#back-view');}
 await hit('#section');await hit('[data-part=pump]');if(touch){await hit('#inspect');await shot('pump-detail');await hit('#back-view');}
 if(!touch){await hit('[data-cylinder=A3]');await hit('[data-part=rod_A3]');await hit('#inspect');await shot('rod-detail');await hit('#back-view');}
 await hit('[data-view=both]');await hit('#play');
 const sample=await page.evaluate(async()=>{const start=performance.now(),frames=window.__V8442__.snapshot().metrics.frames,intervals=[];let last=start;await new Promise(resolve=>{function tick(now){intervals.push(now-last);last=now;if(now-start>=6000)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});const end=performance.now(),s=window.__V8442__.snapshot();intervals.sort((a,b)=>a-b);return{elapsedMs:end-start,renderedFrames:s.metrics.frames-frames,renderedFPS:(s.metrics.frames-frames)*1000/(end-start),rafP95Ms:intervals[Math.floor(intervals.length*.95)],triangles:s.metrics.triangles,drawCalls:s.metrics.drawCalls};});
 await hit('#play');results.push({viewport:name,width:touch?390:1440,height:touch?844:1100,readyMs:initial.metrics.readyMs,...sample,noOverflow:await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),errors});
 if(touch){await page.setViewportSize({width:844,height:390});await hit('[data-view=both]');await page.evaluate(()=>scrollTo(0,document.getElementById('viewport').getBoundingClientRect().top+scrollY));await page.screenshot({path:out+'/phone-landscape.png',animations:'disabled'});}
 await context.close();
}
await browser.close();await writeFile(out+'/measurements.json',JSON.stringify({environment:'Cloud Chromium/SwiftShader, DPR1, 10Mbps/100ms; not physical phone',results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
