const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const roads=require('../assets/map-roads.js');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const layoutSource=html.match(/const DISTRICT_ART_LAYOUT=(\{[\s\S]*?\n\});/)[1];
const layout=Function('return '+layoutSource)();

function inside(p,b,pad){return Math.abs(p.x-b.cx)<b.w/2+pad&&Math.abs(p.y-b.cy)<b.h/2+pad}
function samples(points){
  const out=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);
    for(let s=0;s<=n;s++)out.push({x:a.x+(b.x-a.x)*s/n,y:a.y+(b.y-a.y)*s/n});
  }
  return out;
}

test('map world matches the camera and the svg',()=>{
  assert.equal(roads.WORLD.w,1280);
  assert.match(html,/id="mapSvg" viewBox="0 0 1280 700"/);
  assert.match(fs.readFileSync(path.join(__dirname,'..','assets','map-explorer.js'),'utf8'),/width:1280,height:700/);
  assert.match(fs.readFileSync(path.join(__dirname,'..','assets','map-explorer.css'),'utf8'),/width:1280px!important/);
});

test('districts keep clear space between each other',()=>{
  const ids=Object.keys(layout);
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
    const a=layout[ids[i]],b=layout[ids[j]];
    const gap=Math.max(Math.abs(a.cx-b.cx)-(a.w+b.w)/2,Math.abs(a.cy-b.cy)-(a.h+b.h)/2);
    assert.ok(gap>=45,`${ids[i]} / ${ids[j]}: ${gap}`);
  }
});

test('roads use 45 degree steps, stay in the map and go around other districts',()=>{
  const routes=roads.build(layout);
  assert.equal(routes.length,roads.ROUTES.length);
  routes.forEach((r,i)=>{
    const ids=roads.ROUTES[i].ids;
    assert.ok(r.d.startsWith('M '),r.id);
    assert.deepEqual(r.points[0],{x:layout[ids[0]].cx,y:layout[ids[0]].cy});
    assert.deepEqual(r.points.at(-1),{x:layout[ids.at(-1)].cx,y:layout[ids.at(-1)].cy});
    for(let k=2;k<r.points.length-1;k++){
      const a=r.points[k-1],b=r.points[k],dx=Math.abs(b.x-a.x),dy=Math.abs(b.y-a.y);
      assert.ok(dx===0||dy===0||dx===dy,`${r.id} step ${k}`);
    }
    for(const p of samples(r.points)){
      assert.ok(p.x>=0&&p.x<=roads.WORLD.w&&p.y>=0&&p.y<=roads.WORLD.h,r.id);
      for(const [id,b] of Object.entries(layout))if(!ids.includes(id))assert.ok(!inside(p,b,4),`${r.id} crosses ${id}`);
    }
  });
});

test('routes are cached for the same layout',()=>{
  assert.equal(roads.build(layout),roads.build(layout));
});
