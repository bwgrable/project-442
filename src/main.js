import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createEngine } from './engine.js';
import { linkage, MECHANICS } from './mechanics.js';
import { PARTS, ORDER, ENGINE_OFFSET, BENCH_Y, PIN_TRAVEL, initialState, transition, fit, canRun, getHint, targetFor } from './subassembly.js';

const $=id=>document.getElementById(id), viewport=$('viewport');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let state=initialState(),renderer,scene,camera,controls,engine,ring,failed=false,dirty=true,orbitMode=false,view='bench';
let gesture=null,blockedGesture=false,dropNotice=null,eyeRing;
const pointers=new Set(),roots={},materials={};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),yAxis=new THREE.Vector3(0,1,0);
const benchRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
const metrics={frames:0,readyMs:0,triangles:0,drawCalls:0};
const shortNames={piston:'Piston',rod:'Connecting rod',pin:'Wrist pin',rodCap:'Rod cap'};
const pinned=()=>state.parts.pin.status==='pinned';
const installed=()=>state.parts.piston.status==='installed';
const worldEngine=point=>new THREE.Vector3(...point).add(new THREE.Vector3(ENGINE_OFFSET.x,0,ENGINE_OFFSET.z));
function benchQuaternion(roll){return benchRotation.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),THREE.MathUtils.degToRad(roll)));}
$('part-list').innerHTML=ORDER.map((id,i)=>`<button class="part-card" data-part="${id}" aria-pressed="false"><span class="symbol" aria-hidden="true">${['◉','⌕','┃','∪'][i]}</span><span><strong>${PARTS[id].name}</strong><small id="status-${id}">Loose on bench</small></span></button>`).join('');
$('part-labels').innerHTML=ORDER.map(id=>`<span class="part-label" id="label-${id}">${shortNames[id]}</span>`).join('');
function dispatch(action){if(failed)return;const dropped=action.type==='drop'&&state.drag;state=transition(state,action);dropNotice=dropped?{message:state.feedback,ready:state.tone==='success'}:null;updateUI();if(engine)applyState();dirty=true;}
function updateMotionUI(){
 $('angle').value=String(Math.round(state.angle*180/Math.PI));$('angle-value').value=`${Math.round(state.angle*180/Math.PI)}°`;
 $('turn-progress').textContent=state.tested?'One full revolution. It works.':`${Math.min(360,Math.round(Math.abs(state.travel)*180/Math.PI))}° / 360° · turn in one direction`;
 $('play').textContent=state.playing?'Pause':'Turn crank';$('completion').hidden=!state.tested;
}
function updateUI(){
 const selected=state.selected,hint=getHint(state),insert=state.parts.pin.status==='aligned';
 const statusText={loose:'Separate · move freely',fitted:'Fitted · not pinned',aligned:'Aligned · slide through',pinned:installed()?'Pinned · in engine':'Pinned · moves as a unit',installed:'Unit in engine',joined:'Crank connection closed'};
 for(const id of ORDER){const button=document.querySelector(`[data-part="${id}"]`);button.setAttribute('aria-pressed',String(selected===id));button.classList.toggle('hinted',hint.level>=3&&hint.part===id);$(`status-${id}`).textContent=id==='piston'&&pinned()&&!installed()?'Pinned · moves as a unit':statusText[state.parts[id].status];}
 $('scene-status').textContent=canRun(state)?'Connected · ready to turn':installed()?'Unit in engine':pinned()?'A pinned, moving joint':insert?'Pin aligned · slide to connect':state.parts.rod.status==='fitted'?'A temporary fit · still separate':'Separate pieces';
 $('selected-name').textContent=selected?(pinned()&&selected!=='rodCap'?'Piston + rod unit':PARTS[selected].name):'Grab a piece.';
 $('roll-value').textContent=selected?(state.drag?.mode==='insert'?`Insertion ${Math.round(state.parts.pin.depth*100)}%`:installed()&&selected!=='rodCap'?'In engine · drag to lift':`Roll ${state.parts[pinned()&&selected!=='rodCap'?'piston':selected].roll}°${state.drag?' · holding':''}`):'Drag a part · empty space orbits';
 for(const id of ['rotate-left','rotate-right'])$(id).disabled=!selected||selected==='pin'&&!pinned()||installed()&&selected!=='rodCap'||state.parts[selected]?.status==='joined'||state.drag?.mode==='insert';
 $('remove').disabled=!selected||!!state.drag;
 $('remove').textContent=installed()&&selected!=='rodCap'?'Lift unit out':'Separate / return';
 $('unpin').hidden=!pinned();$('unpin').disabled=!!state.drag;
 $('recover').disabled=!selected||!!state.drag;$('inspect').disabled=!selected||!!state.drag;
 $('pickup').disabled=!selected||!!state.drag;$('drop').disabled=!state.drag;
 document.querySelectorAll('[data-move]').forEach(el=>el.disabled=!state.drag);
 $('cancel').hidden=!state.drag;$('undo').disabled=!state.history.length&&!state.drag;
 $('feedback').textContent=state.feedback;$('feedback').dataset.tone=state.tone;
 $('hint').textContent=hint.level===0?'Want a hint?':hint.level<4?'A little more help':'Walkthrough shown';
 $('hint').disabled=hint.level>=4||canRun(state);$('hint-level').textContent=hint.level?`${hint.level} / 4`:'OPTIONAL';
 $('hint-content').hidden=!hint.level;$('hint-title').textContent=hint.title;$('hint-copy').textContent=hint.text;
 $('joint-controls').hidden=!pinned()||installed();$('pivot').value=String(state.pivot);$('pivot-value').value=`${state.pivot}°`;$('pivot').disabled=!!state.drag;
 $('insertion-controls').hidden=!insert;$('pin-depth').value=`${Math.round(state.parts.pin.depth*100)}% through · release fully inserted to join`;
 for(const id of ['pin-in','pin-out','pin-release'])$(id).disabled=!!state.drag&&state.drag.mode!=='insert';
 $('motion-controls').hidden=!canRun(state);$('play').disabled=reducedMotion.matches;
 $('play').title=reducedMotion.matches?'Reduced motion: use the slider or Step.':'';
 $('section').setAttribute('aria-pressed',String(state.section));
 $('camera-mode').setAttribute('aria-pressed',String(orbitMode));$('camera-mode').textContent=orbitMode?'Move parts':'Orbit view';
 const nearby=state.drag?fit(state,state.drag.part):null;
 $('fit-feedback').hidden=!nearby?.near&&state.drag?.mode!=='insert'&&!dropNotice;
 if(state.drag?.mode==='insert'){$('fit-feedback').textContent=state.parts.pin.depth>=.92?'Pin through. Release to join.':'Slide the pin along its axis.';$('fit-feedback').dataset.ready=String(state.parts.pin.depth>=.92);}
 else if(nearby?.near){$('fit-feedback').textContent=nearby.message;$('fit-feedback').dataset.ready=String(nearby.ready);}
 else if(dropNotice){$('fit-feedback').textContent=dropNotice.message;$('fit-feedback').dataset.ready=String(dropNotice.ready);}
 updateMotionUI();
}
function prepareRoots(){
 roots.piston=engine.piston;roots.rod=engine.rod;roots.pin=engine.wristPin;roots.rodCap=engine.rodCap;
 engine.group.position.set(ENGINE_OFFSET.x,0,ENGINE_OFFSET.z);
 for(const id of ORDER){scene.add(roots[id]);materials[id]=new Set();roots[id].traverse(child=>{if(child.isMesh){child.material=child.material.clone();child.userData.part=id;materials[id].add(child.material);}});}
 engine.group.traverse(child=>{if(child.isMesh)child.userData.part='block';});
}
function benchWrist(id){const p=state.parts[id];return new THREE.Vector3(p.x,BENCH_Y,p.z);}
function applyState(){
 engine.setSection(state.section);engine.crankshaft.rotation.z=-state.angle;
 engine.crankshaft.traverse(child=>{if(child.isMesh)child.castShadow=!state.playing;});
 const pose=linkage(state.angle),piston=state.parts.piston,rod=state.parts.rod,pin=state.parts.pin,cap=state.parts.rodCap;
 if(installed()){
  roots.piston.position.copy(worldEngine(pose.wristpin));roots.piston.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(...pose.axis));
  roots.rod.position.copy(worldEngine(pose.crankpin));roots.rod.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(...pose.wristpin).sub(new THREE.Vector3(...pose.crankpin)).normalize());
  roots.pin.position.copy(worldEngine(pose.wristpin));roots.pin.quaternion.identity();
 }else{
  roots.piston.position.copy(benchWrist('piston'));roots.piston.quaternion.copy(benchQuaternion(piston.roll));
  const attached=rod.status==='fitted'||rod.status==='pinned';
  const wrist=attached?benchWrist('piston'):benchWrist('rod');
  const q=benchQuaternion(attached?piston.roll+state.pivot:rod.roll);
  roots.rod.quaternion.copy(q);roots.rod.position.copy(wrist).sub(new THREE.Vector3(0,MECHANICS.rodLength,0).applyQuaternion(q));
  roots.pin.quaternion.copy(benchRotation);
  roots.pin.position.copy(pin.status==='loose'?benchWrist('pin'):benchWrist('piston'));
  roots.pin.position.y+=pin.status==='aligned'?PIN_TRAVEL*(1-pin.depth):0;
 }
 if(cap.status==='joined'){roots.rodCap.position.copy(worldEngine(pose.crankpin));roots.rodCap.quaternion.copy(roots.rod.quaternion);}
 else {roots.rodCap.position.copy(benchWrist('rodCap'));roots.rodCap.quaternion.copy(benchQuaternion(cap.roll));}
 for(const id of ORDER){const selected=state.selected===id||(pinned()&&state.selected&&state.selected!=='rodCap'&&id!=='rodCap');for(const material of materials[id]){material.emissive.setHex(selected?0x1b7083:0);material.emissiveIntensity=selected?.16:0;}roots[id].traverse(child=>{if(child.isMesh)child.castShadow=!state.playing&&!state.drag;});}
 const nearby=state.drag?fit(state,state.drag.part):null,hint=getHint(state),indicated=nearby?.near?state.drag.part:hint.level>=3?hint.part:null;
 ring.visible=!!indicated&&state.drag?.mode!=='insert';
 eyeRing.visible=state.drag?.part==='rod'&&!!nearby?.near;
 if(eyeRing.visible){eyeRing.position.set(rod.x,BENCH_Y+.04,rod.z);eyeRing.material.color.setHex(nearby.ready?0x95edbc:0xe6c28d);}
 if(indicated){const t=targetFor(state,indicated);ring.position.set(t.x,indicated==='piston'||indicated==='rodCap'?worldEngine(linkage(0)[indicated==='piston'?'wristpin':'crankpin']).y:BENCH_Y+.04,t.z);ring.material.color.setHex(nearby?.ready?0x95edbc:0xe6c28d);}
 scene.updateMatrixWorld(true);
}
function project(point){const r=renderer.domElement.getBoundingClientRect(),p=point.clone().project(camera);return{x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};}
function labels(){
 const r=renderer.domElement.getBoundingClientRect();
 for(const id of ORDER){const el=$(`label-${id}`);el.hidden=state.parts[id].status!=='loose'||!!state.drag||(pinned()&&id==='piston');if(el.hidden)continue;
 const box=new THREE.Box3().setFromObject(roots[id]),pos=box.getCenter(new THREE.Vector3());pos.y=box.max.y+.12;const projected=pos.clone().project(camera);if(Math.abs(projected.x)>.95||Math.abs(projected.y)>.85){el.hidden=true;continue;}const p=project(pos);el.style.left=`${THREE.MathUtils.clamp(p.x-r.left,35,r.width-35)}px`;el.style.top=`${THREE.MathUtils.clamp(p.y-r.top,80,r.height-70)}px`;}
}
function setView(mode='bench'){
 if(!camera||failed)return;abortGesture();view=mode;let target,offset;
 if(mode==='mechanism'){target=worldEngine(linkage(state.angle).wristpin);offset=new THREE.Vector3(1.8,2.8,3.9);}
 else if(mode==='inspect'&&state.selected){target=roots[state.selected].getWorldPosition(new THREE.Vector3());offset=new THREE.Vector3(1.3,3,2.7);}
 else if(mode==='engine'){target=new THREE.Vector3(-.4,.1,.6);offset=new THREE.Vector3(5,9,11);}
 else {target=new THREE.Vector3(1.25,-.3,2.15);offset=new THREE.Vector3(.9,4.9,4.8);}
 if(viewport.clientWidth<600)offset.multiplyScalar(mode==='engine'?1.07:1.1);
 controls.target.copy(target);camera.position.copy(target).add(offset);controls.update();dirty=true;
}
function resize(){if(!renderer||failed)return;abortGesture();const w=viewport.clientWidth,h=viewport.clientHeight;camera.aspect=w/h;camera.fov=w<600?44:38;camera.updateProjectionMatrix();renderer.setSize(w,h);dirty=true;}
function rayAt(x,y){const r=renderer.domElement.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.ray;}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function pick(x,y){
 rayAt(x,y);const meshes=[];for(const root of [engine.group,...Object.values(roots)])root.traverse(child=>{if(child.isMesh&&visible(child))meshes.push(child);});
 const hit=raycaster.intersectObjects(meshes,false)[0];if(hit&&hit.object.userData.part!=='block')return{part:hit.object.userData.part,point:hit.point};
 for(const id of ['pin','rodCap'])if(state.parts[id].status!=='joined'&&state.parts[id].status!=='pinned'){
  const center=roots[id].getWorldPosition(new THREE.Vector3()),screen=project(center);
  if(Math.hypot(x-screen.x,y-screen.y)<=22&&(!hit||raycaster.ray.origin.distanceTo(center)<hit.distance+.1))return{part:id,point:center};
 }return null;
}
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
  if(state.drag)dispatch({type:'cancel'});dispatch({type:'select',part:hit.part});
  gesture={id:event.pointerId,part:hit.part,startX:event.clientX,startY:event.clientY,moved:false,plane:null,offset:null};canvas.setPointerCapture(event.pointerId);
 },true);
 canvas.addEventListener('pointermove',event=>{
  if(blockedGesture){event.stopImmediatePropagation();return;}if(!gesture||event.pointerId!==gesture.id)return;
  event.stopImmediatePropagation();event.preventDefault();
  if(!gesture.moved&&Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)<5)return;
  if(!gesture.moved){dispatch({type:'begin',part:gesture.part});gesture.moved=true;gesture.part=state.drag.part;
   if(state.drag.mode==='insert'){
    gesture.depth=state.parts.pin.depth;const center=roots.pin.position.clone(),a=project(center),b=project(center.clone().add(new THREE.Vector3(0,-PIN_TRAVEL,0)));gesture.axis={x:b.x-a.x,y:b.y-a.y};
   }else{
    gesture.plane=new THREE.Plane(new THREE.Vector3(0,1,0),-BENCH_Y);const start=rayAt(gesture.startX,gesture.startY).intersectPlane(gesture.plane,new THREE.Vector3());const p=state.parts[gesture.part];gesture.offset=start?new THREE.Vector2(start.x-p.x,start.z-p.z):new THREE.Vector2();
   }canvas.classList.add('dragging');
  }
  if(state.drag.mode==='insert'){
   const a=gesture.axis,den=a.x*a.x+a.y*a.y;dispatch({type:'insert',depth:gesture.depth+((event.clientX-gesture.startX)*a.x+(event.clientY-gesture.startY)*a.y)/Math.max(den,1)});
  }else{const point=rayAt(event.clientX,event.clientY).intersectPlane(gesture.plane,new THREE.Vector3());if(point)dispatch({type:'move',x:point.x-gesture.offset.x,z:point.z-gesture.offset.y});}
 },true);
 canvas.addEventListener('pointerup',event=>{
  pointers.delete(event.pointerId);if(gesture&&event.pointerId===gesture.id){event.stopImmediatePropagation();const drop=gesture.moved;gesture=null;if(drop)dispatch({type:'drop'});canvas.classList.remove('dragging');if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}
  if(blockedGesture)event.stopImmediatePropagation();if(!pointers.size){blockedGesture=false;controls.enabled=true;}
 },true);
 canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);if(gesture||blockedGesture){abortGesture();event.stopImmediatePropagation();}if(!pointers.size){blockedGesture=false;controls.enabled=true;}},true);
 canvas.addEventListener('lostpointercapture',event=>{if(gesture?.id===event.pointerId){pointers.delete(event.pointerId);abortGesture();}},true);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();setFailure('The graphics connection was interrupted. Reload the workshop to recover.');});
}
function action(name){
 if(name==='undo'&&state.drag){abortGesture();return;}
 if(['undo','remove','unpin','reset','recover','pickup'].includes(name))abortGesture();
 if(name==='reset'){dispatch({type:'reset'});setView();}
 else if(name==='recover'){dispatch({type:'remove',part:state.selected});setView();}
 else if(name==='pickup'){dispatch({type:'begin',part:state.selected});renderer.domElement.focus({preventScroll:true});}
 else dispatch({type:name});
}
function nudge(x,z){if(!state.drag)return;if(state.drag.mode==='insert'){dispatch({type:'insert',depth:state.parts.pin.depth+z*.6});return;}const p=state.parts[state.drag.part];dispatch({type:'move',x:p.x+x,z:p.z+z});}
function pinStep(delta){if(state.parts.pin.status!=='aligned')return;if(!state.drag){dispatch({type:'select',part:'pin'});dispatch({type:'begin',part:'pin'});}dispatch({type:'insert',depth:state.parts.pin.depth+delta});}
function wireControls(){
 document.querySelectorAll('[data-part]').forEach(el=>el.addEventListener('click',()=>{abortGesture();dispatch({type:'select',part:el.dataset.part});}));
 $('rotate-left').addEventListener('click',()=>dispatch({type:'rotate',delta:-15}));$('rotate-right').addEventListener('click',()=>dispatch({type:'rotate',delta:15}));
 for(const id of ['remove','unpin','undo','reset','recover','pickup','drop','cancel','hint','step','section'])$(id).addEventListener('click',()=>{if(id==='cancel'){abortGesture();return;}action(id);});
 $('camera-mode').addEventListener('click',()=>{abortGesture();orbitMode=!orbitMode;updateUI();});$('home-view').addEventListener('click',()=>setView());$('engine-view').addEventListener('click',()=>setView('engine'));$('inspect').addEventListener('click',()=>setView('inspect'));
 $('pivot').addEventListener('input',event=>dispatch({type:'pivot',delta:Number(event.target.value)-state.pivot}));
 $('motion-view').addEventListener('click',()=>setView('mechanism'));
 $('pin-in').addEventListener('click',()=>pinStep(.15));$('pin-out').addEventListener('click',()=>pinStep(-.15));$('pin-release').addEventListener('click',()=>{if(state.drag?.mode==='insert')dispatch({type:'drop'});});
 document.querySelectorAll('[data-move]').forEach(el=>el.addEventListener('click',()=>nudge(...el.dataset.move.split(',').map(Number))));
 $('angle').addEventListener('input',event=>dispatch({type:'angle',angle:Number(event.target.value)*Math.PI/180}));$('play').addEventListener('click',()=>{if(!reducedMotion.matches)dispatch({type:'toggle-play'});});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();abortGesture();return;}if(event.target!==renderer?.domElement)return;
  const key=event.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','q','e','enter',' '].includes(key))event.preventDefault();
  if(key==='q'||key==='e')dispatch({type:'rotate',delta:key==='q'?-15:15});
  if(key===' '&&!state.drag&&state.selected)dispatch({type:'begin',part:state.selected});if(key==='enter'&&state.drag)dispatch({type:'drop'});
  if(key.startsWith('arrow')&&state.drag)nudge(key==='arrowleft'?-.2:key==='arrowright'?.2:0,key==='arrowup'?-.2:key==='arrowdown'?.2:0);
 });
 reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)dispatch({type:'pause'});updateUI();});document.addEventListener('visibilitychange',()=>{if(document.hidden){abortGesture();dispatch({type:'pause'});}});window.addEventListener('blur',()=>{abortGesture();dispatch({type:'pause'});});
}
function setFailure(message){abortGesture();failed=true;state={...state,playing:false};$('loading').hidden=true;$('fallback').hidden=false;if(message)$('fallback-detail').textContent=message;document.querySelectorAll('button,input').forEach(el=>{if(el.id!=='retry')el.disabled=true;});$('part-labels').hidden=true;$('fit-feedback').hidden=true;}
function addBench(){
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x101d25,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.09;floor.receiveShadow=true;scene.add(floor);
 const board=new THREE.Mesh(new RoundedBoxGeometry(10,.16,11,2,.05),new THREE.MeshStandardMaterial({color:0x24353e,roughness:.76,metalness:.15}));board.position.set(0,-.85,.4);board.receiveShadow=true;scene.add(board);
 const mat=new THREE.Mesh(new RoundedBoxGeometry(4.4,.04,4.6,2,.07),new THREE.MeshStandardMaterial({color:0x38565c,roughness:.9}));mat.position.set(1.2,-.74,2.05);mat.receiveShadow=true;scene.add(mat);
 ring=new THREE.Mesh(new THREE.TorusGeometry(.25,.012,6,48),new THREE.MeshBasicMaterial({color:0xe6c28d,depthTest:false,transparent:true,opacity:.9}));ring.rotation.x=Math.PI/2;ring.renderOrder=10;ring.visible=false;scene.add(ring);
 eyeRing=new THREE.Mesh(new THREE.TorusGeometry(.14,.014,6,32),new THREE.MeshBasicMaterial({color:0xe6c28d,depthTest:false}));eyeRing.rotation.x=Math.PI/2;eyeRing.renderOrder=11;eyeRing.visible=false;scene.add(eyeRing);
}
function initialize(){try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','application');canvas.setAttribute('aria-label','Subassembly workbench. Drag visible pieces. Space picks up, arrows move or slide the aligned pin, Q and E roll, Enter releases, Escape cancels.');$('canvas-wrap').append(canvas);
 scene=new THREE.Scene();scene.background=new THREE.Color(0x172730);camera=new THREE.PerspectiveCamera(38,1,.05,100);
 const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.04,.1,100,{size:64}).texture;scene.environmentIntensity=.8;environment.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xc0e0ea,0x20323c,.85));const key=new THREE.DirectionalLight(0xffecdd,3);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-7,right:7,top:8,bottom:-7,near:.5,far:24});key.shadow.normalBias=.025;key.shadow.bias=-.00015;scene.add(key);
 const rim=new THREE.DirectionalLight(0xa5ddea,2);rim.position.set(4,5,-4);scene.add(rim);
 engine=createEngine();scene.add(engine.group);prepareRoots();addBench();wirePointers();controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.enablePan=false;controls.minDistance=2.5;controls.maxDistance=28;controls.minPolarAngle=.2;controls.maxPolarAngle=1.45;controls.rotateSpeed=.6;controls.addEventListener('change',()=>{dirty=true;});
 applyState();resize();setView();new ResizeObserver(resize).observe(viewport);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);labels();metrics.readyMs=performance.now();$('loading').hidden=true;viewport.dataset.ready='true';
 let last=performance.now(),shadowKey='',shadowDragging=false;
 function frame(now){if(failed)return;const delta=Math.min((now-last)/1000,.1);last=now;
  if(state.playing&&!document.hidden){const tested=state.tested;state=transition(state,{type:'tick',delta:delta*.62});applyState();if(state.tested!==tested)updateUI();else updateMotionUI();dirty=true;}
  if(dirty&&!document.hidden){const next=JSON.stringify([state.parts,state.pivot,state.section,!!state.drag,state.playing,state.playing?null:state.angle]);if((!state.drag&&next!==shadowKey)||!!state.drag!==shadowDragging){renderer.shadowMap.needsUpdate=true;shadowKey=next;shadowDragging=!!state.drag;}labels();renderer.render(scene,camera);metrics.frames++;metrics.triangles=renderer.info.render.triangles;metrics.drawCalls=renderer.info.render.calls;dirty=false;}
  requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
 }catch(error){console.error('Workshop initialization failed:',error);setFailure();}}
