import { QUESTIONS, SCARE_PHASES, judge, parseAnswer, uiLayout, Spring } from './core.js';
import { scene, scaleScene, updateScale } from './scenes.js';
import { GardenAudio } from './audio.js';

const $=id=>document.getElementById(id);
const el={app:$('app'),welcome:$('welcome'),game:$('game'),ending:$('ending'),hud:$('hud'),footer:$('home-footer'),stage:$('stage'),tray:$('number-tray'),input:$('answer-input'),drop:$('answer-drop'),check:$('check-answer'),card:$('puzzle-card'),feedback:$('feedback'),scare:$('scare'),modal:$('modal-layer'),canvas:$('particles')};
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
let prefs={muted:false,volume:.55,reduced:motionQuery.matches};
try {const saved=JSON.parse(localStorage.getItem('number-garden-preferences')||'null');if(saved){prefs.muted=!!saved.muted;prefs.volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.55;prefs.reduced=!!saved.reduced||motionQuery.matches;}}catch{}
const audio=new GardenAudio(prefs);
const state={screen:'home',question:0,selected:null,stars:0,phase:'playing',elapsed:0,scareStep:-1,typed:false,counted:new Set()};
const spring=new Spring(0);
let raf=0,lastTime=0,particles=[],drag=null,returnFocus=null,resizeFrame=0;
const context=el.canvas.getContext('2d');
let canvasWidth=0,canvasHeight=0;

function savePrefs(){try{localStorage.setItem('number-garden-preferences',JSON.stringify(prefs));}catch{}}
function syncPreferences(){
  document.documentElement.dataset.reducedMotion=String(prefs.reduced||motionQuery.matches);
  audio.setMuted(prefs.muted);audio.setVolume(prefs.volume);
  $('sound-toggle').innerHTML=icon(prefs.muted?'muted':'sound');
  $('sound-toggle').setAttribute('aria-label',prefs.muted?'Unmute sound':'Mute sound');
  $('sound-toggle').title=prefs.muted?'Unmute sound':'Mute sound';
  $('sound-toggle').setAttribute('aria-pressed',String(prefs.muted));
}
const reduced=()=>prefs.reduced||motionQuery.matches;
const paused=()=>document.hidden||!el.modal.hidden;
const locked=()=>state.screen!=='game'||state.phase!=='playing'||paused();
function wake(){if(!raf&&!paused()){lastTime=0;raf=requestAnimationFrame(tick);}}
function syncLayout(){
  cancelDrag();
  const w=document.documentElement.clientWidth||innerWidth,h=document.documentElement.clientHeight||innerHeight;
  const layout=uiLayout(w,h);
  document.documentElement.style.setProperty('--ui-scale',String(layout.scale));
  document.documentElement.dataset.layout=layout.layout;
  canvasWidth=innerWidth;canvasHeight=innerHeight;
  const dpr=Math.min(window.devicePixelRatio||1,1.5);
  el.canvas.width=Math.round(canvasWidth*dpr);el.canvas.height=Math.round(canvasHeight*dpr);
  context?.setTransform(dpr,0,0,dpr,0,0);
  $('fullscreen').setAttribute('aria-label',document.fullscreenElement||document.webkitFullscreenElement?'Exit fullscreen':'Enter fullscreen');
  $('fullscreen').title=document.fullscreenElement||document.webkitFullscreenElement?'Exit fullscreen':'Fullscreen';
}
function scheduleResize(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(syncLayout);}
window.addEventListener('resize',scheduleResize,{passive:true});
window.addEventListener('orientationchange',scheduleResize,{passive:true});
window.visualViewport?.addEventListener('resize',scheduleResize,{passive:true});
document.addEventListener('fullscreenchange',scheduleResize);
document.addEventListener('webkitfullscreenchange',scheduleResize);
motionQuery.addEventListener?.('change',syncPreferences);

