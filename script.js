/* ============================================================
   MMLI CREDENTIAL STUDIO — APPLICATION LOGIC
   Mind Masters Liberia Initiative
   ============================================================ */

(function(){
"use strict";

/* ============================================================
   1. STORAGE LAYER (modular — swap localStorage for a real DB later
      by re-implementing the same method names below)
   ============================================================ */
const StorageAdapter = {
  _key(name){ return "mmli_studio_v1_" + name; },
  get(name, fallback){
    try{
      const raw = localStorage.getItem(this._key(name));
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ console.warn("Storage read failed", name, e); return fallback; }
  },
  set(name, value){
    try{
      localStorage.setItem(this._key(name), JSON.stringify(value));
      return true;
    }catch(e){ console.warn("Storage write failed", name, e); return false; }
  },
  remove(name){ try{ localStorage.removeItem(this._key(name)); }catch(e){} }
};

/* ============================================================
   2. UTILITIES
   ============================================================ */
function uid(){ return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function todayISO(){ return new Date().toISOString().slice(0,10); }

function formatDateHuman(iso){
  if(!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if(isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric'});
}

function toast(message, type){
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(()=>el.remove(), 300); }, 3200);
}

function openModal(id){ document.getElementById(id).hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal(id){ document.getElementById(id).hidden = true; document.body.style.overflow = ''; }

document.addEventListener('click', (e) => {
  if(e.target.matches('[data-close-modal]')){
    closeModal(e.target.getAttribute('data-close-modal'));
  }
  if(e.target.classList && e.target.classList.contains('modal-overlay')){
    e.target.hidden = true; document.body.style.overflow = '';
  }
});

let confirmCallback = null;
function askConfirm(title, body, onConfirm, danger){
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmBody').textContent = body;
  confirmCallback = onConfirm;
  const btn = document.getElementById('confirmActionBtn');
  btn.className = danger === false ? 'btn btn-primary' : 'btn btn-danger';
  openModal('confirmModal');
}
document.getElementById('confirmActionBtn').addEventListener('click', () => {
  closeModal('confirmModal');
  if(confirmCallback) confirmCallback();
  confirmCallback = null;
});

/* ============================================================
   3. CREDENTIAL TYPE CONFIGURATION
   ============================================================ */
// Reusable option sets
const OPT_PARTICIPANT_POSITION = ["Academic Competitor","Team Captain","Team Member","Individual Competitor","Substitute","National Team Member","Other"];
const OPT_TEAM_ROLE = ["Team Captain","Team Member"];
const OPT_STAFF_POSITION = ["Executive Director","Program Coordinator","Project Coordinator","Administrative Staff","Technical Staff","Communications Officer","Finance Officer","Training Coordinator","Event Coordinator","Other"];
const OPT_OFFICIAL_POSITION = ["Competition Judge","Chief Judge","Adjudicator","Moderator","Invigilator","Scorekeeper","Competition Official","Technical Official","Other"];
const OPT_COACH_POSITION = ["Academic Coach","Trainer","Assistant Coach","Other"];
const OPT_VOLUNTEER_ROLE = ["General Volunteer","Registration","Logistics","Ushering","Technical Support","Hospitality","Other"];
const OPT_COORDINATOR_POSITION = ["Program Coordinator","Event Coordinator","Regional Coordinator","Logistics Coordinator","Other"];
const OPT_DIVISION = ["Junior","Senior","Open","Other"];

const CREDENTIAL_TYPES = {
  participant: {
    label: "Academic Participant", tag:"AP", family:"participant", idPrefix:"P",
    defaultPosition: "Academic Competitor",
    fields: [
      {key:"fullName", label:"Full Name", type:"text", required:true},
      {key:"photo", label:"Photograph", type:"photo"},
      {key:"institution", label:"Institution / School Name", type:"text", required:true},
      {key:"subject", label:"Subject", type:"text", required:true, placeholder:"e.g. Mathematics"},
      {key:"event", label:"Competition / Event", type:"eventtext", required:true},
      {key:"division", label:"Division", type:"select", options:OPT_DIVISION, allowOther:true},
      {key:"team", label:"Team", type:"text", placeholder:"e.g. UL Mathematics Team"},
      {key:"position", label:"Position", type:"select", options:OPT_PARTICIPANT_POSITION, allowOther:true, default:"Academic Competitor"},
      {key:"teamRole", label:"Team Role", type:"select", options:OPT_TEAM_ROLE, optional:true},
      {key:"validThrough", label:"Valid Through", type:"date"}
    ],
    previewMeta: [
      {key:"subject", label:"Subject"},
      {key:"institution", label:"Institution"},
      {key:"team", label:"Team"},
      {key:"division", label:"Division"}
    ],
    kindLabelFrom: "position"
  },
  teamCaptain: {
    label: "Team Captain", tag:"TC", family:"participant", idPrefix:"P",
    baseType:"participant", presetPosition:"Team Captain", presetTeamRole:"Team Captain"
  },
  teamMember: {
    label: "Team Member", tag:"TM", family:"participant", idPrefix:"P",
    baseType:"participant", presetPosition:"Team Member", presetTeamRole:"Team Member"
  },
  coach: {
    label: "Coach / Trainer", tag:"CO", family:"staff", idPrefix:"COA",
    fields: [
      {key:"fullName", label:"Full Name", type:"text", required:true},
      {key:"photo", label:"Photograph", type:"photo"},
      {key:"institution", label:"Institution", type:"text", required:true},
      {key:"position", label:"Position", type:"select", options:OPT_COACH_POSITION, allowOther:true, default:"Academic Coach"},
      {key:"team", label:"Team", type:"text"},
      {key:"event", label:"Program / Event", type:"eventtext"},
      {key:"validThrough", label:"Valid Through", type:"date"}
    ],
    previewMeta: [
      {key:"institution", label:"Institution"},
      {key:"team", label:"Team"},
      {key:"event", label:"Program"}
    ],
    kindLabelFrom: "position"
  },
  staff: {
    label: "Staff", tag:"ST", family:"staff", idPrefix:"STF",
    fields: [
      {key:"fullName", label:"Full Name", type:"text", required:true},
      {key:"photo", label:"Photograph", type:"photo"},
      {key:"organization", label:"Organization", type:"text", required:true, default:"Mind Masters Liberia Initiative"},
      {key:"position", label:"Position", type:"select", options:OPT_STAFF_POSITION, allowOther:true, required:true},
      {key:"department", label:"Department / Program", type:"text"},
      {key:"event", label:"Event", type:"eventtext"},
      {key:"validThrough", label:"Valid Through", type:"date"}
    ],
    previewMeta: [
      {key:"department", label:"Department"},
      {key:"organization", label:"Organization"},
      {key:"event", label:"Event"}
    ],
    kindLabelFrom: "position"
  },
  official: {
    label: "Official", tag:"OF", family:"official", idPrefix:"OFF",
    fields: [
      {key:"fullName", label:"Full Name", type:"text", required:true},
      {key:"photo", label:"Photograph", type:"photo"},
      {key:"organization", label:"Organization", type:"text", required:true, default:"Mind Masters Liberia Initiative"},
      {key:"position", label:"Position", type:"select", options:OPT_OFFICIAL_POSITION, allowOther:true, required:true},
      {key:"event", label:"Event", type:"eventtext"},
      {key:"validThrough", label:"Valid Through", type:"date"}
    ],
    previewMeta: [
      {key:"organization", label:"Organization"},
      {key:"event", label:"Event"}
    ],
    kindLabelFrom: "position"
  },
  volunteer: {
    label: "Volunteer", tag:"VL", family:"staff", idPrefix:"VOL",
    fields: [
      {key:"fullName", label:"Full Name", type:"text", required:true},
      {key:"photo", label:"Photograph", type:"photo"},
      {key:"organization", label:"Organization", type:"text", required:true, default:"Mind Masters Liberia Initiative"},
      {key:"position", label:"Position / Volunteer Role", type:"select", options:OPT_VOLUNTEER_ROLE, allowOther:true},
      {key:"event", label:"Event", type:"eventtext"},
      {key:"validThrough", label:"Valid Through", type:"date"}
    ],
    previewMeta: [
      {key:"organization", label:"Organization"},
      {key:"event", label:"Event"}
    ],
    kindLabelFrom: "position"
  },
  coordinator: {
    label: "Coordinator", tag:"CR", family:"staff", idPrefix:"COR",
    fields: [
      {key:"fullName", label:"Full Name", type:"text", required:true},
      {key:"photo", label:"Photograph", type:"photo"},
      {key:"organization", label:"Organization", type:"text", required:true, default:"Mind Masters Liberia Initiative"},
      {key:"position", label:"Position", type:"select", options:OPT_COORDINATOR_POSITION, allowOther:true},
      {key:"program", label:"Program", type:"text"},
      {key:"event", label:"Event", type:"eventtext"},
      {key:"validThrough", label:"Valid Through", type:"date"}
    ],
    previewMeta: [
      {key:"program", label:"Program"},
      {key:"organization", label:"Organization"},
      {key:"event", label:"Event"}
    ],
    kindLabelFrom: "position"
  },
  vip: {
    label: "VIP / Guest", tag:"VIP", family:"official", idPrefix:"VIP",
    fields: [
      {key:"fullName", label:"Full Name", type:"text", required:true},
      {key:"photo", label:"Photograph", type:"photo"},
      {key:"organization", label:"Organization", type:"text"},
      {key:"position", label:"Position / Title", type:"text", placeholder:"e.g. Guest of Honor"},
      {key:"event", label:"Event", type:"eventtext"},
      {key:"validThrough", label:"Valid Through", type:"date"}
    ],
    previewMeta: [
      {key:"organization", label:"Organization"},
      {key:"event", label:"Event"}
    ],
    kindLabelFrom: "position", kindLabelDefault:"VIP Guest"
  },
  nationalTeam: {
    label: "National Team Member", tag:"NT", family:"participant", idPrefix:"NT",
    fields: [
      {key:"fullName", label:"Full Name", type:"text", required:true},
      {key:"photo", label:"Photograph", type:"photo"},
      {key:"country", label:"Country", type:"text", required:true, default:"Liberia"},
      {key:"institution", label:"Institution", type:"text"},
      {key:"subject", label:"Subject", type:"text"},
      {key:"team", label:"Team", type:"text"},
      {key:"position", label:"Position", type:"select", options:OPT_PARTICIPANT_POSITION, allowOther:true, default:"National Team Member"},
      {key:"event", label:"Competition", type:"eventtext", required:true},
      {key:"validThrough", label:"Valid Through", type:"date"}
    ],
    previewMeta: [
      {key:"country", label:"Country"},
      {key:"subject", label:"Subject"},
      {key:"team", label:"Team"},
      {key:"event", label:"Competition"}
    ],
    kindLabelFrom: "position", kindLabelDefault:"National Team Member"
  }
};

// Resolve inherited (base) type configs for teamCaptain / teamMember
function resolveTypeConfig(typeId){
  const cfg = CREDENTIAL_TYPES[typeId];
  if(!cfg) return null;
  if(cfg.baseType){
    const base = CREDENTIAL_TYPES[cfg.baseType];
    return Object.assign({}, base, {label:cfg.label, tag:cfg.tag, idPrefix:cfg.idPrefix, family:cfg.family, presetPosition:cfg.presetPosition, presetTeamRole:cfg.presetTeamRole, _isVariant:true, baseType:cfg.baseType});
  }
  return cfg;
}

const TYPE_ORDER = ["participant","teamCaptain","teamMember","coach","staff","official","volunteer","coordinator","vip","nationalTeam"];

/* ============================================================
   4. APPLICATION STATE
   ============================================================ */
const state = {
  credentials: StorageAdapter.get('credentials', []),
  events: StorageAdapter.get('events', []),
  settings: StorageAdapter.get('settings', {
    orgName: "Mind Masters Liberia Initiative",
    motto: "Unleashing the Genius Within",
    logoFull: MMLI_ASSETS.MMLI_LOGO_FULL,
    logoMark: MMLI_ASSETS.MMLI_LOGO_MARK,
    signature: MMLI_ASSETS.MMLI_SIGNATURE,
    signatoryName: "Executive Director",
    signatoryTitle: "Mind Masters Liberia Initiative"
  }),
  counters: StorageAdapter.get('counters', {}),
  currentTypeId: null,
  editingCredId: null,     // credential being edited via inline create form (create view)
  currentPhotoTarget: null, // 'create' | 'edit' — which form the crop result should apply to
  pendingCropFile: null,
  bulkRows: []
};

function persist(){
  StorageAdapter.set('credentials', state.credentials);
  StorageAdapter.set('events', state.events);
  StorageAdapter.set('settings', state.settings);
  StorageAdapter.set('counters', state.counters);
}

/* ============================================================
   5. ID GENERATION
   ============================================================ */
function generateCredentialId(prefix, yearHint){
  const year = yearHint || new Date().getFullYear();
  const counterKey = prefix + '-' + year;
  let n = (state.counters[counterKey] || 0) + 1;
  let candidate;
  do{
    candidate = `MMLI-${prefix}-${year}-${String(n).padStart(5,'0')}`;
    n++;
  } while(state.credentials.some(c => c.credentialId === candidate));
  state.counters[counterKey] = n - 1;
  return candidate;
}

function yearFromEventName(eventName){
  if(!eventName) return null;
  const ev = state.events.find(e => e.name && e.name.toLowerCase() === String(eventName).toLowerCase());
  if(ev && ev.year && /^\d{4}$/.test(String(ev.year))) return parseInt(ev.year,10);
  const m = String(eventName).match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1],10) : null;
}

/* ============================================================
   6. QR CODE HELPER — returns a data URL synchronously via qrcode.js
   ============================================================ */
const qrCache = new Map();
function getQrDataUrl(text, size){
  size = size || 200;
  const cacheKey = text + '|' + size;
  if(qrCache.has(cacheKey)) return qrCache.get(cacheKey);
  const temp = document.createElement('div');
  temp.style.position = 'fixed';
  temp.style.left = '-9999px';
  document.body.appendChild(temp);
  let dataUrl = '';
  try{
    /* eslint-disable no-undef */
    new QRCode(temp, {
      text: text,
      width: size,
      height: size,
      correctLevel: QRCode.CorrectLevel.M,
      colorDark: "#0b2545",
      colorLight: "#ffffff"
    });
    const canvas = temp.querySelector('canvas');
    if(canvas) dataUrl = canvas.toDataURL('image/png');
    else{
      const img = temp.querySelector('img');
      if(img) dataUrl = img.src;
    }
  }catch(e){ console.warn('QR generation failed', e); }
  document.body.removeChild(temp);
  qrCache.set(cacheKey, dataUrl);
  return dataUrl;
}

/* expose for later sections */
window.__MMLI = { StorageAdapter, uid, escapeHtml, todayISO, formatDateHuman, toast, openModal, closeModal, askConfirm,
  CREDENTIAL_TYPES, resolveTypeConfig, TYPE_ORDER, state, persist, generateCredentialId, yearFromEventName, getQrDataUrl };

})();

