import test from 'node:test';
import assert from 'node:assert/strict';
import { V8, CYLINDERS, v8Linkage } from '../src/v8-mechanics.js';
const distance = (a,b) => Math.hypot(...a.map((v,i)=>v-b[i]));
test('all eight fixed-length rods follow their bank axes for a complete turn',()=>{
  assert.equal(new Set(CYLINDERS.map(c=>c.id)).size,8);
  for(const c of CYLINDERS) for(let i=0;i<1440;i++) {
    const p=v8Linkage(i*Math.PI/720,c.id);
    assert.ok(Math.abs(distance(p.crankpin,p.wristpin)-V8.rodLength)<1e-12);
    assert.ok(Math.abs(p.wristpin[0]*p.axis[1]-p.wristpin[1]*p.axis[0])<1e-12);
    assert.equal(p.crankpin[2],c.station+c.axialOffset);
    assert.equal(p.crankpin[2],p.wristpin[2]);
  }
});
test('paired lanes clear one another and fit between crank cheeks',()=>{
  for(let i=1;i<=4;i++) {
    const a=v8Linkage(1,`A${i}`),b=v8Linkage(1,`B${i}`);
    assert.equal(a.crankpin[0],b.crankpin[0]); assert.equal(a.crankpin[1],b.crankpin[1]);
    assert.ok(Math.abs(a.crankpin[2]-b.crankpin[2])>V8.rodWidth);
    assert.ok(V8.bankOffset+V8.rodWidth/2<V8.crankpinLength/2);
    assert.ok(V8.bankOffset+V8.rodWidth/2<.34-.09/2);
  }
  assert.throws(()=>v8Linkage(NaN,'A1'),TypeError); assert.throws(()=>v8Linkage(0,'A9'),RangeError);
});
test('each bank has the same stroke with phase-shifted dead centers',()=>{
  for(const c of CYLINDERS) {
    const top=v8Linkage(c.bankAngle-c.phase,c.id),bottom=v8Linkage(c.bankAngle-c.phase+Math.PI,c.id);
    assert.ok(Math.abs(top.distance-bottom.distance-2*V8.radius)<1e-12);
  }
});