function setScreen(screen){
  state.screen=screen;el.app.dataset.screen=screen;
  for(const name of ['welcome','game','ending'])el[name].hidden=name!==(screen==='home'?'welcome':screen);
  el.hud.hidden=screen!=='game';el.footer.hidden=screen!=='home';
  window.scrollTo({top:0,left:0,behavior:'instant'});
}
function clearEffects(){
  cancelDrag();audio.stop();particles=[];context?.clearRect(0,0,canvasWidth,canvasHeight);
  cancelAnimationFrame(raf);raf=0;lastTime=0;
  el.scare.hidden=true;delete el.scare.dataset.phase;
  el.app.removeAttribute('inert');el.app.removeAttribute('aria-hidden');
  el.feedback.hidden=true;el.card.classList.remove('correct','retry');
}
function home(){
  closeModal(false);clearEffects();state.phase='playing';state.elapsed=0;
  setScreen('home');$('start').focus({preventScroll:true});
}
function start(){
  closeModal(false);clearEffects();audio.unlock().then(()=>{if(state.screen==='game'&&state.phase!=='scare')audio.music(true);});
  Object.assign(state,{question:0,selected:null,stars:0,phase:'playing',elapsed:0,scareStep:-1,typed:false});
  setScreen('game');showQuestion();
  $('creature').decode?.().catch(()=>{});
}
function updateProgress(){
  $('progress').innerHTML=QUESTIONS.map((q,i)=>`<span class="progress-step ${i<state.question?'done':i===state.question?'active':''}" ${i===state.question?'aria-current="step"':''} aria-label="Puzzle ${i+1}${i<state.question?', completed':i===state.question?', current':''}">${i<state.question?'✓':i+1}</span>`).join('');
  $('progress').setAttribute('aria-label',`Puzzle ${state.question+1} of ${QUESTIONS.length}`);$('score').textContent=state.stars;
}
function showQuestion(){
  cancelDrag();state.selected=null;state.phase='playing';state.elapsed=0;state.typed=false;state.counted.clear();
  const q=QUESTIONS[state.question];
  el.feedback.hidden=true;el.card.classList.remove('correct','retry');
  $('question-tag').textContent=q.tag;$('question-title').textContent=q.title;$('question-hint').textContent=q.hint;
  $('question-count').textContent=`PUZZLE ${String(state.question+1).padStart(2,'0')} / ${String(QUESTIONS.length).padStart(2,'0')}`;
  $('equation-text').textContent=q.missing?'3 +':q.kind==='pattern'?'2, 4, 6,':q.equation;
  $('equals').textContent=q.missing?'':q.kind==='pattern'?'':'=';
  $('equals').hidden=q.missing||q.kind==='pattern';
  let suffix=$('equation-suffix');
  if(!suffix){suffix=document.createElement('span');suffix.id='equation-suffix';$('equation').append(suffix);}
  suffix.hidden=!q.missing;suffix.textContent=q.missing?'= 8':'';
  el.input.value='';el.input.disabled=false;el.drop.classList.remove('filled');
  el.tray.innerHTML=q.choices.map(n=>`<button class="number-tile" data-value="${n}" aria-label="Choose ${n}" aria-pressed="false">${n}</button>`).join('');
  el.check.innerHTML=`Check answer ${icon('check')}`;el.check.disabled=true;
  renderScene(true);updateProgress();
  $('encouragement').textContent=['Every little try helps you grow.','Look at you, growing already.','One little hop at a time.','Curiosity looks good on you.','Small things add up to something lovely.'][state.question];
  // Announce the new question without opening a phone keyboard.
  $('question-title').setAttribute('tabindex','-1');$('question-title').focus({preventScroll:true});
}
function renderScene(enter=false){
  const q=QUESTIONS[state.question];
  el.stage.innerHTML=scene(q,state.selected);
  if(enter){el.stage.classList.remove('scene-enter');void el.stage.offsetWidth;el.stage.classList.add('scene-enter');}
  if(q.kind==='balance'){
    const left=q.left.reduce((a,b)=>a+b,0),right=q.right.reduce((a,b)=>a+b,0)+(state.selected??0);
    spring.target=Math.max(-12,Math.min(12,(right-left)*2));
    if(reduced()){spring.value=spring.target;spring.velocity=0;}
    updateScale(el.stage,spring.value);wake();
  }
  for(const item of el.stage.querySelectorAll('[data-count-item]'))if(state.counted.has(Number(item.dataset.countItem)))markCounted(item,true);
}
function syncControls(){
  const disabled=state.phase!=='playing';
  el.check.disabled=disabled||state.selected===null;el.input.disabled=disabled;
  for(const tile of el.tray.children){tile.disabled=disabled;tile.classList.toggle('selected',Number(tile.dataset.value)===state.selected);tile.setAttribute('aria-pressed',String(Number(tile.dataset.value)===state.selected));}
}
function choose(value,{typed=false,quiet=false}={}){
  if(locked())return;
  state.selected=parseAnswer(value);state.typed=typed;
  el.input.value=state.selected===null?'':String(state.selected);el.drop.classList.toggle('filled',state.selected!==null);
  syncControls();
  if(['balance','hop','pattern'].includes(QUESTIONS[state.question].kind))renderScene();
  if(!quiet&&state.selected!==null)audio.pick(state.selected);
}
function submit(){
  if(locked())return;
  const result=judge(state.question,el.input.value);
  if(result==='empty'){el.input.focus();return;}
  cancelDrag();el.input.blur();
  if(result==='scare'){beginScare();return;}
  state.phase=result;state.elapsed=0;syncControls();
  el.feedback.hidden=false;el.feedback.className='feedback';
  if(result==='correct'){
    state.stars++;$('score').textContent=state.stars;el.card.classList.add('correct');
    el.feedback.textContent=['Beautiful balance!','Berry clever!','Hop, hop, hooray!','A perfect match!'][state.question];
    audio.correct();confetti();
  }else{
    el.card.classList.add('retry');el.feedback.classList.add('retry');el.feedback.textContent='Almost! Give it another try.';audio.retry();
  }
  wake();
}
function beginScare(){
  state.phase='scare';state.elapsed=0;state.scareStep=-1;particles=[];context?.clearRect(0,0,canvasWidth,canvasHeight);
  syncControls();el.scare.hidden=false;el.app.setAttribute('inert','');el.app.setAttribute('aria-hidden','true');
  applyScarePhase(0);$('leave-scare').focus({preventScroll:true});wake();
}
function applyScarePhase(index){
  state.scareStep=index;const phase=SCARE_PHASES[index];
  if(phase.name==='finished'){finish();return;}
  el.scare.dataset.phase=phase.name;
  if(phase.name==='after')audio.stopVoices();
  if(phase.name==='jump')audio.scream();
}
function finish(){clearEffects();state.phase='finished';setScreen('ending');$('replay').focus({preventScroll:true});}