/* ============================================================
   7. CREDENTIAL CARD BUILDER
   ============================================================ */
(function(){
"use strict";
const { escapeHtml, CREDENTIAL_TYPES, resolveTypeConfig, state, getQrDataUrl, formatDateHuman } = window.__MMLI;

const PHOTO_PLACEHOLDER_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/></svg>';

function getKindLabel(typeId, cfg, fields){
  if(cfg.kindLabelFrom){
    const raw = fields[cfg.kindLabelFrom];
    if(raw === 'Other' && fields[cfg.kindLabelFrom + 'Other']) return fields[cfg.kindLabelFrom + 'Other'];
    if(raw) return raw;
  }
  return cfg.kindLabelDefault || cfg.label;
}

function effectiveStatus(cred){
  if(cred.status === 'revoked') return 'revoked';
  if(cred.fields.validThrough){
    const vt = new Date(cred.fields.validThrough + 'T23:59:59');
    if(!isNaN(vt) && vt.getTime() < Date.now()) return 'expired';
  }
  if(cred.status === 'expired') return 'expired';
  return 'valid';
}

function statusStripHtml(status){
  const labelMap = {valid:'Valid Credential', revoked:'Revoked', expired:'Expired'};
  return `<div class="cc-status-strip ${status}">${labelMap[status]}</div>`;
}

function metaRowsHtml(cfg, fields){
  const rows = (cfg.previewMeta || []).filter(m => fields[m.key]);
  return rows.slice(0,4).map(m => `
    <div class="row"><span class="k">${escapeHtml(m.label)}</span><span class="v">${escapeHtml(fields[m.key])}</span></div>
  `).join('');
}

function orgLogoImg(){
  return state.settings.logoMark || state.settings.logoFull || '';
}

function buildCardFrontHtml(cred, cfg, opts){
  opts = opts || {};
  const fields = cred.fields;
  const status = effectiveStatus(cred);
  const kind = getKindLabel(cred.typeId, cfg, fields);
  const photoInner = fields.photo
    ? `<img src="${fields.photo}" alt="">`
    : PHOTO_PLACEHOLDER_SVG;
  const qrSize = opts.exportMode ? 260 : 120;
  const qrUrl = getQrDataUrl(cred.credentialId, qrSize);
  const sealHtml = cfg.family === 'official'
    ? `<img class="cc-seal" src="${window.__MMLI.state.settings.logoMark}" alt="">`
    : '';

  return `
    <div class="cc-bg"></div>
    <div class="cc-geo"></div>
    <div class="cc-sheen"></div>
    ${sealHtml}
    ${statusStripHtml(status)}
    <div class="cc-content">
      <div class="cc-topline">
        <div class="cc-org">
          <img src="${orgLogoImg()}" alt="">
          <div class="cc-org-text">
            <span class="n">MMLI</span>
            <span class="m">${escapeHtml(state.settings.motto || '')}</span>
          </div>
        </div>
        <div class="cc-kind">${escapeHtml(cfg.label)}</div>
      </div>
      <div class="cc-body">
        <div class="cc-photo">${photoInner}<div class="cc-photo-ring"></div></div>
        <div class="cc-info">
          <div class="cc-name">${escapeHtml(fields.fullName || 'Full Name')}</div>
          <div class="cc-role">${escapeHtml(kind)}</div>
          <div class="cc-meta">${metaRowsHtml(cfg, fields)}</div>
        </div>
      </div>
      <div class="cc-bottom">
        <div class="cc-id"><span class="lbl">Credential ID</span>${escapeHtml(cred.credentialId)}</div>
        <div class="cc-qr">${qrUrl ? `<img src="${qrUrl}" alt="QR">` : ''}</div>
      </div>
    </div>
  `;
}

function buildCardBackHtml(cred, cfg, opts){
  opts = opts || {};
  const fields = cred.fields;
  const qrSize = opts.exportMode ? 320 : 150;
  const qrUrl = getQrDataUrl(cred.credentialId, qrSize);
  const validThrough = fields.validThrough ? formatDateHuman(fields.validThrough) : 'See event schedule';
  return `
    <div class="cc-bg"></div>
    <div class="cc-geo"></div>
    <div class="cc-back-inner">
      <div class="cc-back-head">
        <img src="${orgLogoImg()}" alt="">
        <div>
          <span class="n">${escapeHtml(state.settings.orgName)}</span><br>
          <span class="m">Official Credential</span>
        </div>
      </div>
      <div class="cc-statement">This card certifies that the bearer is duly registered with Mind Masters Liberia Initiative for the credential and event named herein. It remains the property of MMLI and must be surrendered upon request or at the close of the event.</div>
      <div class="cc-back-grid">
        <div class="cc-back-qr">${qrUrl ? `<img src="${qrUrl}" alt="QR">` : ''}</div>
        <div class="cc-back-info">
          <div class="row"><span>Event</span><span>${escapeHtml(fields.event || '—')}</span></div>
          <div class="row"><span>Issued</span><span>${formatDateHuman(cred.createdAt)}</span></div>
          <div class="row"><span>Valid Through</span><span>${escapeHtml(validThrough)}</span></div>
          <div class="row"><span>Verify</span><span>Scan QR code</span></div>
        </div>
      </div>
      <div class="cc-sig-block">
        <img src="${window.__MMLI.state.settings.signature || ''}" alt="Authorized signature">
        <div class="cc-sig-caption">Authorized Signature<br>MMLI Executive Office</div>
      </div>
      <div class="cc-footer-note">Property of Mind Masters Liberia Initiative — mmli.org.lr (placeholder)</div>
    </div>
  `;
}

function buildCardEl(cred, face, opts){
  opts = opts || {};
  const cfg = resolveTypeConfig(cred.typeId);
  const el = document.createElement('div');
  el.className = `cred-card fam-${cfg.family}` + (opts.exportMode ? ' export-size' : '') + (face === 'back' ? ' back-face' : '');
  el.innerHTML = face === 'back' ? buildCardBackHtml(cred, cfg, opts) : buildCardFrontHtml(cred, cfg, opts);
  return el;
}

window.__MMLI.getKindLabel = getKindLabel;
window.__MMLI.effectiveStatus = effectiveStatus;
window.__MMLI.buildCardEl = buildCardEl;

})();

