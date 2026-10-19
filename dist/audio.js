// Entire soundtrack is synthesized locally. No audio downloads or autoplay dependency.
export class GardenAudio {
  constructor({ muted=false, volume=.55 }={}) {
    this.muted=muted;this.volume=volume;this.ctx=null;this.voices=new Set();this.musicTimer=0;this.musicOn=false;this.beat=0;this.suspended=false;
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
        this.noiseBuffer=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate);
        const data=this.noiseBuffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      }
      if(this.ctx.state==='suspended'&&!this.suspended)await this.ctx.resume();
    } catch { /* Audio failure must never prevent answering or replay. */ }
  }
  setMuted(muted) {this.muted=muted;this.syncVolume();}
  setVolume(value) {this.volume=Math.max(0,Math.min(1,value));this.syncVolume();}
  syncVolume() {if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:this.volume*.65,this.ctx.currentTime,.025);}
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
  noise(duration,level,frequency=500,delay=0,rise=false) {
    if(!this.ctx||this.muted||this.suspended)return;
    const c=this.ctx,t=c.currentTime+delay,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    n.buffer=this.noiseBuffer;n.loop=true;f.type='lowpass';f.frequency.value=frequency;
    g.gain.setValueAtTime(rise?.0001:level,t);
    if(rise)g.gain.exponentialRampToValueAtTime(level,t+duration*.8);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    n.connect(f);f.connect(g);g.connect(this.master);this.track(n,[f,g]);n.start(t);n.stop(t+duration+.03);
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
  dread() {
    this.music(false);this.stopVoices();
    this.tone(39,5.5,.21,'sine',0,49);this.tone(41,5.5,.13,'triangle',0,57);
    this.noise(5.5,.23,420,0,true);
    this.tone(110,5.2,.035,'sawtooth',.15,370);
  }
  wrong(stage) {
    const base=[185,130,95][stage];
    this.tone(base,.75+stage*.25,.11+stage*.025,'sawtooth',0,base*.45);
    this.tone(base*1.06,.75+stage*.25,.08+stage*.02,'square',0,base*.51);
    this.noise(.4+stage*.25,.06+stage*.05,650+stage*500);
  }
  scream() {
    this.stopVoices();
    if(!this.ctx||this.muted||this.suspended)return;
    const c=this.ctx,t=c.currentTime;
    this.tone(65,.95,.3,'sine',0,24);
    this.noise(1.7,.3,6300);
    // An inharmonic, tremulous voice through three vocal-formant filters.
    [0,13,-19].forEach((detune,i)=>{
      const source=c.createOscillator(),env=c.createGain(),vibrato=c.createOscillator(),depth=c.createGain();
      source.type='sawtooth';source.detune.value=detune;
      source.frequency.setValueAtTime(390+i*23,t);source.frequency.exponentialRampToValueAtTime(780+i*17,t+.11);source.frequency.exponentialRampToValueAtTime(230+i*13,t+1.65);
      vibrato.frequency.value=37+i*4;depth.gain.value=60;vibrato.connect(depth);depth.connect(source.frequency);
      env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(.16,t+.008);env.gain.setValueAtTime(.13,t+.9);env.gain.exponentialRampToValueAtTime(.0001,t+1.7);
      const filters=[800,1500,2800].map(frequency=>{
        const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=frequency;f.Q.value=2.5;source.connect(f);f.connect(env);return f;
      });
      env.connect(this.master);this.track(source,[env,...filters]);this.track(vibrato,[depth]);source.start(t);source.stop(t+1.73);vibrato.start(t);vibrato.stop(t+1.73);
    });
  }
  stopVoices() {for(const source of this.voices){try{source.stop();}catch{}}this.voices.clear();}
  suspend() {this.suspended=true;clearTimeout(this.musicTimer);if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
  async resume() {this.suspended=false;await this.unlock();if(this.musicOn)this.music(true);}
  stop() {this.music(false);this.stopVoices();}
}