function tick(time){
  raf=0;if(paused())return;
  const dt=lastTime?Math.min((time-lastTime)/1000,.1):1/60;lastTime=time;
  let active=false;
  if(state.screen==='game'&&QUESTIONS[state.question].kind==='balance'){
    const moving=spring.step(dt);if(moving)updateScale(el.stage,spring.value);active=moving;
  }
  if(state.phase==='correct'||state.phase==='retry'){
    state.elapsed+=dt*1000;active=true;
    if(state.elapsed>=(state.phase==='correct'?1250:1050)){
      if(state.phase==='correct'){state.question++;showQuestion();}
      else{state.phase='playing';el.feedback.hidden=true;el.card.classList.remove('retry');syncControls();}
    }
  }
  if(state.phase==='scare'){
    state.elapsed+=dt*1000;active=true;
    const next=state.scareStep+1;if(next<SCARE_PHASES.length&&state.elapsed>=SCARE_PHASES[next].at)applyScarePhase(next);
  }
  if(particles.length){drawParticles(dt);active=particles.length>0||active;}
  if(active&&!raf&&!paused())raf=requestAnimationFrame(tick);
}
function confetti(){
  if(reduced()||!context)return;
  const bounds=el.stage.getBoundingClientRect(),x=bounds.left+bounds.width/2,y=bounds.top+bounds.height*.45;
  const palette=['#f0ca70','#bba2d6','#a8c898','#eca88d','#a2d1d8'];
  particles=Array.from({length:38},(_,i)=>({x,y,vx:(Math.random()-.5)*410,vy:-120-Math.random()*260,life:1.1+Math.random()*.5,size:3+Math.random()*4,angle:Math.random()*6,color:palette[i%5]}));
  wake();
}
function drawParticles(dt){
  if(!context){particles=[];return;}
  context.clearRect(0,0,canvasWidth,canvasHeight);
  particles=particles.filter(p=>p.life>0);
  for(const p of particles){p.life-=dt;p.vy+=440*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=dt*4;context.save();context.globalAlpha=Math.min(1,Math.max(0,p.life*2));context.translate(p.x,p.y);context.rotate(p.angle);context.fillStyle=p.color;context.fillRect(-p.size/2,-p.size/2,p.size,p.size*.6);context.restore();}
}