/* ============================================================
   8. DYNAMIC FORM BUILDER
   ============================================================ */
(function(){
"use strict";
const { escapeHtml, uid, state, resolveTypeConfig, toast } = window.__MMLI;

function ensureEventsDatalist(){
  let dl = document.getElementById('eventsDatalist');
  if(!dl){
    dl = document.createElement('datalist');
    dl.id = 'eventsDatalist';
    document.body.appendChild(dl);
  }
  dl.innerHTML = state.events.map(ev => `<option value="${escapeHtml(ev.name)}">`).join('');
  return dl;
}

function fieldHtml(f, value, otherValue){
  const req = f.required ? '<span class="req">*</span>' : '';
  const id = 'f_' + f.key;
  let control = '';
  if(f.type === 'text'){
    control = `<input type="text" id="${id}" data-field="${f.key}" placeholder="${escapeHtml(f.placeholder||'')}" value="${escapeHtml(value||'')}">`;
  } else if(f.type === 'date'){
    control = `<input type="date" id="${id}" data-field="${f.key}" value="${escapeHtml(value||'')}">`;
  } else if(f.type === 'eventtext'){
    ensureEventsDatalist();
    control = `<input type="text" id="${id}" data-field="${f.key}" list="eventsDatalist" placeholder="e.g. National Mathematics Championship" value="${escapeHtml(value||'')}">`;
  } else if(f.type === 'select'){
    const opts = f.options.map(o => `<option value="${escapeHtml(o)}" ${o===value?'selected':''}>${escapeHtml(o)}</option>`).join('');
    const blank = f.optional ? '<option value="">— Not applicable —</option>' : '<option value="" disabled '+(value?'':'selected')+'>Select…</option>';
    control = `<select id="${id}" data-field="${f.key}">${blank}${opts}</select>`;
    if(f.allowOther){
      control += `<input type="text" class="other-field${value==='Other'?' show':''}" data-field-other="${f.key}" placeholder="Please specify" value="${escapeHtml(otherValue||'')}">`;
    }
  } else if(f.type === 'photo'){
    control = `
      <div class="photo-upload">
        <div class="photo-preview-sm" id="photoPreview_${f.key}">${value ? `<img src="${value}" alt="">` : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/></svg>'}</div>
        <div class="photo-actions">
          <button type="button" class="btn btn-outline btn-sm" data-photo-upload="${f.key}">Upload Photo</button>
          <button type="button" class="btn btn-ghost btn-sm" data-photo-remove="${f.key}">Remove</button>
        </div>
        <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" hidden id="photoInput_${f.key}">
      </div>
      <input type="hidden" data-field="${f.key}" id="${id}" value="${escapeHtml(value||'')}">
    `;
  }
  return `<div class="field" data-field-wrap="${f.key}"><label for="${id}">${escapeHtml(f.label)} ${req}</label>${control}<div class="err">This field is required.</div></div>`;
}

function renderCredentialForm(container, typeId, existingFields){
  const cfg = resolveTypeConfig(typeId);
  existingFields = existingFields || {};
  container.innerHTML = cfg.fields.map(f => {
    let val = existingFields[f.key];
    if(val === undefined){
      if(f.key === 'position' && cfg.presetPosition) val = cfg.presetPosition;
      else if(f.key === 'teamRole' && cfg.presetTeamRole) val = cfg.presetTeamRole;
      else val = f.default || '';
    }
    const otherVal = existingFields[f.key + 'Other'] || '';
    return fieldHtml(f, val, otherVal);
  }).join('');

  // wire select-other toggles
  container.querySelectorAll('select[data-field]').forEach(sel => {
    sel.addEventListener('change', () => {
      const wrap = sel.closest('.field');
      const otherInput = wrap.querySelector('[data-field-other]');
      if(otherInput){
        if(sel.value === 'Other'){ otherInput.classList.add('show'); otherInput.focus(); }
        else { otherInput.classList.remove('show'); otherInput.value=''; }
      }
      wrap.classList.remove('invalid');
    });
  });
  container.querySelectorAll('input[data-field], textarea[data-field]').forEach(inp => {
    inp.addEventListener('input', () => inp.closest('.field').classList.remove('invalid'));
  });

  // wire photo controls
  container.querySelectorAll('[data-photo-upload]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-photo-upload');
      document.getElementById('photoInput_' + key).click();
    });
  });
  container.querySelectorAll('input[type=file][id^="photoInput_"]').forEach(inp => {
    inp.addEventListener('change', (e) => {
      const key = inp.id.replace('photoInput_','');
      const file = e.target.files[0];
      if(!file) return;
      window.__MMLI.openCropModal(file, (dataUrl) => {
        document.getElementById('f_' + key).value = dataUrl;
        const prev = document.getElementById('photoPreview_' + key);
        prev.innerHTML = `<img src="${dataUrl}" alt="">`;
        container.dispatchEvent(new CustomEvent('mmli:change'));
      });
      inp.value = '';
    });
  });
  container.querySelectorAll('[data-photo-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-photo-remove');
      document.getElementById('f_' + key).value = '';
      document.getElementById('photoPreview_' + key).innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="26" height="26"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7"/></svg>';
      container.dispatchEvent(new CustomEvent('mmli:change'));
    });
  });

  // live-update event
  container.querySelectorAll('input[data-field], select[data-field], input[data-field-other]').forEach(el => {
    el.addEventListener('input', () => container.dispatchEvent(new CustomEvent('mmli:change')));
    el.addEventListener('change', () => container.dispatchEvent(new CustomEvent('mmli:change')));
  });

  return {
    cfg,
    getData(){
      const data = {};
      cfg.fields.forEach(f => {
        const el = container.querySelector(`[data-field="${f.key}"]`);
        let val = el ? el.value : '';
        data[f.key] = val;
        if(f.allowOther){
          const otherEl = container.querySelector(`[data-field-other="${f.key}"]`);
          if(otherEl) data[f.key + 'Other'] = otherEl.value;
        }
      });
      if(cfg.presetPosition && !data.position) data.position = cfg.presetPosition;
      if(cfg.presetTeamRole && !data.teamRole) data.teamRole = cfg.presetTeamRole;
      return data;
    },
    validate(){
      let ok = true;
      let firstInvalid = null;
      cfg.fields.forEach(f => {
        if(!f.required) return;
        const el = container.querySelector(`[data-field="${f.key}"]`);
        const wrap = container.querySelector(`[data-field-wrap="${f.key}"]`);
        if(!el || !el.value || !String(el.value).trim()){
          ok = false;
          wrap.classList.add('invalid');
          if(!firstInvalid) firstInvalid = el;
        } else {
          wrap.classList.remove('invalid');
        }
      });
      if(!ok && firstInvalid) firstInvalid.scrollIntoView({behavior:'smooth', block:'center'});
      if(!ok) toast('Please fill in all required fields.', 'error');
      return ok;
    }
  };
}

