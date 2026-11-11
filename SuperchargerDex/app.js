const KEY = 'superchargerdex.v1';
const BADGES = [
  {id:'first', label:'First charge', test:(v)=>v>=1},
  {id:'five',  label:'5 stations',   test:(v)=>v>=5},
  {id:'ten',   label:'10 stations',  test:(v)=>v>=10},
  {id:'half',  label:'Half the dex', test:(v,t)=>t>0&&v>=t/2},
  {id:'all',   label:'Gotta catch ’em all', test:(v,t)=>t>0&&v>=t},
];
let data = {};
try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

let stations = [], markers = {}, map, selected = null;

function pinIcon(id){ return L.divIcon({className:'', html:`<div class="pin${data[id]?' visited':''}"></div>`, iconSize:[16,16]}); }

function renderStats(){
  const total = stations.length, v = stations.filter(s=>data[s.id]).length;
  $('count').textContent = `${v} / ${total}`;
  $('fill').style.width = total ? (100*v/total)+'%' : '0';
  const byState = {};
  stations.forEach(s => { (byState[s.state] ||= {t:0,v:0}).t++; if (data[s.id]) byState[s.state].v++; });
  $('states').innerHTML = Object.keys(byState).sort().map(st => {
    const {t,v:n} = byState[st];
    return `<span class="chip${n===t?' done':''}">${st} ${n}/${t}</span>`;
  }).join('');
  $('badges').innerHTML = BADGES.map(b => `<div class="badge${b.test(v,total)?' on':''}">🏅 ${b.label}</div>`).join('');
}

function renderDetail(){
  const s = stations.find(x=>x.id===selected);
  if (!s) { $('detail').innerHTML = '<p class="muted">Tap a station on the map.</p>'; return; }
  const rec = data[s.id];
  $('detail').innerHTML = `
    <strong>${esc(s.name)}</strong>
    <p class="muted">${esc(s.city)}, ${esc(s.state)} · ${s.stalls} stalls</p>
    <button class="primary${rec?' visited':''}" id="toggle">${rec?'✓ Visited '+esc(rec.date)+' (tap to undo)':'Mark as visited'}</button>
    ${rec?`<textarea id="note" rows="3" placeholder="Scrapbook note…">${esc(rec.note||'')}</textarea>`:''}`;
  $('toggle').onclick = () => {
    if (data[s.id]) delete data[s.id];
    else data[s.id] = {date:new Date().toISOString().slice(0,10), note:''};
    save(); markers[s.id].setIcon(pinIcon(s.id)); renderStats(); renderDetail();
  };
  const n = $('note');
  if (n) n.oninput = () => { data[s.id].note = n.value; save(); };
}

async function init(){
  map = L.map('map').setView([39.5,-98.35],4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
  try {
    const j = await (await fetch('stations.json')).json();
    stations = j.stations;
    if (j._note) { $('notice').hidden = false; $('notice').textContent = 'Sample data: ' + j._note; }
  } catch (e) {
    $('notice').hidden = false; $('notice').textContent = 'Could not load stations.json. Serve this folder over http, not file://.';
  }
  stations.forEach(s => {
    markers[s.id] = L.marker([s.lat,s.lng],{icon:pinIcon(s.id),title:s.name}).addTo(map)
      .on('click', () => { selected = s.id; renderDetail(); });
  });
  $('reset').onclick = () => { if (confirm('Erase all visited stations on this device?')) {
    data = {}; save(); stations.forEach(s=>markers[s.id].setIcon(pinIcon(s.id))); renderStats(); renderDetail(); } };
  renderStats(); renderDetail();
}
init();