// Pointer capture keeps touch dragging stable, even outside the original tile.
function cancelDrag(){
  if(!drag)return;
  drag.tile.classList.remove('dragging');drag.ghost?.remove();
  try{if(drag.tile.hasPointerCapture(drag.id))drag.tile.releasePointerCapture(drag.id);}catch{}
  el.drop.classList.remove('over');el.stage.classList.remove('drop-hover');drag=null;
}
function hitDrop(x,y){
  const target=QUESTIONS[state.question].kind==='balance'?el.stage.querySelector('.pan-drop'):el.stage;
  return [el.drop,target].filter(Boolean).some(node=>{const r=node.getBoundingClientRect();return x>=r.left-16&&x<=r.right+16&&y>=r.top-16&&y<=r.bottom+16;});
}
el.tray.addEventListener('pointerdown',e=>{
  const tile=e.target.closest('[data-value]');if(!tile||locked()||e.button!==0||e.isPrimary===false||drag)return;
  drag={tile,id:e.pointerId,startX:e.clientX,startY:e.clientY,value:Number(tile.dataset.value),ghost:null};
  tile.setPointerCapture?.(e.pointerId);audio.unlock();
});
el.tray.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(!drag.ghost&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7){
    drag.ghost=drag.tile.cloneNode(true);drag.ghost.className='number-tile drag-ghost';drag.ghost.removeAttribute('data-value');drag.ghost.setAttribute('aria-hidden','true');drag.ghost.tabIndex=-1;
    const css=getComputedStyle(drag.tile);for(const key of ['--tile-bg','--tile-ink','--tile-edge'])drag.ghost.style.setProperty(key,css.getPropertyValue(key));
    const r=drag.tile.getBoundingClientRect();drag.width=r.width;drag.height=r.height;drag.ghost.style.width=`${r.width}px`;drag.ghost.style.height=`${r.height}px`;
    document.body.append(drag.ghost);drag.tile.classList.add('dragging');
  }
  if(drag.ghost){e.preventDefault();drag.ghost.style.transform=`translate(${e.clientX-drag.width/2}px,${e.clientY-drag.height/2-12}px) rotate(-5deg)`;const over=hitDrop(e.clientX,e.clientY);el.drop.classList.toggle('over',over);el.stage.classList.toggle('drop-hover',over);}
});
el.tray.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const value=drag.value,wasDrag=!!drag.ghost,accepted=!wasDrag||hitDrop(e.clientX,e.clientY);cancelDrag();
  if(accepted){choose(value);if(wasDrag)audio.drop();}
});
el.tray.addEventListener('pointercancel',cancelDrag);
el.tray.addEventListener('lostpointercapture',cancelDrag);
el.tray.addEventListener('contextmenu',e=>e.preventDefault());
el.tray.addEventListener('click',e=>{const tile=e.target.closest('[data-value]');if(tile&&e.detail===0)choose(tile.dataset.value);});
el.input.addEventListener('input',()=>{const cleaned=el.input.value.replace(/\D/g,'').slice(0,2);choose(cleaned,{typed:true,quiet:true});});
el.input.addEventListener('focus',()=>{if(!locked())el.input.select();});
el.check.addEventListener('click',submit);

