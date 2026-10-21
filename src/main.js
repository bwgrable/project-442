import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createEngine } from './engine.js';
import { linkage, MECHANICS } from './mechanics.js';
import { PARTS, ORDER, initialState, transition, fit, canRun, getHint } from './pile.js';

const $=id=>document.getElementById(id), viewport=$('viewport');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let state=initialState(),renderer,scene,camera,controls,engine,ring,failed=false,dirty=true,orbitMode=false;
let gesture=null,blockedGesture=false;
const pointers=new Set(),roots={},materials={},heightCache=new Map();
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),yAxis=new THREE.Vector3(0,1,0);
const fixed=linkage(0),wrist0=new THREE.Vector3(...fixed.wristpin),pin0=new THREE.Vector3(...fixed.crankpin);
const rodAngle=Math.atan2(-(fixed.wristpin[0]-fixed.crankpin[0]),fixed.wristpin[1]-fixed.crankpin[1]);
const baseRoll={crank:0,mainCaps:0,piston:0,rodCap:rodAngle};
const metrics={frames:0,readyMs:0,triangles:0,drawCalls:0};
const shortNames={crank:'Crankshaft',mainCaps:'Main caps',piston:'Piston + rod',rodCap:'Rod cap'};

$('part-list').innerHTML=ORDER.map((id,i)=>`<button class="part-card" data-part="${id}" aria-pressed="false"><span class="symbol" aria-hidden="true">${['↻','∩','↕','∪'][i]}</span><span><strong>${PARTS[id].name}</strong><small id="status-${id}">Loose on bench</small></span></button>`).join('');
$('part-labels').innerHTML=ORDER.map(id=>`<span class="part-label" id="label-${id}">${shortNames[id]}</span>`).join('');
function dispatch(action){if(failed)return;state=transition(state,action);updateUI();if(engine)applyState();dirty=true;}
function updateMotionUI(){
 $('angle').value=String(Math.round(state.angle*180/Math.PI));$('angle-value').value=`${Math.round(state.angle*180/Math.PI)}°`;
 $('turn-progress').textContent=state.tested?'One full revolution. It works.':`${Math.min(360,Math.round(Math.abs(state.travel)*180/Math.PI))}° / 360° · turn in one direction`;
 $('play').textContent=state.playing?'Pause':'Turn crank';$('completion').hidden=!state.tested;
}
function updateUI(){
 const selected=state.selected,loose=selected&&state.parts[selected].status==='loose',hint=getHint(state);
 for(const id of ORDER){const button=document.querySelector(`[data-part="${id}"]`);button.setAttribute('aria-pressed',String(selected===id));button.classList.toggle('hinted',hint.level>=3&&hint.part===id);$(`status-${id}`).textContent=state.parts[id].status==='joined'?'Connected · drag to lift':'Loose on bench';}
 $('scene-status').textContent=`${ORDER.filter(id=>state.parts[id].status==='joined').length} / 4 connected`;
 $('selected-name').textContent=selected?PARTS[selected].name:'Grab a piece.';
 $('roll-value').textContent=selected?(state.parts[selected].status==='joined'?'Connected · lift to retry':`Roll ${state.parts[selected].roll}°${state.drag?' · holding':''}`):'Drag a part · empty space orbits';
 for(const id of ['rotate-left','rotate-right'])$(id).disabled=!loose;
 $('remove').disabled=!selected||state.parts[selected].status!=='joined'||!!state.drag;
 $('recover').disabled=!selected||!!state.drag;
 $('inspect').disabled=!selected||!!state.drag;
 $('pickup').disabled=!selected||!!state.drag;
 $('drop').disabled=!state.drag;
 document.querySelectorAll('[data-move]').forEach(el=>el.disabled=!state.drag);
 $('cancel').hidden=!state.drag;$('undo').disabled=!state.history.length&&!state.drag;
 $('feedback').textContent=state.feedback;$('feedback').dataset.tone=state.tone;
 $('hint').textContent=hint.level===0?'Want a hint?':hint.level<4?'A little more help':'Walkthrough shown';
 $('hint').disabled=hint.level>=4||canRun(state);$('hint-level').textContent=hint.level?`${hint.level} / 4`:'OPTIONAL';
 $('hint-content').hidden=!hint.level;$('hint-title').textContent=hint.title;$('hint-copy').textContent=hint.text;
 $('motion-controls').hidden=!canRun(state);$('play').disabled=reducedMotion.matches;
 $('play').title=reducedMotion.matches?'Reduced motion: use the slider or Step.':'';
 $('section').setAttribute('aria-pressed',String(state.section));
 $('camera-mode').setAttribute('aria-pressed',String(orbitMode));$('camera-mode').textContent=orbitMode?'Move parts':'Orbit view';
 const nearby=state.drag?fit(state,state.drag.part):null;
 $('fit-feedback').hidden=!nearby?.near;
 if(nearby?.near){$('fit-feedback').textContent=nearby.ready?'Fits here. Release to connect.':nearby.message;$('fit-feedback').dataset.ready=String(nearby.ready);}
 updateMotionUI();
}
function prepareRoots(){
 const unit=new THREE.Group();engine.group.add(unit);unit.add(engine.piston,engine.rod);
 roots.crank=engine.crankshaft;roots.mainCaps=engine.mainCaps;roots.piston=unit;roots.rodCap=engine.rodCap;
 for(const id of ORDER){materials[id]=new Set();roots[id].traverse(child=>{if(child.isMesh){child.material=child.material.clone();child.userData.part=id;materials[id].add(child.material);}});}
 engine.block.traverse(child=>{if(child.isMesh)child.userData.part='block';});
}
function setPistonChildren(angle){
 const {crankpin,wristpin}=linkage(angle);
 engine.piston.position.fromArray(wristpin).sub(wrist0);engine.piston.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(Math.SQRT1_2,Math.SQRT1_2,0));
 engine.rod.position.fromArray(crankpin).sub(wrist0);
 engine.rod.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(...wristpin).sub(new THREE.Vector3(...crankpin)).normalize());
}
function looseHeight(id,roll){
 const key=`${id}/${roll}`;
 if(!heightCache.has(key)){const group=roots[id];group.position.set(0,0,0);group.rotation.set(0,0,baseRoll[id]+THREE.MathUtils.degToRad(roll));group.updateWorldMatrix(true,true);heightCache.set(key,-.86-new THREE.Box3().setFromObject(group).min.y);}
 return heightCache.get(key);
}
function targetPoint(id){if(id==='piston')return wrist0.clone();if(id==='rodCap')return pin0.clone();return new THREE.Vector3(0,0,0);}
function applyState(){
 engine.setSection(state.section);setPistonChildren(state.parts.piston.status==='joined'?state.angle:0);
 for(const id of ORDER){const p=state.parts[id],root=roots[id];
  if(p.status==='loose'){const restingHeight=looseHeight(id,p.roll);
   const height=state.drag?.part===id ? Math.max(restingHeight+.15,targetPoint(id).y) : restingHeight;
   root.position.set(p.x,height,p.z);root.rotation.set(0,0,baseRoll[id]+THREE.MathUtils.degToRad(p.roll));}
  else {root.position.copy(targetPoint(id));root.rotation.set(0,0,baseRoll[id]);
   if(id==='crank')root.rotation.z=-state.angle;
   if(id==='rodCap'){const pose=linkage(state.angle);root.position.fromArray(pose.crankpin);root.quaternion.copy(engine.rod.quaternion);}
  }
  for(const material of materials[id]){material.emissive.setHex(state.selected===id?0x1b7083:0);material.emissiveIntensity=state.selected===id?.16:0;}
  root.traverse(child=>{if(child.isMesh)child.castShadow=!state.playing&&!state.drag;});
 }
 const nearby=state.drag?fit(state,state.drag.part):null,hint=getHint(state);
 const indicated=nearby?.near?state.drag.part:hint.level>=3?hint.part:null;
 ring.visible=!!indicated;
 if(indicated){ring.position.copy(targetPoint(indicated));ring.position.y+=.06;ring.material.color.setHex(nearby?.ready?0x95edbc:0xe6c28d);}
 engine.group.updateMatrixWorld(true);
}
function project(point){const r=renderer.domElement.getBoundingClientRect(),p=point.clone().project(camera);return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
function labels(){
 const r=renderer.domElement.getBoundingClientRect();
 for(const id of ORDER){const el=$(`label-${id}`);el.hidden=state.parts[id].status==='joined'||!!state.drag; if(el.hidden)continue;
 const box=new THREE.Box3().setFromObject(roots[id]),pos=box.getCenter(new THREE.Vector3());pos.y=box.max.y+.12;const p=project(pos);el.style.left=`${THREE.MathUtils.clamp(p.x-r.left,45,r.width-45)}px`;el.style.top=`${THREE.MathUtils.clamp(p.y-r.top,100,r.height-80)}px`;}
}
function setView(close=false){if(!camera||failed)return;abortGesture();const target=close&&state.selected?roots[state.selected].getWorldPosition(new THREE.Vector3()):new THREE.Vector3(0,.25,.7);controls.target.copy(target);const narrow=viewport.clientWidth<600;camera.position.copy(target).add(close?new THREE.Vector3(4.6,5.4,6.5):new THREE.Vector3(5.4,10.8,12.8).multiplyScalar(narrow?1.10:1));controls.update();dirty=true;}
function resize(){if(!renderer||failed)return;abortGesture();const w=viewport.clientWidth,h=viewport.clientHeight;camera.aspect=w/h;camera.fov=w<600?44:38;camera.updateProjectionMatrix();renderer.setSize(w,h);dirty=true;}
function rayAt(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.ray;}
function pick(x,y){rayAt(x,y);const meshes=[];engine.group.traverse(child=>{if(child.isMesh&&child.visible&&child.parent.visible)meshes.push(child);});const hit=raycaster.intersectObjects(meshes,false)[0];
 if(hit&&hit.object.userData.part!=='block')return{part:hit.object.userData.part,point:hit.point};
 // Give the physically small loose cap a 44px touch region without scaling its geometry.
 if(state.parts.rodCap.status==='loose'){
  const center=roots.rodCap.getWorldPosition(new THREE.Vector3()),screen=project(center);
  if(Math.hypot(x-screen.x,y-screen.y)<=22&&(!hit||raycaster.ray.origin.distanceTo(center)<hit.distance+.05))return{part:'rodCap',point:center};
 }
 return null;}
function abortGesture(){if(state.drag)dispatch({type:'cancel'});gesture=null;blockedGesture=pointers.size>0;if(controls)controls.enabled=!blockedGesture;if(renderer)renderer.domElement.classList.remove('dragging');}
function wirePointers(){
 const canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',event=>{
  pointers.add(event.pointerId);
  if(pointers.size>1&&gesture){abortGesture();blockedGesture=true;event.stopImmediatePropagation();event.preventDefault();return;}
  if(blockedGesture){event.stopImmediatePropagation();return;}
  if(pointers.size>1||orbitMode||event.button!==0)return;
  const hit=pick(event.clientX,event.clientY);if(!hit)return;
  event.stopImmediatePropagation();event.preventDefault();controls.enabled=false;
  if(state.drag&&state.drag.part!==hit.part)dispatch({type:'cancel'});
  dispatch({type:'select',part:hit.part});
  gesture={id:event.pointerId,part:hit.part,startX:event.clientX,startY:event.clientY,moved:false,plane:null,offset:null};
  canvas.setPointerCapture(event.pointerId);
 },true);
 canvas.addEventListener('pointermove',event=>{
  if(blockedGesture){event.stopImmediatePropagation();return;}if(!gesture||event.pointerId!==gesture.id)return;
  event.stopImmediatePropagation();event.preventDefault();
  if(!gesture.moved&&Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)<5)return;
  if(!gesture.moved){dispatch({type:'begin',part:gesture.part});gesture.moved=true;
   const root=roots[gesture.part];gesture.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-root.position.y);
   const start=rayAt(gesture.startX,gesture.startY).intersectPlane(gesture.plane,new THREE.Vector3());
   gesture.offset=start?new THREE.Vector2(start.x-state.parts[gesture.part].x,start.z-state.parts[gesture.part].z):new THREE.Vector2();canvas.classList.add('dragging');
  }
  const point=rayAt(event.clientX,event.clientY).intersectPlane(gesture.plane,new THREE.Vector3());
  if(point)dispatch({type:'move',x:point.x-gesture.offset.x,z:point.z-gesture.offset.y});
 },true);
 canvas.addEventListener('pointerup',event=>{
  pointers.delete(event.pointerId);
  if(gesture&&event.pointerId===gesture.id){event.stopImmediatePropagation();const drop=gesture.moved;gesture=null;if(drop)dispatch({type:'drop'});canvas.classList.remove('dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}
  if(blockedGesture)event.stopImmediatePropagation();if(!pointers.size){blockedGesture=false;controls.enabled=true;}
 },true);
 canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);if(gesture||blockedGesture){abortGesture();event.stopImmediatePropagation();}if(!pointers.size){blockedGesture=false;controls.enabled=true;}},true);
 canvas.addEventListener('lostpointercapture',event=>{if(gesture?.id===event.pointerId){pointers.delete(event.pointerId);abortGesture();}},true);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();setFailure('The graphics connection was interrupted. Reload the workshop to recover.');});
}
function action(name){
 if(name==='undo'&&state.drag){abortGesture();return;}
 if(['undo','remove','reset','recover','pickup'].includes(name))abortGesture();
 if(name==='reset'){dispatch({type:'reset'});setView();}
 else if(name==='recover'){dispatch({type:'remove',part:state.selected});setView();}
 else if(name==='pickup'){dispatch({type:'begin',part:state.selected});renderer.domElement.focus({preventScroll:true});}
 else dispatch({type:name});
}
function wireControls(){
 document.querySelectorAll('[data-part]').forEach(el=>el.addEventListener('click',()=>{abortGesture();dispatch({type:'select',part:el.dataset.part});}));
 $('rotate-left').addEventListener('click',()=>dispatch({type:'rotate',delta:-15}));$('rotate-right').addEventListener('click',()=>dispatch({type:'rotate',delta:15}));
 for(const id of ['remove','undo','reset','recover','pickup','drop','cancel','hint','step','section'])$(id).addEventListener('click',()=>{if(id==='cancel'){abortGesture();return;}action(id);});
 $('camera-mode').addEventListener('click',()=>{abortGesture();orbitMode=!orbitMode;updateUI();});$('home-view').addEventListener('click',()=>setView());$('inspect').addEventListener('click',()=>setView(true));
 document.querySelectorAll('[data-move]').forEach(el=>el.addEventListener('click',()=>{const[x,z]=el.dataset.move.split(',').map(Number),p=state.parts[state.selected];if(state.drag)dispatch({type:'move',x:p.x+x,z:p.z+z});}));
 $('angle').addEventListener('input',event=>dispatch({type:'angle',angle:Number(event.target.value)*Math.PI/180}));
 $('play').addEventListener('click',()=>{if(!reducedMotion.matches)dispatch({type:'toggle-play'});});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();abortGesture();return;}
  if(event.target!==renderer?.domElement)return;
  const key=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','q','e','enter',' '].includes(key))event.preventDefault();
  if(key==='q'||key==='e')dispatch({type:'rotate',delta:key==='q'?-15:15});
  if(key===' '&&!state.drag&&state.selected)dispatch({type:'begin',part:state.selected});
  if(key==='enter'&&state.drag)dispatch({type:'drop'});
  if(key.startsWith('arrow')&&state.drag){const p=state.parts[state.selected];dispatch({type:'move',x:p.x+(key==='arrowleft'?-.25:key==='arrowright'?.25:0),z:p.z+(key==='arrowup'?-.25:key==='arrowdown'?.25:0)});}
 });
 reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)dispatch({type:'pause'});updateUI();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){abortGesture();dispatch({type:'pause'});}});
 window.addEventListener('blur',()=>{abortGesture();dispatch({type:'pause'});});
}
function setFailure(message){abortGesture();failed=true;state={...state,playing:false};$('loading').hidden=true;$('fallback').hidden=false;if(message)$('fallback-detail').textContent=message;document.querySelectorAll('button,input').forEach(el=>{if(el.id!=='retry')el.disabled=true;});$('part-labels').hidden=true;$('fit-feedback').hidden=true;}
function addBench(){
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x101d25,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.09;floor.receiveShadow=true;scene.add(floor);
 const board=new THREE.Mesh(new RoundedBoxGeometry(9.3,.16,9.1,2,.05),new THREE.MeshStandardMaterial({color:0x24353e,roughness:.66,metalness:.35}));board.position.set(0,-.98,1);board.receiveShadow=true;scene.add(board);
 const supportMaterial=new THREE.MeshStandardMaterial({color:0x111f28,roughness:.6,metalness:.5});
 for(const z of [-1.35,1.35]){const support=new THREE.Mesh(new RoundedBoxGeometry(1.8,.31,.24,2,.04),supportMaterial);support.position.set(0,-.77,z);support.castShadow=true;scene.add(support);}
 ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.018,6,48),new THREE.MeshBasicMaterial({color:0xe6c28d,depthTest:false,transparent:true,opacity:.9}));ring.rotation.x=Math.PI/2;ring.renderOrder=10;ring.visible=false;scene.add(ring);
}
function initialize(){try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label','Engine workbench. Drag visible parts. Select a part with the named buttons for keyboard movement; Space picks up, arrows move, Q and E roll, Enter drops, Escape cancels.');$('canvas-wrap').append(canvas);
 scene=new THREE.Scene();scene.background=new THREE.Color(0x172730);camera=new THREE.PerspectiveCamera(38,1,.05,100);
 const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.04,.1,100,{size:64}).texture;scene.environmentIntensity=.8;environment.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xc0e0ea,0x20323c,.85));const key=new THREE.DirectionalLight(0xffecdd,3);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-6,right:6,top:7,bottom:-6,near:.5,far:22});key.shadow.normalBias=.025;key.shadow.bias=-.00015;scene.add(key);
 const rim=new THREE.DirectionalLight(0xa5ddea,2);rim.position.set(4,5,-4);scene.add(rim);
 engine=createEngine();scene.add(engine.group);prepareRoots();addBench();
 wirePointers();controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=6;controls.maxDistance=28;controls.minPolarAngle=.2;controls.maxPolarAngle=1.3;controls.rotateSpeed=.6;controls.addEventListener('change',()=>{dirty=true;});
 applyState();resize();setView();new ResizeObserver(resize).observe(viewport);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);labels();metrics.readyMs=performance.now();$('loading').hidden=true;viewport.dataset.ready='true';
 let last=performance.now(),shadowKey='',shadowDragging=false;
 function frame(now){if(failed)return;const delta=Math.min((now-last)/1000,.1);last=now;
  if(state.playing&&!document.hidden){const tested=state.tested;state=transition(state,{type:'tick',delta:delta*.62});applyState();if(state.tested!==tested)updateUI();else updateMotionUI();dirty=true;}
  if(dirty&&!document.hidden){const next=`${ORDER.map(id=>{const p=state.parts[id];return `${p.status}/${p.x}/${p.z}/${p.roll}`;}).join(';')}/${state.section}/${!!state.drag}/${state.playing}`;if((!state.drag&&next!==shadowKey)||!!state.drag!==shadowDragging){renderer.shadowMap.needsUpdate=true;shadowKey=next;shadowDragging=!!state.drag;}labels();renderer.render(scene,camera);metrics.frames++;metrics.triangles=renderer.info.render.triangles;metrics.drawCalls=renderer.info.render.calls;dirty=false;}
  requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
 }catch(error){console.error('Workshop initialization failed:',error);setFailure();}}
