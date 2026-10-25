import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState,transition,ORDER,CYLINDERS,missingFor,canRun,connectedCount,isComplete } from '../src/v8-state.js';
const select=(s,part)=>transition(s,{type:'select',part});
const base=()=>['bearings','crank','mainCaps'].reduce(select,initialState());
test('alternate piston and pump orders complete the same 21-part assembly',()=>{
  assert.equal(ORDER.length,21);
  for(const reverse of [false,true]) {
    const cylinders=reverse?[...CYLINDERS].reverse():CYLINDERS;
    let s=select(initialState(),'pump');
    for(const c of cylinders) s=select(s,`piston_${c.id}`);
    s=['bearings','crank','mainCaps'].reduce(select,s);
    for(const c of cylinders) {const old=s; s=select(s,`rod_${c.id}`);assert.equal(old.installed[`rod_${c.id}`],false);}
    assert.equal(connectedCount(s),8);assert.equal(isComplete(s),false);
    s=select(s,'pan');assert.equal(isComplete(s),true);
  }
});
test('blocked selections preserve installations and summarize pan requirements',()=>{
  const s=initialState();
  for(const id of ['crank','mainCaps','rod_A1','pan']) {const next=select(s,id);assert.equal(next.tone,'blocked');assert.strictEqual(next.installed,s.installed);}
  assert.match(select(s,'pan').feedback,/8 rod joint sets/);
  assert.deepEqual(missingFor(select(s,'piston_A1'),'rod_A1'),['mainCaps']);
  assert.deepEqual(missingFor(s,'__proto__'),[]);
});
test('secured crank permits partial motion; installed selections pause and focus does not install',()=>{
  let s=base();assert.equal(canRun(s),true);assert.equal(connectedCount(s),0);
  s=select(select(s,'piston_B3'),'rod_B3');s=transition(s,{type:'toggle-play'});s=transition(s,{type:'tick',deltaSeconds:2});
  assert.ok(Math.abs(s.angle-.6)<1e-12);assert.equal(connectedCount(s),1);
  const repeat=select(s,'rod_B3');assert.strictEqual(repeat.installed,s.installed);assert.equal(repeat.playing,false);
  const focus=transition(s,{type:'cylinder',cylinder:'A4'});assert.strictEqual(focus.installed,s.installed);assert.equal(focus.selected,null);assert.equal(focus.activeCylinder,'A4');
});
test('manual motion wraps; hints/reset and invalid events remain safe',()=>{
  const empty=initialState();assert.strictEqual(transition(empty,{type:'step',delta:1}),empty);
  let s=transition(base(),{type:'angle',angle:-Math.PI});assert.ok(Math.abs(s.angle-Math.PI)<1e-12);
  s=transition(s,{type:'hint'});assert.equal(s.hint,true);
  for(const event of [null,{}, {type:'select',part:'no'},{type:'angle',angle:Infinity},{type:'step',delta:'1'},{type:'cylinder',id:'A9'},{type:'tick',deltaSeconds:NaN}]) assert.strictEqual(transition(s,event),s);
  assert.deepEqual(transition(s,{type:'reset'}),initialState());
});
