// v2: manual gear editor cards + live totals. No DPS math.
const state = { rules:null, slots:{}, focus:'DPS' };

function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!=null) e.innerHTML=html; return e; }

function onSlotChange(e){
  const [slot,key] = e.target.name.split(':');
  state.slots[slot] = state.slots[slot] || {};
  state.slots[slot][key] = e.target.value;
  renderPreview();
  saveAuto();
}

function slotTemplate(slot){
  const card = el('div','card');
  card.appendChild(el('h3',null,slot));

  // Tier
  const tierRow = el('div','row');
  tierRow.appendChild(el('label',null,'Tier'));
  const tierSel = el('select');
  state.rules.tiers.forEach(t => tierSel.appendChild(new Option(t,t)));
  tierSel.name = `${slot}:tier`;
  tierSel.addEventListener('input', onSlotChange);
  tierRow.appendChild(tierSel);
  card.appendChild(tierRow);

  // Rune
  const runeRow = el('div','row');
  runeRow.appendChild(el('label',null,'Rune'));
  const runeSel = el('select');
  ['','ATK SPD','Crit Chance','Evasion','DR'].forEach(r=>runeSel.appendChild(new Option(r,r)));
  runeSel.name = `${slot}:rune`;
  runeSel.addEventListener('input', onSlotChange);
  runeRow.appendChild(runeSel);
  card.appendChild(runeRow);

  // Special (5th)
  const spRow = el('div','row');
  spRow.appendChild(el('label',null,'Special Line'));
  const spSel = el('select');
  ['','Crit DMG +80%','HP% +52%','Boss DMG','Racial DMG'].forEach(opt=>spSel.appendChild(new Option(opt,opt)));
  spSel.name = `${slot}:special`;
  spSel.addEventListener('input', onSlotChange);
  spRow.appendChild(spSel);
  card.appendChild(spRow);

  // Normal lines (3 for weapon, 4 for others)
  const stats = ['','ATK SPD','Crit Chance','Evasion','ATK%','Crit DMG%','HP%','DEF%','DR%'];
  const maxLines = slot==='Weapon' ? 3 : 4;
  for(let i=1;i<=maxLines;i++){
    const row = el('div','row');
    const statSel = el('select');
    stats.forEach(s=>statSel.appendChild(new Option(s,s)));
    statSel.name = `${slot}:line${i}:stat`;
    statSel.addEventListener('input', onSlotChange);

    const val = el('input'); val.type='number'; val.step='1'; val.min='0';
    val.name = `${slot}:line${i}:value`;
    val.addEventListener('input', onSlotChange);

    row.appendChild(statSel); row.appendChild(val);
    card.appendChild(row);
  }

  // Image URL
  const imgRow = el('div','row');
  imgRow.appendChild(el('label',null,'Image URL'));
  const url = el('input'); url.type='url'; url.placeholder='https://...';
  url.name = `${slot}:image`;
  url.addEventListener('input', onSlotChange);
  imgRow.appendChild(url);
  card.appendChild(imgRow);

  return card;
}

function renderSlots(){
  const grid = document.getElementById('slotsGrid');
  grid.innerHTML = '';
  state.rules.slots.forEach(slot=> grid.appendChild(slotTemplate(slot)));
}

function computeTotals(){
  const totals = { AS:0, CR:0, EV:0, DR:0 };
  for(const slot in state.slots){
    const s = state.slots[slot];
    // normal lines
    for(let i=1;i<=4;i++){
      const stat = s[`line${i}:stat`];
      const val  = +s[`line${i}:value`] || 0;
      if(stat==='Crit Chance') totals.CR += val;
      if(stat==='Evasion') totals.EV += val;
      if(stat==='DR%') totals.DR += val;
      if(stat==='ATK SPD') totals.AS += val;
    }
    // rune
    if(s.rune==='Crit Chance') totals.CR += 12;
    if(s.rune==='Evasion') totals.EV += 12;
    if(s.rune==='DR') totals.DR += 12;
    if(s.rune==='ATK SPD') totals.AS += 6;
  }
  // caps
  const caps = state.rules.caps;
  totals.CR = Math.min(totals.CR, caps.critFromGearRune);
  totals.EV = Math.min(totals.EV, caps.evaFromGearRune);
  totals.DR = Math.min(totals.DR, caps.tankDRTarget);
  return totals;
}

function renderPreview(){
  const totals = computeTotals();
  document.getElementById('scAS').textContent = `${totals.AS}%`;
  document.getElementById('scCR').textContent = `${totals.CR}%`;
  document.getElementById('scEV').textContent = `${totals.EV}%`;
  document.getElementById('scDR').textContent = `${totals.DR}%`;

  const wrap = document.getElementById('scSlots');
  wrap.innerHTML='';
  state.rules.slots.forEach(slot=>{
    const s = state.slots[slot] || {};
    const box = el('div','sc-slot');
    box.innerHTML = `
      <div><strong>${slot}</strong> <span class="o">${s.tier||''}</span></div>
      <div class="o">${s.special||''}</div>
      <div class="o">${[1,2,3,4].map(i=>{
        const st=s[`line${i}:stat`]||''; const vv=s[`line${i}:value`]||'';
        return st?`${st} ${vv}%`:'';
      }).filter(Boolean).join(' • ')}</div>
    `;
    wrap.appendChild(box);
  });
}

function saveAuto(){ try{ localStorage.setItem('redi-v2-slots', JSON.stringify(state.slots)); }catch(e){} }
function loadSaved(){
  try{
    const raw = localStorage.getItem('redi-v2-slots');
    if(!raw) return;
    state.slots = JSON.parse(raw)||{};
    // push into inputs
    state.rules.slots.forEach(slot=>{
      const s = state.slots[slot]||{};
      const set = (k,v)=>{ const q=document.querySelector(`[name="${slot}:${k}"]`); if(q && v!=null) q.value=v; };
      set('tier', s.tier||'');
      set('rune', s.rune||'');
      set('special', s.special||'');
      for(let i=1;i<=4;i++){
        set(`line${i}:stat`, s[`line${i}:stat`]||'');
        set(`line${i}:value`, s[`line${i}:value`]||'');
      }
      set('image', s.image||'');
    });
  }catch(e){}
}

async function exportPNG(){
  const node = document.getElementById('shareCard');
  const canvas = await html2canvas(node,{backgroundColor:null,scale:2,useCORS:true});
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a'); a.href=url; a.download='rediscover-build.png'; a.click();
}

async function boot(){
  state.rules = await fetch('rules.json').then(r=>r.json());
  renderSlots();
  loadSaved();
  renderPreview();

  document.getElementsByName('focus').forEach?.(r=>r.addEventListener('change', (e)=>{
    state.focus = e.target.value;
    document.getElementById('badgeFocus').textContent = state.focus;
  }));

  document.getElementById('btnExport').addEventListener('click', exportPNG);
}

document.addEventListener('DOMContentLoaded', boot);
