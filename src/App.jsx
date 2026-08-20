import { useState, useEffect, useCallback } from 'react'
import CommandCentre  from './views/CommandCentre.jsx'
import ScenarioRevenueMiss from './views/ScenarioRevenueMiss.jsx'
import ScenarioExpansion   from './views/ScenarioExpansion.jsx'
import ScenarioCash        from './views/ScenarioCash.jsx'
import ScenarioMargin      from './views/ScenarioMargin.jsx'
import ScenarioProcurement from './views/ScenarioProcurement.jsx'
import OpportunityRadar    from './views/OpportunityRadar.jsx'
import ActionPlan          from './views/ActionPlan.jsx'
import ProtectionPlan      from './views/ProtectionPlan.jsx'
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
import { C, F, S, label as labelStyle } from './lib/theme.js'
import { Wordmark } from './components/Shell.jsx'
import { COMPANIES, FUNDS } from './lib/companies.js'
import { attentionActions } from './lib/investigation.js'

// Grouped as the reference screens group them. The top bar carries the four
// sections; the rail below carries every view within the active section.
const VIEWS = [
  { id:'command',      group:'Portfolio',    label:'Command Centre',     icon:'◎', sub:'Fund health · Risks vs opportunities · 9 companies' },
  { id:'gp',           group:'Portfolio',    label:'Company Detail',     icon:'⬡', sub:'One company · Eleven modules · Finance drill-downs' },
  { id:'client',       group:'Portfolio',    label:'Company Portal',     icon:'◈', sub:'Role-based views for the portfolio company' },
  { id:'realtime',     group:'Portfolio',    label:'Live Data',          icon:'◉', sub:'Continuous readings · Market data · Activity' },

  { id:'revenuemiss',  group:'Intelligence', label:'Revenue Risk',       icon:'▽', sub:'NovaTech Solutions · Forecast miss · Driver bridge' },
  { id:'radar',        group:'Intelligence', label:'Opportunity Radar',  icon:'◎', sub:'Portfolio-wide value creation · Ranked upside · 9 companies' },
  { id:'expansion',    group:'Intelligence', label:'Customer Expansion', icon:'△', sub:'BrightWave Digital · Cross-sell · Account scoring' },
  { id:'cash',         group:'Intelligence', label:'Cash & Runway',      icon:'◷', sub:'Nusantara Foods · 13-week model · Three bases' },
  { id:'margin',       group:'Intelligence', label:'Margin Erosion',     icon:'◱', sub:'Apex Manufacturing · Green everywhere · 8 points lost' },
  { id:'procurement',  group:'Intelligence', label:'Procurement',        icon:'⬢', sub:'Cross-portfolio · Supplier consolidation' },
  { id:'analytics',    group:'Intelligence', label:'Analytics',          icon:'▦', sub:'Heatmap · Scenario · Returns · IRR' },
  { id:'news',         group:'Intelligence', label:'News & Sentiment',   icon:'◫', sub:'Per-company news · Materiality · Sentiment' },

  { id:'protection',   group:'Actions',      label:'Protection Plan',    icon:'⛨', sub:'NovaTech Solutions · Forecast risk into owned interventions' },
  { id:'actionplan',   group:'Actions',      label:'Commercial Plan',    icon:'◇', sub:'BrightWave Digital · Campaign · Owners and dates' },
  { id:'agents',       group:'Actions',      label:'AI Agents',          icon:'◐', sub:'Investigation · Portfolio Q&A · Board pack' },
  { id:'improvements', group:'Actions',      label:'Improvement Stack',  icon:'✦', sub:'28 improvements · Priority order' },
  { id:'gantt',        group:'Actions',      label:'Delivery Plan',      icon:'▤', sub:'Prototype and production timeline' },
  { id:'integrations', group:'Actions',      label:'Connected Sources',  icon:'⌘', sub:'Systems · What each one feeds' },

  { id:'guide',        group:'Reports',      label:'User Guide',         icon:'◧', sub:'Screens · Drill-down routes · Walkthrough' },
]

const GROUPS = ['Portfolio', 'Intelligence', 'Actions', 'Reports']