window.__MMLI.renderCredentialForm = renderCredentialForm;
window.__MMLI.ensureEventsDatalist = ensureEventsDatalist;

})();

/* ============================================================
   9. PHOTO CROP TOOL
   ============================================================ */
(function(){
"use strict";
const { openModal, closeModal } = window.__MMLI;

const CANVAS_W = 330, CANVAS_H = 400; // internal working res, 33:40 ratio
const OUTPUT_W = 660, OUTPUT_H = 800; // 2x for crisp export

let img = null, baseScale = 1, zoom = 1, offsetX = 0, offsetY = 0;
let dragging = false, dragStart = null;
let onDoneCallback = null;
let canvas, ctx;

function clampOffsets(){
  const drawW = img.naturalWidth * baseScale * zoom;
  const drawH = img.naturalHeight * baseScale * zoom;
  const maxX = Math.max(0, (drawW - CANVAS_W) / 2);
  const maxY = Math.max(0, (drawH - CANVAS_H) / 2);
  offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
  offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
}

function redraw(){
  if(!img) return;
  ctx.fillStyle = '#0c1524';
  ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  const drawW = img.naturalWidth * baseScale * zoom;
  const drawH = img.naturalHeight * baseScale * zoom;
  const x = CANVAS_W/2 - drawW/2 + offsetX;
  const y = CANVAS_H/2 - drawH/2 + offsetY;
  ctx.drawImage(img, x, y, drawW, drawH);
  // subtle frame guide
  ctx.strokeStyle = 'rgba(232,169,59,.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1,1,CANVAS_W-2,CANVAS_H-2);
}

function initCanvas(){
  canvas = document.getElementById('cropCanvas');
  canvas.width = CANVAS_W; canvas.height = CANVAS_H;
  ctx = canvas.getContext('2d');

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    dragStart = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY, scaleX, scaleY: CANVAS_H/rect.height };
  });
  canvas.addEventListener('pointermove', (e) => {
    if(!dragging || !dragStart) return;
    const dx = (e.clientX - dragStart.x) * dragStart.scaleX;
    const dy = (e.clientY - dragStart.y) * dragStart.scaleY;
    offsetX = dragStart.ox + dx;
    offsetY = dragStart.oy + dy;
    clampOffsets();
    redraw();
  });
  ['pointerup','pointercancel','pointerleave'].forEach(ev => {
    canvas.addEventListener(ev, () => { dragging = false; dragStart = null; });
  });

  document.getElementById('cropZoom').addEventListener('input', (e) => {
    zoom = parseInt(e.target.value,10) / 100;
    clampOffsets();
    redraw();
  });
}

