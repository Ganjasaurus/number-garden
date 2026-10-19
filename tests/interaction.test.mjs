import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as core from '../dist/core.js';
import * as scenes from '../dist/scenes.js';

const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function setup({storageBroken=false,reduced=false}={}){
  const dom=new JSDOM(html,{url:'https://example.test/games/garden/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,log=[],frames=new Map();let next=0,time=0,hidden=false;
  w.matchMedia=()=>({matches:reduced,addEventListener(){}});w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>({setTransform(){},clearRect(){},save(){},restore(){},translate(){},rotate(){},fillRect(){}});
  w.HTMLElement.prototype.setPointerCapture=function(id){this.capture=id;};
  w.HTMLElement.prototype.hasPointerCapture=function(id){return this.capture===id;};
  w.HTMLElement.prototype.releasePointerCapture=function(){this.capture=null;};
  w.requestAnimationFrame=fn=>{frames.set(++next,fn);return next;};w.cancelAnimationFrame=id=>frames.delete(id);
  Object.defineProperty(w.document,'hidden',{get:()=>hidden,configurable:true});
  if(storageBroken)Object.defineProperty(w,'localStorage',{get(){throw new Error('blocked');}});
  class SilentAudio{
    constructor(){this.ctx={};}unlock(){return Promise.resolve();}setMuted(){}setVolume(){}tap(){}pick(){}drop(){}music(){}stop(){}correct(){log.push('correct');}retry(){log.push('retry');}dread(){log.push('dread');}wrong(n){log.push('wrong'+n);}scream(){log.push('scream');}stopVoices(){log.push('silence');}suspend(){log.push('suspend');}resume(){log.push('resume');}
  }
  Object.assign(w,core,scenes,{GardenAudio:SilentAudio});w.eval(source);
  const $=id=>w.document.getElementById(id);
  function advance(ms){for(let i=0;i<Math.ceil(ms/(1000/60));i++){time+=1000/60;const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(time);}}
  function click(id){$(id).click();}
  function select(n){const b=w.document.querySelector(`[data-value="${n}"]`);assert.ok(b,`choice ${n} exists`);b.click();}
  function input(value){$('answer-input').value=String(value);$('answer-input').dispatchEvent(new w.Event('input',{bubbles:true}));}
  function key(key,target=w.document.body,options={}){target.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options}));}
  function seven(){click('start');for(let i=0;i<6;i++){select(core.QUESTIONS[i].answer);click('check-answer');advance(1450);}assert.equal($('question-count').textContent,'PUZZLE 07 / 07');}
  function pointer(target,type,x,y,id=1){const event=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{clientX:x,clientY:y,pointerId:id,button:0,isPrimary:true});target.dispatchEvent(event);}
  return {w,$,advance,click,select,input,key,seven,pointer,log,frames,hide(value){hidden=value;w.document.dispatchEvent(new w.Event('visibilitychange'));},close(){dom.window.close();}};
}

