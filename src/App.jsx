import { useState, useEffect, useCallback } from 'react'
import CommandCentre  from './views/CommandCentre.jsx'
import ScenarioRevenueMiss from './views/ScenarioRevenueMiss.jsx'
import ScenarioExpansion   from './views/ScenarioExpansion.jsx'
import ScenarioCash        from './views/ScenarioCash.jsx'
import ScenarioMargin      from './views/ScenarioMargin.jsx'
import ScenarioProcurement from './views/ScenarioProcurement.jsx'
import GPDashboard    from './views/GPDashboard.jsx'
import ClientPortal   from './views/ClientPortal.jsx'
import RealTime       from './views/RealTime.jsx'
import Agents         from './views/Agents.jsx'
import Gantt          from './views/Gantt.jsx'
import Improvements   from './views/Improvements.jsx'
import IntegrationPlan from './views/IntegrationPlan.jsx'
import NewsFeed        from './views/NewsFeed.jsx'
import PortfolioAnalytics from './views/PortfolioAnalytics.jsx'
import UserGuide      from './views/UserGuide.jsx'
import { HOMES, SCALES, loadPrefs, savePrefs } from './lib/prefs.js'

const VIEWS = [
  { id:'command',      label:'Portfolio Health',  icon:' ◎ ', sub:'Command centre · Risks vs opportunities · 9 companies' },
  { id:'revenuemiss',  label:'Revenue Risk',      icon:' ▽ ', sub:'Straits Analytics · Forecast miss · Driver bridge' },
  { id:'expansion',    label:'Growth Opportunity',icon:' △ ', sub:'Zafira Systems · Cross-sell radar · Account scoring' },
  { id:'cash',         label:'Cash & Runway',     icon:' ◷ ', sub:'Nusantara Foods · 13-week model · Three runway bases' },
  { id:'margin',       label:'Margin Erosion',    icon:' ◱ ', sub:'ForgeTech · Green everywhere · 8 points of gross margin' },
  { id:'procurement',  label:'Procurement',       icon:' ⬢ ', sub:'Cross-portfolio · Supplier consolidation · Savings' },
  { id:'gp',           label:'GP Dashboard',      icon:'⬡', sub:'Fund manager · All companies · 9 modules' },
  { id:'client',       label:'Client Portal',      icon:'◈', sub:'Portfolio company · Role-based · Configurable' },
  { id:'realtime',     label:'Live Data',          icon:'◉', sub:'Real-time feeds · Market data · Activity stream' },
  { id:'news',         label:'News & Sentiment',   icon:'📰', sub:'Per-company news · Sentiment · NewsAPI-ready' },
  { id:'analytics',   label:'Portfolio Analytics',  icon:'SS', sub:'Heatmap - Scenario - Returns - Board Pack - IRR' },
  { id:'agents',       label:'AI Agents',          icon:'🤖', sub:'12 agents · Live demos · Investigation · Q&A' },
  { id:'gantt',        label:'Delivery Plan',      icon:'📅', sub:'7-day prototype + 12-month production Gantt' },
  { id:'improvements', label:'UI Improvements',    icon:'✦',  sub:'28 improvements · Priority stack · This week' },
  { id:'integrations', label:'Integration Plan',   icon:'🔌', sub:'Live vs mock · 22 systems · Cost + effort' },
  { id:'guide',        label:'User Guide',         icon:'📖', sub:'Screens · Drill-down routes · Walkthrough' },
]

// ── TOAST SYSTEM ────────────────────────────────────────────────────────────
const TOAST_POOL = [
  { type:'alert',  icon:'🔴', color:'#ff3d5a', title:'Threshold breached', msg:'CareOS cash runway fell below 3 months' },
  { type:'sync',   icon:'✓',  color:'#00c97a', title:'Data synced',         msg:'Xero · Meridian SaaS · P&L updated' },
  { type:'news',   icon:'📰', color:'#3d8bff', title:'News flagged',        msg:'PayFlo secured new enterprise contract' },
  { type:'agent',  icon:'🤖', color:'#9b6dff', title:'Agent action',        msg:'Investigation Agent completed — CareOS revenue' },
  { type:'sync',   icon:'✓',  color:'#00c97a', title:'Live feed',           msg:'Market data refreshed · GBP/USD updated' },
  { type:'alert',  icon:'⚡', color:'#f5a524', title:'Action due',          msg:'SwiftLogix — SLA review due today' },
]

