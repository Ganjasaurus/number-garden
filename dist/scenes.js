const colors = [ ['#d8c8ec','#bfacd7','#70518f'], ['#f6d47b','#dfb759','#967132'], ['#bde2e3','#9bc9cb','#4c848a'], ['#fac0a7','#dfa186','#a46249'] ];
const svg = (content, label, extra='') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 320" role="img" aria-label="${label}" ${extra}>${content}</svg>`;

export function block(number, x, y, color=0, size=58, face=false) {
  const [fill,edge,ink] = colors[color % 4];
  return `<g transform="translate(${x} ${y})"><rect x="${-size/2}" y="5" width="${size}" height="${size}" rx="12" fill="${edge}"/><rect x="${-size/2}" y="0" width="${size}" height="${size}" rx="12" fill="${fill}"/><path d="M${-size/2+12} 3h${size-24}" stroke="#fff" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/><text x="0" y="${face?size*.64:size*.72}" text-anchor="middle" font-size="${size*.62}" fill="${ink}">${number}</text>${face?`<circle cx="-5" cy="${size*.82}" r="1.5" fill="${ink}"/><circle cx="5" cy="${size*.82}" r="1.5" fill="${ink}"/><path d="M-3 ${size*.89}q3 3 6 0" fill="none" stroke="${ink}" stroke-width="1.5"/>`:''}</g>`;
}

function leaves(x,y,flip=1){return `<g transform="translate(${x} ${y}) scale(${flip} 1)"><path d="M0 0q2-30 24-51M2-9q-24-1-20-22 20 1 20 22M11-29q-4-25 18-30 7 23-18 30M6-17q22-16 32 0-20 14-32 0" fill="#c6d6ad"/><path d="M0 0q2-30 24-51" stroke="#9caf88" stroke-width="2" fill="none"/></g>`;}

export function scaleScene(q, chosen=null, hero=false) {
  const leftBlocks=q.left.map((n,i)=>block(n,(i-(q.left.length-1)/2)*63,38,i,56,hero)).join('');
  const rightNumbers=[...(q.right||[]),chosen ?? '?'];
  const rightBlocks=rightNumbers.map((n,i)=>n==='?'?`<g transform="translate(${(i-(rightNumbers.length-1)/2)*63} 38)"><rect class="drop-zone" x="-28" width="56" height="58" rx="12" fill="#f7f4e5" stroke="#b8c5a4" stroke-width="2" stroke-dasharray="5 4"/><text text-anchor="middle" y="41" font-size="35" fill="#95a982">?</text></g>`:block(n,(i-(rightNumbers.length-1)/2)*63,38,i+2,56,hero)).join('');
  return svg(`<ellipse cx="380" cy="290" rx="235" ry="14" fill="#dae2ca" opacity=".45"/>
    ${leaves(92,278)}${leaves(670,278,-1)}<circle cx="107" cy="225" r="4" fill="#e9c572"/><circle cx="651" cy="210" r="3" fill="#bca3d4"/>
    <path d="M365 92q15-16 30 0l39 173H326Z" fill="#97bd98"/><path d="M365 92q15-16 23-3l12 176h-74Z" fill="#afd0a9"/>
    <rect x="302" y="263" width="156" height="22" rx="11" fill="#759e79"/><rect x="302" y="260" width="156" height="18" rx="9" fill="#9abc92"/>
    <circle cx="372" cy="222" r="3" fill="#507450"/><circle cx="388" cy="222" r="3" fill="#507450"/><path d="M374 232q6 6 12 0" fill="none" stroke="#507450" stroke-width="2.5" stroke-linecap="round"/>
    <g id="scale-beam"><rect x="164" y="88" width="432" height="16" rx="8" fill="#d2ae61"/><rect x="164" y="86" width="432" height="12" rx="6" fill="#f5d17d"/></g>
    <g id="scale-left" transform="translate(175 95)"><path d="M0 0-87 98M0 0l87 98" stroke="#bbad8b" stroke-width="3" fill="none" stroke-linecap="round"/>${leftBlocks}<path d="M-94 97Q-87 142 0 143T94 97Z" fill="#c69f50"/><path d="M-94 96Q-80 135 0 135T94 96Z" fill="#f4d17d"/><rect x="-98" y="93" width="196" height="9" rx="4.5" fill="#fbe2a1"/><circle r="6" fill="#edc56b"/></g>
    <g id="scale-right" class="pan-drop" transform="translate(585 95)"><path d="M0 0-87 98M0 0l87 98" stroke="#a6adb1" stroke-width="3" fill="none" stroke-linecap="round"/><g id="right-blocks">${rightBlocks}</g><path d="M-94 97Q-87 142 0 143T94 97Z" fill="#8cb8be"/><path d="M-94 96Q-80 135 0 135T94 96Z" fill="#b9dce1"/><rect x="-98" y="93" width="196" height="9" rx="4.5" fill="#d5edf0"/><circle r="6" fill="#edc56b"/></g>
    <circle cx="380" cy="95" r="19" fill="#d3ad60"/><circle cx="380" cy="92" r="18" fill="#ffe2a2"/><circle cx="380" cy="92" r="7" fill="#f0c66c"/>
    ${hero?'':'<text x="175" y="275" text-anchor="middle" font-size="12" fill="#a1ac94" letter-spacing="2">LITTLE WEIGHTS</text><text x="585" y="275" text-anchor="middle" font-size="12" fill="#a1ac94" letter-spacing="2">YOUR NUMBER</text>'}`,
    hero?'A smiling balance scale with colorful number blocks':`${q.left.join(' plus ')} on the left. ${q.right.length?q.right.join(' plus ')+' plus ':''}${chosen===null?'a missing number':chosen} on the right.`);
}

