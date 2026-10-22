import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,statSync,readdirSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { QUESTIONS,judge,parseAnswer,Spring,uiLayout } from '../dist/core.js';

test('every numeric answer to puzzle four triggers the finale, with five puzzles retained',()=>{
  assert.equal(QUESTIONS.length,5);
  assert.equal(QUESTIONS[3].answer,8-3);
  for(let answer=0;answer<=99;answer++)assert.equal(judge(3,answer),'scare',String(answer));
  assert.equal(judge(3,''),'empty');assert.equal(judge(3,'abc'),'empty');
});
test('the first three puzzles have coherent arithmetic and allow retry',()=>{
  const expected=[3+2,4+3,9-3];
  for(let i=0;i<3;i++){
    assert.equal(QUESTIONS[i].answer,expected[i]);assert.equal(judge(i,expected[i]),'correct');
    assert.equal(judge(i,expected[i]+1),'retry');assert.ok(QUESTIONS[i].choices.includes(expected[i]));
    assert.equal(new Set(QUESTIONS[i].choices).size,QUESTIONS[i].choices.length);
  }
});
test('answer parsing accepts zero, rejects ambiguous or unbounded input',()=>{
  for(const value of ['',null,undefined,'-1','1.5','1e2','100','<svg>'])assert.equal(parseAnswer(value),null);
  assert.equal(parseAnswer(' 07 '),7);assert.equal(parseAnswer('0'),0);assert.equal(parseAnswer(99),99);
});
test('scale spring settles at different refresh rates and survives a long frame',()=>{
  for(const fps of [20,30,60,120]){
    const s=new Spring(-12);s.target=12;
    for(let i=0;i<fps*4;i++)s.step(1/fps);
    assert.equal(s.value,12);assert.equal(s.velocity,0);
    s.target=-12;s.step(100);assert.ok(Number.isFinite(s.value)&&Math.abs(s.value)<30);
  }
});
test('portrait, short landscape, desktop and 4K retain a consistent scale',()=>{
  assert.equal(uiLayout(390,844).layout,'portrait');assert.equal(uiLayout(844,390).layout,'landscape');
  assert.equal(uiLayout(320,568).scale,1);assert.equal(uiLayout(768,1024).scale,1);
  assert.equal(uiLayout(3840,2160).scale,uiLayout(1920,1080).scale*2);
  assert.equal(uiLayout(800,800).layout,'portrait');
});
test('all shipped local resources resolve and the entire distribution stays below 400 KB',()=>{
  const root=resolve('dist'),files=[];
  function walk(p){for(const name of readdirSync(p)){const path=join(p,name);if(statSync(path).isDirectory())walk(path);else files.push(path);}}
  walk(root);assert.ok(files.reduce((total,p)=>total+statSync(p).size,0)<400_000);
  for(const file of files.filter(p=>/\.(html|css|js)$/.test(p))){
    const text=readFileSync(file,'utf8');
    const references=[...text.matchAll(/(?:src=|href=)["'](\.\/[^"']+)|url\(['"]?(\.\/[^)'"\s]+)|from ['"](\.\/[^'"\s]+)/g)];
    for(const match of text.matchAll(/new URL\(['"](\.\/[^'"]+)/g))assert.ok(statSync(resolve(file,'..',match[1])).isFile());
    for(const match of references){const ref=match[1]||match[2]||match[3];assert.ok(statSync(resolve(file,'..',ref)).isFile(),`${file}: ${ref}`);}
  }
  for(const font of ['fredoka','nunito'])assert.equal(readFileSync(join(root,'assets',font+'.woff2')).subarray(0,4).toString(),'wOF2');
});
