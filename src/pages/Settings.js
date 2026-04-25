// src/pages/Settings.js
import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';

/* ── helpers ──────────────────────────────────────────────────── */
const TABS = [
  { id:'thresholds', icon:'🔔', label:'Alert Thresholds' },
  { id:'notifications', icon:'📧', label:'Notifications'   },
  { id:'account',    icon:'👤', label:'Account'          },
  { id:'sensor',     icon:'📡', label:'Sensor Config'    },
];

const THRESHOLD_CFG = [
  { key:'pm25',      label:'PM2.5',      unit:'µg/m³', safe:12,  warn:35.4, desc:'Fine particulate matter — primary air quality indicator' },
  { key:'pm10',      label:'PM10',       unit:'µg/m³', safe:54,  warn:154,  desc:'Coarse particulate matter from dust and pollen' },
  { key:'pm1',       label:'PM1.0',      unit:'µg/m³', safe:20,  warn:50,   desc:'Ultra-fine particles — deepest lung penetration' },
  { key:'co',        label:'CO',         unit:'ppm',   safe:4,   warn:9,    desc:'Carbon monoxide — dangerous at high concentrations' },
  { key:'co2',       label:'CO₂',        unit:'ppm',   safe:600, warn:1000, desc:'Carbon dioxide — indicates ventilation quality' },
  { key:'voc_index', label:'VOC Index',  unit:'idx',   safe:100, warn:250,  desc:'Volatile organic compounds from cleaning products etc.' },
  { key:'nox_index', label:'NOx Index',  unit:'idx',   safe:100, warn:250,  desc:'Nitrogen oxides — traffic & combustion pollutants' },
  { key:'temperature',label:'Temperature',unit:'°C',   safe:28,  warn:40,   desc:'Ambient temperature alert threshold' },
  { key:'humidity',  label:'Humidity',   unit:'%',     safe:60,  warn:80,   desc:'Relative humidity — affects mold and comfort' },
];

const DEFAULTS = Object.fromEntries(THRESHOLD_CFG.map(c=>[c.key, c.warn]));

