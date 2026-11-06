const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {Camera}=require('../assets/map-camera.js');
const script=fs.readFileSync(require.resolve('../assets/map-motion.js'),'utf8');

function fixture(){
  const events=new Map(),queue=new Map(),documentEvents=new Map();
  let clock=0,nextId=0,active=true,disabled=false;
  const backdrop={style:{}},page={classList:{contains:()=>active}};
  const viewport={clientWidth:800,clientHeight:560,hidden:false,classList:{},
    addEventListener(type,fn){const list=events.get(type)||[];list.push(fn);events.set(type,list)}};
  const previousObserver=global.ResizeObserver;
  global.ResizeObserver=class{observe(){} disconnect(){}};
  let camera;
  try{camera=new Camera(viewport,{style:{}},{disabled:()=>disabled})}
  finally{global.ResizeObserver=previousObserver}
  const reduce={matches:false},window={matchMedia:()=>reduce};
  const context=vm.createContext({window,atlasTokyoCamera:camera,
    performance:{now:()=>clock},requestAnimationFrame:fn=>{const id=++nextId;queue.set(id,fn);return id},
    cancelAnimationFrame:id=>queue.delete(id),MutationObserver:class{observe(){}},
    document:{readyState:'loading',querySelector:s=>({'#mapPage':page,'#mapBackdrop':backdrop})[s],
      addEventListener(type,fn){documentEvents.set(type,fn)}}});
  vm.runInContext(script,context);documentEvents.get('DOMContentLoaded')();
  const advance=ms=>{const end=clock+ms;while(clock<end){clock=Math.min(clock+16,end);const frames=[...queue];queue.clear();for(const [,fn] of frames)fn(clock)}};
  const pick=()=>window.PhobiaMapMotion.flyToDistrict({getBBox:()=>({x:290,y:230,width:150,height:124})});
  return {camera,viewport,window,reduce,backdrop,events,advance,pick,setActive:v=>active=v,setDisabled:v=>disabled=v};
}

test('flight reaches the selected map point and Ajustar animates back to the overview',()=>{
  const f=fixture(),cam=f.camera;f.pick();f.advance(350);assert.ok(cam.view.k>cam.fitScale);
  f.advance(1100);assert.ok(Math.abs((cam.vw/2-cam.view.x)/cam.view.k-365)<.001);
  assert.ok(Math.abs((cam.vh/2-cam.view.y)/cam.view.k-292)<.001);
  const offset=()=>f.backdrop.style.transform.match(/translate3d\(([^)]+)/)[1].split(',').slice(0,2).map(parseFloat);
  assert.ok(offset().some(value=>value!==0));
  cam.fit();assert.ok(cam.view.k>cam.fitScale);f.advance(1300);
  assert.ok(Math.abs(cam.view.k-cam.fitScale)<1e-10);
  assert.deepEqual(offset(),[0,0]);
});
test('manual zoom and pointer input stop a flight without moving again afterward',()=>{
  const f=fixture(),cam=f.camera;f.pick();f.advance(350);cam.zoomBy(1.25);
  let stopped={...cam.view};f.advance(1300);assert.deepEqual({...cam.view},stopped);
  f.pick();f.advance(250);f.events.get('pointerdown').at(-1)();
  stopped={...cam.view};f.advance(1300);assert.deepEqual({...cam.view},stopped);
});
test('leaving Tokyo, positioning a signal, resizing and reduced motion do not keep flying',()=>{
  for(const interrupt of [f=>f.viewport.hidden=true,f=>f.setDisabled(true),f=>f.setActive(false),f=>f.camera.vw+=20,f=>f.reduce.matches=true]){
    const f=fixture();f.pick();f.advance(250);const before={...f.camera.view};interrupt(f);f.advance(1300);
    assert.deepEqual({...f.camera.view},before);
  }
  const f=fixture();f.window.PHOBIA_MOTION={flyOnSelect:false,parallax:false};f.pick();f.advance(1300);f.camera.zoomBy(1.25);
  assert.equal(f.backdrop.style.transform,'');f.camera.fit();assert.equal(f.camera.view.k,f.camera.fitScale);
});