function openCropModal(file, onDone){
  onDoneCallback = onDone;
  if(!canvas) initCanvas();
  const reader = new FileReader();
  reader.onload = (ev) => {
    const image = new Image();
    image.onload = () => {
      img = image;
      baseScale = Math.max(CANVAS_W / img.naturalWidth, CANVAS_H / img.naturalHeight);
      zoom = 1;
      offsetX = 0; offsetY = 0;
      document.getElementById('cropZoom').value = 100;
      clampOffsets();
      redraw();
      openModal('cropModal');
    };
    image.onerror = () => { window.__MMLI.toast('Could not load that image.', 'error'); };
    image.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById('applyCropBtn').addEventListener('click', () => {
  if(!img) return;
  const outCanvas = document.createElement('canvas');
  outCanvas.width = OUTPUT_W; outCanvas.height = OUTPUT_H;
  const octx = outCanvas.getContext('2d');
  const rescale = OUTPUT_W / CANVAS_W;
  const drawW = img.naturalWidth * baseScale * zoom * rescale;
  const drawH = img.naturalHeight * baseScale * zoom * rescale;
  const x = OUTPUT_W/2 - drawW/2 + offsetX * rescale;
  const y = OUTPUT_H/2 - drawH/2 + offsetY * rescale;
  octx.drawImage(img, x, y, drawW, drawH);
  const dataUrl = outCanvas.toDataURL('image/jpeg', 0.92);
  closeModal('cropModal');
  if(onDoneCallback) onDoneCallback(dataUrl);
});

window.__MMLI.openCropModal = openCropModal;

})();

/* ============================================================
   10. CSV PARSING (lightweight, quote-aware)
   ============================================================ */
function parseCsvText(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  text = text.replace(/\r\n/g, '\n').replace(/\r/g,'\n');
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if(c === '"') inQuotes = true;
      else if(c === ','){ row.push(field); field=''; }
      else if(c === '\n'){ row.push(field); rows.push(row); row=[]; field=''; }
      else field += c;
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  const nonEmpty = rows.filter(r => r.some(cell => cell.trim() !== ''));
  if(!nonEmpty.length) return [];
  const headers = nonEmpty[0].map(h => h.trim());
  return nonEmpty.slice(1).map(r => {
    const obj = {};
    headers.forEach((h,idx) => obj[h] = (r[idx]||'').trim());
    return obj;
  });
}

window.__MMLI.parseCsvText = parseCsvText;

/* ============================================================
   11. MAIN CONTROLLER
   ============================================================ */
(function(){
"use strict";
const M = window.__MMLI;
const { escapeHtml, uid, todayISO, formatDateHuman, toast, openModal, closeModal, askConfirm,
  CREDENTIAL_TYPES, resolveTypeConfig, TYPE_ORDER, state, persist, generateCredentialId, yearFromEventName,
  getQrDataUrl, buildCardEl, effectiveStatus, getKindLabel, renderCredentialForm, ensureEventsDatalist, parseCsvText } = M;

let currentFace = 'front';
let createFormHandle = null;
let editFormHandle = null;
let editingCred = null;

/* ---------- view navigation ---------- */
const VIEW_TITLES = {
  dashboard: {eyebrow:"Mind Masters Liberia Initiative", title:"Dashboard"},
  create: {eyebrow:"Issue a new credential", title:"Create Credential"},
  manage: {eyebrow:"Search, edit, revoke", title:"Manage Credentials"},
  bulk: {eyebrow:"Roster upload", title:"Bulk Generate"},
  events: {eyebrow:"Competitions & programs", title:"Events"},
  settings: {eyebrow:"Studio configuration", title:"Settings"}
};

function showView(name){
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  const target = document.getElementById('view-' + name);
  if(target) target.hidden = false;
  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.toggle('active', n.getAttribute('data-view') === name));
  const t = VIEW_TITLES[name];
  if(t){
    document.getElementById('topbarEyebrow').textContent = t.eyebrow;
    document.getElementById('topbarTitleText').textContent = t.title;
  }
  if(name === 'dashboard') renderDashboard();
  if(name === 'manage') renderManageTable();
  if(name === 'events') renderEventsTable();
  closeSidebarMobile();
  window.scrollTo({top:0});
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if(btn){
    showView(btn.getAttribute('data-view'));
  }
});

/* ---------- mobile sidebar ---------- */
function openSidebarMobile(){ document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebarScrim').classList.add('show'); }
function closeSidebarMobile(){ document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarScrim').classList.remove('show'); }
document.getElementById('mobileMenuBtn').addEventListener('click', openSidebarMobile);
document.getElementById('sidebarScrim').addEventListener('click', closeSidebarMobile);

/* ============================================================
   DASHBOARD
   ============================================================ */
function countByGroup(){
  const counts = { total: state.credentials.length, participant:0, staff:0, official:0, coach:0, volunteer:0, coordinator:0, vip:0, nationalTeam:0 };
  state.credentials.forEach(c => {
    if(c.typeId === 'participant' || c.typeId === 'teamCaptain' || c.typeId === 'teamMember') counts.participant++;
    else if(counts[c.typeId] !== undefined) counts[c.typeId]++;
  });
  return counts;
}

function renderDashboard(){
  const c = countByGroup();
  const tiles = [
    {label:'Total Credentials', val:c.total},
    {label:'Academic Participants', val:c.participant},
    {label:'Staff', val:c.staff},
    {label:'Officials', val:c.official},
    {label:'Coaches / Trainers', val:c.coach},
    {label:'Volunteers', val:c.volunteer},
    {label:'Coordinators', val:c.coordinator},
    {label:'VIP / Guests', val:c.vip},
    {label:'National Team Members', val:c.nationalTeam}
  ];
  document.getElementById('statGrid').innerHTML = tiles.map(t => `
    <div class="stat-tile"><div class="num">${t.val}</div><div class="lbl">${t.label}</div></div>
  `).join('');

  const recent = [...state.credentials].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,6);
  const tbody = document.getElementById('recentTableBody');
  document.getElementById('recentEmpty').hidden = recent.length > 0;
  tbody.innerHTML = recent.map(cred => recentRowHtml(cred)).join('');
  wireTableRowActions(tbody);
}

function recentRowHtml(cred){
  const cfg = resolveTypeConfig(cred.typeId);
  const status = effectiveStatus(cred);
  return `
    <tr data-cred-id="${cred.id}">
      <td><div class="name-cell">
        <img class="mini-thumb" src="${cred.fields.photo || ''}" alt="" onerror="this.style.visibility='hidden'">
        <div><div class="nm">${escapeHtml(cred.fields.fullName||'—')}</div><div class="id">${escapeHtml(cred.credentialId)}</div></div>
      </div></td>
      <td>${escapeHtml(cfg.label)}</td>
      <td>${escapeHtml(cred.fields.event||'—')}</td>
      <td><span class="status-pill ${status}"><span class="dot"></span>${status}</span></td>
      <td class="row-actions"><button class="icon-btn" data-action="view" title="View / verify"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
    </tr>
  `;
}

/* ============================================================
   CREATE / EDIT VIEW
   ============================================================ */
function renderTypePicker(){
  document.getElementById('typePicker').innerHTML = TYPE_ORDER.map(id => {
    const cfg = resolveTypeConfig(id);
    return `<button type="button" class="type-chip" data-type="${id}">
      <span class="tag">${escapeHtml(cfg.tag)}</span>
      <span class="lbl">${escapeHtml(cfg.label)}</span>
      <span class="fam">${escapeHtml(cfg.family)} design</span>
    </button>`;
  }).join('');
}

function selectType(typeId, existingCred){
  state.currentTypeId = typeId;
  editingCred = existingCred || null;
  document.querySelectorAll('.type-chip').forEach(c => c.classList.toggle('active', c.getAttribute('data-type') === typeId));
  document.getElementById('editorGrid').hidden = false;
  const cfg = resolveTypeConfig(typeId);
  document.getElementById('formSectionTitle').textContent = cfg.label + ' Details';
  document.getElementById('saveCredBtn').innerHTML = existingCred
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Update Credential'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Save Credential';
  const container = document.getElementById('formFields');
  createFormHandle = renderCredentialForm(container, typeId, existingCred ? existingCred.fields : null);
  container.addEventListener('mmli:change', renderCreatePreview);
  currentFace = 'front';
  document.querySelectorAll('#view-create .preview-face-toggle button').forEach(b => b.classList.toggle('active', b.getAttribute('data-face')==='front'));
  renderCreatePreview();
  document.getElementById('editorGrid').scrollIntoView({behavior:'smooth', block:'start'});
}

document.getElementById('typePicker').addEventListener('click', (e) => {
  const chip = e.target.closest('.type-chip');
  if(chip) selectType(chip.getAttribute('data-type'), null);
});

function buildDraftCredential(){
  if(!state.currentTypeId || !createFormHandle) return null;
  const cfg = resolveTypeConfig(state.currentTypeId);
  const fields = createFormHandle.getData();
  const credentialId = editingCred ? editingCred.credentialId : previewIdFor(cfg.idPrefix, fields.event);
  return {
    id: editingCred ? editingCred.id : 'draft',
    typeId: state.currentTypeId,
    credentialId,
    createdAt: editingCred ? editingCred.createdAt : todayISO(),
    status: editingCred ? editingCred.status : 'valid',
    fields
  };
}

function previewIdFor(prefix, eventName){
  const year = yearFromEventName(eventName) || new Date().getFullYear();
  const key = prefix + '-' + year;
  const n = (state.counters[key] || 0) + 1;
  return `MMLI-${prefix}-${year}-${String(n).padStart(5,'0')}`;
}

function renderCreatePreview(){
  const draft = buildDraftCredential();
  const mount = document.getElementById('cardPreviewMount');
  mount.innerHTML = '';
  if(!draft) return;
  mount.appendChild(buildCardEl(draft, currentFace, {exportMode:false}));
}

document.querySelectorAll('#view-create .preview-face-toggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#view-create .preview-face-toggle button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFace = btn.getAttribute('data-face');
    renderCreatePreview();
  });
});