function markCounted(item,on){item.setAttribute('aria-pressed',String(on));for(const mark of item.querySelectorAll('.count-mark'))mark.setAttribute('opacity',on?'1':'0');}
function sceneAction(target){
  if(locked())return;
  const answer=target.closest('[data-answer]');if(answer){choose(answer.dataset.answer);audio.drop();return;}
  const item=target.closest('[data-count-item]');if(!item)return;
  const id=Number(item.dataset.countItem),on=!state.counted.has(id);
  if(on)state.counted.add(id);else state.counted.delete(id);markCounted(item,on);audio.pick(state.counted.size);
}
el.stage.addEventListener('click',e=>sceneAction(e.target));
el.stage.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();sceneAction(e.target);}});

function openModal(type){
  if(state.phase==='scare')return;
  returnFocus=document.activeElement;cancelDrag();el.modal.hidden=false;el.app.setAttribute('inert','');el.app.setAttribute('aria-hidden','true');
  if(type==='how'){
    $('modal-content').innerHTML=`<span class="tag">A little guide</span><h2 id="modal-title" style="margin-top:.8rem">Ready, set, grow.</h2><p class="modal-intro">A few little puzzles. Lots of little discoveries.</p><div class="how-steps"><div class="how-step"><span>1</span><div><strong>Have a look.</strong><p>Balance the scale, count the berries, or follow the numbers.</p></div></div><div class="how-step"><span>2</span><div><strong>Pick your number.</strong><p>Tap a tile, drag it into place, or type your answer.</p></div></div><div class="how-step"><span>3</span><div><strong>Give it a try.</strong><p>Check your answer. There’s no timer, so take your time.</p></div></div></div><button class="primary" id="modal-play">Let’s play ${icon('arrow')}</button><p class="keyboard-hint">Keyboard: numbers + Enter · Esc to pause</p>`;
    $('modal-play').addEventListener('click',start);
  }else{
    $('modal-content').innerHTML=`<span class="tag">Make yourself at home</span><h2 id="modal-title" style="margin-top:.8rem">Just your speed.</h2><p class="modal-intro">A few little things to make play feel right.</p><div class="settings-row"><div>Sound<small>Music and little sound effects</small></div><button class="toggle" id="modal-sound" role="switch" aria-label="Sound enabled" aria-checked="${!prefs.muted}"></button></div><label class="settings-row" for="volume"><div>Volume</div><output id="volume-value">${Math.round(prefs.volume*100)}%</output></label><input class="volume-control" id="volume" type="range" min="0" max="100" value="${Math.round(prefs.volume*100)}"><div class="settings-row"><div>Gentle motion<small>Keep animations still and simple</small></div><button class="toggle" id="modal-motion" role="switch" aria-label="Gentle motion" aria-checked="${reduced()}"></button></div><button class="primary" id="modal-done">${state.screen==='game'?'Keep playing':'All set'} ${icon('check')}</button>${state.screen==='game'?'<div class="settings-footer"><button class="text-button" id="modal-home">Back to the garden</button></div>':''}`;
    $('modal-sound').addEventListener('click',()=>{prefs.muted=!prefs.muted;syncPreferences();savePrefs();$('modal-sound').setAttribute('aria-checked',String(!prefs.muted));});
    $('volume').addEventListener('input',e=>{prefs.volume=Number(e.target.value)/100;$('volume-value').textContent=`${e.target.value}%`;audio.setVolume(prefs.volume);savePrefs();});
    $('modal-motion').addEventListener('click',()=>{prefs.reduced=!prefs.reduced;syncPreferences();savePrefs();$('modal-motion').setAttribute('aria-checked',String(reduced()));});
    $('modal-done').addEventListener('click',()=>closeModal());$('modal-home')?.addEventListener('click',home);
  }
  syncPause();$('modal-close').focus({preventScroll:true});
}
function closeModal(restore=true){
  const wasOpen=!el.modal.hidden;el.modal.hidden=true;
  if(state.phase!=='scare'){el.app.removeAttribute('inert');el.app.removeAttribute('aria-hidden');}
  if(wasOpen){syncPause();if(restore&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
}
function syncPause(){
  document.body.classList.toggle('paused',paused());
  if(paused()){cancelDrag();cancelAnimationFrame(raf);raf=0;audio.suspend();}
  else{lastTime=0;if(audio.ctx||audio.fallbackActive)audio.resume();wake();}
}
document.addEventListener('visibilitychange',syncPause);
window.addEventListener('pagehide',()=>{cancelDrag();audio.suspend();cancelAnimationFrame(raf);raf=0;});
window.addEventListener('pageshow',syncPause);

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(!el.modal.hidden){e.preventDefault();closeModal();}
    else if(state.phase==='scare'){e.preventDefault();finish();}
    else if(state.screen==='game'){e.preventDefault();openModal('settings');}
    return;
  }
  if(!el.modal.hidden){
    if(e.key==='Tab'){
      const focusable=[...el.modal.querySelectorAll('button,input,a[href]')].filter(n=>!n.disabled);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    return;
  }
  if(locked()||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='Enter'){
    if(e.target.closest('.number-tile,[data-answer],[data-count-item]'))return;
    if(e.target.tagName==='BUTTON'&&e.target!==el.check)return;
    e.preventDefault();submit();return;
  }
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
  if(/^\d$/.test(e.key)){e.preventDefault();const value=state.typed&&el.input.value.length<2?el.input.value+e.key:e.key;choose(value,{typed:true});}
  if(e.key==='Backspace'){e.preventDefault();choose(el.input.value.slice(0,-1),{typed:true,quiet:true});}
});

