const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const catalogCode=source.slice(source.indexOf('/* VANTAGENS E DEFEITOS // CATALOG AND PURCHASES */'),source.indexOf('/* END VANTAGENS E DEFEITOS */'));
const dissStart=source.indexOf('const PERSONA_PHOBIA_DISSONANT_ARCANAS =');
const dissonants=source.slice(dissStart,source.indexOf('\n',dissStart));
function fixture(){
  const state={charSheet:{cnv:1,pnv:1,profile:{persona:'Orfeu',dissonantArcana:'',dissonantArcanaExtra:''},persona:{affinities:[{type:'Fogo',reaction:'Normal'},{type:'Gelo',reaction:'Fraqueza'}]},resources:{},progress:{},attrs:{FOR:0,AGI:0,MAG:0,TEC:0,VIT:0,SOR:0},social:{},traits:{purchases:{},extraPoints:0}}};
  const box=vm.createContext({state,console});
  vm.runInContext(dissonants+'\nfunction socialEffectiveTier(skill){return Number(state.charSheet.social[skill])||0}\n'+catalogCode,box);
  return box;
}
function acquire(box,id,configuration={},confirmed=false){return box.acquireCharacterTrait(id,configuration,confirmed)}
function sourceFunction(name){
  const start=source.indexOf('function '+name+'(');
  assert.ok(start>=0,name);
  return source.slice(start,source.indexOf('\n}',start)+2);
}

test('the current catalogue contains exactly the 63 approved advantages across four categories',()=>{
  const box=fixture();
  const groups=vm.runInContext('ADVANTAGE_CATEGORIES.map(({id})=>[id,ADVANTAGE_CATALOG.filter(item=>item.category_id===id).length])',box);
  assert.deepEqual(JSON.parse(JSON.stringify(groups)),[['CBT',18],['ATT',12],['SOC',19],['PER',14]]);
  assert.equal(box.traitById('V-REL-01'),null);
  assert.equal(box.traitById('V2-CBT-02').name,'Impacto Inicial');
  assert.equal(box.traitById('V2-PER-09').name,'Batida Final');
  assert.equal(box.traitById('V2-ATT-11').points,5);
  assert.equal(box.traitById('V2-ATT-12').points,5);
  assert.equal(vm.runInContext('FLAW_CATALOG.length',box),60);
  assert.equal(vm.runInContext('DISSONANT_TRAIT_CATALOG.length',box),20);
});

test('the eight former tier abilities require both the social tier and the purchase points',()=>{
  const newAdvantages=[
    ['V2-CBT-15','Coragem',2,3],
    ['V2-CBT-16','Expressão',2,2],
    ['V2-CBT-17','Expressão',3,3],
    ['V2-CBT-18','Charme',4,5],
    ['V2-SOC-19','Disciplina',3,2],
    ['V2-PER-12','Empatia',3,4],
    ['V2-PER-13','Conhecimento',1,2],
    ['V2-PER-14','Conhecimento',2,5],
  ];
  const tiers=['0','I','II','III','IV','V'];
  for(const [id,skill,minimum,points] of newAdvantages){
    const box=fixture();
    const sheet=box.state.charSheet;
    sheet.traits.extraPoints=points-1;
    sheet.social[skill]=minimum-1;
    assert.equal(acquire(box,id).error,`Requer ${skill} Tier ${tiers[minimum]}.`);
    sheet.social[skill]=minimum;
    assert.equal(box.traitIsOwned(box.traitById(id)),false);
    sheet.traits.extraPoints=points-2;
    assert.equal(acquire(box,id).error,'Falta 1 ponto de Vantagem.');
    sheet.traits.extraPoints=points-1;
    assert.equal(acquire(box,id).ok,true);
    assert.equal(box.traitBudget().spent,points);
    assert.equal(box.removeCharacterTrait(id).ok,true);
    assert.equal(box.traitBudget().available,points);
  }
});