export function updateScale(root, degrees) {
  const rad=degrees*Math.PI/180, y=Math.sin(rad)*205, x=Math.cos(rad)*205;
  root.querySelector('#scale-beam')?.setAttribute('transform',`rotate(${degrees} 380 95)`);
  root.querySelector('#scale-left')?.setAttribute('transform',`translate(${380-x} ${95-y})`);
  root.querySelector('#scale-right')?.setAttribute('transform',`translate(${380+x} ${95+y})`);
}

function berry(x,y,id,color) {
  return `<g transform="translate(${x} ${y})" data-count-item="${id}" tabindex="0" role="button" aria-label="Count berry ${id+1}" aria-pressed="false" style="cursor:pointer"><ellipse cy="38" rx="24" ry="5" fill="#bac79f" opacity=".25"/><path d="M0-24C-49-45-50 11-18 33Q0 47 18 33C50 11 49-45 0-24Z" fill="${color}"/><path d="M0-25q-21 4-22-11 17-7 22 11M0-25q21 4 22-11-17-7-22 11M0-26v-15" fill="#6f9b71" stroke="#6f9b71" stroke-width="3" stroke-linecap="round"/><g fill="#fff4d8" opacity=".75"><ellipse cx="-16" cy="-7" rx="2" ry="3"/><ellipse cx="10" cy="-10" rx="2" ry="3"/><ellipse cx="22" cy="8" rx="2" ry="3"/><ellipse cx="-5" cy="9" rx="2" ry="3"/><ellipse cx="-15" cy="22" rx="2" ry="3"/><ellipse cx="9" cy="27" rx="2" ry="3"/></g><circle class="count-mark" cx="28" cy="-28" r="12" fill="#427a5b" opacity="0"/><text class="count-mark" x="28" y="-23" text-anchor="middle" font-size="16" fill="white" opacity="0">✓</text></g>`;
}

function countScene(q) {
  let id=0;
  const left=q.groups[0]===4?[[175,105],[260,105],[175,208],[260,208]]:[[175,110],[260,110],[217,210]];
  const right=q.groups[1]===3?[[500,105],[585,105],[542,208]]:[[500,105],[585,105],[500,208],[585,208]];
  return svg(`<rect x="105" y="40" width="225" height="239" rx="45" fill="#f4e5e7"/><rect x="430" y="40" width="225" height="239" rx="45" fill="#ebe5f2"/>
    <text x="380" y="170" text-anchor="middle" font-size="40" fill="#b2bba5">+</text>${left.map(([x,y])=>berry(x,y,id++,'#e88887')).join('')}${right.map(([x,y])=>berry(x,y,id++,'#b49bce')).join('')}<text x="380" y="312" text-anchor="middle" font-size="12" fill="#a0aa94">Tap each berry to help you count.</text>`,`${q.groups[0]} pink berries plus ${q.groups[1]} purple berries`);
}

function frog(x,y) {return `<g id="frog" transform="translate(${x} ${y})"><ellipse cx="0" cy="7" rx="30" ry="11" fill="#7fa879"/><ellipse cx="0" cy="-9" rx="27" ry="25" fill="#a6c98f"/><circle cx="-16" cy="-28" r="13" fill="#a6c98f"/><circle cx="16" cy="-28" r="13" fill="#a6c98f"/><circle cx="-16" cy="-29" r="7" fill="#f9f8e5"/><circle cx="16" cy="-29" r="7" fill="#f9f8e5"/><circle cx="-15" cy="-28" r="3" fill="#3b5737"/><circle cx="15" cy="-28" r="3" fill="#3b5737"/><path d="M-7-6q7 7 14 0" fill="none" stroke="#4c7446" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="-17" cy="-8" rx="5" ry="3" fill="#d7b38b"/><ellipse cx="17" cy="-8" rx="5" ry="3" fill="#d7b38b"/></g>`;}

