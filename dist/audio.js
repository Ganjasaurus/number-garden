// Music is synthesized locally; the scare uses a bundled, processed human recording.
const SCREAM_URL = new URL('./assets/scream-deep.mp3', import.meta.url);
export class GardenAudio {
  constructor({ muted=false, volume=.55 }={}) {
    this.muted=muted;this.volume=volume;this.ctx=null;this.voices=new Set();this.musicTimer=0;this.musicOn=false;this.beat=0;this.suspended=false;
    this.screamBuffer=null;this.screamReady=null;this.fallbackActive=false;this.fallbackResume=false;this.media=null;
    // Fetch early, decode after Play unlocks the context, and never delay gameplay.
    this.screamBytes=fetch(SCREAM_URL).then(response=>response.ok?response.arrayBuffer():null).catch(()=>null);
  }
  async unlock() {
    try {
      if(!this.ctx) {
        const Context=window.AudioContext||window.webkitAudioContext;
        if(!Context)return;
        this.ctx=new Context({latencyHint:'interactive'});
        this.master=this.ctx.createGain();
        this.master.gain.value=this.muted?0:this.volume*.65;
        const limiter=this.ctx.createDynamicsCompressor();
        limiter.threshold.value=-10;limiter.knee.value=10;limiter.ratio.value=14;limiter.attack.value=.003;limiter.release.value=.12;
        this.master.connect(limiter);limiter.connect(this.ctx.destination);
        this.screamReady=this.screamBytes.then(bytes=>bytes?this.ctx.decodeAudioData(bytes):null).then(buffer=>{this.screamBuffer=buffer;return buffer;}).catch(()=>null);
      }
      if(this.ctx.state==='suspended'&&!this.suspended)await this.ctx.resume();
    } catch { /* Audio failure must never prevent answering or replay. */ }
  }
  setMuted(muted) {this.muted=muted;this.syncVolume();}
  setVolume(value) {this.volume=Math.max(0,Math.min(1,value));this.syncVolume();}
  syncVolume() {
    if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:this.volume*.65,this.ctx.currentTime,.025);
    if(this.media){this.media.muted=this.muted;this.media.volume=this.volume*.65;}
  }
  track(source,nodes=[]) {
    this.voices.add(source);
    source.onended=()=>{this.voices.delete(source);source.disconnect();nodes.forEach(n=>n.disconnect());};
    return source;
  }
  tone(freq,duration=.2,level=.08,type='sine',delay=0,endFreq=null) {
    if(!this.ctx||this.muted||this.suspended)return;
    const ctx=this.ctx,t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(this.master);this.track(o,[g]);o.start(t);o.stop(t+duration+.03);
  }
  tap() {this.tone(520,.11,.045,'sine',0,700);}
  pick(n) {this.tone(280+n*33,.18,.07,'sine');this.tone(560+n*66,.12,.018,'triangle',.02);}
  drop() {this.tone(210,.16,.07,'sine',0,95);}
  correct() {[523.25,659.25,783.99,1046.5].forEach((f,i)=>this.tone(f,.44,.065,'sine',i*.095));}
  retry() {this.tone(330,.2,.035,'sine');this.tone(294,.3,.035,'sine',.15);}
  music(on) {
    this.musicOn=on;clearTimeout(this.musicTimer);
    if(!on||this.suspended)return;
    const notes=[523.25,0,659.25,0,783.99,659.25,0,587.33,523.25,0,0,440,523.25,0,392,0];
    const next=()=>{
      if(!this.musicOn||this.suspended)return;
      const i=this.beat++%notes.length;
      if(notes[i])this.tone(notes[i],.8,.018,'sine');
      if(i%4===0)this.tone([130.81,164.81,146.83,98][Math.floor(i/4)],1.7,.014,'triangle');
      this.musicTimer=setTimeout(next,460);
    };
    next();
  }
  scream() {
    this.music(false);this.stopVoices();
    if(this.muted||this.suspended)return;
    if(this.ctx&&this.screamBuffer){
      const c=this.ctx,t=c.currentTime,source=c.createBufferSource(),env=c.createGain();
      source.buffer=this.screamBuffer;
      env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(1,t+.003);
      source.connect(env);env.connect(this.master);this.track(source,[env]);
      source.start(t);source.stop(t+this.screamBuffer.duration+.03);
      return;
    }
    // Native media fallback retains the recorded voice if Web Audio cannot decode it.
    try{
      if(!this.media){
        this.media=new Audio(SCREAM_URL.href);this.media.preload='auto';
        this.media.addEventListener('ended',()=>{this.fallbackActive=false;this.fallbackResume=false;});
      }
      this.media.currentTime=0;this.syncVolume();this.fallbackActive=true;
      this.media.play()?.catch(()=>{this.fallbackActive=false;});
    }catch{this.fallbackActive=false;}
  }
  stopVoices() {
    for(const source of this.voices){try{source.stop();}catch{}}this.voices.clear();
    this.fallbackActive=false;this.fallbackResume=false;
    if(this.media){this.media.pause();try{this.media.currentTime=0;}catch{}}
  }
  suspend() {
    this.suspended=true;clearTimeout(this.musicTimer);
    if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});
    if(this.fallbackActive&&this.media){this.fallbackResume=true;this.media.pause();}
  }
  async resume() {
    this.suspended=false;await this.unlock();
    // Visibility may have changed again while the context was resuming.
    if(this.suspended)return;
    if(this.musicOn)this.music(true);
    if(this.fallbackActive&&this.fallbackResume&&this.media){this.fallbackResume=false;this.media.play()?.catch(()=>{this.fallbackActive=false;});}
  }
  stop() {this.music(false);this.stopVoices();}
}