document.getElementById('cancelFormBtn').addEventListener('click', () => {
  resetCreateView();
  showView('dashboard');
});

function resetCreateView(){
  state.currentTypeId = null;
  editingCred = null;
  createFormHandle = null;
  document.getElementById('editorGrid').hidden = true;
  document.querySelectorAll('.type-chip').forEach(c => c.classList.remove('active'));
}

document.getElementById('credForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if(!createFormHandle.validate()) return;
  const cfg = resolveTypeConfig(state.currentTypeId);
  const fields = createFormHandle.getData();

  if(editingCred){
    editingCred.fields = fields;
    persist();
    toast('Credential updated.', 'success');
  } else {
    const year = yearFromEventName(fields.event) || new Date().getFullYear();
    const credentialId = generateCredentialId(cfg.idPrefix, year);
    const newCred = { id: uid(), typeId: state.currentTypeId, credentialId, createdAt: todayISO(), status: 'valid', fields };
    state.credentials.push(newCred);
    persist();
    toast('Credential created — ' + credentialId, 'success');
  }
  resetCreateView();
  showView('manage');
});

/* ============================================================
   EXPORT (PNG / JPG / PDF / PRINT)
   ============================================================ */
function renderOffscreenCard(cred, face){
  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-9999px';
  holder.style.top = '0';
  holder.appendChild(buildCardEl(cred, face, {exportMode:true}));
  document.body.appendChild(holder);
  return holder;
}

function downloadDataUrl(dataUrl, filename){
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

async function captureFace(cred, face, bg){
  // Make sure the brand webfonts are fully loaded before we ever rasterize a card —
  // exporting too early makes html2canvas fall back to a system font with different
  // line-height, which is what causes text to visually collide.
  try{
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    if(document.fonts && document.fonts.load){
      await Promise.all([
        document.fonts.load('700 32px "Space Grotesk"'),
        document.fonts.load('600 16px "Inter"'),
        document.fonts.load('600 14px "IBM Plex Mono"')
      ]);
    }
  }catch(e){ /* font API not available — proceed anyway */ }

  const holder = renderOffscreenCard(cred, face);
  const cardEl = holder.firstChild;
  // Force layout, then give the browser two animation frames plus a short
  // buffer so fonts/images are fully painted before html2canvas reads pixels.
  void cardEl.offsetHeight;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise(r => setTimeout(r, 180));
  const canvas = await html2canvas(cardEl, {scale:2, backgroundColor: bg || null, useCORS:true});
  document.body.removeChild(holder);
  return canvas;
}

async function exportImage(format){
  const draft = buildDraftCredential();
  if(!draft) return toast('Choose a credential type first.', 'error');
  toast('Preparing your download…');
  try{
    const canvas = await captureFace(draft, currentFace, format === 'jpg' ? '#0b2545' : null);
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mime, 0.95);
    downloadDataUrl(dataUrl, `${draft.credentialId}-${currentFace}.${format}`);
  } catch(err){
    console.error(err);
    toast('Export failed. Please try again.', 'error');
  }
}

async function exportPdf(){
  const draft = buildDraftCredential();
  if(!draft) return toast('Choose a credential type first.', 'error');
  toast('Building PDF…');
  try{
    const { jsPDF } = window.jspdf;
    const frontCanvas = await captureFace(draft, 'front', null);
    const backCanvas = await captureFace(draft, 'back', null);
    // CR80 card size in mm, landscape, with margin
    const cardW = 85.6, cardH = 54;
    const pageW = cardW + 20, pageH = cardH + 20;
    const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:[pageW, pageH] });
    const x = (pageW - cardW)/2, y = (pageH - cardH)/2;
    doc.setFillColor(247,245,239); doc.rect(0,0,pageW,pageH,'F');
    doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', x, y, cardW, cardH, '', 'FAST');
    doc.addPage([pageW,pageH], 'landscape');
    doc.setFillColor(247,245,239); doc.rect(0,0,pageW,pageH,'F');
    doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', x, y, cardW, cardH, '', 'FAST');
    doc.save(`${draft.credentialId}.pdf`);
  } catch(err){
    console.error(err);
    toast('PDF export failed. Please try again.', 'error');
  }
}

async function printCurrentCard(){
  const draft = buildDraftCredential();
  if(!draft) return toast('Choose a credential type first.', 'error');
  toast('Preparing print preview…');
  try{
    const frontCanvas = await captureFace(draft, 'front', null);
    const backCanvas = await captureFace(draft, 'back', null);
    const w = window.open('', '_blank', 'width=500,height=700');
    w.document.write(`
      <html><head><title>${draft.credentialId}</title>
      <style>
        @page{ size: 96mm 66mm; margin:5mm; }
        body{ margin:0; font-family:sans-serif; display:flex; flex-direction:column; align-items:center; gap:14px; padding:14px; background:#fff; }
        img{ width:86mm; border-radius:4mm; box-shadow:0 4px 14px rgba(0,0,0,.2); }
      </style></head>
      <body>
        <img src="${frontCanvas.toDataURL('image/png')}">
        <img src="${backCanvas.toDataURL('image/png')}">
        <script>window.onload = () => { setTimeout(()=>window.print(), 300); };<\/script>
      </body></html>
    `);
    w.document.close();
  } catch(err){
    console.error(err);
    toast('Print preparation failed.', 'error');
  }
}

document.getElementById('downloadPngBtn').addEventListener('click', () => exportImage('png'));
document.getElementById('downloadJpgBtn').addEventListener('click', () => exportImage('jpg'));
document.getElementById('downloadPdfBtn').addEventListener('click', exportPdf);
document.getElementById('printCardBtn').addEventListener('click', printCurrentCard);


/* ============================================================
   MANAGE / SEARCH VIEW
   ============================================================ */
let activeStatusFilter = 'all';

function renderFilterChips(){
  const chips = [
    {id:'all', label:'All'},
    {id:'valid', label:'Valid'},
    {id:'revoked', label:'Revoked'},
    {id:'expired', label:'Expired'}
  ];
  document.getElementById('filterChips').innerHTML = chips.map(c =>
    `<button type="button" class="filter-chip ${activeStatusFilter===c.id?'active':''}" data-filter="${c.id}">${c.label}</button>`
  ).join('');
}
document.getElementById('filterChips').addEventListener('click', (e) => {
  const chip = e.target.closest('.filter-chip');
  if(!chip) return;
  activeStatusFilter = chip.getAttribute('data-filter');
  renderFilterChips();
  renderManageTable();
});

