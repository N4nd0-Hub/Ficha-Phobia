const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

function freshDeck(mediaPlayer){
  delete require.cache[require.resolve('../assets/phobia-deck.js')];
  globalThis.state={mediaPlayer};
  return require('../assets/phobia-deck.js');
}

test('an old single-track save becomes the first playlist entry',()=>{
  const deck=freshDeck({artist:'MIRR★R NOISE',title:'Glass Hearts',fileName:'glass.mp3',volume:60,loop:true});
  const m=deck._state();
  assert.equal(m.tracks.length,1);
  assert.deepEqual(m.tracks[0],{id:'t_legacy',key:'activeTrack',title:'Glass Hearts',artist:'MIRR★R NOISE',fileName:'glass.mp3',duration:0});
  assert.equal(m.current,'t_legacy');
  assert.equal(m.repeat,'one');
  assert.equal(m.volume,60);
});

test('a save without audio starts with an empty playlist that repeats',()=>{
  const m=freshDeck({artist:'MIRR★R NOISE',title:'Glass Hearts',fileName:'',volume:75,loop:false})._state();
  assert.deepEqual(m.tracks,[]);
  assert.equal(m.repeat,'all');
});

test('existing playlists are kept as they are',()=>{
  const tracks=[{id:'a',title:'A'},{id:'b',title:'B'}];
  const m=freshDeck({tracks,current:'b',repeat:'off',shuffle:true,volume:30})._state();
  assert.equal(m.tracks,tracks);
  assert.equal(m.repeat,'off');
  assert.equal(m.shuffle,true);
});

test('times are shown as mm:ss',()=>{
  const {_fmt}=freshDeck({});
  assert.equal(_fmt(0),'00:00');
  assert.equal(_fmt(65.9),'01:05');
  assert.equal(_fmt(NaN),'00:00');
});

test('the footer keeps every id the rest of the site binds to',()=>{
  for(const id of ['phobiaAudio','phobiaDeckBar','deckPlayer','deckPlay','deckListBtn','quickPrevDay','quickNextDay','quickCalendarBtn',
    'footerDate','footerDistrictBtn','currentDistrictFooter','openNotesFoot','footerFileToggle','footerFileMenu','saveBtn','exportBtn',
    'importInput','largeSaveEngine','largeSaveUsage','saveStateFooter','systemLog'])
    assert.match(html,new RegExp(`id="${id}"`),id);
  assert.doesNotMatch(html,/bindMusicPlayer|mediaRenderMeta/);
  assert.match(html,/window\.PhobiaDeck\?\.init\(\)/);
});