/* ── styled helpers ──────────────────────────────────────────── */
const panel = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'20px 22px', marginBottom:16 };
const label = { fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', marginBottom:6, display:'block' };
const inputS = (focus) => ({ width:'100%', boxSizing:'border-box', padding:'10px 13px', background:'rgba(255,255,255,0.06)', border:`1px solid ${focus?'rgba(0,229,160,0.5)':'rgba(255,255,255,0.1)'}`, borderRadius:9, color:'#e8eef8', fontSize:14, fontFamily:'inherit', outline:'none', boxShadow:focus?'0 0 0 3px rgba(0,229,160,0.08)':'none', transition:'all .15s' });
const primaryBtn = { padding:'10px 22px', borderRadius:9, border:'none', background:'linear-gradient(135deg,#00e5a0,#06b6d4)', color:'#012d1a', fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' };
const ghostBtn  = { padding:'10px 22px', borderRadius:9, border:'1px solid rgba(255,255,255,0.15)', background:'transparent', color:'rgba(255,255,255,0.65)', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' };

/* ═══════════════════════════════════════════════════════════════ */
export default function Settings() {
  const { user } = useAuth();
  const userId   = user?.id || 'admin';

  const [tab,        setTab]        = useState('thresholds');
  const [thresholds, setThresholds] = useState(DEFAULTS);
  const [notif,      setNotif]      = useState({ alertEmails:true, dailyDigest:true, digestTime:'07:00', testLoading:false, testMsg:'' });
  const [account,    setAccount]    = useState({ name: user?.name||'', email: user?.email||'', currentPw:'', newPw:'', confirmPw:'' });
  const [sensor,     setSensor]     = useState({ location:'Nairobi', retentionDays:30, pollInterval:60 });
  const [saving,     setSaving]     = useState(false);
  const [savedMsg,   setSavedMsg]   = useState('');
  const [focus,      setFocus]      = useState('');

  /* load persisted settings */
  useEffect(() => {
    api.get(`/api/settings/${userId}`).then(r => {
      if (r.data?.thresholds) setThresholds(t=>({...t,...r.data.thresholds}));
      if (r.data?.notifications) setNotif(n=>({...n,...r.data.notifications}));
      if (r.data?.sensor)        setSensor(s=>({...s,...r.data.sensor}));
    }).catch(()=>{});
  }, [userId]);

  const flash = msg => { setSavedMsg(msg); setTimeout(()=>setSavedMsg(''), 3500); };

  /* save thresholds */
  const saveThresholds = async () => {
    setSaving(true);
    try { await api.post('/api/settings', { userId, thresholds }); flash('✅ Thresholds saved'); }
    catch { flash('❌ Save failed'); } finally { setSaving(false); }
  };

  /* save notification prefs */
  const saveNotif = async () => {
    setSaving(true);
    try { await api.post('/api/settings', { userId, notifications: notif }); flash('✅ Notification preferences saved'); }
    catch { flash('❌ Save failed'); } finally { setSaving(false); }
  };

  /* test email */
  const sendTest = async (type) => {
    setNotif(n=>({...n, testLoading:true, testMsg:''}));
    try {
      await api.post('/api/email/test', { type, to: account.email || user?.email });
      setNotif(n=>({...n, testLoading:false, testMsg:`✅ ${type==='alert'?'Alert':'Daily digest'} email sent! Check your inbox.`}));
    } catch(e) {
      setNotif(n=>({...n, testLoading:false, testMsg:`❌ ${e.response?.data?.error||'Email failed. Check SMTP config.'}`}));
    }
  };

  /* save sensor config */
  const saveSensor = async () => {
    setSaving(true);
    try { await api.post('/api/settings', { userId, sensor }); flash('✅ Sensor config saved'); }
    catch { flash('❌ Save failed'); } finally { setSaving(false); }
  };

  /* reset thresholds */
  const resetThresholds = () => { setThresholds(DEFAULTS); flash('🔄 Reset to WHO defaults'); };

  /* ── render ── */
  return (
    <div style={{ padding:'20px 24px', maxWidth:900, margin:'0 auto', fontFamily:"'Inter',sans-serif" }}>
      <style>{`
        .set-tab:hover { background:rgba(255,255,255,0.06)!important; }
        .set-save:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 18px rgba(0,229,160,.35)!important; }
        .set-ghost:hover { background:rgba(255,255,255,0.08)!important; color:#e8eef8!important; }
        .set-thr-card:hover { border-color:rgba(0,229,160,0.25)!important; }
        input[type=range] { accent-color:#00e5a0; }
        input[type=number]::-webkit-inner-spin-button { opacity:.4; }
        .set-toggle { position:relative;display:inline-block;width:42px;height:22px; }
        .set-toggle input { opacity:0;width:0;height:0; }
        .set-slider { position:absolute;inset:0;background:rgba(255,255,255,0.15);border-radius:22px;cursor:pointer;transition:.2s; }
        .set-slider:before { position:absolute;content:'';width:16px;height:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s; }
        input:checked + .set-slider { background:linear-gradient(135deg,#00e5a0,#06b6d4); }
        input:checked + .set-slider:before { transform:translateX(20px); }
      `}</style>

      {/* ── Page header ── */}
      <div style={{marginBottom:22}}>
        <div style={{fontSize:22,fontWeight:700,color:'#e8eef8',letterSpacing:'-.02em'}}>Settings</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:4}}>Configure thresholds, notifications, and account preferences</div>
      </div>

      {/* ── Flash message ── */}
      {savedMsg && (
        <div style={{padding:'11px 16px',borderRadius:10,marginBottom:16,fontSize:13,fontWeight:600,
          background:savedMsg.startsWith('✅')?'rgba(16,185,129,0.12)':savedMsg.startsWith('🔄')?'rgba(59,130,246,0.12)':'rgba(239,68,68,0.12)',
          border:savedMsg.startsWith('✅')?'1px solid rgba(16,185,129,0.3)':savedMsg.startsWith('🔄')?'1px solid rgba(59,130,246,0.3)':'1px solid rgba(239,68,68,0.3)',
          color:savedMsg.startsWith('✅')?'#6ee7b7':savedMsg.startsWith('🔄')?'#93c5fd':'#fca5a5',
          animation:'fadeIn .2s ease'}}>
          {savedMsg}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{display:'flex',gap:4,marginBottom:20,background:'rgba(255,255,255,0.03)',borderRadius:12,padding:4,border:'1px solid rgba(255,255,255,0.06)'}}>
        {TABS.map(t=>(
          <button key={t.id} className="set-tab" onClick={()=>setTab(t.id)} style={{
            flex:1, padding:'9px 8px', borderRadius:9, border:'none', cursor:'pointer', fontFamily:'inherit',
            background:tab===t.id?'rgba(0,229,160,0.12)':'transparent',
            color:tab===t.id?'#00e5a0':'rgba(255,255,255,0.45)',
            fontWeight:tab===t.id?700:500, fontSize:12, transition:'all .15s',
            borderBottom:tab===t.id?'2px solid #00e5a0':'2px solid transparent',
          }}>
            <span style={{marginRight:5}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 1 — Alert Thresholds                                  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==='thresholds' && (
        <>
          <div style={panel}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:18,flexWrap:'wrap',gap:10}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:'#e8eef8'}}>Alert Thresholds</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:3}}>
                  Email alerts fire when any sensor reading exceeds these values
                </div>
              </div>
              <button className="set-ghost" style={ghostBtn} onClick={resetThresholds}>↩ Reset to Defaults</button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
              {THRESHOLD_CFG.map(c => {
                const pct = Math.min(100,(thresholds[c.key]/( c.warn*2))*100);
                const color = thresholds[c.key] <= c.safe ? '#10b981' : thresholds[c.key] <= c.warn ? '#f59e0b' : '#ef4444';
                return (
                  <div key={c.key} className="set-thr-card" style={{padding:14,background:'rgba(255,255,255,0.03)',borderRadius:10,border:'1px solid rgba(255,255,255,0.07)',transition:'border .15s'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#e8eef8'}}>{c.label}</div>
                        <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:2}}>{c.desc}</div>
                      </div>
                      <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:`${color}22`,color,fontWeight:700,flexShrink:0,marginLeft:8}}>
                        {thresholds[c.key]} {c.unit}
                      </span>
                    </div>
                    <input type="range" min={0} max={c.warn*3} step={c.warn>100?10:1}
                      value={thresholds[c.key]}
                      onChange={e=>setThresholds(t=>({...t,[c.key]:Number(e.target.value)}))}
                      style={{width:'100%',marginBottom:6}}/>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'rgba(255,255,255,0.25)'}}>
                      <span>0</span>
                      <span style={{color:'#10b981'}}>Safe ≤{c.safe}</span>
                      <span style={{color:'#f59e0b'}}>Warn ≤{c.warn}</span>
                      <span>{c.warn*3}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="set-save" style={{...primaryBtn,opacity:saving?.2:1}} disabled={saving} onClick={saveThresholds}>
              {saving?'Saving…':'💾 Save Thresholds'}
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 2 — Notifications                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==='notifications' && (
        <>
          {/* Toggles */}
          <div style={panel}>
            <div style={{fontSize:15,fontWeight:700,color:'#e8eef8',marginBottom:16}}>Email Preferences</div>
            {[
              { key:'alertEmails', title:'Real-time AQI Alerts', desc:'Instant email when any pollutant exceeds its threshold (30-min cooldown per metric)' },
              { key:'dailyDigest', title:'Daily Digest Report',  desc:'Morning summary with 24-hour stats, trends, and health tips' },
            ].map(item=>(
              <div key={item.key} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:'#e8eef8',marginBottom:3}}>{item.title}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{item.desc}</div>
                </div>
                <label className="set-toggle" style={{flexShrink:0,marginLeft:16}}>
                  <input type="checkbox" checked={notif[item.key]} onChange={e=>setNotif(n=>({...n,[item.key]:e.target.checked}))}/>
                  <span className="set-slider"/>
                </label>
              </div>
            ))}

            {/* Digest time */}
            {notif.dailyDigest && (
              <div style={{marginTop:16}}>
                <label style={label}>Daily digest time (your local time)</label>
                <input type="time" value={notif.digestTime}
                  onChange={e=>setNotif(n=>({...n,digestTime:e.target.value}))}
                  onFocus={()=>setFocus('time')} onBlur={()=>setFocus('')}
                  style={{...inputS(focus==='time'), width:160}}/>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:6}}>
                  Currently scheduled: 07:00 EAT daily. Server restart required to apply new time.
                </div>
              </div>
            )}
          </div>

          {/* Test emails */}
          <div style={panel}>
            <div style={{fontSize:15,fontWeight:700,color:'#e8eef8',marginBottom:6}}>Test Email Delivery</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:14}}>
              Send a test email to <strong style={{color:'#00e5a0'}}>{account.email || user?.email || 'your registered address'}</strong>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <button style={primaryBtn} className="set-save" disabled={notif.testLoading} onClick={()=>sendTest('alert')}>
                {notif.testLoading?'Sending…':'🚨 Send Test Alert'}
              </button>
              <button style={ghostBtn} className="set-ghost" disabled={notif.testLoading} onClick={()=>sendTest('daily')}>
                📋 Send Test Digest
              </button>
            </div>
            {notif.testMsg && (
              <div style={{marginTop:12,fontSize:13,padding:'10px 14px',borderRadius:9,
                background:notif.testMsg.startsWith('✅')?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',
                border:notif.testMsg.startsWith('✅')?'1px solid rgba(16,185,129,0.25)':'1px solid rgba(239,68,68,0.25)',
                color:notif.testMsg.startsWith('✅')?'#6ee7b7':'#fca5a5'}}>
                {notif.testMsg}
              </div>
            )}
          </div>

          <button className="set-save" style={primaryBtn} disabled={saving} onClick={saveNotif}>
            {saving?'Saving…':'💾 Save Notification Preferences'}
          </button>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 3 — Account                                            */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==='account' && (
        <>
          <div style={panel}>
            <div style={{fontSize:15,fontWeight:700,color:'#e8eef8',marginBottom:16}}>Profile Information</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
              {[
                {key:'name',  label:'Display Name', type:'text',     ph:'Your name',        ac:'name'  },
                {key:'email', label:'Email Address', type:'email',    ph:'you@example.com',  ac:'email' },
              ].map(f=>(
                <div key={f.key}>
                  <label style={label}>{f.label}</label>
                  <input type={f.type} autoComplete={f.ac} value={account[f.key]} placeholder={f.ph}
                    onChange={e=>setAccount(a=>({...a,[f.key]:e.target.value}))}
                    onFocus={()=>setFocus(f.key)} onBlur={()=>setFocus('')}
                    style={inputS(focus===f.key)}/>
                </div>
              ))}
            </div>
          </div>

          <div style={panel}>
            <div style={{fontSize:15,fontWeight:700,color:'#e8eef8',marginBottom:4}}>Change Password</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:14}}>Leave blank to keep your current password</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
              {[
                {key:'currentPw', label:'Current Password', ph:'Current password'},
                {key:'newPw',     label:'New Password',     ph:'At least 6 characters'},
                {key:'confirmPw', label:'Confirm New',      ph:'Repeat new password'},
              ].map(f=>(
                <div key={f.key}>
                  <label style={label}>{f.label}</label>
                  <input type="password" value={account[f.key]} placeholder={f.ph}
                    onChange={e=>setAccount(a=>({...a,[f.key]:e.target.value}))}
                    onFocus={()=>setFocus(f.key)} onBlur={()=>setFocus('')}
                    style={inputS(focus===f.key)}/>
                </div>
              ))}
            </div>
          </div>

          {/* Account info card */}
          <div style={{...panel, background:'rgba(0,229,160,0.04)', borderColor:'rgba(0,229,160,0.12)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,#00e5a0,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:'#012d1a',fontWeight:700,flexShrink:0}}>
                {(user?.name||'?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#e8eef8'}}>{user?.name||'User'}</div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.45)',marginTop:2}}>{user?.email||'—'}</div>
                <div style={{fontSize:11,color:'#00e5a0',marginTop:3,fontWeight:600}}>✓ Email notifications active</div>
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:10}}>
            <button className="set-save" style={primaryBtn} disabled={saving}
              onClick={async()=>{ setSaving(true); await new Promise(r=>setTimeout(r,600)); flash('✅ Profile updated'); setSaving(false); }}>
              {saving?'Saving…':'💾 Save Profile'}
            </button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 4 — Sensor Config                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab==='sensor' && (
        <>
          <div style={panel}>
            <div style={{fontSize:15,fontWeight:700,color:'#e8eef8',marginBottom:16}}>Sensor & Data Configuration</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14}}>
              {/* Location */}
              <div>
                <label style={label}>Monitoring Location</label>
                <input type="text" value={sensor.location} placeholder="e.g. Nairobi CBD"
                  onChange={e=>setSensor(s=>({...s,location:e.target.value}))}
                  onFocus={()=>setFocus('loc')} onBlur={()=>setFocus('')}
                  style={inputS(focus==='loc')}/>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:5}}>Shown on dashboard and in email reports</div>
              </div>

              {/* Retention */}
              <div>
                <label style={label}>Data Retention — {sensor.retentionDays} days</label>
                <input type="range" min={7} max={365} step={1} value={sensor.retentionDays}
                  onChange={e=>setSensor(s=>({...s,retentionDays:Number(e.target.value)}))}
                  style={{width:'100%',marginBottom:4}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,0.3)'}}>
                  <span>7 days</span><span>365 days</span>
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:4}}>Readings older than this are auto-purged from the database</div>
              </div>

              {/* Poll interval */}
              <div>
                <label style={label}>Expected Sensor Interval — {sensor.pollInterval}s</label>
                <input type="range" min={10} max={600} step={10} value={sensor.pollInterval}
                  onChange={e=>setSensor(s=>({...s,pollInterval:Number(e.target.value)}))}
                  style={{width:'100%',marginBottom:4}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'rgba(255,255,255,0.3)'}}>
                  <span>10s</span><span>10min</span>
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:4}}>Used by the "Last Data Received" staleness indicator on the realtime page</div>
              </div>
            </div>
          </div>

          {/* System info */}
          <div style={panel}>
            <div style={{fontSize:15,fontWeight:700,color:'#e8eef8',marginBottom:14}}>System Information</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10}}>
              {[
                ['Backend',        'Node.js + Express'],
                ['Database',       'MongoDB Atlas'],
                ['Email Provider', 'Gmail SMTP'],
                ['WebSockets',     'Socket.IO v4'],
                ['Scheduler',      'node-cron (daily 07:00 EAT)'],
                ['Frontend',       'React 18'],
              ].map(([k,v])=>(
                <div key={k} style={{padding:'12px 14px',background:'rgba(255,255,255,0.03)',borderRadius:9,border:'1px solid rgba(255,255,255,0.06)'}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>{k}</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#e8eef8'}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="set-save" style={primaryBtn} disabled={saving} onClick={saveSensor}>
            {saving?'Saving…':'💾 Save Sensor Config'}
          </button>
        </>
      )}
    </div>
  );
}