wireControls();updateUI();initialize();

// Diagnostics report actual transforms and projected geometry; no state-writing API.
function pickPoint(id){
 const root=roots[id],r=renderer.domElement.getBoundingClientRect(),candidates=[];
 root.traverse(child=>{if(!child.isMesh||!child.visible)return;const pos=child.geometry.getAttribute('position');const stride=Math.max(3,Math.floor(pos.count/24/3)*3);for(let i=0;i+2<pos.count;i+=stride){const p=new THREE.Vector3().fromBufferAttribute(pos,i).add(new THREE.Vector3().fromBufferAttribute(pos,i+1)).add(new THREE.Vector3().fromBufferAttribute(pos,i+2)).multiplyScalar(1/3);child.localToWorld(p);candidates.push(project(p));}});
 for(const p of candidates){if(p.x<r.left+10||p.x>r.right-10||p.y<r.top+90||p.y>r.bottom-65)continue;if(pick(p.x,p.y)?.part===id)return p;}return null;
}
Object.defineProperty(window,'__PROJECT442__',{value:Object.freeze({snapshot(){
 const positions=engine?{piston:engine.piston.getWorldPosition(new THREE.Vector3()).toArray(),rodBig:engine.rod.getWorldPosition(new THREE.Vector3()).toArray(),rodSmall:engine.rod.localToWorld(new THREE.Vector3(0,MECHANICS.rodLength,0)).toArray(),rodCap:engine.rodCap.getWorldPosition(new THREE.Vector3()).toArray()}:null;
 return {state:structuredClone(state),failed,positions,camera:camera?.position.toArray(),metrics:{...metrics},gesture:gesture?{part:gesture.part,moved:gesture.moved}:null};
},pickPoint(id){return engine?pickPoint(id):null;},dropPoint(id){if(!gesture?.plane)return null;const t=PARTS[id].target;return project(new THREE.Vector3(t.x+gesture.offset.x,-gesture.plane.constant,t.z+gesture.offset.y));},screenCenter(id){return roots[id]?project(roots[id].getWorldPosition(new THREE.Vector3())):null;},partPosition(id){return roots[id]?.getWorldPosition(new THREE.Vector3()).toArray();}})});
