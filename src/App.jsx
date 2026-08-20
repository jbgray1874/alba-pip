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
import { C, F, S } from './lib/theme.js'
import { Wordmark } from './components/Shell.jsx'

// Grouped as the reference screens group them. The top bar carries the four
// sections; the rail below carries every view within the active section.
const VIEWS = [
  { id:'command',      group:'Portfolio',    label:'Command Centre',     icon:'◎', sub:'Fund health · Risks vs opportunities · 9 companies' },
  { id:'gp',           group:'Portfolio',    label:'Company Detail',     icon:'⬡', sub:'One company · Eleven modules · Finance drill-downs' },
  { id:'client',       group:'Portfolio',    label:'Company Portal',     icon:'◈', sub:'Role-based views for the portfolio company' },
  { id:'realtime',     group:'Portfolio',    label:'Live Data',          icon:'◉', sub:'Continuous readings · Market data · Activity' },

  { id:'revenuemiss',  group:'Intelligence', label:'Revenue Risk',       icon:'▽', sub:'Straits Analytics · Forecast miss · Driver bridge' },
  { id:'expansion',    group:'Intelligence', label:'Opportunity Radar',  icon:'△', sub:'Zafira Systems · Cross-sell · Account scoring' },
  { id:'cash',         group:'Intelligence', label:'Cash & Runway',      icon:'◷', sub:'Nusantara Foods · 13-week model · Three bases' },
  { id:'margin',       group:'Intelligence', label:'Margin Erosion',     icon:'◱', sub:'ForgeTech · Green everywhere · 8 points lost' },
  { id:'procurement',  group:'Intelligence', label:'Procurement',        icon:'⬢', sub:'Cross-portfolio · Supplier consolidation' },
  { id:'analytics',    group:'Intelligence', label:'Analytics',          icon:'▦', sub:'Heatmap · Scenario · Returns · IRR' },
  { id:'news',         group:'Intelligence', label:'News & Sentiment',   icon:'◫', sub:'Per-company news · Materiality · Sentiment' },

  { id:'agents',       group:'Actions',      label:'AI Agents',          icon:'◐', sub:'Investigation · Portfolio Q&A · Board pack' },
  { id:'improvements', group:'Actions',      label:'Improvement Stack',  icon:'✦', sub:'28 improvements · Priority order' },
  { id:'gantt',        group:'Actions',      label:'Delivery Plan',      icon:'▤', sub:'Prototype and production timeline' },
  { id:'integrations', group:'Actions',      label:'Connected Sources',  icon:'⌘', sub:'Systems · What each one feeds' },

  { id:'guide',        group:'Reports',      label:'User Guide',         icon:'◧', sub:'Screens · Drill-down routes · Walkthrough' },
]

const GROUPS = ['Portfolio', 'Intelligence', 'Actions', 'Reports']

// ── TOAST SYSTEM ────────────────────────────────────────────────────────────
const TOAST_POOL = [
  { type:'alert',  icon:'▲', color:'#F4525F', title:'Threshold breached', msg:'CareOS cash runway fell below 3 months' },
  { type:'sync',   icon:'✓',  color:'#3FCF6E', title:'Data synced',         msg:'Xero · Meridian SaaS · P&L updated' },
  { type:'news',   icon:'◫', color:'#5B8DEF', title:'News flagged',        msg:'PayFlo secured new enterprise contract' },
  { type:'agent',  icon:'◐', color:'#9B7BEF', title:'Agent action',        msg:'Investigation Agent completed — CareOS revenue' },
  { type:'sync',   icon:'✓',  color:'#3FCF6E', title:'Live feed',           msg:'Market data refreshed · GBP/USD updated' },
  { type:'alert',  icon:'◷', color:'#E5A83C', title:'Action due',          msg:'SwiftLogix — SLA review due today' },
]

