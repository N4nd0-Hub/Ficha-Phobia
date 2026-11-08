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
  const state={charSheet:{cnv:1,profile:{dissonantArcana:'',dissonantArcanaExtra:''},attrs:{FOR:0,AGI:0,MAG:0,TEC:0,VIT:0,SOR:0},social:{},traits:{purchases:{},extraPoints:0}}};
  const box=vm.createContext({state,console});
  vm.runInContext(dissonants+'\nfunction socialEffectiveTier(skill){return Number(state.charSheet.social[skill])||0}\n'+catalogCode,box);
  return box;
}
function acquire(box,id,configuration={},confirmed=false){return box.acquireCharacterTrait(id,configuration,confirmed)}

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
test('tier requirements block acquisition and duplicate advantages never spend twice',()=>{
  const box=fixture();assert.equal(acquire(box,'V-REL-02').ok,false);
  assert.equal(box.traitBudget().available,1);
  box.state.charSheet.social.Empatia=1;
  assert.equal(acquire(box,'V-REL-02').ok,true);assert.equal(box.traitBudget().available,0);
  assert.equal(acquire(box,'V-REL-02').ok,false);assert.equal(box.traitBudget().spent,1);
});
test('optional details allow direct purchases and core definitions still open the purchase form',()=>{
  const box=fixture();
  box.state.charSheet.traits.extraPoints=1;
  box.state.charSheet.attrs.TEC=3;
  const opened=[];
  box.openTraitDialog=(id,mode)=>opened.push([id,mode]);
  box.completeTraitEdit=result=>result.ok;
  box.toast=()=>{};
  const click=id=>box.handleTraitAction({target:{closest:()=>({dataset:{traitAction:'acquire',traitId:id}})}});
  click('V-REL-01');
  assert.equal(box.traitIsOwned(box.traitById('V-REL-01')),true);
  assert.deepEqual(opened,[]);
  click('V-EST-03');
  assert.deepEqual(opened,[['V-EST-03','purchase']]);
  assert.equal(acquire(box,'V-EST-03').ok,false);
  assert.equal(box.traitBudget().available,1);
  assert.equal(acquire(box,'V-EST-03',{atividade_manual:'Costura'}).ok,true);
  assert.equal(box.traitBudget().available,0);
});
test('required flaw definitions and narrative prerequisites still gate point credits',()=>{
  const box=fixture();
  assert.equal(acquire(box,'D-REC-06',{},true).ok,false);
  assert.equal(box.traitBudget().available,1);
  assert.equal(acquire(box,'D-REC-06',{fonte_de_renda:'Trabalho temporário'},false).ok,false);
  assert.equal(acquire(box,'D-REC-06',{fonte_de_renda:'Trabalho temporário'},true).ok,true);
});
test('spent flaw credit cannot be removed and advantage refunds unblock removal',()=>{
  const box=fixture();box.state.charSheet.social={Empatia:2,Charme:1,Disciplina:1};
  assert.equal(acquire(box,'D-ARC-IV').ok,true);
  for(const id of ['V-REL-07','V-COM-05','V-AUT-02'])assert.equal(acquire(box,id).ok,true,id);
  assert.equal(box.traitBudget().spent,6);assert.equal(box.traitBudget().available,0);
  assert.equal(box.removeCharacterTrait('D-ARC-IV').ok,false);
  assert.equal(box.state.charSheet.profile.dissonantArcana,'IV');
  assert.equal(box.removeCharacterTrait('V-REL-07').ok,true);
  assert.equal(box.removeCharacterTrait('D-ARC-IV').ok,false);
  assert.equal(box.removeCharacterTrait('V-COM-05').ok,true);
  assert.equal(box.removeCharacterTrait('D-ARC-IV').ok,true);
  assert.equal(box.traitBudget().available,0);
});
test('incompatible income choices cannot be combined to claim free points',()=>{
  const box=fixture();
  assert.equal(acquire(box,'D-REC-06',{fonte_de_renda:'Bicos'},true).ok,true);
  assert.equal(acquire(box,'V-REC-05',{fonte_de_renda:'Salário',obrigacoes:'Turnos regulares'},true).ok,false);
  assert.equal(box.traitBudget().available,4);
});
test('a legacy advantage keeps its ID, point cost, definitions, notes and uses',()=>{
  const box=fixture();
  box.state.charSheet.traits.purchases['V-REL-01']={owned:true,configuration:{bairro:'Nakano'},requirementsConfirmed:false,notes:'Contato no mercado',usesSpent:2};
  box.state=JSON.parse(JSON.stringify(box.state));
  assert.equal(box.traitIsOwned(box.traitById('V-REL-01')),true);
  assert.equal(box.traitBudget().spent,1);
  assert.equal(box.updateCharacterTraitDefinition('V-REL-01',{bairro:'Nakano'},false,'Contato no mercado',2).ok,true);
  const saved=box.state.charSheet.traits.purchases['V-REL-01'];
  assert.equal(saved.configuration.bairro,'Nakano');assert.equal(saved.notes,'Contato no mercado');
  assert.equal(saved.usesSpent,2);assert.equal(box.traitBudget().spent,1);
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
test('the Persona selector enforces the same removal budget as the catalogue',()=>{
  const box=fixture();box.toast=()=>{};
  const start=source.indexOf('function setSheetPath(');
  vm.runInContext(source.slice(start,source.indexOf('\n}',start)+2),box);
  assert.equal(box.setSheetPath('profile.dissonantArcana','IV'),true);
  box.state.charSheet.social={Empatia:2,Charme:1,Disciplina:1};
  for(const id of ['V-REL-07','V-COM-05','V-AUT-02'])assert.equal(acquire(box,id).ok,true);
  assert.equal(box.setSheetPath('profile.dissonantArcana',''),false);
  assert.equal(box.state.charSheet.profile.dissonantArcana,'IV');
  assert.equal(box.setSheetPath('profile.dissonantArcana','VII'),true);
  assert.equal(box.traitBudget().available,0);assert.equal(box.traitBudget().flawPoints,5);
});