function matchesSearch(cred, q){
  if(!q) return true;
  const cfg = resolveTypeConfig(cred.typeId);
  const hay = [
    cred.fields.fullName, cred.credentialId, cred.fields.institution, cred.fields.organization,
    cred.fields.team, cred.fields.event, cfg.label, cred.fields.country
  ].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderManageTable(){
  renderFilterChips();
  const q = document.getElementById('searchInput').value.trim();
  const rows = state.credentials
    .filter(c => activeStatusFilter === 'all' || effectiveStatus(c) === activeStatusFilter)
    .filter(c => matchesSearch(c, q))
    .sort((a,b) => b.createdAt.localeCompare(a.createdAt));

  const tbody = document.getElementById('manageTableBody');
  document.getElementById('manageEmpty').hidden = rows.length > 0;
  tbody.innerHTML = rows.map(cred => {
    const cfg = resolveTypeConfig(cred.typeId);
    const status = effectiveStatus(cred);
    return `
      <tr data-cred-id="${cred.id}">
        <td><div class="name-cell">
          <img class="mini-thumb" src="${cred.fields.photo || ''}" alt="" onerror="this.style.visibility='hidden'">
          <div><div class="nm">${escapeHtml(cred.fields.fullName||'—')}</div><div class="id">${escapeHtml(cred.credentialId)}</div></div>
        </div></td>
        <td>${escapeHtml(cfg.label)}</td>
        <td>${escapeHtml(cred.fields.institution || cred.fields.organization || '—')}</td>
        <td>${escapeHtml(cred.fields.event || '—')}</td>
        <td><span class="status-pill ${status}"><span class="dot"></span>${status}</span></td>
        <td class="row-actions">
          <button class="icon-btn" data-action="view" title="View / verify"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="icon-btn" data-action="edit" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
          <button class="icon-btn" data-action="${status==='revoked' ? 'restore' : 'revoke'}" title="${status==='revoked' ? 'Restore' : 'Revoke'}">
            ${status==='revoked'
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 109-9"/><path d="M3 3v6h6"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/></svg>'}
          </button>
          <button class="icon-btn danger" data-action="delete" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z"/></svg></button>
        </td>
      </tr>
    `;
  }).join('');
  wireTableRowActions(tbody);
}

document.getElementById('searchInput').addEventListener('input', renderManageTable);
document.getElementById('searchClearBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  renderManageTable();
});

function findCred(id){ return state.credentials.find(c => c.id === id); }

function wireTableRowActions(tbody){
  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tr = btn.closest('tr');
      const id = tr.getAttribute('data-cred-id');
      const cred = findCred(id);
      if(!cred) return;
      const action = btn.getAttribute('data-action');
      if(action === 'view') openVerifyModal(cred);
      else if(action === 'edit') openEditModal(cred);
      else if(action === 'revoke'){
        askConfirm('Revoke this credential?', `${cred.fields.fullName || 'This credential'} will immediately show as REVOKED and will no longer verify as valid.`, () => {
          cred.status = 'revoked'; persist(); renderManageTable(); renderDashboard(); toast('Credential revoked.', 'success');
        });
      } else if(action === 'restore'){
        cred.status = 'valid'; persist(); renderManageTable(); renderDashboard(); toast('Credential restored to valid.', 'success');
      } else if(action === 'delete'){
        askConfirm('Delete this credential?', 'This permanently removes the credential record. This cannot be undone.', () => {
          state.credentials = state.credentials.filter(c => c.id !== id);
          persist(); renderManageTable(); renderDashboard(); toast('Credential deleted.', 'success');
        });
      }
    });
  });
}

/* ============================================================
   VERIFY MODAL
   ============================================================ */
function openVerifyModal(cred){
  const cfg = resolveTypeConfig(cred.typeId);
  const status = effectiveStatus(cred);
  const badgeIcon = status === 'valid'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>'
    : status === 'revoked'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
  const badgeText = status === 'valid' ? 'VALID CREDENTIAL' : status === 'revoked' ? 'REVOKED CREDENTIAL' : 'EXPIRED CREDENTIAL';
  const kind = getKindLabel(cred.typeId, cfg, cred.fields);
  const rows = [
    {k:'Name', v:cred.fields.fullName},
    {k:'Credential Type', v:cfg.label},
    {k:'Role / Position', v:kind},
    {k:'Institution / Org', v:cred.fields.institution || cred.fields.organization},
    {k:'Event', v:cred.fields.event},
    {k:'Credential ID', v:cred.credentialId},
    {k:'Issued', v:formatDateHuman(cred.createdAt)},
    {k:'Valid Through', v:cred.fields.validThrough ? formatDateHuman(cred.fields.validThrough) : 'See event schedule'}
  ].filter(r => r.v);
  document.getElementById('verifyModalBody').innerHTML = `
    <div class="verify-badge ${status}">${badgeIcon} ${badgeText}</div>
    <div class="verify-grid">${rows.map(r => `<div class="vf"><div class="k">${escapeHtml(r.k)}</div><div class="v">${escapeHtml(r.v)}</div></div>`).join('')}</div>
  `;
  openModal('verifyModal');
}

/* ============================================================
   EDIT MODAL
   ============================================================ */
let editCurrentFace = 'front';
function openEditModal(cred){
  editingCred = cred;
  const container = document.getElementById('editFormFields');
  const cfg = resolveTypeConfig(cred.typeId);
  container.innerHTML = `<div class="section-title" style="margin-bottom:2px;">${escapeHtml(cfg.label)}</div><div class="section-sub">${escapeHtml(cred.credentialId)}</div><div id="editFieldsInner"></div>`;
  const inner = document.getElementById('editFieldsInner');
  editFormHandle = renderCredentialForm(inner, cred.typeId, cred.fields);
  inner.addEventListener('mmli:change', renderEditPreview);
  editCurrentFace = 'front';
  renderEditPreview();
  openModal('editModal');
}

function renderEditPreview(){
  if(!editFormHandle || !editingCred) return;
  const fields = editFormHandle.getData();
  const draft = { id:editingCred.id, typeId:editingCred.typeId, credentialId:editingCred.credentialId, createdAt:editingCred.createdAt, status:editingCred.status, fields };
  const mount = document.getElementById('editCardPreviewMount');
  mount.innerHTML = '';
  mount.appendChild(buildCardEl(draft, editCurrentFace, {exportMode:false}));
}

document.getElementById('saveEditBtn').addEventListener('click', () => {
  if(!editFormHandle.validate()) return;
  editingCred.fields = editFormHandle.getData();
  persist();
  closeModal('editModal');
  renderManageTable();
  renderDashboard();
  toast('Credential updated.', 'success');
});

/* ============================================================
   BULK GENERATE
   ============================================================ */
const CSV_TEMPLATE = "Name,Institution,Subject,Team,Position,Division,Event\nJohn Doe,University of Liberia,Mathematics,Team A,Team Captain,Senior,NMC 2026\nJane Doe,St. Mary's High School,Science,Team B,Team Member,Junior,NMC 2026\n";

document.getElementById('downloadCsvTemplateBtn').addEventListener('click', () => {
  const blob = new Blob([CSV_TEMPLATE], {type:'text/csv'});
  downloadDataUrl(URL.createObjectURL(blob), 'mmli-bulk-template.csv');
});

const csvDropzone = document.getElementById('csvDropzone');
const csvFileInput = document.getElementById('csvFileInput');
csvDropzone.addEventListener('click', () => csvFileInput.click());
csvDropzone.addEventListener('dragover', (e) => { e.preventDefault(); csvDropzone.classList.add('drag'); });
csvDropzone.addEventListener('dragleave', () => csvDropzone.classList.remove('drag'));
csvDropzone.addEventListener('drop', (e) => {
  e.preventDefault(); csvDropzone.classList.remove('drag');
  if(e.dataTransfer.files[0]) handleCsvFile(e.dataTransfer.files[0]);
});
csvFileInput.addEventListener('change', (e) => { if(e.target.files[0]) handleCsvFile(e.target.files[0]); });