wireControls();updateUI();initialize();

// Read-only diagnostics project actual geometry so browser tests can drive normal input.
function pickPoint(id,nearJoint=false){
 const root=roots[id],r=renderer.domElement.getBoundingClientRect(),candidates=[];
 root.traverse(child=>{if(!child.isMesh||!visible(child))return;const pos=child.geometry.getAttribute('position');const stride=Math.max(3,Math.floor(pos.count/40/3)*3);for(let i=0;i+2<pos.count;i+=stride){const p=new THREE.Vector3().fromBufferAttribute(pos,i).add(new THREE.Vector3().fromBufferAttribute(pos,i+1)).add(new THREE.Vector3().fromBufferAttribute(pos,i+2)).multiplyScalar(1/3);child.localToWorld(p);candidates.push(project(p));}});
 if(nearJoint&&id==='rod'){const eye=project(root.localToWorld(new THREE.Vector3(0,MECHANICS.rodLength,0)));candidates.sort((a,b)=>Math.hypot(a.x-eye.x,a.y-eye.y)-Math.hypot(b.x-eye.x,b.y-eye.y));}
 for(const p of candidates){if(p.x<r.left+10||p.x>r.right-10||p.y<r.top+80||p.y>r.bottom-65)continue;if(pick(p.x,p.y)?.part===id)return p;}return null;
}
Object.defineProperty(window,'__PROJECT442__',{value:Object.freeze({snapshot(){
 const positions=engine?{piston:roots.piston.getWorldPosition(new THREE.Vector3()).toArray(),rodBig:roots.rod.getWorldPosition(new THREE.Vector3()).toArray(),rodSmall:roots.rod.localToWorld(new THREE.Vector3(0,MECHANICS.rodLength,0)).toArray(),pin:roots.pin.getWorldPosition(new THREE.Vector3()).toArray(),rodCap:roots.rodCap.getWorldPosition(new THREE.Vector3()).toArray()}:null;
 return {state:structuredClone(state),failed,positions,camera:camera?.position.toArray(),metrics:{...metrics},gesture:gesture?{part:gesture.part,moved:gesture.moved}:null};
},pickPoint(id,nearJoint=false){return engine?pickPoint(id,nearJoint):null;},jointScreen(id){return engine?project(id==='rod'?roots.rod.localToWorld(new THREE.Vector3(0,MECHANICS.rodLength,0)):roots.piston.getWorldPosition(new THREE.Vector3())):null;},dropPoint(id){if(!gesture?.plane)return null;const t=targetFor(state,id);return project(new THREE.Vector3(t.x+gesture.offset.x,BENCH_Y,t.z+gesture.offset.y));},movePoint(x,z){if(!gesture?.plane)return null;return project(new THREE.Vector3(x+gesture.offset.x,BENCH_Y,z+gesture.offset.y));},insertionPoint(depth=1){if(!gesture?.axis)return null;return{x:gesture.startX+gesture.axis.x*(depth-gesture.depth),y:gesture.startY+gesture.axis.y*(depth-gesture.depth)};},screenCenter(id){return roots[id]?project(roots[id].getWorldPosition(new THREE.Vector3())):null;},partPosition(id){return roots[id]?.getWorldPosition(new THREE.Vector3()).toArray();}})});
