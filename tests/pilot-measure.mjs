import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.EVIDENCE_DIR||'review/parts-explorer',url=process.env.PROOF_URL||'http://127.0.0.1:4180/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
for(const mobile of [false,true]){
 const name=mobile?'phone':'desktop';const c=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1100},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const cdp=await c.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:10*1000*1000/8,uploadThroughput:10*1000*1000/8});
 await p.goto(url);await p.locator('[data-ready=true]').waitFor({timeout:45000});
 const initial=await p.evaluate(()=>window.__PILOT442__.snapshot());await p.screenshot({path:out+'/'+name+'-opening.png',fullPage:!mobile});
 const select=async id=>{const el=p.locator('[data-part='+id+']');if(mobile)await el.tap();else await el.click();};
 await select('rod');await p.screenshot({path:out+'/'+name+'-blocked.png',fullPage:!mobile});
 for(const id of ['piston','crank','rod','pin'])await select(id);
 await p.locator('#angle').fill('135');if(!mobile)await p.evaluate(()=>scrollTo(0,0));
 await p.screenshot({path:out+'/'+name+'-assembly.png',fullPage:!mobile});
 for(const id of ['piston','pin']){
  await select(id);await p.locator('#inspect').click();await p.screenshot({path:out+'/'+name+'-'+id+'-detail.png',fullPage:!mobile});await p.locator('#back-view').click();
 }
 await p.locator('#play').click();
 const sample=await p.evaluate(async()=>{
  const start=performance.now(),frames=window.__PILOT442__.snapshot().metrics.frames,intervals=[];let last=start;
  await new Promise(resolve=>{function tick(now){intervals.push(now-last);last=now;if(now-start>=6000)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);});
  const end=performance.now(),snapshot=window.__PILOT442__.snapshot();intervals.sort((a,b)=>a-b);
  return{elapsedMs:end-start,renderedFrames:snapshot.metrics.frames-frames,renderedFPS:(snapshot.metrics.frames-frames)*1000/(end-start),rafP95Ms:intervals[Math.floor(intervals.length*.95)],triangles:snapshot.metrics.triangles,drawCalls:snapshot.metrics.drawCalls};
 });
 await p.locator('#play').click();
 const noOverflow=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
 results.push({viewport:name,width:mobile?390:1440,height:mobile?844:1100,readyMs:initial.metrics.readyMs,...sample,noOverflow,errors});
 if(mobile){await p.setViewportSize({width:844,height:390});await p.locator('#home-view').click();await p.evaluate(()=>scrollTo(0,document.getElementById('viewport').getBoundingClientRect().top+scrollY));await p.screenshot({path:out+'/phone-landscape.png'});}
 await c.close();
}
await browser.close();await writeFile(out+'/measurements.json',JSON.stringify({environment:'Cloud Chromium/SwiftShader; DPR1; 10Mbps download,100mslatency; not actual phone',results},null,2)+'\n');console.log(JSON.stringify(results,null,2));
