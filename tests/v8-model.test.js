import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createV8Engine,V8_DIMENSIONS } from '../src/v8-model.js';
import { CYLINDERS,V8,v8Linkage } from '../src/v8-mechanics.js';
import { ORDER } from '../src/v8-state.js';

test('V8 has 21 independently highlightable parts and stays within full-view geometry budget',()=>{
  const m=createV8Engine(),owners=new Map();let triangles=0,draws=0;
  assert.deepEqual(Object.keys(m.parts),ORDER);
  for(const part of [m.block,...Object.values(m.parts)]) part.traverse(o=>{
    if(!o.isMesh)return;draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
    for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));
    assert.ok(!owners.has(o.material)||owners.get(o.material)===part,'materials cannot highlight a different part');owners.set(o.material,part);assert.equal(o.castShadow,false);
  });
  assert.ok(triangles<=120000,`${triangles} triangles`);assert.ok(draws<=110,`${draws} draws`);
  const bounds=new THREE.Box3().setFromObject(m.block);assert.ok(bounds.max.z-bounds.min.z>3.5);
  assert.ok(V8_DIMENSIONS.pistonRadius<V8_DIMENSIONS.boreRadius);
  assert.ok(V8_DIMENSIONS.mainJournalRadius<V8_DIMENSIONS.mainBearingBoreRadius);
});
test('all rod roots keep cap and hollow wrist pin attached through a full revolution',()=>{
  const m=createV8Engine();
  for(const c of CYLINDERS) {
    const {piston,rod,pin,cap}=m.units[c.id];assert.strictEqual(pin.parent,rod);assert.strictEqual(cap.parent,rod);
    assert.equal(pin.position.y,V8.rodLength);assert.equal(cap.position.length(),0);
    for(let i=0;i<360;i++) {
      const angle=i*Math.PI/180,p=v8Linkage(angle,c.id);
      m.parts.crank.rotation.z=-angle;
      piston.position.fromArray(p.wristpin);piston.rotation.z=-c.bankAngle;
      rod.position.fromArray(p.crankpin);rod.rotation.z=-Math.atan2(p.wristpin[0]-p.crankpin[0],p.wristpin[1]-p.crankpin[1]);
      m.group.updateMatrixWorld(true);
      const joint=m.parts.crank.localToWorld(new THREE.Vector3(V8.radius*Math.sin(c.phase),V8.radius*Math.cos(c.phase),c.station+c.axialOffset));
      assert.ok(joint.distanceTo(rod.position)<1e-12);
      assert.ok(pin.getWorldPosition(new THREE.Vector3()).distanceTo(piston.position)<1e-12);
      assert.ok(cap.getWorldPosition(new THREE.Vector3()).distanceTo(rod.position)<1e-12);
    }
    const geometry=pin.children[0].geometry.attributes.position;let inner=Infinity;
    for(let i=0;i<geometry.count;i++)inner=Math.min(inner,Math.hypot(geometry.getX(i),geometry.getY(i)));
    assert.ok(inner>.048,'wrist pin retains an actual hollow center');
  }
});
test('section restores pan walls and mating front support hardware together; full pan is hollow',()=>{
  const m=createV8Engine();assert.ok(m.sectionParts.length>=8);m.setSection(false);assert.ok(m.sectionParts.every(o=>o.visible));
  m.group.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,-1,0),new THREE.Vector3(1,0,0),0,2);
  assert.ok(ray.intersectObject(m.parts.pan,true).length>0,'full pan has an opaque enclosing wall');
  const up=new THREE.Raycaster(new THREE.Vector3(0,-1,0),new THREE.Vector3(0,1,0),0,.5);
  assert.equal(up.intersectObject(m.parts.pan,true).length,0,'sump interior is open toward block');
  m.setSection(true);assert.ok(m.sectionParts.every(o=>!o.visible));
  for(const id of ['block','bearings','mainCaps','pan']) {
    const root=id==='block'?m.block:m.parts[id];assert.ok(root.children.some(o=>o.userData.section),`${id} has coherent section membership`);
  }
});
test('bores remain open from the deck through their full stroke space',()=>{
  const m=createV8Engine();m.setSection(false);m.group.updateMatrixWorld(true);
  for(const c of CYLINDERS) {
    const axis=new THREE.Vector3(Math.sin(c.bankAngle),Math.cos(c.bankAngle),0),origin=axis.clone().multiplyScalar(2.5);origin.z=c.station+c.axialOffset;
    const ray=new THREE.Raycaster(origin,axis.clone().negate(),0,1.43);
    assert.equal(ray.intersectObject(m.block,true).length,0,`${c.id} has an open bore`);
  }
});

test('pan cutaway opens underside sightline to the pickup while full pan encloses it',()=>{
  const m=createV8Engine();m.group.updateMatrixWorld(true);
  const target=new THREE.Vector3(.12,-1.28,0),direction=new THREE.Vector3(4,-5,6).normalize(),origin=target.clone().addScaledVector(direction,10);
  const ray=new THREE.Raycaster(origin,direction.clone().negate(),0,9.99);
  m.setSection(false);
  const full=m.parts.pan.children.filter(o=>o.isMesh&&o.visible);
  assert.ok(ray.intersectObjects(full,false).length>0,'full pan blocks the underside pickup sightline');
  m.setSection(true);
  const cut=m.parts.pan.children.filter(o=>o.isMesh&&o.visible);
  assert.equal(ray.intersectObjects(cut,false).length,0,'opened floor and near walls expose the pickup');
});
