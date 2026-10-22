import test from 'node:test';
import assert from 'node:assert/strict';
import { GardenAudio } from '../dist/audio.js';

function harness(t,{decodeFails=false,noContext=false,fetchFails=false}={}) {
  const contexts=[],media=[],requests=[];
  const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;}});
  const node=()=>({connect(){},disconnect(){this.disconnected=true;}});
  class Context {
    constructor(){this.currentTime=1;this.state='running';this.destination=node();this.sources=[];this.oscillators=[];this.decoded=0;contexts.push(this);}
    createGain(){return {...node(),gain:param()};}
    createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
    createBufferSource(){const source={...node(),starts:0,stops:[],start(){this.starts++;},stop(time){this.stops.push(time);}};this.sources.push(source);return source;}
    createOscillator(){const source={...node(),frequency:param(),start(){},stop(){this.stopped=true;}};this.oscillators.push(source);return source;}
    async decodeAudioData(){this.decoded++;if(decodeFails)throw new Error('decode unavailable');return {duration:3.20};}
    async suspend(){this.state='suspended';}
    async resume(){this.state='running';}
  }
  class Media {
    constructor(url){this.src=url;this.currentTime=0;this.paused=true;this.plays=0;this.listeners={};media.push(this);}
    addEventListener(event,callback){this.listeners[event]=callback;}
    play(){this.paused=false;this.plays++;return Promise.resolve();}
    pause(){this.paused=true;}
  }
  t.mock.method(globalThis,'fetch',async url=>{requests.push(String(url));if(fetchFails)throw new Error('offline');return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};});
  const oldWindow=globalThis.window,oldAudio=globalThis.Audio;
  globalThis.window={AudioContext:noContext?undefined:Context};globalThis.Audio=Media;
  t.after(()=>{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldAudio===undefined)delete globalThis.Audio;else globalThis.Audio=oldAudio;});
  return {contexts,media,requests};
}

test('the real scream preloads and decodes once, plays immediately, and replaces music voices',async t=>{
  const h=harness(t),audio=new GardenAudio();
  await audio.unlock();await audio.screamReady;await audio.unlock();
  assert.equal(h.requests.length,1);assert.ok(h.requests[0].endsWith('/assets/scream-demonic.mp3'));
  assert.equal(h.contexts[0].decoded,1);
  audio.music(true);const notes=h.contexts[0].oscillators.length;assert.ok(notes>0);
  audio.scream();assert.equal(audio.musicOn,false);assert.ok(h.contexts[0].oscillators.every(o=>o.stopped));
  assert.equal(h.contexts[0].sources.length,1);assert.equal(h.contexts[0].sources[0].buffer,audio.screamBuffer);
  assert.equal(h.contexts[0].sources[0].starts,1);assert.equal(h.contexts[0].oscillators.length,notes);
  assert.equal(h.media.length,0);
  h.contexts[0].sources[0].onended();assert.equal(audio.voices.size,0);audio.stop();
});

test('mute suppresses the scare, volume changes apply immediately, and exit stops the recording',async t=>{
  const h=harness(t),audio=new GardenAudio({muted:true,volume:.4});
  await audio.unlock();await audio.screamReady;audio.scream();assert.equal(h.contexts[0].sources.length,0);
  audio.setMuted(false);audio.scream();assert.equal(h.contexts[0].sources.length,1);
  audio.setVolume(0);assert.equal(audio.master.gain.value,0);
  audio.setVolume(.7);assert.equal(audio.master.gain.value,.7*.65);
  await audio.suspend();assert.equal(audio.ctx.state,'suspended');
  await audio.resume();assert.equal(audio.ctx.state,'running');
  assert.equal(h.contexts[0].sources.length,1);audio.stop();
  assert.equal(audio.voices.size,0);assert.ok(h.contexts[0].sources[0].stops.includes(undefined));
});

test('decode failure uses the same real recording through native audio and respects pause and cancellation',async t=>{
  const h=harness(t,{decodeFails:true}),audio=new GardenAudio();
  await audio.unlock();await audio.screamReady;audio.scream();assert.equal(h.media.length,1);
  const media=h.media[0];assert.ok(media.src.endsWith('/assets/scream-demonic.mp3'));assert.equal(media.plays,1);
  audio.setMuted(true);assert.equal(media.muted,true);audio.setMuted(false);audio.setVolume(.2);assert.equal(media.volume,.2*.65);
  audio.suspend();assert.equal(media.paused,true);await audio.resume();assert.equal(media.plays,2);
  audio.suspend();audio.stop();await audio.resume();assert.equal(media.plays,2);assert.equal(audio.fallbackActive,false);
});

test('unavailable Web Audio or a failed fetch cannot block fallback playback or restarting',async t=>{
  const h=harness(t,{noContext:true,fetchFails:true}),audio=new GardenAudio();
  await audio.unlock();await audio.screamBytes;audio.scream();assert.equal(h.media[0].plays,1);
  audio.suspend();await audio.resume();assert.equal(h.media[0].plays,2);
  audio.stop();audio.scream();assert.equal(h.media.length,1);assert.equal(h.media[0].plays,3);audio.stop();
});
