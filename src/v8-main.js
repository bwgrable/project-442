import './v8.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createV8Engine } from './v8-model.js';
import { V8, CYLINDERS, v8Linkage } from './v8-mechanics.js';
import { PARTS, ORDER, initialState, transition, missingFor, canRun, connectedCount, isComplete } from './v8-state.js';

const $=id=>document.getElementById(id),viewport=$('viewport'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let state=initialState(),engine,renderer,scene,camera,failed=false,dirty=true;
let section=true,view='both',inspection=null,blockInfo=false,cylinderFocus=false;
const roots={},materials={},yAxis=new THREE.Vector3(0,1,0);
const metrics={readyMs:0,frames:0,triangles:0,drawCalls:0};
const icons={
 crank:'<path d="M5 20h10v-8h10v16h12V12h10v8h12"/><path d="M15 8v8m10 8v8m12-24v8m10 0v8"/><circle cx="5" cy="20" r="3"/><circle cx="59" cy="20" r="3"/>',
 piston:'<ellipse cx="32" cy="8" rx="18" ry="5"/><path d="M14 8v25c9 5 27 5 36 0V8M14 14c9 5 27 5 36 0M14 19c9 5 27 5 36 0"/><circle cx="32" cy="29" r="4"/>',
 rod:'<circle cx="17" cy="29" r="10"/><circle cx="17" cy="29" r="6"/><circle cx="49" cy="10" r="6"/><circle cx="49" cy="10" r="3"/><path d="m23 21 20-13m-16 21 19-14M23 25l19-12"/>',
 bearings:'<path d="M9 29a12 12 0 0 1 24 0h-4a8 8 0 0 0-16 0ZM34 23a12 12 0 0 1 24 0h-4a8 8 0 0 0-16 0Z"/>',
 mainCaps:'<path d="M8 14h13a11 11 0 0 0 22 0h13v19H8Z"/><path d="M14 14v-5m36 5v-5M12 36h6m29 0h6"/>',
 pump:'<rect x="7" y="6" width="24" height="22" rx="4"/><circle cx="19" cy="17" r="6"/><path d="M31 23h7v10h12"/><ellipse cx="52" cy="33" rx="10" ry="5"/>',
 pan:'<path d="M5 10h54l-6 25H11ZM5 10l7-6h40l7 6M13 15h38M18 36v3h8"/>'
};
function typeOf(id){return id.startsWith('piston_')?'piston':id.startsWith('rod_')?'rod':id;}
function card(id){
 const title=id.startsWith('rod_')?'Connecting rod':id.startsWith('piston_')?'Piston':id==='pump'?'Pump + pickup':PARTS[id].name;
 return '<button class="part-card" data-part="'+id+'" aria-pressed="false" aria-label="'+PARTS[id].name+'"><svg viewBox="0 0 64 42" aria-hidden="true">'+icons[typeOf(id)]+'</svg><span class="part-state" aria-hidden="true">+</span><strong>'+title+'</strong><small id="status-'+id+'">Tap to add</small></button>';
}
$('support-parts').innerHTML=['bearings','crank','mainCaps'].map(card).join('');
$('cylinder-parts').innerHTML=CYLINDERS.flatMap(c=>['piston_'+c.id,'rod_'+c.id]).map(card).join('');
$('oil-parts').innerHTML=['pump','pan'].map(card).join('');
$('cylinder-selector').innerHTML=['A','B'].map(bank=>'<span class="bank-label">BANK '+bank+'</span>'+CYLINDERS.filter(c=>c.bank===bank).map(c=>'<button data-cylinder="'+c.id+'" aria-pressed="false" aria-label="Choose cylinder '+c.id+'"><strong>'+c.id+'</strong><small id="count-'+c.id+'">0 / 2</small></button>').join('')).join('');

function dispatch(event){if(failed)return;state=transition(state,event);updateUI();if(engine)applyState();dirty=true;}
function choose(id){
 inspection=null;blockInfo=false;cylinderFocus=false;
 if(/^(piston|rod)_/.test(id))view=id.split('_')[1][0];else view=['pump','pan'].includes(id)?'under':'both';
 dispatch({type:'select',part:id});frameCamera();
}
function focusCylinder(id){inspection=null;blockInfo=false;cylinderFocus=true;view=id[0];dispatch({type:'cylinder',cylinder:id});frameCamera();}
function showAssembly(){inspection=null;blockInfo=false;applyState();frameCamera();updateUI();dirty=true;}
function explanation(){
 if(blockInfo)return 'The casting holds two banks of four cylinder bores above five main-bearing supports. Cutaway opens the outer walls to reveal the moving parts. Teaching labels A/B and 1–4 do not assert factory cylinder numbering or a firing order.';
 if(cylinderFocus)return 'Each cylinder needs its own piston and connecting-rod joint set. The joint set includes the wrist pin, big-end bearing and matching cap. Once connected, this piston follows the same crankshaft as the other cylinders.';
 const id=state.selected;
 if(!id)return 'Main bearings, crankshaft and main caps form the supported shaft. Pistons and the oil pump can be added independently. Each rod needs its own piston and the supported crank. The oil pan closes the underside after the pump and all eight rod connections are in place.';
 const missing=missingFor(state,id),rods=missing.filter(p=>p.startsWith('rod_'));
 const names=missing.filter(p=>!p.startsWith('rod_')).map(p=>PARTS[p].name);
 if(rods.length)names.push(rods.length+' cylinder connection'+(rods.length===1?'':'s'));
 return (missing.length?'Still needed: '+names.join(' + ')+'. ':'')+PARTS[id].detail;
}
function updateMotionUI(){
 const ready=canRun(state),count=connectedCount(state);
 $('play').disabled=!ready||reduced.matches||!!inspection;$('step').disabled=!ready||!!inspection;$('angle').disabled=!ready||!!inspection;
 $('play').textContent=state.playing?'Pause':'Turn slowly';$('angle').value=String(Math.round(state.angle*180/Math.PI));$('angle-value').value=Math.round(state.angle*180/Math.PI)+'°';
 $('motion-title').textContent=isComplete(state)?'The whole bottom end works together.':ready?'One crank. '+count+' connected cylinder'+(count===1?'':'s')+'.':'Support the crankshaft, then explore.';
 $('motion-status').textContent=count+' / 8 cylinders connected';
 $('motion-copy').textContent=ready?'Follow the shared crank through both banks. Only pistons with connected rods move.':'The main bearings and caps must support the crankshaft before it can turn.';
 $('motion-explanation').textContent=!ready?'Add the main bearings, crankshaft and caps to explore rotation.':inspection?'Return to the assembly to explore the connected motion.':reduced.matches?'Reduced motion is on. Use the crank slider or Step 15°.':!section&&state.installed.pan?'The full pan encloses the underside. Use Cutaway to see the crank and pump.':count<8?'Connected pistons follow their rods. Unconnected pistons stay at rest in this teaching model.':'All eight wrist joints and paired rod ends stay connected. Pump drive, oil flow and combustion are not simulated.';
}
function updateUI(){
 const selected=state.selected,c=CYLINDERS.find(c=>c.id===state.activeCylinder);
 for(const id of ORDER){
  const el=document.querySelector('[data-part="'+id+'"]'),added=state.installed[id],blocked=missingFor(state,id).length>0;
  el.hidden=/^(piston|rod)_/.test(id)&&!id.endsWith('_'+state.activeCylinder);
  el.setAttribute('aria-pressed',String(selected===id&&!blockInfo&&!cylinderFocus));el.dataset.installed=String(added);el.dataset.blocked=String(blocked);
  $('status-'+id).textContent=added?'Added · select to learn':blocked?'Needs a connection':id.startsWith('rod_')?'Includes pin + cap':'Tap to add';
  el.querySelector('.part-state').textContent=added?'✓':'+';
 }
 for(const unit of CYLINDERS){const count=Number(state.installed['piston_'+unit.id])+Number(state.installed['rod_'+unit.id]),el=document.querySelector('[data-cylinder="'+unit.id+'"]');el.setAttribute('aria-pressed',String(state.activeCylinder===unit.id));el.dataset.complete=String(count===2);$('count-'+unit.id).textContent=count+' / 2';}
 $('active-cylinder-name').textContent='Bank '+c.bank+' · Cylinder '+c.index;
 $('part-count').textContent=ORDER.filter(id=>state.installed[id]).length+' / 21 added';$('cylinder-count').textContent=connectedCount(state)+' / 8 connected';
 const feedback=cylinderFocus?'Cylinder '+c.id+' selected. Choose its piston or connecting-rod joint set.':state.feedback;
 $('feedback').textContent=feedback;$('feedback').dataset.tone=cylinderFocus?'info':state.tone==='blocked'?'error':state.tone;
 $('detail-kicker').textContent=blockInfo?'THE FOUNDATION':cylinderFocus?'A CYLINDER CONNECTION':selected?'COMPONENT STUDY':'START WITH CURIOSITY';
 $('detail-name').textContent=blockInfo?'V8 engine block':cylinderFocus?'Bank '+c.bank+' · Cylinder '+c.index:selected?PARTS[selected].name:'A complete bottom end.';
 $('detail-role').textContent=blockInfo?'Two banks of four bores locate the pistons. Five bearing supports hold the shared crankshaft.':cylinderFocus?'Add the piston and rod for this cylinder in your own build order. Its completed joint will move with the shared crankshaft.':selected?PARTS[selected].role:'One crankshaft connects the motion of eight pistons across two banks.';
 $('detail-status').textContent=blockInfo?'Prepared':cylinderFocus?(state.installed['rod_'+c.id]?'Connected':'Not connected yet'):selected?state.installed[selected]?'Added to assembly':'Not added yet':'';
 const features=blockInfo?['Two cylinder banks','Five main supports','Cutaway walls']:cylinderFocus?['Piston '+c.id,'Rod joint set '+c.id]:selected?PARTS[selected].features:[];
 $('detail-features').replaceChildren(...features.map(text=>{const el=document.createElement('li');el.textContent=text;return el;}));
 $('inspect').disabled=(!blockInfo&&(!selected||!state.installed[selected]||cylinderFocus))||!!inspection;$('inspect').textContent=inspection?'Detail view open':'Look closer';
 $('hint').setAttribute('aria-expanded',String(state.hint));$('hint').innerHTML=(state.hint?'Hide explanation':'Explain '+(blockInfo?'the block':selected||cylinderFocus?'this connection':'the connections'))+' <span>'+(state.hint?'−':'＋')+'</span>';
 $('hint-content').hidden=!state.hint;$('hint-content').textContent=explanation();
 $('section').setAttribute('aria-pressed',String(section));$('section').querySelector('span').textContent=section?'On':'Off';$('section').disabled=!!inspection;
 document.querySelectorAll('[data-view]').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.view===view));el.disabled=!!inspection;});
 $('back-view').hidden=!inspection;$('view-title').textContent=inspection?'Component detail':view==='under'?'Underside':view==='both'?'Both banks':'Bank '+view;
 const sceneId=inspection||(!blockInfo&&!cylinderFocus&&selected?selected:'block'),blocked=sceneId!=='block'&&!state.installed[sceneId];
 document.querySelector('.view-caption').dataset.blocked=String(blocked);
 $('scene-kicker').textContent=inspection?'LOOK CLOSER':blocked?'CONNECTION NOT READY':cylinderFocus?'CYLINDER STUDY':sceneId==='block'?'THE FOUNDATION':'IN THE ASSEMBLY';
 $('scene-name').textContent=cylinderFocus&&!inspection?'Bank '+c.bank+' · Cylinder '+c.index:sceneId==='block'?'V8 engine block':PARTS[sceneId].name;
 $('scene-description').textContent=inspection?'Isolated for inspection. Your assembly is preserved.':blocked?state.feedback:cylinderFocus?'Choose this cylinder’s piston or rod. A completed joint moves with the crank.':sceneId==='block'?'Eight bores and five supports give the parts their places.':PARTS[sceneId].role;
 $('scene-note').textContent=inspection?'Illustrative geometry · enlarged detail':state.installed.pan?section?'Pan installed · floor and near walls cut away':'Pan installed · underside enclosed':section?'Cutaway exposes both banks':'Full casting · use Cutaway to see inside';
 updateMotionUI();
}
function applyState(){
 engine.parts.crank.rotation.z=-state.angle;
 for(const c of CYLINDERS){
  const u=engine.units[c.id],pose=v8Linkage(state.installed['rod_'+c.id]?state.angle:0,c.id);
  u.piston.position.set(...pose.wristpin);u.piston.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(...pose.axis));
  u.rod.position.set(...pose.crankpin);u.rod.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(...pose.wristpin).sub(new THREE.Vector3(...pose.crankpin)).normalize());
 }
 engine.setSection(inspection?false:section);
 for(const [id,root] of Object.entries(roots))root.visible=inspection?inspection===id:id==='block'||state.installed[id];
 for(const [id,set] of Object.entries(materials)){
  const highlight=!inspection&&!blockInfo&&state.installed[id]&&(cylinderFocus?id.endsWith('_'+state.activeCylinder):state.selected===id);
  for(const m of set){m.emissive.setHex(highlight?0x426147:0);m.emissiveIntensity=highlight?.15:0;}
 }
 engine.group.updateMatrixWorld(true);updateLabels();
}
function frameCamera(){
 if(!camera||!engine)return;
 const w=viewport.clientWidth,h=viewport.clientHeight,aspect=w/h;
 let offset=new THREE.Vector3(6,4.2,7);
 if(view==='A'||view==='B')offset.set(view==='A'?8:-8,3,.7);
 if(view==='under')offset.set(4,-5,6);
 const object=inspection?roots[inspection]:engine.group;
 const worldBox=new THREE.Box3().setFromObject(object),target=worldBox.getCenter(new THREE.Vector3());
 if(inspection){offset.set(3,2,5);if(inspection.startsWith('piston_'))offset.set(2.5,2.4,4);if(inspection.startsWith('rod_'))offset.set(1.8,1,6);if(inspection==='pan')offset.set(4,6,7);}
 camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateMatrixWorld();
 const bounds=new THREE.Box3();
 object.traverse(mesh=>{
  if(!mesh.isMesh)return;if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])bounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse));
 });
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const caption=document.querySelector('.view-caption');
 const topPad=Math.min(h*.39,Math.max(86,caption.offsetTop+caption.offsetHeight+12)),bottomPad=inspection?66:38;
 const usable=Math.max(.3,(h-topPad-bottomPad)/h),span=Math.max(size.x/(aspect*.88),size.y/usable)*1.06;
 const centerFraction=(topPad+(h-topPad-bottomPad)/2)/h;
 camera.left=center.x-span*aspect/2;camera.right=center.x+span*aspect/2;camera.top=center.y+span*centerFraction;camera.bottom=camera.top-span;
 camera.updateProjectionMatrix();updateLabels();dirty=true;
}

