import './pilot.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createPilotEngine } from './pilot-model.js';
import { linkage, MECHANICS } from './mechanics.js';
import { PARTS, ORDER, initialState, transition, missingFor, canRun } from './pilot-state.js';

const $=id=>document.getElementById(id), viewport=$('viewport');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let state=initialState(),engine,renderer,scene,camera,failed=false,dirty=true;
let section=true,side=false,inspection=null,blockInfo=false;
const roots={},materials={},yAxis=new THREE.Vector3(0,1,0);
const metrics={readyMs:0,frames:0,triangles:0,drawCalls:0};
const icons={
 crank:'<path d="M5 20h10v-8h10v16h12V12h10v8h12"/><path d="M15 8v8m10 8v8m12-24v8m10 0v8"/><circle cx="5" cy="20" r="3"/><circle cx="59" cy="20" r="3"/>',
 piston:'<ellipse cx="32" cy="8" rx="18" ry="5"/><path d="M14 8v25c9 5 27 5 36 0V8M14 14c9 5 27 5 36 0M14 19c9 5 27 5 36 0"/><circle cx="32" cy="29" r="4"/>',
 rod:'<circle cx="17" cy="29" r="10"/><circle cx="17" cy="29" r="6"/><circle cx="49" cy="10" r="6"/><circle cx="49" cy="10" r="3"/><path d="m23 21 20-13m-16 21 19-14M23 25l19-12"/>',
 pin:'<ellipse cx="13" cy="25" rx="7" ry="10"/><ellipse cx="13" cy="25" rx="4" ry="6"/><path d="M13 15 49 4c10-1 14 16 5 20L13 35M20 26l35-11"/>'
};
const color={crank:'#446875',piston:'#61726d',rod:'#66787f',pin:'#a5773e'};
$('part-list').innerHTML=ORDER.map(id=>'<button class="part-card" data-part="'+id+'" aria-pressed="false" style="--part-color:'+color[id]+'"><svg viewBox="0 0 64 42" aria-hidden="true">'+icons[id]+'</svg><span class="part-state" aria-hidden="true">+</span><strong>'+PARTS[id].name+'</strong><small id="status-'+id+'">Tap to add</small></button>').join('');