// ── TOAST SYSTEM ────────────────────────────────────────────────────────────
// Derived from the registry and the finance model rather than typed, so the
// activity ticker names the companies the rest of the platform names.
const TOAST_POOL = (() => {
  const worst = attentionActions(3)
  const co = (i) => worst[i]?.company ?? COMPANIES[i]?.name ?? 'a portfolio company'
  return [
    { type:'alert', icon:'▲', color:C.red,    title:'Threshold breached', msg:`${co(0)} — ${worst[0]?.rationale ?? 'runway below threshold'}` },
    { type:'sync',  icon:'✓', color:C.green,  title:'Data synced',        msg:`Xero · ${COMPANIES[0].name} · management accounts updated` },
    { type:'news',  icon:'◫', color:C.blue,   title:'News flagged',       msg:`${COMPANIES[1].name} secured a new enterprise contract` },
    { type:'agent', icon:'◐', color:C.purple, title:'Agent action',       msg:`Investigation complete — ${co(1)}` },
    { type:'sync',  icon:'✓', color:C.green,  title:'Live feed',          msg:'Market data refreshed · GBP/USD updated' },
    { type:'alert', icon:'◷', color:C.amber,  title:'Action due',         msg:`${co(2)} — review due today` },
  ]
})()

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
  const [fundId, setFundId] = useState(FUNDS[0].id)
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
  const open = (v) => { if (v.id === 'gp') setOpenCompany(null); setView(v.id) }

  // ── The navigation panel ──────────────────────────────────────────────────
  //
  // This was a 52px icon-only rail, which is what the reference screens draw.
  // The reference screens have four or five destinations. This build has
  // nineteen, and nineteen unlabelled glyphs at #5E5E66 on #070708 is not a
  // navigation panel — it reads as an empty black strip, which is exactly how
  // it was described the first time somebody who had not built it looked at it.
  //
  // So it carries labels. It still collapses to the rail, the collapse persists,
  // and the top bar's four sections are untouched.
  const navOpen = prefs.navOpen
  const setNavOpen = (value) => setPrefs(savePrefs({ navOpen: value }))
  const navItem = (v) => ({
    display:'flex', alignItems:'center', gap:10, width:'100%', textAlign:'left',
    padding: navOpen ? '8px 10px' : '8px 0', justifyContent: navOpen ? 'flex-start' : 'center',
    borderRadius:5, cursor:'pointer', fontFamily:'inherit',
    background: view===v.id ? C.goldSoft : 'transparent',
    border:`1px solid ${view===v.id ? C.goldLine : 'transparent'}`,
    borderLeft: navOpen ? `2px solid ${view===v.id ? C.gold : 'transparent'}` : undefined,
    color: view===v.id ? C.gold : C.txt2,
  })

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
            <select value={fundId} onChange={(e) => setFundId(e.target.value)}
                    title="The fund in view"
                    style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:4,
                             padding:'4px 7px', color:C.txt2, fontFamily:'inherit', fontSize:S.label,
                             letterSpacing:'0.09em', textTransform:'uppercase', cursor:'pointer' }}>
              {FUNDS.map(f => <option key={f.id} value={f.id} style={{ background:C.surface }}>{f.name}</option>)}
            </select>
            <span style={{ width:26, height:26, borderRadius:'50%', border:`1px solid ${C.goldLine}`,
                           background:C.goldSoft, color:C.gold, display:'flex', alignItems:'center',
                           justifyContent:'center', fontSize:9.5, fontWeight:700 }}>GM</span>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        {/* ── Navigation panel ── */}
        <div style={{ width: navOpen ? 212 : 52, background:C.bgDeep, borderRight:`1px solid ${C.border}`,
                      flexShrink:0, display:'flex', flexDirection:'column', padding:'10px 8px',
                      gap:2, transition:'width 0.16s ease', overflow:'hidden' }}>

          {navOpen && (
            <div style={{ ...labelStyle(C.txt3), padding:'2px 10px 8px' }}>{group}</div>
          )}

          {inGroup.map(v => (
            <button key={v.id} onClick={() => open(v)} title={navOpen ? v.sub : `${v.label} — ${v.sub}`} style={navItem(v)}>
              <span style={{ fontSize:15, flexShrink:0, width:18, textAlign:'center' }}>{v.icon}</span>
              {navOpen && (
                <span style={{ minWidth:0 }}>
                  <span style={{ display:'block', fontSize:S.body, fontWeight: view===v.id ? 600 : 400,
                                 color: view===v.id ? C.gold : C.txt1, lineHeight:1.3 }}>{v.label}</span>
                  <span style={{ display:'block', fontSize:S.micro, color:C.txt3, lineHeight:1.4, marginTop:1,
                                 overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.sub}</span>
                </span>
              )}
            </button>
          ))}

          <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:2 }}>
            <button onClick={() => setView('guide')} title="User guide"
              style={{ ...navItem({ id:'guide' }), borderTop:`1px solid ${C.border}`, borderRadius:0, paddingTop:10 }}>
              <span style={{ fontSize:15, flexShrink:0, width:18, textAlign:'center' }}>?</span>
              {navOpen && <span style={{ fontSize:S.body, color: view==='guide' ? C.gold : C.txt2 }}>User guide</span>}
            </button>
            <button onClick={() => setNavOpen(!navOpen)}
              title={navOpen ? 'Collapse the navigation' : 'Expand the navigation'}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding: navOpen ? '8px 10px' : '8px 0',
                       justifyContent: navOpen ? 'flex-start' : 'center', background:'transparent',
                       border:'1px solid transparent', borderRadius:5, cursor:'pointer', color:C.txt3,
                       fontFamily:'inherit', fontSize:S.small }}>
              <span style={{ fontSize:14, flexShrink:0, width:18, textAlign:'center' }}>{navOpen ? '‹' : '›'}</span>
              {navOpen && <span>Collapse</span>}
            </button>
          </div>
        </div>

        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          <div key={view} className="view-enter" style={{ flex:1, overflow:'hidden', minWidth:0 }}>
          {view==='command'      && <CommandCentre onOpenCompany={(id)=>{setOpenCompany(id);setView('gp')}} onGuide={()=>setView('guide')}/>}
          {view==='revenuemiss'  && <ScenarioRevenueMiss onOpenPlan={()=>setView('protection')}/>}
          {view==='radar'        && <OpportunityRadar/>}
          {view==='expansion'    && <ScenarioExpansion/>}
          {view==='cash'         && <ScenarioCash/>}
          {view==='margin'       && <ScenarioMargin/>}
          {view==='procurement'  && <ScenarioProcurement/>}
          {view==='protection'   && <ProtectionPlan/>}
          {view==='actionplan'   && <ActionPlan/>}
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