function hopScene(q,chosen) {
  const x=n=>70+n*62;
  const hops=Array.from({length:q.hops},(_,i)=>`<path d="M${x(q.start-i)} 163q-31-90-62 0m-4-12 4 12 12-3" fill="none" stroke="#a9b895" stroke-width="2.5" stroke-dasharray="5 4" stroke-linecap="round"/>`).join('');
  const pads=Array.from({length:11},(_,n)=>`<g data-answer="${n}" role="button" tabindex="0" aria-label="Land on ${n}" style="cursor:pointer"><ellipse cx="${x(n)}" cy="215" rx="27" ry="14" fill="${chosen===n?'#8fbc83':'#c2d7a6'}"/><path d="M${x(n)} 215l20-12" stroke="#e2edda" stroke-width="4"/><text x="${x(n)}" y="255" text-anchor="middle" font-size="20" fill="${chosen===n?'#427a5b':'#89997b'}">${n}</text></g>`).join('');
  return svg(`<ellipse cx="380" cy="223" rx="367" ry="61" fill="#e0eff0"/><path d="M115 278q40 12 80 0M480 285q40 12 80 0M270 173q20 8 40 0" fill="none" stroke="#bcdadd" stroke-width="2" stroke-linecap="round"/>${hops}${pads}${frog(x(chosen===null?q.start:Math.min(chosen,10)),190)}<text x="380" y="55" text-anchor="middle" font-size="17" fill="#889d78">← 3 little hops</text>`,`A frog starts at ${q.start} on a number line from zero to ten. Hop back ${q.hops}.`);
}

function flower(x,y,color,id) {
  return `<g transform="translate(${x} ${y})" data-count-item="${id}" role="button" tabindex="0" aria-label="Count flower ${id+1}" aria-pressed="false" style="cursor:pointer"><path d="M0 0v83M0 53q-25-24-30-5 12 20 30 5M0 38q23-23 29-5-11 20-29 5" fill="#9fbe8b" stroke="#7da96e" stroke-width="3" stroke-linecap="round"/><g fill="${color}"><ellipse cx="0" cy="-17" rx="14" ry="19"/><ellipse cx="16" cy="-5" rx="18" ry="14" transform="rotate(25 16 -5)"/><ellipse cx="10" cy="14" rx="14" ry="18" transform="rotate(-20 10 14)"/><ellipse cx="-12" cy="14" rx="14" ry="18" transform="rotate(25 -12 14)"/><ellipse cx="-17" cy="-7" rx="18" ry="14" transform="rotate(-25 -17 -7)"/></g><circle r="14" fill="#f9d675"/><circle cx="-4" cy="-1" r="1.7" fill="#9b7a39"/><circle cx="4" cy="-1" r="1.7" fill="#9b7a39"/><path d="M-3 5q3 3 6 0" stroke="#9b7a39" stroke-width="1.5" fill="none"/><circle class="count-mark" cx="23" cy="-28" r="11" fill="#427a5b" opacity="0"/><text class="count-mark" x="23" y="-23" text-anchor="middle" font-size="15" fill="white" opacity="0">✓</text></g>`;
}

function groupsScene(q) {
  let id=0;
  return svg(q.groups.map((n,g)=>`<g transform="translate(${170+g*210} 0)"><ellipse cy="285" rx="78" ry="10" fill="#e2e7d4"/>${Array.from({length:n},(_,i)=>flower((i-.5)*65,100+(i%2)*24,['#d6b6e8','#f3b19a','#becddf'][g],id++)).join('')}<path d="M-69 200H69l-14 70q-55 15-110 0Z" fill="${['#edb995','#b6c8a1','#bdacd8'][g]}"/><rect x="-76" y="193" width="152" height="20" rx="9" fill="${['#f3c9aa','#ccdcba','#d3c5e5'][g]}"/><path d="M-48 221-40 256" stroke="#fff" stroke-opacity=".3" stroke-width="5" stroke-linecap="round"/></g>`).join(''),`Three pots with two flowers in each pot. Count all six flowers.`);
}

function patternScene(q,chosen) {
  return svg(`<path d="M90 251q110-40 230 0t260 0 110 0" fill="none" stroke="#e1e9d5" stroke-width="3" stroke-linecap="round"/>${leaves(78,252)}${leaves(702,250,-1)}${[...q.sequence,chosen??'?'].map((n,i)=>`<g transform="translate(${140+i*160} ${132-i*15})">${block(n,0,0,i,95,true)}${i<3?'<path d="M65 40h26m-8-7 8 7-8 7" fill="none" stroke="#c5cdb8" stroke-width="3" stroke-linecap="round"/><text x="80" y="22" text-anchor="middle" font-size="14" fill="#91a280">+2</text>':''}</g>`).join('')}`,`Number pattern: two, four, six, missing number.`);
}

export function scene(q,chosen) {
  if(q.kind==='balance')return scaleScene(q,chosen);
  if(q.kind==='count')return countScene(q);
  if(q.kind==='hop')return hopScene(q,chosen);
  if(q.kind==='groups')return groupsScene(q);
  return patternScene(q,chosen);
}