function dispatch(event){
 if(failed)return;
 state=transition(state,event);updateUI();if(engine)applyState();dirty=true;
}
function showAssembly(){
 inspection=null;blockInfo=false;applyState();frameCamera();updateUI();dirty=true;
}
function choose(id){
 inspection=null;blockInfo=false;
 dispatch({type:'select',part:id});frameCamera();
}
function explanation(){
 if(blockInfo)return 'The section opens the cylinder wall so the piston and wrist joint remain visible. The lower supports hold the crankshaft on its main axis. The copper faces mark where material has been cut away in this model.';
 const id=state.selected;
 if(!id)return 'Crankshaft and piston can be added in either order. The connecting rod needs both of those connection points. The wrist pin then completes the piston-to-rod pivot. These are learning dependencies, not a factory assembly sequence.';
 const missing=missingFor(state,id);
 return (missing.length?'Still needed: '+missing.map(p=>PARTS[p].name).join(' + ')+'. ':'')+PARTS[id].detail;
}
function updateMotionUI(){
 const ready=canRun(state);
 $('play').disabled=!ready||reduced.matches||!!inspection;
 $('step').disabled=!ready||!!inspection;$('angle').disabled=!ready||!!inspection;
 $('play').textContent=state.playing?'Ⅱ Pause':'Turn slowly';
 $('angle').value=String(Math.round(state.angle*180/Math.PI));
 $('angle-value').value=Math.round(state.angle*180/Math.PI)+'°';
 $('motion-title').textContent=ready?'The connections make it move.':'Bring the assembly to life.';
 $('motion-status').textContent=ready?'Four parts · one mechanism':'Waiting for the four parts';
 $('motion-copy').textContent=ready?'Turn the crank slowly and follow the rod between its two ends.':'The wrist pin, rod and crank turn separate parts into a moving mechanism.';
 const cycle=(state.angle-MECHANICS.bankAngle+2*Math.PI)%(2*Math.PI);
 $('motion-explanation').textContent=!ready?'Complete the connections to explore their movement.':inspection?'Return to the assembly to see the connected motion.':reduced.matches?'Reduced motion is on. Use the crank slider or Step 15° to explore.':cycle<.12||cycle>2*Math.PI-.12?'Near the outer end of travel: the piston changes direction while the crank keeps turning.':Math.abs(cycle-Math.PI)<.12?'Near the inner end of travel: the piston reverses direction again.':'The crankpin circles. The rod swings at the wrist pin while the piston stays on the cylinder axis.';
}
function updateUI(){
 const selected=state.selected;
 for(const id of ORDER){
  const el=document.querySelector('[data-part="'+id+'"]'),added=state.installed[id],blocked=missingFor(state,id).length>0;
  el.setAttribute('aria-pressed',String(selected===id&&!blockInfo));el.dataset.installed=String(added);el.dataset.blocked=String(blocked);
  $('status-'+id).textContent=added?'Added · select to learn':blocked?'Needs a connection first':'Tap to add';
  el.querySelector('.part-state').textContent=added?'✓':'+';
 }
 $('part-count').textContent=ORDER.filter(id=>state.installed[id]).length+' / 4 added';
 $('feedback').textContent=state.feedback;$('feedback').dataset.tone=state.tone==='blocked'?'error':state.tone;
 $('detail-kicker').textContent=blockInfo?'THE FOUNDATION':selected?'COMPONENT STUDY':'START WITH CURIOSITY';
 $('detail-name').textContent=blockInfo?'Engine block':selected?PARTS[selected].name:'Four parts. One relationship.';
 $('detail-role').textContent=blockInfo?'The casting locates the cylinder and supports the rotating crankshaft. A cutaway reveals the spaces where the other parts belong.':selected?PARTS[selected].role:'The piston travels in the cylinder. A rod joins it to the crankshaft, and a wrist pin lets that joint pivot.';
 $('detail-status').textContent=blockInfo?'Prepared':selected?state.installed[selected]?'Added to assembly':'Not added yet':'';
 const features=blockInfo?['Cylinder liner','Machined deck','Main bearing supports']:selected?PARTS[selected].features:[];
 $('detail-features').replaceChildren(...features.map(text=>{const el=document.createElement('li');el.textContent=text;return el;}));
 $('inspect').disabled=(!blockInfo&&(!selected||!state.installed[selected]))||!!inspection;
 $('inspect').textContent=inspection?'Detail view open':'Look closer';
 $('hint').setAttribute('aria-expanded',String(state.hint));
 $('hint').innerHTML=(state.hint?'Hide explanation':'Explain '+(blockInfo?'the block':selected?'this connection':'the connections'))+' <span>'+(state.hint?'−':'＋')+'</span>';
 $('hint-content').hidden=!state.hint;$('hint-content').textContent=explanation();
 $('section').setAttribute('aria-pressed',String(section));$('section').querySelector('span').textContent=section?'On':'Off';
 $('section').disabled=!!inspection&&inspection!=='block';$('side-view').setAttribute('aria-pressed',String(side));$('side-view').disabled=!!inspection&&inspection!=='block';
 $('back-view').hidden=!inspection;$('view-title').textContent=inspection?'Component detail':side?'Side view':'Assembly view';
 const sceneId=inspection||(!blockInfo&&selected?selected:'block');
 const blocked=sceneId!=='block'&&!state.installed[sceneId];
 document.querySelector('.view-caption').dataset.blocked=String(blocked);
 $('scene-kicker').textContent=inspection?'LOOK CLOSER':blocked?'CONNECTION NOT READY':sceneId==='block'?'THE FOUNDATION':'IN THE ASSEMBLY';
 $('scene-name').textContent=sceneId==='block'?'Engine block':PARTS[sceneId].name;
 $('scene-description').textContent=inspection?'Isolated for inspection. Your assembly is preserved.':blocked?state.feedback:sceneId==='block'?'A section through the casting reveals the cylinder and crank supports.':PARTS[sceneId].role;
 $('scene-note').textContent=inspection?'Illustrative geometry · enlarged detail':section?'Cut surfaces shown in copper':'Complete cylinder wall · use Cutaway to see inside';
 updateMotionUI();
}
function applyState(){
 const pose=linkage(state.angle);
 engine.crankshaft.rotation.z=-state.angle;
 engine.piston.position.set(...pose.wristpin);engine.piston.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(...pose.axis));
 engine.rod.position.set(...pose.crankpin);engine.rod.quaternion.setFromUnitVectors(yAxis,new THREE.Vector3(...pose.wristpin).sub(new THREE.Vector3(...pose.crankpin)).normalize());
 engine.rodCap.position.copy(engine.rod.position);engine.rodCap.quaternion.copy(engine.rod.quaternion);
 engine.wristPin.position.set(...pose.wristpin);
 engine.setSection(section);
 for(const id of ['block',...ORDER])roots[id].visible=inspection?inspection===id:id==='block'||state.installed[id];
 engine.rodCap.visible=roots.rod.visible;
 for(const [id,set] of Object.entries(materials)){
  const highlight=!inspection&&!blockInfo&&state.selected===id&&state.installed[id];
  for(const m of set){m.emissive.setHex(highlight?0x426147:0);m.emissiveIntensity=highlight?.12:0;}
 }
 engine.group.updateMatrixWorld(true);updateLabels();
}
function frameCamera(){
 if(!camera||!engine)return;
 const width=viewport.clientWidth,height=viewport.clientHeight,aspect=width/height;
 let target=new THREE.Vector3(.43,.7,MECHANICS.station),span=3.8,offset=side?new THREE.Vector3(.1,.15,8):new THREE.Vector3(3.2,2.2,7);
 if(inspection){
  const box=new THREE.Box3().setFromObject(roots[inspection]),size=box.getSize(new THREE.Vector3());target=box.getCenter(new THREE.Vector3());
  span=Math.max(size.x,size.y,size.z)*1.8;
  if(inspection==='pin'){span=1.1;offset=new THREE.Vector3(3,1.4,4);}
  else if(inspection==='piston'){span=1.4;offset=new THREE.Vector3(2.5,2.4,4);}
  else if(inspection==='rod'){span=2.6;offset=new THREE.Vector3(1.8,1,6);}
  else if(inspection==='crank'){span=2.5;offset=new THREE.Vector3(3,1.7,4);}
 }
 // Leave room for the caption above the exhibit and the return control below it.
 span*=Math.max(1,1/aspect);
 camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span*.57;camera.bottom=-span*.43;
 camera.position.copy(target).add(offset);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 updateLabels();dirty=true;
}
const featureDefs={
 block:[{text:'Cylinder liner',point:[1.3,1.3,1.2]},{text:'Main bearing',point:[0,0,1.75]}],
 piston:[{text:'Ring grooves',point:[.25,.17,0]},{text:'Open wrist bore',point:[0,0,.29]}],
 rod:[{text:'Small end · wrist pin',point:[0,1.45,0]},{text:'Large end · crankpin',point:[0,0,.1]}],
 pin:[{text:'Hollow bore',point:[0,0,.32]},{text:'Pivot surface',point:[.075,0,0]}],
 crank:[{text:'Offset crank journal',point:[0,.42,1.2]},{text:'Main journal axis',point:[0,0,1.95]}]
};
function updateLabels(){
 if(!engine||!camera)return;
 const holder=$('feature-labels');holder.replaceChildren();if(!inspection)return;
 const w=viewport.clientWidth,h=viewport.clientHeight,placed=[];
 for(const feature of featureDefs[inspection]||[]){
  const point=roots[inspection].localToWorld(new THREE.Vector3(...feature.point)).project(camera);
  const el=document.createElement('span');el.className='feature-label';el.textContent=feature.text;
  const x=Math.max(12,Math.min(w-140,(point.x+1)*w/2+15));
  let y=Math.max(110,Math.min(h-110,(1-point.y)*h/2));
  for(const other of placed)if(Math.abs(x-other.x)<138&&Math.abs(y-other.y)<34)y=other.y-38;
  placed.push({x,y});
  el.style.left=x+'px';el.style.top=y+'px';holder.append(el);
 }
}
function resize(){if(!renderer||failed)return;renderer.setSize(viewport.clientWidth,viewport.clientHeight);frameCamera();}
function fail(message){
 failed=true;state={...state,playing:false};$('loading').hidden=true;$('fallback').hidden=false;
 if(message)$('fallback-detail').textContent=message;
 document.querySelectorAll('button,input').forEach(el=>{if(el.id!=='retry')el.disabled=true;});
 $('feature-labels').replaceChildren();
}
function initialize(){
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','Illustrative one-cylinder engine. Use the part buttons to add components and the view controls to inspect them.');
  $('canvas-wrap').append(renderer.domElement);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('The graphics connection was interrupted. Reload the explorer to recover.');});
  scene=new THREE.Scene();scene.background=new THREE.Color(0xdce2d9);
  camera=new THREE.OrthographicCamera(-3,3,3,-3,.01,100);
  const environment=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(environment,.04,.1,100,{size:64}).texture;scene.environmentIntensity=.65;environment.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf4f6e9,0x687970,2));
  const key=new THREE.DirectionalLight(0xfff1d9,3);key.position.set(-3,6,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0xdaeaff,2);rim.position.set(4,3,-4);scene.add(rim);
  engine=createPilotEngine();scene.add(engine.group);
  Object.assign(roots,{block:engine.block,crank:engine.crankshaft,piston:engine.piston,rod:engine.rod,pin:engine.wristPin});
  for(const [id,root] of Object.entries(roots)){materials[id]=new Set();root.traverse(o=>{if(o.isMesh)materials[id].add(o.material);});}
  engine.rodCap.traverse(o=>{if(o.isMesh)materials.rod.add(o.material);});
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2,64),new THREE.MeshBasicMaterial({color:0xcdd6cb}));floor.rotation.x=-Math.PI/2;floor.position.set(.4,-.82,1.2);scene.add(floor);
  applyState();resize();new ResizeObserver(resize).observe(viewport);renderer.render(scene,camera);updateUI();
  metrics.readyMs=performance.now();$('loading').hidden=true;viewport.dataset.ready='true';
  let last=performance.now();
  function frame(now){
   if(failed)return;
   const delta=Math.min((now-last)/1000,.25);last=now;
   if(state.playing&&!document.hidden){state=transition(state,{type:'tick',delta});applyState();updateMotionUI();dirty=true;}
   if(dirty&&!document.hidden){renderer.render(scene,camera);metrics.frames++;metrics.triangles=renderer.info.render.triangles;metrics.drawCalls=renderer.info.render.calls;dirty=false;}
   requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
 }catch(error){console.error('Explorer initialization failed',error);fail();}
}
for(const id of ORDER)document.querySelector('[data-part="'+id+'"]').addEventListener('click',()=>choose(id));
$('hint').addEventListener('click',()=>dispatch({type:'hint'}));
$('reset').addEventListener('click',()=>{inspection=null;blockInfo=false;side=false;section=true;dispatch({type:'reset'});frameCamera();});
$('play').addEventListener('click',()=>{if(!reduced.matches&&!inspection)dispatch({type:'toggle-play'});});
$('step').addEventListener('click',()=>dispatch({type:'step',delta:Math.PI/12}));
$('angle').addEventListener('input',event=>dispatch({type:'angle',angle:Number(event.target.value)*Math.PI/180}));
$('inspect').addEventListener('click',()=>{dispatch({type:'pause'});inspection=blockInfo?'block':state.selected;applyState();frameCamera();updateUI();});
$('back-view').addEventListener('click',showAssembly);
$('home-view').addEventListener('click',()=>{side=false;showAssembly();});
$('side-view').addEventListener('click',()=>{side=!side;frameCamera();updateUI();});
$('section').addEventListener('click',()=>{section=!section;applyState();updateUI();dirty=true;});
$('block-view').addEventListener('click',()=>{dispatch({type:'pause'});inspection=null;blockInfo=true;applyState();frameCamera();updateUI();});
reduced.addEventListener('change',()=>{if(reduced.matches)dispatch({type:'pause'});updateMotionUI();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)dispatch({type:'pause'});});
window.addEventListener('blur',()=>dispatch({type:'pause'}));
updateUI();initialize();

// Read-only evidence: no setters, install helpers or simulated transitions.
Object.defineProperty(window,'__PILOT442__',{value:Object.freeze({snapshot(){
 const positions=engine?{piston:engine.piston.getWorldPosition(new THREE.Vector3()).toArray(),rodBig:engine.rod.getWorldPosition(new THREE.Vector3()).toArray(),rodSmall:engine.rod.localToWorld(new THREE.Vector3(0,MECHANICS.rodLength,0)).toArray(),pin:engine.wristPin.getWorldPosition(new THREE.Vector3()).toArray(),cap:engine.rodCap.getWorldPosition(new THREE.Vector3()).toArray()}:null;
 return{state:structuredClone(state),positions,inspection,section,side,failed,metrics:{...metrics},visible:Object.fromEntries(Object.entries(roots).map(([id,root])=>[id,root.visible]))};
}})});
