const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const hud=fs.readFileSync(path.join(__dirname,'..','assets','hud.js'),'utf8');

test('the HUD loads after the page scripts',()=>{
  assert.match(html,/assets\/hud\.css/);
  assert.ok(html.lastIndexOf('assets/hud.js')>html.lastIndexOf('<script>'),'hud.js must come after the inline scripts');
});

test('every control the HUD moves still exists in the page',()=>{
  for(const id of ['atlasDistrictSearch','districtList','realityBtn','cognitionBtn','cogEditor','mapVisualOptions','districtDossierPanel','siteThemeButton','openNotesTop'])
    assert.match(html,new RegExp(`id="${id}"`),id);
  assert.match(html,/data-time="morning"/);
  assert.match(html,/class="legend"/);
  for(const id of ['atlasDistrictSearch','districtList','realityBtn','cogEditor','mapVisualOptions','districtDossierPanel'])
    assert.ok(hud.includes(id),'hud.js uses '+id);
});

test('the HUD only wraps functions the site defines',()=>{
  const wrapped=[...hud.matchAll(/wrap\('([A-Za-z]+)'/g)].map(m=>m[1]);
  assert.ok(wrapped.length>=5);
  const sources=html+fs.readFileSync(path.join(__dirname,'..','assets','map-explorer.js'),'utf8');
  for(const name of wrapped)assert.match(sources,new RegExp(`function ${name}\\(`),name);
});

test('the redesigned pages only call functions the site defines',()=>{
  const pages=fs.readFileSync(path.join(__dirname,'..','assets','hud-pages.js'),'utf8');
  assert.ok(html.indexOf('assets/hud-pages.js')>html.indexOf('assets/hud.js'));
  const called=[...pages.matchAll(/call\('([A-Za-z]+)'/g)].map(m=>m[1]);
  const wrapped=[...pages.matchAll(/wrap\('([A-Za-z]+)'/g)].map(m=>m[1]);
  const sources=html+fs.readFileSync(path.join(__dirname,'..','assets','map-explorer.js'),'utf8');
  for(const name of new Set([...called,...wrapped]))assert.match(sources,new RegExp(`function ${name}\\(`),name);
  for(const id of ['areaSearch','sheetPhotoInput','sheetPVMaxText','sheetPMMaxText','sheetCarry','sheetMovement','sheetIntegrityState'])
    assert.match(html,new RegExp(`id="${id}"`),id);
});