$('start').addEventListener('click',start);$('replay').addEventListener('click',start);
for(const id of ['brand-home','back-home','end-home'])$(id).addEventListener('click',home);
$('how').addEventListener('click',()=>openModal('how'));$('settings').addEventListener('click',()=>openModal('settings'));
$('modal-close').addEventListener('click',()=>closeModal());el.modal.addEventListener('click',e=>{if(e.target===el.modal)closeModal();});
$('leave-scare').addEventListener('click',finish);
$('sound-toggle').addEventListener('click',()=>{prefs.muted=!prefs.muted;syncPreferences();savePrefs();if(!prefs.muted)audio.unlock().then(()=>audio.tap());});
$('fullscreen').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement||document.webkitFullscreenElement){if(document.exitFullscreen)await document.exitFullscreen();else document.webkitExitFullscreen?.();}
    else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
    else document.documentElement.webkitRequestFullscreen?.();
  }catch{openModal('settings');}
});
if(!document.documentElement.requestFullscreen&&!document.documentElement.webkitRequestFullscreen)$('fullscreen').hidden=true;
$('creature').addEventListener('error',()=>{if(!$('creature').src.endsWith('creature.svg'))$('creature').src='./assets/creature.svg';});
$('hero-scale').innerHTML=scaleScene({left:[2,3],right:[]},5,true);
updateScale($('hero-scale'),-3);
syncPreferences();syncLayout();