function handleCsvFile(file){
  const reader = new FileReader();
  reader.onload = (e) => {
    const rows = parseCsvText(e.target.result);
    if(!rows.length){ toast('No rows found in that CSV.', 'error'); return; }
    state.bulkRows = rows.map(r => ({
      fullName: r.Name || r.name || '',
      institution: r.Institution || r.institution || '',
      subject: r.Subject || r.subject || '',
      team: r.Team || r.team || '',
      position: r.Position || r.position || 'Academic Competitor',
      division: r.Division || r.division || '',
      event: r.Event || r.event || ''
    }));
    renderBulkPreview();
  };
  reader.readAsText(file);
}

function renderBulkPreview(){
  document.getElementById('bulkResultsWrap').hidden = false;
  document.getElementById('bulkCount').textContent = state.bulkRows.length;
  document.getElementById('bulkPreviewGrid').innerHTML = state.bulkRows.map(r => `
    <div class="bulk-row-card">
      <div class="nm">${escapeHtml(r.fullName || '(missing name)')}</div>
      <div class="meta">${escapeHtml(r.institution||'—')}<br>${escapeHtml(r.subject||'—')} · ${escapeHtml(r.team||'—')}<br>${escapeHtml(r.position||'—')}${r.division ? ' · '+escapeHtml(r.division) : ''}</div>
      ${!r.fullName ? '<div class="missing">Missing name — will be skipped</div>' : ''}
    </div>
  `).join('');
}

document.getElementById('bulkCancelBtn').addEventListener('click', () => {
  state.bulkRows = [];
  document.getElementById('bulkResultsWrap').hidden = true;
  csvFileInput.value = '';
});

document.getElementById('bulkGenerateBtn').addEventListener('click', () => {
  const cfg = resolveTypeConfig('participant');
  let count = 0;
  state.bulkRows.forEach(r => {
    if(!r.fullName) return;
    const year = yearFromEventName(r.event) || new Date().getFullYear();
    const credentialId = generateCredentialId(cfg.idPrefix, year);
    state.credentials.push({
      id: uid(), typeId:'participant', credentialId, createdAt: todayISO(), status:'valid',
      fields: { fullName:r.fullName, institution:r.institution, subject:r.subject, team:r.team, position:r.position || 'Academic Competitor', division:r.division, event:r.event }
    });
    count++;
  });
  persist();
  state.bulkRows = [];
  document.getElementById('bulkResultsWrap').hidden = true;
  csvFileInput.value = '';
  toast(`Generated ${count} credential${count===1?'':'s'}.`, 'success');
  showView('manage');
});

/* ============================================================
   EVENTS VIEW
   ============================================================ */
function renderEventsTable(){
  const tbody = document.getElementById('eventsTableBody');
  document.getElementById('eventsEmpty').hidden = state.events.length > 0;
  tbody.innerHTML = state.events.map(ev => `
    <tr data-event-id="${ev.id}">
      <td><strong>${escapeHtml(ev.name)}</strong></td>
      <td>${escapeHtml(ev.year||'—')}</td>
      <td>${escapeHtml(ev.venue||'—')}</td>
      <td>${ev.start ? formatDateHuman(ev.start) : '—'}${ev.end ? ' – '+formatDateHuman(ev.end) : ''}</td>
      <td class="row-actions"><button class="icon-btn danger" data-action="delete-event" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6h16z"/></svg></button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-action="delete-event"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').getAttribute('data-event-id');
      askConfirm('Delete this event?', 'Credentials already issued for it are not affected.', () => {
        state.events = state.events.filter(ev => ev.id !== id);
        persist(); renderEventsTable(); ensureEventsDatalist();
        toast('Event deleted.', 'success');
      });
    });
  });
}

document.getElementById('saveEventBtn').addEventListener('click', () => {
  const name = document.getElementById('evName').value.trim();
  if(!name){ toast('Event name is required.', 'error'); return; }
  state.events.push({
    id: uid(), name,
    year: document.getElementById('evYear').value.trim(),
    start: document.getElementById('evStart').value,
    end: document.getElementById('evEnd').value,
    venue: document.getElementById('evVenue').value.trim(),
    org: document.getElementById('evOrg').value.trim()
  });
  persist();
  ['evName','evYear','evStart','evEnd','evVenue','evOrg'].forEach(id => document.getElementById(id).value = '');
  renderEventsTable();
  ensureEventsDatalist();
  toast('Event added.', 'success');
});


/* ============================================================
   SETTINGS VIEW
   ============================================================ */
function refreshBrandDisplays(){
  document.getElementById('sidebarLogo').src = state.settings.logoMark;
  document.getElementById('settingsLogoPreview').src = state.settings.logoMark;
  document.getElementById('orgNameInput').value = state.settings.orgName;
  document.getElementById('orgMottoInput').value = state.settings.motto;
}

document.getElementById('uploadLogoBtn').addEventListener('click', () => document.getElementById('logoFileInput').click());
document.getElementById('logoFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    state.settings.logoFull = ev.target.result;
    state.settings.logoMark = ev.target.result;
    persist();
    refreshBrandDisplays();
    toast('Logo updated.', 'success');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});
document.getElementById('resetLogoBtn').addEventListener('click', () => {
  state.settings.logoFull = MMLI_ASSETS.MMLI_LOGO_FULL;
  state.settings.logoMark = MMLI_ASSETS.MMLI_LOGO_MARK;
  persist();
  refreshBrandDisplays();
  toast('Logo reset to default.', 'success');
});
document.getElementById('saveBrandingBtn').addEventListener('click', () => {
  state.settings.orgName = document.getElementById('orgNameInput').value.trim() || 'Mind Masters Liberia Initiative';
  state.settings.motto = document.getElementById('orgMottoInput').value.trim() || 'Unleashing the Genius Within';
  persist();
  toast('Branding saved.', 'success');
});

document.getElementById('exportDataBtn').addEventListener('click', () => {
  const backup = { credentials: state.credentials, events: state.events, settings: state.settings, counters: state.counters, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  downloadDataUrl(URL.createObjectURL(blob), `mmli-studio-backup-${todayISO()}.json`);
});
document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
document.getElementById('importFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try{
      const data = JSON.parse(ev.target.result);
      askConfirm('Import backup?', 'This will replace all current credentials, events, and settings in this browser.', () => {
        state.credentials = data.credentials || [];
        state.events = data.events || [];
        state.settings = Object.assign({}, state.settings, data.settings || {});
        state.counters = data.counters || {};
        persist();
        refreshBrandDisplays();
        renderDashboard();
        renderEventsTable();
        ensureEventsDatalist();
        toast('Backup imported.', 'success');
      }, false);
    } catch(err){ toast('That file could not be read as a valid backup.', 'error'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});
document.getElementById('clearAllBtn').addEventListener('click', () => {
  askConfirm('Erase all studio data?', 'This deletes every credential, event, and setting stored in this browser. This cannot be undone.', () => {
    state.credentials = []; state.events = []; state.counters = {};
    state.settings = { orgName:"Mind Masters Liberia Initiative", motto:"Unleashing the Genius Within", logoFull:MMLI_ASSETS.MMLI_LOGO_FULL, logoMark:MMLI_ASSETS.MMLI_LOGO_MARK, signature:MMLI_ASSETS.MMLI_SIGNATURE };
    persist();
    refreshBrandDisplays();
    renderDashboard(); renderEventsTable(); ensureEventsDatalist();
    toast('All studio data erased.', 'success');
  });
});

/* ============================================================
   INIT
   ============================================================ */
function init(){
  renderTypePicker();
  refreshBrandDisplays();
  ensureEventsDatalist();
  renderDashboard();
  showView('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
if(document.readyState === 'complete' || document.readyState === 'interactive') init();

})();