function Toasts({ toasts, dismiss }) {
  return (
    <div style={{ position:'fixed', top:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:10, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          pointerEvents:'auto', minWidth:280, maxWidth:340,
          background:'rgba(19,19,21,0.97)', backdropFilter:'blur(12px)',
          border:`1px solid ${t.color}40`, borderLeft:`3px solid ${t.color}`,
          borderRadius:10, padding:'12px 14px',
          boxShadow:'0 12px 40px rgba(0,0,0,0.4)',
          animation: t.leaving ? 'toastOut 0.3s ease forwards' : 'toastIn 0.35s cubic-bezier(0.22,1,0.36,1)',
          display:'flex', gap:11, alignItems:'flex-start',
        }}>
          <span style={{ fontSize:15, marginTop:1 }}>{t.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ color:C.txt1, fontSize:12, fontWeight:600, marginBottom:2 }}>{t.title}</div>
            <div style={{ color:C.txt2, fontSize:11, lineHeight:1.4 }}>{t.msg}</div>
          </div>
          <button onClick={()=>dismiss(t.id)} style={{ background:'transparent', border:'none', color:C.txt3, cursor:'pointer', fontSize:13, padding:0, lineHeight:1 }}>×</button>
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
  // Which company Portfolio Health handed over, if any. Cleared when the GP
  // Dashboard is opened from the sidebar so it lands on the portfolio list.
  const [openCompany, setOpenCompany] = useState(null)
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

  const group = active?.group ?? GROUPS[0]
  const inGroup = VIEWS.filter(v => v.group === group)
  const railBtn = (v) => ({
    width:36, height:36, borderRadius:5, cursor:'pointer', fontFamily:'inherit',
    display:'flex', alignItems:'center', justifyContent:'center', fontSize:15,
    background: view===v.id ? C.goldSoft : 'transparent',
    border:`1px solid ${view===v.id ? C.goldLine : 'transparent'}`,
    color: view===v.id ? C.gold : C.txt3,
  })
  const open = (v) => { if (v.id === 'gp') setOpenCompany(null); setView(v.id) }

  return (
    <>
    {/* The whole interface scales together rather than the type alone; the
        height is divided by the same factor so it still fills one viewport. */}
    <div style={{
      zoom: prefs.scale,
      display:'flex', flexDirection:'column', height:`calc(100vh / ${prefs.scale})`, overflow:'hidden',
      fontFamily: F.sans, background: C.bg, color: C.txt1,
    }}>

      {/* ── Top bar: mark, sections, fund, account ── */}
      <div style={{ display:'flex', alignItems:'center', gap:22, padding:'0 18px', height:48,
                    borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <Wordmark/>
        <nav style={{ display:'flex', gap:2, marginLeft:8 }}>
          {GROUPS.map(g => {
            const on = g === group
            const first = VIEWS.find(v => v.group === g)
            return (
              <button key={g} onClick={() => first && setView(first.id)}
                style={{ padding:'15px 13px 13px', background:'transparent', border:'none',
                         borderBottom:`2px solid ${on ? C.gold : 'transparent'}`,
                         color: on ? C.txt1 : C.txt3, cursor:'pointer', fontFamily:'inherit',
                         fontSize:S.label, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase' }}>
                {g}
              </button>
            )
          })}
        </nav>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:9 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ color:C.txt3, fontSize:S.micro, letterSpacing:'0.1em' }}>HOME</span>
            <div style={{ display:'flex', border:`1px solid ${C.border}`, borderRadius:4, overflow:'hidden' }}>
              {HOMES.map(h => (
                <button key={h.id} onClick={() => setHome(h.id)} title={`Open on ${h.label} — ${h.blurb}`}
                  style={{ padding:'3px 8px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:S.micro,
                           fontWeight: prefs.home===h.id ? 700 : 400,
                           background: prefs.home===h.id ? C.gold : 'transparent',
                           color: prefs.home===h.id ? '#141005' : C.txt2 }}>{h.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ color:C.txt3, fontSize:S.micro, letterSpacing:'0.1em' }}>SIZE</span>
            <div style={{ display:'flex', border:`1px solid ${C.border}`, borderRadius:4, overflow:'hidden' }}>
              {SCALES.map(sc => (
                <button key={sc.id} onClick={() => setScale(sc.id)} title={sc.blurb}
                  style={{ padding:'3px 6px', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:S.micro,
                           fontWeight: prefs.scale===sc.id ? 700 : 400,
                           background: prefs.scale===sc.id ? C.gold : 'transparent',
                           color: prefs.scale===sc.id ? '#141005' : C.txt2 }}>{sc.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:8, borderLeft:`1px solid ${C.border}` }}>
            <span style={{ color:C.txt2, fontSize:S.label, letterSpacing:'0.09em', textTransform:'uppercase' }}>Alba Growth I</span>
            <span style={{ width:26, height:26, borderRadius:'50%', border:`1px solid ${C.goldLine}`,
                           background:C.goldSoft, color:C.gold, display:'flex', alignItems:'center',
                           justifyContent:'center', fontSize:9.5, fontWeight:700 }}>GM</span>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* ── Icon rail ── */}
        <div style={{ width:52, background:C.bgDeep, borderRight:`1px solid ${C.border}`, flexShrink:0,
                      display:'flex', flexDirection:'column', alignItems:'center', paddingTop:10, gap:2 }}>
          {inGroup.map(v => (
            <button key={v.id} onClick={() => open(v)} title={`${v.label} — ${v.sub}`} style={railBtn(v)}>{v.icon}</button>
          ))}
          <div style={{ marginTop:'auto', paddingBottom:12 }}>
            <button onClick={() => setView('guide')} title="User guide"
              style={{ width:36, height:36, borderRadius:5, cursor:'pointer', background:'transparent',
                       border:'1px solid transparent', color: view==='guide' ? C.gold : C.txt3, fontSize:15,
                       fontFamily:'inherit' }}>?</button>
          </div>
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
          {/* ── Section bar ── */}
          <div style={{ display:'flex', alignItems:'center', gap:3, padding:'0 18px', height:36,
                        borderBottom:`1px solid ${C.border}`, flexShrink:0, overflowX:'auto' }}>
            {inGroup.map(v => (
              <button key={v.id} onClick={() => open(v)}
                style={{ padding:'5px 10px', borderRadius:4, cursor:'pointer', fontFamily:'inherit',
                         whiteSpace:'nowrap', fontSize:S.small,
                         background: view===v.id ? C.surfaceUp : 'transparent',
                         border:`1px solid ${view===v.id ? C.border : 'transparent'}`,
                         color: view===v.id ? C.txt1 : C.txt3 }}>{v.label}</button>
            ))}
            <span style={{ marginLeft:'auto', color:C.txt3, fontSize:S.micro, whiteSpace:'nowrap', paddingLeft:12 }}>
              {active?.sub}
            </span>
          </div>

          <div key={view} className="view-enter" style={{ flex:1, overflow:'hidden', minWidth:0 }}>
          {view==='command'      && <CommandCentre onOpenCompany={(id)=>{setOpenCompany(id);setView('gp')}} onGuide={()=>setView('guide')}/>}
      {view==='revenuemiss'  && <ScenarioRevenueMiss/>}
      {view==='expansion'    && <ScenarioExpansion/>}
          {view==='cash'         && <ScenarioCash/>}
          {view==='margin'       && <ScenarioMargin/>}
          {view==='procurement'  && <ScenarioProcurement/>}
      {view==='gp'           && <GPDashboard onGuide={()=>setView('guide')} openCompany={openCompany}/>}
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
    </div>

    {/* Outside the zoomed container: fixed positioning inside a `zoom` context
        has its coordinates scaled too, which walks the toasts off the corner. */}
    <Toasts toasts={toasts} dismiss={dismiss} />
    </>
  )
}