function Toasts({ toasts, dismiss }) {
  return (
    <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:10, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          pointerEvents:'auto', minWidth:280, maxWidth:340,
          background:'rgba(11,17,32,0.96)', backdropFilter:'blur(12px)',
          border:`1px solid ${t.color}40`, borderLeft:`3px solid ${t.color}`,
          borderRadius:10, padding:'12px 14px',
          boxShadow:'0 12px 40px rgba(0,0,0,0.4)',
          animation: t.leaving ? 'toastOut 0.3s ease forwards' : 'toastIn 0.35s cubic-bezier(0.22,1,0.36,1)',
          display:'flex', gap:11, alignItems:'flex-start',
        }}>
          <span style={{ fontSize:15, marginTop:1 }}>{t.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ color:'#e8edf8', fontSize:12, fontWeight:700, marginBottom:2 }}>{t.title}</div>
            <div style={{ color:'#7a90b8', fontSize:11, lineHeight:1.4 }}>{t.msg}</div>
          </div>
          <button onClick={()=>dismiss(t.id)} style={{ background:'transparent', border:'none', color:'#3d5070', cursor:'pointer', fontSize:13, padding:0, lineHeight:1 }}>×</button>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  // Which landing page opens first, and how large the interface is drawn, are
  // the viewer's choices rather than the build's — both are read from
  // localStorage on the first render so a reload lands where the last one did.
  const [prefs, setPrefs] = useState(loadPrefs)
  const [view, setView]   = useState(prefs.home)
  const [collapsed, setCollapsed] = useState(false)
  const active = VIEWS.find(v => v.id === view)

  const setHome  = (id)    => { setPrefs(savePrefs({ home: id })); setView(id) }
  const setScale = (value) => setPrefs(savePrefs({ scale: value }))

  // ── Ctrl/Cmd +, − and 0 drive the same setting as the top-bar control ──
  //
  // The browser's own zoom still works and stacks on top of this. Binding the
  // keys here as well means the keyboard and the SIZE control cannot disagree,
  // and the choice persists with the rest of the preferences rather than living
  // in browser state the next machine will not have.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return
      const step = e.key === '+' || e.key === '=' ? 1 : e.key === '-' || e.key === '_' ? -1 : e.key === '0' ? 0 : null
      if (step === null) return
      e.preventDefault()
      setPrefs(p => {
        const i = SCALES.findIndex(x => x.id === p.scale)
        const next = step === 0 ? 0 : Math.min(SCALES.length - 1, Math.max(0, i + step))
        return savePrefs({ scale: SCALES[next].id })
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Toast system: demo emitter fires realistic events periodically ──
  const [toasts, setToasts] = useState([])
  const dismiss = useCallback((id) => {
    setToasts(p => p.map(t => t.id===id ? {...t, leaving:true} : t))
    setTimeout(() => setToasts(p => p.filter(t => t.id!==id)), 300)
  }, [])
  useEffect(() => {
    let i = 0
    const fire = () => {
      const base = TOAST_POOL[i % TOAST_POOL.length]; i++
      const id = Date.now() + Math.random()
      setToasts(p => [...p, { ...base, id }].slice(-3))
      setTimeout(() => dismiss(id), 5500)
    }
    const first = setTimeout(fire, 3000)
    const loop = setInterval(fire, 11000)
    return () => { clearTimeout(first); clearInterval(loop) }
  }, [dismiss])

  return (
    <>
    {/*
      The whole interface is scaled together rather than the type alone: 340 of
      the prototype's 578 type sizes are 10px or below, and raising those in
      isolation would reflow every panel they sit in and change what fits on a
      screen. `zoom` scales text, charts, spacing and tables in proportion, so
      no column or table row is lost at any setting. The height is divided by
      the same factor so the app still fills exactly one viewport.
    */}
    <div style={{
      zoom: prefs.scale,
      display:'flex', height:`calc(100vh / ${prefs.scale})`, overflow:'hidden',
      fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      background:'#020817',
    }}>

      {/* Sidebar */}
      <div style={{
        width: collapsed ? 52 : 220,
        background:'#04091a',
        borderRight:'1px solid #0f1a30',
        display:'flex', flexDirection:'column',
        padding:'14px 0', gap:2, flexShrink:0,
        transition:'width 0.2s ease',
        overflow:'hidden',
      }}>

        {/* Logo + collapse toggle */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 10px', marginBottom:16 }}>
          <div style={{
            width:32, height:32, borderRadius:8, flexShrink:0,
            background:'linear-gradient(135deg,#3d8bff,#9b6dff)',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontSize:14, fontWeight:800,
          }}>A</div>
          {!collapsed && (
            <div>
              <div style={{ color:'#e8edf8', fontSize:11, fontWeight:700, lineHeight:1.2 }}>Alba PIP</div>
              <div style={{ color:'#3d5070', fontSize:9 }}>Caledonia Alba</div>
            </div>
          )}
          <button onClick={() => setCollapsed(p=>!p)} style={{
            marginLeft:'auto', background:'transparent', border:'none',
            color:'#3d5070', cursor:'pointer', fontSize:14, padding:0, flexShrink:0,
          }}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Nav items */}
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} title={v.label}
            style={{
              display:'flex', alignItems:'center', gap:10,
              padding: collapsed ? '9px 0' : '9px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: view===v.id ? '#0f2140' : 'transparent',
              border:'none',
              borderLeft: view===v.id ? '3px solid #3d8bff' : '3px solid transparent',
              cursor:'pointer', width:'100%', textAlign:'left',
              transition:'background 0.15s',
            }}>
            <span style={{ fontSize:15, flexShrink:0 }}>{v.icon}</span>
            {!collapsed && (
              <div>
                <div style={{ color: view===v.id ? '#e8edf8' : '#7a90b8', fontSize:11, fontWeight: view===v.id ? 700 : 400 }}>
                  {v.label}
                </div>
                <div style={{ color:'#3d5070', fontSize:8.5, marginTop:1, lineHeight:1.3 }}>{v.sub}</div>
              </div>
            )}
          </button>
        ))}

        {/* Footer */}
        {!collapsed && (
          <div style={{ marginTop:'auto', padding:'10px 12px', borderTop:'1px solid #0f1a30' }}>
            <div style={{ color:'#3d5070', fontSize:8, lineHeight:1.5 }}>
              Alba PIP Prototype · May 2026<br/>
              1 developer · Node.js + React<br/>
              npm run dev → localhost:5173
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>

        {/* Top bar */}
        <div style={{
          background:'#070d1a', borderBottom:'1px solid #172035',
          padding:'8px 20px', display:'flex', alignItems:'center',
          justifyContent:'space-between', flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:16 }}>{active?.icon}</span>
            <div>
              <span style={{ color:'#e8edf8', fontSize:13, fontWeight:700 }}>{active?.label}</span>
              <span style={{ color:'#3d5070', fontSize:10, marginLeft:10 }}>{active?.sub}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>

            {/* Home switch — which of the two landing pages opens first. */}
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ color:'#3d5070', fontSize:9, letterSpacing:'0.08em' }}>HOME</span>
              <div style={{ display:'flex', border:'1px solid #172035', borderRadius:5, overflow:'hidden' }}>
                {HOMES.map(h => (
                  <button key={h.id} onClick={() => setHome(h.id)}
                    title={`Open on ${h.label} — ${h.blurb}`}
                    style={{
                      padding:'3px 9px', border:'none', cursor:'pointer', fontSize:9.5,
                      fontWeight: prefs.home===h.id ? 700 : 400,
                      background: prefs.home===h.id ? '#3d8bff' : 'transparent',
                      color: prefs.home===h.id ? '#fff' : '#7a90b8',
                    }}>{h.label}</button>
                ))}
              </div>
            </div>

            {/* Interface size. */}
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ color:'#3d5070', fontSize:9, letterSpacing:'0.08em' }}>SIZE</span>
              <div style={{ display:'flex', border:'1px solid #172035', borderRadius:5, overflow:'hidden' }}>
                {SCALES.map(s => (
                  <button key={s.id} onClick={() => setScale(s.id)} title={s.blurb}
                    style={{
                      padding:'3px 7px', border:'none', cursor:'pointer', fontSize:9.5,
                      fontWeight: prefs.scale===s.id ? 700 : 400,
                      background: prefs.scale===s.id ? '#9b6dff' : 'transparent',
                      color: prefs.scale===s.id ? '#fff' : '#7a90b8',
                    }}>{s.label}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setView('guide')}
              style={{
                padding:'3px 10px', background:'transparent', border:'1px solid #172035',
                borderRadius:5, color: view==='guide' ? '#e8edf8' : '#7a90b8',
                fontSize:9.5, cursor:'pointer', fontFamily:'inherit',
              }}>📖 User guide</button>

            <span style={{
              padding:'3px 10px', background:'#00c97a14', border:'1px solid #00c97a30',
              borderRadius:5, color:'#00c97a', fontSize:9, fontWeight:700,
            }}>● PROTOTYPE RUNNING</span>
          </div>
        </div>

        {/* View area — re-keyed on view change to trigger transition */}
        <div key={view} className="view-enter" style={{ flex:1, overflow:'hidden' }}>
          {view==='command'      && <CommandCentre onOpenCompany={()=>setView('gp')} onGuide={()=>setView('guide')}/>}
      {view==='revenuemiss'  && <ScenarioRevenueMiss/>}
      {view==='expansion'    && <ScenarioExpansion/>}
          {view==='cash'         && <ScenarioCash/>}
          {view==='margin'       && <ScenarioMargin/>}
          {view==='procurement'  && <ScenarioProcurement/>}
      {view==='gp'           && <GPDashboard onGuide={()=>setView('guide')}/>}
          {view==='client'       && <ClientPortal/>}
          {view==='realtime'     && <RealTime/>}
          {view==='news'         && <NewsFeed/>}
          {view==='agents'       && <Agents/>}
          {view==='analytics'    && <PortfolioAnalytics/>}
          {view==='gantt'        && <Gantt/>}
          {view==='improvements' && <Improvements/>}
          {view==='integrations' && <IntegrationPlan/>}
          {view==='guide'        && <UserGuide onNavigate={setView}/>}
        </div>
      </div>
    </div>

    {/* Outside the zoomed container: fixed positioning inside a `zoom` context
        has its coordinates scaled too, which walks the toasts off the corner. */}
    <Toasts toasts={toasts} dismiss={dismiss} />
    </>
  )
}
