const state = { rules: null, slots: {}, currentSlot: null };

function openEditor(slot) {
  state.currentSlot = slot;
  document.getElementById('modalTitle').textContent = slot;

  const tierSel = document.getElementById('editTier');
  tierSel.innerHTML = '';
  state.rules.tiers.forEach(t => tierSel.appendChild(new Option(t, t)));

  const saved = state.slots[slot] || {};
  tierSel.value = saved.tier || '';
  document.getElementById('editRune').value = saved.rune || '';
  document.getElementById('editSpecial').value = saved.special || '';

  const linesDiv = document.getElementById('editLines');
  linesDiv.innerHTML = '';
  const maxLines = slot === 'Weapon' ? 3 : 4;
  for (let i = 1; i <= maxLines; i++) {
    const statSel = document.createElement('select');
    [
      '',
      'ATK SPD',
      'Crit Chance',
      'Evasion',
      'ATK%',
      'Crit DMG%',
      'HP%',
      'DEF%',
      'DR%'
    ].forEach(opt => statSel.appendChild(new Option(opt, opt)));
    statSel.value = saved[`line${i}:stat`] || '';
    statSel.id = `editStat${i}`;

    const val = document.createElement('input');
    val.type = 'number';
    val.step = '1';
    val.min = '0';
    val.value = saved[`line${i}:value`] || '';
    val.id = `editVal${i}`;

    const wrap = document.createElement('div');
    wrap.appendChild(statSel);
    wrap.appendChild(val);
    linesDiv.appendChild(wrap);
  }

  document.getElementById('editorModal').classList.remove('hidden');
}

function saveEditor() {
  const slot = state.currentSlot;
  if (!slot) return;

  const s = {};
  s.tier = document.getElementById('editTier').value;
  s.rune = document.getElementById('editRune').value;
  s.special = document.getElementById('editSpecial').value;

  const maxLines = slot === 'Weapon' ? 3 : 4;
  for (let i = 1; i <= maxLines; i++) {
    s[`line${i}:stat`] = document.getElementById('editStat' + i).value;
    s[`line${i}:value`] = document.getElementById('editVal' + i).value;
  }

  state.slots[slot] = s;

  // ✅ update the correct slot box
  const box = document.querySelector(`.slot[data-slot="${slot}"]`);
  if (box) {
    box.textContent = slot + "\n" + (s.tier || "");
  }

  renderPreview();
  closeEditor();
}

function closeEditor() {
  document.getElementById('editorModal').classList.add('hidden');
}

function computeTotals() {
  const totals = { AS: 0, CR: 0, EV: 0, DR: 0 };

  for (const slot in state.slots) {
    const s = state.slots[slot];
    for (let i = 1; i <= 4; i++) {
      const st = s[`line${i}:stat`];
      const val = +s[`line${i}:value`] || 0;
      if (st === 'Crit Chance') totals.CR += val;
      if (st === 'Evasion') totals.EV += val;
      if (st === 'DR%') totals.DR += val;
      if (st === 'ATK SPD') totals.AS += val;
    }
    if (s.rune === 'Crit Chance') totals.CR += 12;
    if (s.rune === 'Evasion') totals.EV += 12;
    if (s.rune === 'DR') totals.DR += 12;
    if (s.rune === 'ATK SPD') totals.AS += 6;
  }

  const caps = state.rules.caps;
  totals.CR = Math.min(totals.CR, caps.critFromGearRune);
  totals.EV = Math.min(totals.EV, caps.evaFromGearRune);
  totals.DR = Math.min(totals.DR, caps.tankDRTarget);

  return totals;
}

function renderPreview() {
  const t = computeTotals();
  document.getElementById('scAS').textContent = t.AS + '%';
  document.getElementById('scCR').textContent = t.CR + '%';
  document.getElementById('scEV').textContent = t.EV + '%';
  document.getElementById('scDR').textContent = t.DR + '%';
}

async function exportPNG() {
  const node = document.getElementById('shareCard');
  const canvas = await html2canvas(node, { backgroundColor: null, scale: 2 });
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gear-build.png';
  a.click();
}

async function boot() {
  state.rules = await fetch('rules.json').then(r => r.json());

  // ✅ proper slot click binding
  document.querySelectorAll('.slot').forEach(box => {
    box.addEventListener('click', () => openEditor(box.dataset.slot));
  });

  document.getElementById('btnSave').addEventListener('click', saveEditor);
  document.getElementById('btnCancel').addEventListener('click', closeEditor);
  document.getElementById('btnExport').addEventListener('click', exportPNG);

  renderPreview();
}

document.addEventListener('DOMContentLoaded', boot);