function updateLabels(){
 if(!engine||!camera)return;
 const holder=$('feature-labels');holder.replaceChildren();
 if(!inspection){
  if(view==='A'||view==='B')for(const c of CYLINDERS.filter(c=>c.bank===view)){
   const axis=v8Linkage(0,c.id).axis,point=new THREE.Vector3(axis[0]*2.28,axis[1]*2.28,c.station+c.axialOffset).project(camera);
   const el=document.createElement('span');el.className='cylinder-label'+(state.activeCylinder===c.id?' is-active':'');el.textContent=c.id;
   el.style.left=Math.max(8,Math.min(viewport.clientWidth-38,(point.x+1)*viewport.clientWidth/2-15))+'px';el.style.top=Math.max(98,Math.min(viewport.clientHeight-45,(1-point.y)*viewport.clientHeight/2-24))+'px';holder.append(el);
  }
  return;
 }
 const defs=inspection.startsWith('piston_')?[{text:'Ring grooves',point:[.25,.17,0]},{text:'Wrist-pin bore',point:[0,0,.29]}]:inspection.startsWith('rod_')?[{text:'Wrist pin + small end',point:[0,V8.rodLength,.315]},{text:'Crank bearing + cap',point:[0,-.12,.1]}]:engine.anchors?.[inspection]||[];
 const w=viewport.clientWidth,h=viewport.clientHeight,placed=[];
 for(const feature of defs.slice(0,2)){
  const point=roots[inspection].localToWorld(new THREE.Vector3(...feature.point)).project(camera);
  const el=document.createElement('span');el.className='feature-label';el.textContent=feature.text;
  const x=Math.max(12,Math.min(w-155,(point.x+1)*w/2+15));let y=Math.max(110,Math.min(h-110,(1-point.y)*h/2));
  for(const other of placed)if(Math.abs(x-other.x)<155&&Math.abs(y-other.y)<38)y=other.y-42;
  placed.push({x,y});el.style.left=x+'px';el.style.top=y+'px';holder.append(el);
 }
}
function resize(){if(!renderer||failed)return;renderer.setSize(viewport.clientWidth,viewport.clientHeight);frameCamera();}
function fail(message){
 failed=true;state={...state,playing:false};$('loading').hidden=true;$('fallback').hidden=false;if(message)$('fallback-detail').textContent=message;
 document.querySelectorAll('button,input').forEach(el=>{if(el.id!=='retry')el.disabled=true;});$('feature-labels').replaceChildren();
}
function initialize(){
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Illustrative V8 bottom end. Select parts with the component buttons and inspect both banks using the view controls.');
  $('canvas-wrap').append(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('The graphics connection was interrupted. Reload the explorer to recover.');});
  scene=new THREE.Scene();scene.background=new THREE.Color(0xdce2d9);camera=new THREE.OrthographicCamera(-3,3,3,-3,.01,100);
  const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.04,.1,100,{size:64}).texture;scene.environmentIntensity=.65;environment.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf4f6e9,0x687970,2));
  const key=new THREE.DirectionalLight(0xfff1d9,3);key.position.set(-3,6,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0xdaeaff,2);rim.position.set(4,3,-4);scene.add(rim);
  engine=createV8Engine();scene.add(engine.group);Object.assign(roots,{block:engine.block,...engine.parts});
  for(const [id,root] of Object.entries(roots)){materials[id]=new Set();root.traverse(o=>{if(o.isMesh)materials[id].add(o.material);});}
  applyState();resize();new ResizeObserver(resize).observe(viewport);renderer.render(scene,camera);updateUI();
  metrics.readyMs=performance.now();$('loading').hidden=true;viewport.dataset.ready='true';
  let last=performance.now();
  function frame(now){
   if(failed)return;const delta=Math.min((now-last)/1000,.25);last=now;
   if(state.playing&&!document.hidden){state=transition(state,{type:'tick',delta});applyState();updateMotionUI();dirty=true;}
   if(dirty&&!document.hidden){renderer.render(scene,camera);metrics.frames++;metrics.triangles=renderer.info.render.triangles;metrics.drawCalls=renderer.info.render.calls;dirty=false;}
   requestAnimationFrame(frame);
  }requestAnimationFrame(frame);
 }catch(error){console.error('V8 explorer initialization failed',error);fail();}
}
for(const id of ORDER)document.querySelector('[data-part="'+id+'"]').addEventListener('click',()=>choose(id));
for(const c of CYLINDERS)document.querySelector('[data-cylinder="'+c.id+'"]').addEventListener('click',()=>focusCylinder(c.id));
$('hint').addEventListener('click',()=>dispatch({type:'hint'}));
$('reset').addEventListener('click',()=>{inspection=null;blockInfo=false;cylinderFocus=false;view='both';section=true;dispatch({type:'reset'});frameCamera();});
$('play').addEventListener('click',()=>{if(!reduced.matches&&!inspection)dispatch({type:'toggle-play'});});
$('step').addEventListener('click',()=>dispatch({type:'step',delta:Math.PI/12}));
$('angle').addEventListener('input',event=>dispatch({type:'angle',angle:Number(event.target.value)*Math.PI/180}));
$('inspect').addEventListener('click',()=>{dispatch({type:'pause'});inspection=blockInfo?'block':state.selected;applyState();frameCamera();updateUI();});
$('back-view').addEventListener('click',showAssembly);
$('home-view').addEventListener('click',()=>{view='both';cylinderFocus=false;showAssembly();});
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{view=el.dataset.view;frameCamera();updateUI();}));
$('section').addEventListener('click',()=>{section=!section;applyState();updateUI();dirty=true;});
$('block-view').addEventListener('click',()=>{dispatch({type:'pause'});inspection=null;blockInfo=true;cylinderFocus=false;applyState();frameCamera();updateUI();});
reduced.addEventListener('change',()=>{if(reduced.matches)dispatch({type:'pause'});updateMotionUI();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)dispatch({type:'pause'});});window.addEventListener('blur',()=>dispatch({type:'pause'}));
updateUI();initialize();
Object.defineProperty(window,'__V8442__',{value:Object.freeze({snapshot(){
 const units=engine?Object.fromEntries(CYLINDERS.map(c=>{const u=engine.units[c.id];return[c.id,{piston:u.piston.getWorldPosition(new THREE.Vector3()).toArray(),rodBig:u.rod.getWorldPosition(new THREE.Vector3()).toArray(),rodSmall:u.rod.localToWorld(new THREE.Vector3(0,V8.rodLength,0)).toArray(),pin:u.pin.getWorldPosition(new THREE.Vector3()).toArray(),cap:u.cap.getWorldPosition(new THREE.Vector3()).toArray()}];})):null;
 return{state:structuredClone(state),units,crankAngle:engine?.parts.crank.rotation.z,sectionVisibleMeshes:engine?.sectionParts.filter(o=>o.visible).length,inspection,section,view,failed,metrics:{...metrics},visible:Object.fromEntries(Object.entries(roots).map(([id,root])=>[id,root.visible]))};
}})});