test('a mistaken early answer retries without earning a star; a correct answer advances once',()=>{
  const t=setup();try{
    t.click('start');t.select(4);t.click('check-answer');assert.match(t.$('feedback').textContent,/another try/);t.advance(1200);
    assert.equal(t.$('score').textContent,'0');assert.equal(t.$('question-count').textContent,'PUZZLE 01 / 07');
    t.select(5);t.click('check-answer');t.click('check-answer');t.advance(1450);
    assert.equal(t.$('score').textContent,'1');assert.equal(t.$('question-count').textContent,'PUZZLE 02 / 07');assert.equal(t.$('answer-input').value,'');
  }finally{t.close();}
});
for(const finalAnswer of [0,7,99])test(`complete playthrough with final answer ${finalAnswer}: all scare stages and clean replay`,()=>{
  const t=setup();try{
    t.seven();t.input(finalAnswer);t.click('check-answer');
    assert.equal(t.$('scare').dataset.phase,'wrong-one');assert.equal(t.$('wrong-message').textContent,'Wrong!');
    t.advance(1800);assert.equal(t.$('scare').dataset.phase,'wrong-two');
    t.advance(1800);assert.equal(t.$('scare').dataset.phase,'wrong-three');assert.equal(t.$('wrong-message').textContent,'WRONG!!!!!!');
    t.advance(2050);assert.equal(t.$('scare').dataset.phase,'silence');
    t.advance(1000);assert.equal(t.$('scare').dataset.phase,'jump');
    t.advance(1800);assert.equal(t.$('scare').dataset.phase,'after');
    t.advance(1200);assert.equal(t.$('app').dataset.screen,'ending');assert.equal(t.$('scare').hidden,true);
    assert.deepEqual(t.log.filter(v=>v.startsWith('wrong')||v==='scream'),['wrong0','wrong1','wrong2','scream']);
    t.click('replay');assert.equal(t.$('question-count').textContent,'PUZZLE 01 / 07');assert.equal(t.$('score').textContent,'0');
    t.advance(11000);assert.equal(t.$('scare').hidden,true);assert.equal(t.$('app').dataset.screen,'game');
  }finally{t.close();}
});
test('tab visibility freezes the scare and resumes without skipping the quiet interval',()=>{
  const t=setup();try{
    t.seven();t.select(7);t.click('check-answer');t.advance(1850);assert.equal(t.$('scare').dataset.phase,'wrong-two');
    t.hide(true);t.advance(30000);assert.equal(t.$('scare').dataset.phase,'wrong-two');
    t.hide(false);t.advance(400);assert.equal(t.$('scare').dataset.phase,'wrong-two');
    t.advance(1400);assert.equal(t.$('scare').dataset.phase,'wrong-three');
    t.key('Escape');assert.equal(t.$('app').dataset.screen,'ending');assert.equal(t.$('app').hasAttribute('inert'),false);
    t.advance(10000);assert.equal(t.$('scare').hidden,true);
  }finally{t.close();}
});
test('typing, Enter, empty input, and blocked local storage are supported',()=>{
  const t=setup({storageBroken:true});try{
    t.click('start');t.key('Enter');assert.equal(t.$('score').textContent,'0');
    t.$('answer-input').blur();t.key('5');assert.equal(t.$('answer-input').value,'5');t.key('Enter');t.advance(1450);
    assert.equal(t.$('score').textContent,'1');t.click('sound-toggle');t.click('settings');
    t.$('volume').value='25';t.$('volume').dispatchEvent(new t.w.Event('input',{bubbles:true}));assert.equal(t.$('volume-value').textContent,'25%');
    t.key('Escape');assert.equal(t.$('modal-layer').hidden,true);
  }finally{t.close();}
});
test('a touch tile can be tapped or dropped, and off-target or cancelled drags never answer',()=>{
  const t=setup();try{
    t.click('start');const tile=t.w.document.querySelector('[data-value="5"]');
    const rect={left:450,right:510,top:450,bottom:510,width:60,height:60};
    tile.getBoundingClientRect=()=>({left:100,right:160,top:600,bottom:660,width:60,height:60});
    t.$('answer-drop').getBoundingClientRect=()=>rect;
    t.pointer(tile,'pointerdown',130,630);t.pointer(tile,'pointermove',480,480);assert.ok(t.w.document.querySelector('.drag-ghost'));
    t.pointer(tile,'pointerup',480,480);assert.equal(t.$('answer-input').value,'5');assert.equal(t.w.document.querySelector('.drag-ghost'),null);
    t.input('');t.pointer(tile,'pointerdown',130,630);t.pointer(tile,'pointermove',800,800);t.pointer(tile,'pointerup',800,800);assert.equal(t.$('answer-input').value,'');
    t.pointer(tile,'pointerdown',130,630);t.pointer(tile,'pointermove',480,480);t.pointer(tile,'pointercancel',480,480);assert.equal(t.w.document.querySelector('.drag-ghost'),null);assert.equal(t.$('answer-input').value,'');
    t.pointer(tile,'pointerdown',130,630);t.pointer(tile,'pointerup',130,630);assert.equal(t.$('answer-input').value,'5');
  }finally{t.close();}
});
test('rotation cancels a live drag, settings pause progression, and focus stays in the dialog',()=>{
  const t=setup();try{
    t.click('start');const tile=t.w.document.querySelector('[data-value="5"]');
    t.pointer(tile,'pointerdown',100,100);t.pointer(tile,'pointermove',120,120);t.w.dispatchEvent(new t.w.Event('resize'));t.advance(20);assert.equal(t.w.document.querySelector('.drag-ghost'),null);
    t.select(5);t.click('check-answer');t.click('settings');t.advance(5000);assert.equal(t.$('question-count').textContent,'PUZZLE 01 / 07');
    t.$('modal-home').focus();t.key('Tab',t.$('modal-home'));assert.equal(t.w.document.activeElement.id,'modal-close');
    t.key('Tab',t.$('modal-close'),{shiftKey:true});assert.equal(t.w.document.activeElement.id,'modal-home');
    t.click('modal-done');t.advance(1450);assert.equal(t.$('question-count').textContent,'PUZZLE 02 / 07');
  }finally{t.close();}
});
test('berries and flowers are countable, frog pads choose answers, and reduced motion persists',()=>{
  const t=setup({reduced:true});try{
    t.click('start');t.select(5);t.click('check-answer');t.advance(1450);
    const berry=t.w.document.querySelector('[data-count-item="0"]');berry.dispatchEvent(new t.w.MouseEvent('click',{bubbles:true}));assert.equal(berry.getAttribute('aria-pressed'),'true');
    berry.dispatchEvent(new t.w.MouseEvent('click',{bubbles:true}));assert.equal(berry.getAttribute('aria-pressed'),'false');
    t.select(7);t.click('check-answer');t.advance(1450);const pad=t.w.document.querySelector('[data-answer="6"]');t.key('Enter',pad);assert.equal(t.$('answer-input').value,'6');
    assert.equal(t.w.document.documentElement.dataset.reducedMotion,'true');
  }finally{t.close();}
});