test('the catalogue renders the right filters and offers a selector for configured bonuses',()=>{
  const box=fixture();
  const nodes=new Map();
  const makeNode=()=>({
    innerHTML:'',dataset:{},style:{setProperty(){}},classList:{toggle(){}},
    querySelectorAll:()=>[],querySelector:()=>null,setAttribute(){},showModal(){},
  });
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,makeNode());
    return nodes.get(id);
  };
  box.document={getElementById:node};
  box.esc=value=>String(value??'');
  box.getComputedStyle=()=>({getPropertyValue:()=>''});
  const traits=box.state.charSheet.traits;
  traits.category='REL';
  box.renderTraitsPage();
  assert.equal(traits.category,'all');
  assert.match(node('traitCategoryFilter').innerHTML,/Combate \/ Instrumentos/);
  assert.match(node('traitCategoryFilter').innerHTML,/Persona & Combos Musicais/);
  assert.doesNotMatch(node('traitCategoryFilter').innerHTML,/Relações e vínculos/);
  assert.match(node('traitGrid').innerHTML,/data-trait-id="V2-CBT-02"/);
  assert.doesNotMatch(node('traitGrid').innerHTML,/data-trait-id="V-REL-01"/);
  traits.view='defeitos';
  box.renderTraitsPage();
  assert.match(node('traitCategoryFilter').innerHTML,/Relações e vínculos/);
  assert.doesNotMatch(node('traitCategoryFilter').innerHTML,/Combate \/ Instrumentos/);
  box.openTraitDialog('V2-ATT-09','purchase');
  assert.match(node('traitDetailDialog').innerHTML,/<select[^>]+data-trait-config="attribute"/);
  assert.match(node('traitDetailDialog').innerHTML,/<option value="VIT"/);
});
test('a new character receives one point and character levels do not recreate feat slots',()=>{
  const box=fixture();assert.equal(box.traitBudget().available,1);
  box.state.charSheet.cnv=20;assert.equal(box.traitBudget().available,1);
});
test('a Dissonant grants five points once, including when changed to another Dissonant',()=>{
  const box=fixture();assert.equal(acquire(box,'D-ARC-VII').ok,true);
  assert.equal(box.traitBudget().available,6);assert.equal(box.traitBudget().flawCount,1);
  assert.equal(acquire(box,'D-ARC-VII').ok,false);assert.equal(box.traitBudget().available,6);
  assert.equal(acquire(box,'D-ARC-IV').ok,true);assert.equal(box.traitBudget().available,6);
  assert.equal(box.state.charSheet.profile.dissonantArcana,'IV');
});
test('Hunger’s secondary Dissonant does not create another five-point credit',()=>{
  const box=fixture();assert.equal(acquire(box,'D-ARC-XI').ok,true);
  box.state.charSheet.profile.dissonantArcanaExtra='II';
  assert.equal(box.traitBudget().flawPoints,5);assert.equal(box.traitBudget().flawCount,1);
  assert.equal(box.traitBudget().available,6);
});
test('Dissonants and ordinary flaws share the same five-point limit',()=>{
  const box=fixture();assert.equal(acquire(box,'D-AUT-01').ok,true);
  assert.equal(acquire(box,'D-ARC-IV').ok,false);assert.equal(box.traitBudget().flawPoints,1);
  assert.equal(box.removeCharacterTrait('D-AUT-01').ok,true);
  assert.equal(acquire(box,'D-ARC-IV').ok,true);
  assert.equal(acquire(box,'D-AUT-01').ok,false);assert.equal(box.traitBudget().flawPoints,5);
});
test('no more than three ordinary flaw choices can be acquired',()=>{
  const box=fixture();
  for(const id of ['D-AUT-01','D-COM-02','D-REL-01'])assert.equal(acquire(box,id).ok,true,id);
  assert.equal(acquire(box,'D-AUT-02').ok,false);
  assert.equal(box.traitBudget().flawCount,3);assert.equal(box.traitBudget().available,4);
});
test('an advantage can only be purchased once',()=>{
  const box=fixture();
  assert.equal(acquire(box,'V2-SOC-07').ok,true);
  assert.equal(acquire(box,'V2-SOC-07').ok,false);
  assert.equal(box.traitBudget().spent,1);
});
test('required selections and flaw conditions are checked before committing points',()=>{
  const box=fixture();box.state.charSheet.traits.extraPoints=3;
  assert.equal(acquire(box,'V2-ATT-09').ok,false);
  assert.equal(acquire(box,'V2-ATT-09',{attribute:'HAB'}).ok,false);
  assert.equal(box.traitBudget().available,4);
  assert.equal(acquire(box,'V2-ATT-09',{attribute:'VIT'}).ok,true);
  assert.equal(box.traitBudget().available,0);
  assert.equal(acquire(box,'D-REC-06',{fonte_de_renda:'Trabalho temporário'},false).ok,false);
  assert.equal(acquire(box,'D-REC-06',{fonte_de_renda:'Trabalho temporário'},true).ok,true);
});
test('spent flaw credit cannot be removed and advantage refunds unblock removal',()=>{
  const box=fixture();box.state.charSheet.social={Empatia:2,Charme:1,Disciplina:1};
  assert.equal(acquire(box,'D-ARC-IV').ok,true);
  for(const id of ['V2-CBT-10','V2-CBT-03','V2-ATT-01'])assert.equal(acquire(box,id).ok,true,id);
  assert.equal(box.traitBudget().spent,6);assert.equal(box.traitBudget().available,0);
  assert.equal(box.removeCharacterTrait('D-ARC-IV').ok,false);
  assert.equal(box.state.charSheet.profile.dissonantArcana,'IV');
  assert.equal(box.removeCharacterTrait('V2-CBT-10').ok,true);
  assert.equal(box.removeCharacterTrait('D-ARC-IV').ok,false);
  assert.equal(box.removeCharacterTrait('V2-CBT-03').ok,true);
  assert.equal(box.removeCharacterTrait('D-ARC-IV').ok,true);
  assert.equal(box.traitBudget().available,0);
});
test('new purchases, definitions, notes and usage records survive a JSON round trip',()=>{
  const box=fixture();assert.equal(acquire(box,'V2-PER-01',{element:'Fogo'}).ok,true);
  assert.equal(box.updateCharacterTraitDefinition('V2-PER-01',{element:'Fogo'},false,'Uso no ensaio',2).ok,true);
  box.state=JSON.parse(JSON.stringify(box.state));
  const saved=box.state.charSheet.traits.purchases['V2-PER-01'];
  assert.equal(saved.configuration.element,'Fogo');assert.equal(saved.notes,'Uso no ensaio');
  assert.equal(saved.usesSpent,2);assert.equal(box.traitBudget().spent,1);
});
test('static advantages recalculate maximum resources and effective stats as levels and purchases change',()=>{
  const box=fixture();
  Object.assign(box.state.charSheet,{cnv:5,pnv:5,attrs:{FOR:1,AGI:2,MAG:5,TEC:3,VIT:4,SOR:3},progress:{pmChoices:2}});
  box.state.charSheet.traits.extraPoints=40;
  vm.runInContext(`
    const CNV_PV_LEVELS=[3,5,7,9,10,11,13,15,17,19,20];
    const getEquippedModifiers=()=>({attrs:{AGI:1},dodge:1});
    const socialTierStatBonuses=()=>({attrs:{},pv:10,pm:20});
    const awakeningPointBudget=()=>({});const currentArcanaData=()=>null;
  `+['countReached','integrityInfo','calculateSheet'].map(sourceFunction).join('\n'),box);
  const c=()=>box.calculateSheet();
  assert.deepEqual([c().pvMax,c().pmMax],[100,95]);
  for(const id of ['ATT-01','ATT-02','ATT-03','ATT-04','ATT-05','ATT-06','ATT-07','ATT-10','ATT-11','ATT-12','PER-04']){
    assert.equal(acquire(box,'V2-'+id).ok,true,id);
  }
  assert.equal(acquire(box,'V2-ATT-09',{attribute:'VIT'}).ok,true);
  assert.deepEqual([c().pvMax,c().pmMax,c().VIT,c().carry,c().movement,c().traitStats.dodge,c().escape,c().recovery,c().traitStats.combat,c().traitStats.extraSpell],
    [125,110,5,15,7,2,12.5,8,1,1]);
  box.state.charSheet.cnv=8;box.state.charSheet.pnv=10;
  assert.deepEqual([c().traitStats.pv,c().traitStats.pm,c().traitStats.combat],[29,25,2]);
  assert.equal(box.removeCharacterTrait('V2-ATT-11').ok,true);
  assert.equal(c().traitStats.pv,5);
});
test('stable affinity applies to the named Persona and leaves the stored affinity intact',()=>{
  const box=fixture();box.state.charSheet.traits.extraPoints=4;
  vm.runInContext("const ELEMENT_REACTIONS=['Fraqueza','Normal','Resistir'];\n"+
    ['normalizeAffinityReaction','personaAffinitiesWithTrait'].map(sourceFunction).join('\n'),box);
  assert.equal(acquire(box,'V2-PER-06',{persona:'Izanagi',element:'Fogo'}).ok,false);
  assert.equal(acquire(box,'V2-PER-06',{persona:'Orfeu',element:'Gelo'}).ok,false);
  assert.equal(acquire(box,'V2-PER-06',{persona:'Orfeu',element:'Fogo'}).ok,true);
  const sheet=box.state.charSheet;
  assert.equal(box.personaAffinitiesWithTrait(sheet)[0].reaction,'Resistir');
  assert.equal(sheet.persona.affinities[0].reaction,'Normal');
  sheet.profile.persona='Izanagi';
  assert.equal(box.personaAffinitiesWithTrait(sheet)[0].reaction,'Normal');
  assert.equal(box.updateCharacterTraitDefinition('V2-PER-06',{persona:'Orfeu',element:'Fogo'},false,'Nota',0).ok,true);
  sheet.profile.persona='Orfeu';
  assert.equal(box.removeCharacterTrait('V2-PER-06').ok,true);
  assert.equal(box.personaAffinitiesWithTrait(sheet)[0].reaction,'Normal');
});
test('legacy backups retain photos, Persona, equipment and archived feat selections',()=>{
  const box=fixture();
  const defaults=source.slice(source.indexOf('const DEFAULT ='),source.indexOf('const SHAPES='));
  const merge=source.slice(source.indexOf('function mergeDefaults('),source.indexOf('function loadState('));
  vm.runInContext(defaults+'\nfunction clone(o){return JSON.parse(JSON.stringify(o))}\n'+merge,box);
  const result=vm.runInContext(`(()=>{
    const old=clone(DEFAULT);delete old.charSheet.traits;
    old.charSheet.feats={ranks:{'mente-aberta':1},filter:'owned',query:'mente'};
    old.charSheet.sheetSection='feats';old.charSheet.profile.dissonantArcana='IV';
    old.charSheet.profile.persona='Orfeu';old.charSheet.photoData='data:image/png;base64,cGhvdG8=';
    old.charSheet.persona.deck='Agi, Dia';old.charSheet.equipment.items=[{id:'item1',name:'Violão'}];
    return mergeDefaults(DEFAULT,JSON.parse(JSON.stringify(old)));
  })()`,box);
  assert.equal(result.charSheet.sheetSection,'traits');
  assert.equal(result.charSheet.feats,undefined);
  assert.equal(result.charSheet.legacyFeats.ranks['mente-aberta'],1);
  assert.equal(result.charSheet.profile.persona,'Orfeu');
  assert.equal(result.charSheet.photoData,'data:image/png;base64,cGhvdG8=');
  assert.equal(result.charSheet.persona.deck,'Agi, Dia');
  assert.equal(result.charSheet.equipment.items[0].name,'Violão');
  assert.equal(box.traitBudget(result.charSheet).available,6);
});
test('retired advantages are archived once and refund their points without changing flaws',()=>{
  const box=fixture();
  const defaults=source.slice(source.indexOf('const DEFAULT ='),source.indexOf('const SHAPES='));
  vm.runInContext(defaults+'\nfunction clone(o){return JSON.parse(JSON.stringify(o))}\n'+sourceFunction('mergeDefaults'),box);
  const [migrated,again]=vm.runInContext(`(()=>{
    const old=clone(DEFAULT);
    old.charSheet.traits.purchases={
      'V-REL-01':{owned:true,configuration:{bairro:'Nakano'},notes:'Contato',usesSpent:2},
      'D-AUT-01':{owned:true},
      'V2-ATT-01':{owned:true}
    };
    const migrated=mergeDefaults(DEFAULT,old);
    return [migrated,mergeDefaults(DEFAULT,clone(migrated))];
  })()`,box);
  const traits=migrated.charSheet.traits;
  assert.equal(traits.purchases['V-REL-01'],undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(traits.retiredAdvantages['V-REL-01'])),
    {owned:true,configuration:{bairro:'Nakano'},notes:'Contato',usesSpent:2});
  assert.equal(box.traitBudget(migrated.charSheet).flawPoints,1);
  assert.equal(box.traitBudget(migrated.charSheet).spent,1);
  assert.equal(box.traitBudget(migrated.charSheet).available,1);
  assert.equal(JSON.stringify(again.charSheet.traits),JSON.stringify(traits));
});
test('the Persona selector enforces the same removal budget as the catalogue',()=>{
  const box=fixture();box.toast=()=>{};
  const start=source.indexOf('function setSheetPath(');
  vm.runInContext(source.slice(start,source.indexOf('\n}',start)+2),box);
  assert.equal(box.setSheetPath('profile.dissonantArcana','IV'),true);
  box.state.charSheet.social={Empatia:2,Charme:1,Disciplina:1};
  for(const id of ['V2-CBT-10','V2-CBT-03','V2-ATT-01'])assert.equal(acquire(box,id).ok,true);
  assert.equal(box.setSheetPath('profile.dissonantArcana',''),false);
  assert.equal(box.state.charSheet.profile.dissonantArcana,'IV');
  assert.equal(box.setSheetPath('profile.dissonantArcana','VII'),true);
  assert.equal(box.traitBudget().available,0);assert.equal(box.traitBudget().flawPoints,5);
});
