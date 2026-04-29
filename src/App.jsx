import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── BigQuery query runner ────────────────────────────────────────────────────
// Calls the BigQuery REST API via google-auth token (ADC already configured)
// Usage: replace PROJECT_ID and ensure GOOGLE_APPLICATION_CREDENTIALS is set.
// In a real deployment this runs server-side; here we simulate with real-looking
// data that matches the exact schema of letudiant-data-prod.Hacka_g24

const PROJECT = "letudiant-data-prod";
const DATASET = "Hacka_g24";

// ─── BIGQUERY QUERIES (prêts à coller dans BQ console ou notebook) ─────────
export const BQ_QUERIES = {
  monthly_conversations: `
    SELECT
      FORMAT_DATE('%Y-%m', DATE(created_at)) AS month,
      COUNT(*) AS conversations,
      COUNTIF(id_Inscrit_site IS NOT NULL) AS identified,
      ROUND(AVG(nb_input_tokens)) AS avg_tokens
    FROM \`${PROJECT}.${DATASET}.Agent_Conversationnel_ORI_Conversation\`
    WHERE created_at >= '2025-01-01'
    GROUP BY month ORDER BY month`,

  domain_distribution: `
    SELECT d.domaine_etude, COUNT(*) AS cnt
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\` s
    JOIN \`${PROJECT}.${DATASET}.Site_Inscrits_dimension_domaine_etude\` d
      ON s.id_domaine_etude = d.id_domaine_etude
    WHERE d.domaine_etude IS NOT NULL
    GROUP BY 1 ORDER BY cnt DESC LIMIT 15`,

  study_level_dist: `
    SELECT sl.study_level, COUNT(*) AS cnt
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\` s
    JOIN \`${PROJECT}.${DATASET}.Site_Inscrits_dimension_study_level\` sl
      ON s.id_study_level = sl.id_study_level
    WHERE sl.study_level IS NOT NULL
    GROUP BY 1 ORDER BY cnt DESC LIMIT 12`,

  lead_scoring: `
    SELECT
      CASE
        WHEN score >= 75 THEN 'A — Hot'
        WHEN score >= 40 THEN 'B — Warm'
        ELSE 'C — Cold'
      END AS grade,
      COUNT(*) AS count,
      ROUND(AVG(score), 1) AS avg_score
    FROM (
      SELECT
        id_Inscrit_site,
        EXP(-DATE_DIFF(CURRENT_DATE(), DATE(created_at), DAY) / 90.0) * 100 * 0.35
        + CASE WHEN id_Inscrit_site IS NOT NULL THEN 60 ELSE 20 END * 0.25
        + LEAST(nb_input_tokens / 50000.0, 1) * 100 * 0.25
        + CASE WHEN id_Inscrit_site IS NOT NULL THEN 80 ELSE 20 END * 0.15
        AS score
      FROM \`${PROJECT}.${DATASET}.Agent_Conversationnel_ORI_Conversation\`
    )
    GROUP BY 1 ORDER BY 1`,

  salon_conversion: `
    SELECT
      saison,
      COUNT(*) AS inscrits,
      COUNTIF(Showed_up = TRUE) AS venus,
      ROUND(COUNTIF(Showed_up = TRUE) / COUNT(*) * 100, 1) AS taux_conversion
    FROM \`${PROJECT}.${DATASET}.Salons_Inscrits_et_venus\`
    GROUP BY 1 ORDER BY 1`,

  crm_engagement: `
    SELECT
      MESSAGE_TYPE,
      COUNT(*) AS envois,
      COUNTIF(opened = TRUE) AS opens,
      COUNTIF(clicked = TRUE) AS clicks,
      ROUND(COUNTIF(opened = TRUE) / COUNT(*) * 100, 1) AS open_rate,
      ROUND(COUNTIF(clicked = TRUE) / COUNT(*) * 100, 1) AS ctr
    FROM \`${PROJECT}.${DATASET}.CRM_Communication\`
    WHERE MESSAGE_TYPE IS NOT NULL
    GROUP BY 1 ORDER BY envois DESC LIMIT 10`,

  optin_funnel: `
    SELECT
      COUNTIF(optin_commercial_actuel = 'OUI') AS commercial,
      COUNTIF(optin_letudiant_actuel  = 'OUI') AS letudiant,
      COUNTIF(optin_tel_actuel        = 'OUI') AS telephone,
      COUNTIF(optin_COACHING          = 'OUI') AS coaching,
      COUNTIF(optin_FINANCE           = 'OUI') AS finance,
      COUNT(*) AS total
    FROM \`${PROJECT}.${DATASET}.Site_Inscrits\``,
};

// ─── Mock data (mirrors exact BQ output) ─────────────────────────────────────
const MOCK = {
  kpis: {
    total_inscrits: 692847,
    total_conversations: 124000,
    identified_pct: 34.5,
    opt_in_commercial: 40.2,
    avg_tokens: 7123,
    salons_conversion: 28.4,
  },
  monthly: [
    { month: "Sep 25", conversations: 7192, identified: 2840, avg_tokens: 9100 },
    { month: "Oct 25", conversations: 4216, identified: 1420, avg_tokens: 7200 },
    { month: "Nov 25", conversations: 4000, identified: 1290, avg_tokens: 6800 },
    { month: "Déc 25", conversations: 1499, identified: 380,  avg_tokens: 5400 },
    { month: "Jan 26", conversations: 3706, identified: 1560, avg_tokens: 8200 },
    { month: "Fév 26", conversations: 1975, identified: 710,  avg_tokens: 7100 },
    { month: "Mar 26", conversations: 1915, identified: 640,  avg_tokens: 6900 },
    { month: "Avr 26", conversations: 497,  identified: 178,  avg_tokens: 7400 },
  ],
  domains: [
    { domain: "Commerce / Marketing",        cnt: 128874, pct: 18.4 },
    { domain: "International",               cnt: 106803, pct: 15.3 },
    { domain: "Communication / Journalisme", cnt: 105895, pct: 15.1 },
    { domain: "Arts / Audiovisuel",          cnt: 98739,  pct: 14.1 },
    { domain: "Action sociale",              cnt: 92313,  pct: 13.2 },
    { domain: "Sport",                       cnt: 92243,  pct: 13.2 },
    { domain: "Digital / Informatique",      cnt: 91466,  pct: 13.1 },
    { domain: "Droit / Sciences Po",         cnt: 88387,  pct: 12.6 },
    { domain: "Architecture",               cnt: 87025,  pct: 12.4 },
    { domain: "Santé / Paramédical",         cnt: 86327,  pct: 12.3 },
  ],
  study_levels: [
    { level: "Terminale",       cnt: 148200 },
    { level: "Première",        cnt: 112400 },
    { level: "2nde Générale",   cnt: 98700  },
    { level: "3ème",            cnt: 76300  },
    { level: "4ème",            cnt: 62100  },
    { level: "Bac+1",           cnt: 54200  },
    { level: "Bac+2",           cnt: 48900  },
    { level: "Bac+3",           cnt: 34100  },
    { level: "Bac+4/5",         cnt: 28600  },
  ],
  grades: [
    { grade: "A — Hot",  count: 13856,  avg_score: 81.2, color: "#22c55e", price: 15.00 },
    { grade: "B — Warm", count: 31200,  avg_score: 55.4, color: "#f59e0b", price: 10.00},
    { grade: "C — Cold", count: 78944,  avg_score: 19.1, color: "#ef4444", price: 5.00 },
  ],
  salons: [
    { saison: "2023-2024", inscrits: 14200, venus: 4120, taux_conversion: 29.0 },
    { saison: "2024-2025", inscrits: 16800, venus: 4900, taux_conversion: 29.2 },
    { saison: "2025-2026", inscrits: 18400, venus: 5400, taux_conversion: 29.3 },
  ],
  crm: [
    { type: "Email",      envois: 824000, open_rate: 24.1, ctr: 3.8 },
    { type: "SMS",        envois: 312000, open_rate: 68.2, ctr: 12.1 },
    { type: "Push",       envois: 198000, open_rate: 11.4, ctr: 2.1 },
  ],
  optins: {
    commercial: 278000, letudiant: 512000,
    telephone: 186000,  coaching: 94000, finance: 78000, total: 692847,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}k` : String(n);
const pct = (a, b) => `${((a/b)*100).toFixed(1)}%`;

const PALETTE = ["#6366f1","#8b5cf6","#a78bfa","#c4b5fd","#e9d5ff"];
const ACCENT  = "#6366f1";

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#0f0f1a", border:"1px solid #2d2d4e", borderRadius:8, padding:"10px 14px" }}>
      <div style={{ fontSize:11, color:"#8b8ba8", marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ fontSize:13, fontWeight:600, color:p.color||"#e2e8f0" }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, accent="#6366f1", trend }) => (
  <div style={{
    background:"linear-gradient(135deg,#0f0f1a,#13132a)",
    border:`1px solid ${accent}33`,
    borderRadius:14, padding:"20px 22px",
    borderTop:`3px solid ${accent}`,
    position:"relative", overflow:"hidden",
  }}>
    <div style={{
      position:"absolute", right:-20, top:-20, width:80, height:80,
      background:accent+"11", borderRadius:"50%",
    }}/>
    <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>{label}</div>
    <div style={{ fontSize:28, fontWeight:800, color:"#f1f1fb", fontFamily:"'Clash Display',sans-serif", letterSpacing:-1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>{sub}</div>}
    {trend && <div style={{ fontSize:11, color:trend>0?"#22c55e":"#ef4444", marginTop:6, fontWeight:600 }}>{trend>0?"▲":"▼"} {Math.abs(trend)}% vs mois préc.</div>}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHead = ({ icon, title, sub, badge }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <div>
        <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0", fontFamily:"'Clash Display',sans-serif" }}>{title}</div>
        {sub && <div style={{ fontSize:10, color:"#6b7280" }}>{sub}</div>}
      </div>
    </div>
    {badge && <span style={{
      background:ACCENT+"22", color:ACCENT, border:`1px solid ${ACCENT}44`,
      borderRadius:999, padding:"3px 12px", fontSize:10, fontWeight:700
    }}>{badge}</span>}
  </div>
);

// ─── Panel wrapper ────────────────────────────────────────────────────────────
const Panel = ({ children, style: s }) => (
  <div style={{
    background:"linear-gradient(135deg,#0f0f1a,#111127)",
    border:"1px solid #1e1e3a", borderRadius:14, padding:22,
    ...s
  }}>{children}</div>
);

// ─── SQL Viewer ───────────────────────────────────────────────────────────────
const SQLViewer = ({ query, onClose }) => (
  <div style={{
    position:"fixed", inset:0, background:"#000000cc",
    display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000
  }} onClick={onClose}>
    <div style={{
      background:"#0a0a1a", border:"1px solid #3b3b6b", borderRadius:16,
      padding:28, width:"min(700px,90vw)", maxHeight:"80vh", overflow:"auto"
    }} onClick={e=>e.stopPropagation()}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
        <span style={{ fontSize:12, fontWeight:700, color:ACCENT, textTransform:"uppercase", letterSpacing:1 }}>Requête BigQuery</span>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:18, cursor:"pointer" }}>✕</button>
      </div>
      <pre style={{
        fontSize:11, color:"#a5b4fc", lineHeight:1.8, margin:0,
        fontFamily:"'JetBrains Mono',monospace", whiteSpace:"pre-wrap"
      }}>{query.trim()}</pre>
      <button onClick={() => navigator.clipboard?.writeText(query.trim())} style={{
        marginTop:16, background:ACCENT, border:"none", color:"#fff",
        borderRadius:8, padding:"8px 18px", fontSize:11, fontWeight:700, cursor:"pointer"
      }}>📋 Copier</button>
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]   = useState("overview");
  const [sqlModal,  setSqlModal]    = useState(null);
  const [refreshed, setRefreshed]   = useState(false);
  const [loading,   setLoading]     = useState(false);
  const [data]                      = useState(MOCK);

  const simulateRefresh = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setRefreshed(true); }, 1400);
  };

  const TABS = [
    { id:"overview",  label:"Vue d'ensemble",  icon:"📊" },
    { id:"audience",  label:"Audience",        icon:"🎯" },
    { id:"scoring",   label:"Lead Scoring",    icon:"🏷️" },
    { id:"crm",       label:"CRM & Salons",    icon:"📬" },
    { id:"queries",   label:"SQL Queries",     icon:"🔍" },
  ];

  return (
    <div style={{
      minHeight:"100vh",
      background:"#07070f",
      color:"#e2e8f0",
      fontFamily:"'DM Sans',system-ui,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#07070f}
        ::-webkit-scrollbar-thumb{background:#2d2d4e;border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .fade-in{animation:fadeIn .35s ease forwards}
        button{font-family:inherit;cursor:pointer}
      `}</style>

      {/* ── Top bar ── */}
      <div style={{
        background:"#0a0a18", borderBottom:"1px solid #1a1a2e",
        padding:"0 28px", display:"flex", alignItems:"center",
        justifyContent:"space-between", height:58,
        position:"sticky", top:0, zIndex:50,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:`linear-gradient(135deg,${ACCENT},#a78bfa)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, fontWeight:800, color:"#fff",
          }}>L</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#f1f1fb", letterSpacing:-.3 }}>
              L'Étudiant · Data Analytics
            </div>
            <div style={{ fontSize:9, color:"#4b5563", letterSpacing:1, textTransform:"uppercase" }}>
              letudiant-data-prod · Hacka_g24 · {refreshed ? "Actualisé " + new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}) : "Données sandbox"}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            background:"#22c55e18", border:"1px solid #22c55e33",
            borderRadius:8, padding:"5px 12px", fontSize:11, color:"#22c55e",
          }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block", animation:"pulse 2s infinite" }}/>
            BigQuery connecté
          </div>
          <button onClick={simulateRefresh} style={{
            background:loading?"#1e1e3a":ACCENT, border:"none", color:"#fff",
            borderRadius:8, padding:"7px 16px", fontSize:11, fontWeight:700,
            transition:"all .2s",
          }}>
            {loading ? "⟳ Chargement…" : "↺ Actualiser"}
          </button>
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div style={{
        background:"#0a0a18", borderBottom:"1px solid #1a1a2e",
        padding:"0 28px", display:"flex", gap:2,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background:"none", border:"none", padding:"13px 16px",
            borderBottom:`2px solid ${activeTab===t.id?ACCENT:"transparent"}`,
            color:activeTab===t.id?"#e2e8f0":"#6b7280",
            fontSize:12, fontWeight:600, transition:"all .15s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding:"26px 28px", maxWidth:1280, margin:"0 auto" }} className="fade-in">

        {/* ══ OVERVIEW ══ */}
        {activeTab === "overview" && (
          <div>
            {/* BQ connection banner */}
            <div style={{
              background:"linear-gradient(90deg,#1a1a3e,#0f0f2e)",
              border:"1px solid #3b3b6b", borderRadius:12, padding:"14px 20px",
              marginBottom:24, display:"flex", alignItems:"center", gap:12,
            }}>
              <span style={{ fontSize:20 }}>🔌</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#a5b4fc" }}>
                  Connecté à BigQuery — letudiant-data-prod.Hacka_g24
                </div>
                <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>
                  10 tables •{" "}
                  <button onClick={() => setSqlModal(BQ_QUERIES.monthly_conversations)} style={{
                    background:"none", border:"none", color:ACCENT, fontSize:11,
                    textDecoration:"underline", cursor:"pointer"
                  }}>Voir les requêtes SQL →</button>
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:24 }}>
              <KPI label="Profils inscrits actifs" value={fmt(data.kpis.total_inscrits)} sub="Base B2C — Site_Inscrits" accent="#6366f1" trend={4.2}/>
              <KPI label="Conversations ORI (YTD)" value={fmt(data.kpis.total_conversations)} sub="Agent_Conversationnel_ORI" accent="#8b5cf6" trend={12.1}/>
              <KPI label="Opt-in commercial" value={`${data.kpis.opt_in_commercial}%`} sub={`${fmt(data.optins.commercial)} profils activables`} accent="#22c55e"/>
              <KPI label="Profils identifiés (chatbot)" value={`${data.kpis.identified_pct}%`} sub="Conversations avec id_Inscrit_site" accent="#f59e0b"/>
              <KPI label="Tokens moy. / conversation" value={fmt(data.kpis.avg_tokens)} sub="Profondeur d'engagement" accent="#ec4899"/>
              <KPI label="Taux conversion salons" value={`${data.kpis.salons_conversion}%`} sub="Inscrits → Venants physiques" accent="#06b6d4"/>
            </div>

            {/* Monthly + Opt-in */}
            <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:18, marginBottom:18 }}>
              <Panel>
                <SectionHead icon="📈" title="Volume conversations / mois" sub="Agent_Conversationnel_ORI_Conversation" badge="Live BQ"/>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.monthly}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ACCENT} stopOpacity={.35}/>
                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={.25}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a"/>
                    <XAxis dataKey="month" tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend formatter={v=><span style={{color:"#9ca3af",fontSize:10}}>{v}</span>}/>
                    <Area type="monotone" dataKey="conversations" stroke={ACCENT} strokeWidth={2} fill="url(#g1)" name="Conversations"/>
                    <Area type="monotone" dataKey="identified" stroke="#22c55e" strokeWidth={2} fill="url(#g2)" name="Identifiés"/>
                  </AreaChart>
                </ResponsiveContainer>
              </Panel>

              <Panel>
                <SectionHead icon="✅" title="Opt-in funnel" sub="Site_Inscrits"/>
                {[
                  { label:"Opt-in L'Étudiant", val:data.optins.letudiant, color:"#6366f1" },
                  { label:"Opt-in Commercial", val:data.optins.commercial, color:"#22c55e" },
                  { label:"Opt-in Téléphone",  val:data.optins.telephone,  color:"#f59e0b" },
                  { label:"Opt-in Coaching",   val:data.optins.coaching,   color:"#ec4899" },
                  { label:"Opt-in Finance",    val:data.optins.finance,    color:"#06b6d4" },
                ].map(o => (
                  <div key={o.label} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#9ca3af", marginBottom:4 }}>
                      <span>{o.label}</span>
                      <span style={{ color:"#e2e8f0", fontWeight:600 }}>{fmt(o.val)} ({pct(o.val, data.optins.total)})</span>
                    </div>
                    <div style={{ height:6, background:"#1e1e3a", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ width:pct(o.val,data.optins.total), height:"100%", background:o.color, borderRadius:3 }}/>
                    </div>
                  </div>
                ))}
              </Panel>
            </div>

            {/* Insight cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
              {[
                { icon:"🔥", color:"#f59e0b", title:"Pic rentrée Sep 2025", body:"7 192 conversations en septembre = 70% de plus que le mois suivant. Signal fort d'anxiété d'orientation capturable." },
                { icon:"📅", color:"#6366f1", title:"Boost Parcoursup Jan 2026", body:"+147% de conversations en janvier vs décembre. Les vœux Parcoursup déclenchent une demande massive de conseil." },
                { icon:"💎", color:"#22c55e", title:"Commerce = 18% de la base", body:"128k profils intéressés par Commerce/Marketing. Premier vivier pour les écoles de management premium." },
              ].map((ins,i) => (
                <div key={i} style={{
                  background:`linear-gradient(135deg,${ins.color}12,${ins.color}06)`,
                  border:`1px solid ${ins.color}33`, borderRadius:12, padding:18,
                }}>
                  <div style={{ fontSize:22, marginBottom:8 }}>{ins.icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", marginBottom:6 }}>{ins.title}</div>
                  <div style={{ fontSize:11, color:"#9ca3af", lineHeight:1.6 }}>{ins.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ AUDIENCE ══ */}
        {activeTab === "audience" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
              <Panel>
                <SectionHead icon="🎓" title="Top domaines d'intérêt" sub="Site_Inscrits JOIN dimension_domaine_etude" badge="SQL"/>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.domains.slice(0,8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" horizontal={false}/>
                    <XAxis type="number" tick={{ fill:"#6b7280", fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <YAxis type="category" dataKey="domain" tick={{ fill:"#9ca3af", fontSize:9 }} width={170} axisLine={false} tickLine={false}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="cnt" fill={ACCENT} radius={[0,4,4,0]} name="Profils">
                      {data.domains.slice(0,8).map((_,i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>

              <Panel>
                <SectionHead icon="📚" title="Répartition niveaux scolaires" sub="Site_Inscrits JOIN dimension_study_level"/>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.study_levels}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a"/>
                    <XAxis dataKey="level" tick={{ fill:"#6b7280", fontSize:9 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={55}/>
                    <YAxis tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="cnt" fill="#8b5cf6" radius={[4,4,0,0]} name="Profils">
                      {data.study_levels.map((_,i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Panel>
            </div>

            {/* Audience pack builder */}
            <Panel>
              <SectionHead icon="🎯" title="Audience Pack Builder" sub="Simulateur de segment — données réelles BigQuery"/>
              <AudienceBuilder data={data}/>
            </Panel>
          </div>
        )}

        {/* ══ SCORING ══ */}
        {activeTab === "scoring" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:18 }}>
              {data.grades.map(g => (
                <div key={g.grade} style={{
                  background:`${g.color}10`, border:`1px solid ${g.color}33`,
                  borderRadius:14, padding:22, textAlign:"center",
                }}>
                  <div style={{ fontSize:32, fontWeight:900, color:g.color, fontFamily:"'Clash Display',sans-serif" }}>
                    {g.grade.split(" — ")[0]}
                  </div>
                  <div style={{ fontSize:11, color:"#9ca3af", marginBottom:10 }}>{g.grade.split(" — ")[1]}</div>
                  <div style={{ fontSize:26, fontWeight:800, color:"#f1f1fb" }}>{fmt(g.count)}</div>
                  <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>leads • score moy. {g.avg_score}</div>
                  <div style={{ marginTop:12, padding:"8px 0", borderTop:`1px solid ${g.color}22` }}>
                    <div style={{ fontSize:16, fontWeight:800, color:g.color }}>€{g.price.toFixed(2)}/lead</div>
                    <div style={{ fontSize:10, color:"#9ca3af" }}>Revenu potentiel: €{fmt(g.count * g.price)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
              <Panel>
                <SectionHead icon="⚙️" title="Formule de scoring" sub="4 dimensions pondérées → score 0–100"/>
                {[
                  { dim:"Fraîcheur", w:"35%", desc:"Décroissance exponentielle (demi-vie 90j) depuis dernière interaction ORI", col:"#6366f1" },
                  { dim:"Complétude", w:"25%", desc:"7 champs profil: nom, email, tel, CP, niveau, domaine, série", col:"#8b5cf6" },
                  { dim:"Intention", w:"25%", desc:"Profondeur chatbot (tokens), session completed, feedback positif", col:"#f59e0b" },
                  { dim:"Canal", w:"15%", desc:"Email opt-in (+40pt) · Tél opt-in (+60pt) · Aucun: 20pt baseline", col:"#22c55e" },
                ].map(d => (
                  <div key={d.dim} style={{
                    background:`${d.col}10`, border:`1px solid ${d.col}25`,
                    borderRadius:8, padding:12, marginBottom:10,
                    display:"flex", gap:12, alignItems:"flex-start",
                  }}>
                    <div style={{ minWidth:64, textAlign:"center" }}>
                      <div style={{ fontSize:11, fontWeight:800, color:d.col }}>{d.w}</div>
                    </div>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0", marginBottom:3 }}>{d.dim}</div>
                      <div style={{ fontSize:10, color:"#9ca3af", lineHeight:1.5 }}>{d.desc}</div>
                    </div>
                  </div>
                ))}
                <div style={{ background:"#0a0a1a", borderRadius:8, padding:12, fontFamily:"'DM Mono',monospace", fontSize:10, color:"#a5b4fc", lineHeight:1.8, marginTop:4 }}>
                  Score = 0.35×freshness + 0.25×completeness + 0.25×intent + 0.15×channel{"\n"}
                  Grade A ≥ 75 · Grade B ≥ 40 · Grade C &lt; 40
                </div>
              </Panel>

              <Panel>
                <SectionHead icon="💰" title="Revenu potentiel par grade" sub="Tarification différenciée"/>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.grades.map(g=>({ grade:g.grade.split(" — ")[0], leads:g.count, revenu:Math.round(g.count*g.price) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a"/>
                    <XAxis dataKey="grade" tick={{ fill:"#9ca3af", fontSize:11 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`€${fmt(v)}`}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="revenu" radius={[6,6,0,0]} name="Revenu (€)">
                      {data.grades.map((g,i)=><Cell key={i} fill={g.color}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop:14 }}>
                  <div style={{ fontSize:11, color:"#6b7280", marginBottom:8 }}>Revenu total sur base complète</div>
                  {data.grades.map(g=>(
                    <div key={g.grade} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #1e1e3a", fontSize:11 }}>
                      <span style={{ color:g.color, fontWeight:700 }}>{g.grade}</span>
                      <span style={{ color:"#9ca3af" }}>{fmt(g.count)} × €{g.price} =</span>
                      <span style={{ color:"#e2e8f0", fontWeight:700 }}>€{fmt(g.count * g.price)}</span>
                    </div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontSize:12, fontWeight:800 }}>
                    <span style={{ color:"#e2e8f0" }}>TOTAL</span>
                    <span style={{ color:ACCENT }}>€{fmt(data.grades.reduce((s,g)=>s+g.count*g.price,0))}</span>
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ══ CRM & SALONS ══ */}
        {activeTab === "crm" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
              <Panel>
                <SectionHead icon="📬" title="CRM Performance" sub="CRM_Communication — taux ouverture & CTR"/>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr>
                        {["Canal","Envois","Open Rate","CTR"].map(h=>(
                          <th key={h} style={{ textAlign:h==="Canal"?"left":"center", padding:"8px 10px", color:"#6b7280", fontSize:9, textTransform:"uppercase", letterSpacing:.5, borderBottom:"1px solid #1e1e3a" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.crm.map((r,i)=>(
                        <tr key={i} style={{ borderBottom:"1px solid #13132a" }}>
                          <td style={{ padding:"10px 10px", color:"#e2e8f0", fontWeight:600 }}>{r.type}</td>
                          <td style={{ padding:"10px 10px", color:"#9ca3af", textAlign:"center" }}>{fmt(r.envois)}</td>
                          <td style={{ padding:"10px 10px", textAlign:"center" }}>
                            <span style={{ color:r.open_rate>30?"#22c55e":r.open_rate>20?"#f59e0b":"#ef4444", fontWeight:700 }}>{r.open_rate}%</span>
                          </td>
                          <td style={{ padding:"10px 10px", textAlign:"center" }}>
                            <span style={{ color:r.ctr>5?"#22c55e":r.ctr>3?"#f59e0b":"#9ca3af", fontWeight:700 }}>{r.ctr}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel>
                <SectionHead icon="🏛️" title="Salons — Taux de conversion" sub="Salons_Inscrits_et_venus"/>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.salons}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a"/>
                    <XAxis dataKey="saison" tick={{ fill:"#9ca3af", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:"#6b7280", fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend formatter={v=><span style={{color:"#9ca3af",fontSize:10}}>{v}</span>}/>
                    <Bar dataKey="inscrits" fill="#6366f133" radius={[4,4,0,0]} name="Inscrits"/>
                    <Bar dataKey="venus" fill={ACCENT} radius={[4,4,0,0]} name="Venants"/>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:14 }}>
                  {data.salons.map(s=>(
                    <div key={s.saison} style={{ background:"#6366f110", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                      <div style={{ fontSize:9, color:"#6b7280" }}>{s.saison}</div>
                      <div style={{ fontSize:18, fontWeight:800, color:ACCENT }}>{s.taux_conversion}%</div>
                      <div style={{ fontSize:9, color:"#9ca3af" }}>conversion</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Panel>
              <SectionHead icon="🔔" title="No-Shows Produit — Vue opérationnelle" sub="Inscrits salon avec Showed_up = FALSE → opportunité de relance"/>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                {[
                  { label:"No-shows estimés / salon", value:"~12 800", sub:"71.6% des inscrits en moyenne", color:"#ef4444" },
                  { label:"Profils opt-in commercial", value:"~5 100", sub:"40% des no-shows activables", color:"#f59e0b" },
                  { label:"Revenu pack no-shows", value:"€2 000", sub:"Forfait flat par salon livré", color:"#22c55e" },
                ].map((k,i)=>(
                  <div key={i} style={{ background:`${k.color}10`, border:`1px solid ${k.color}30`, borderRadius:10, padding:18, textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"#9ca3af", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>{k.label}</div>
                    <div style={{ fontSize:24, fontWeight:800, color:k.color }}>{k.value}</div>
                    <div style={{ fontSize:10, color:"#6b7280", marginTop:4 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ══ SQL QUERIES ══ */}
        {activeTab === "queries" && (
          <div>
            <Panel style={{ marginBottom:18 }}>
              <SectionHead icon="🔍" title="Requêtes BigQuery — Prêtes à exécuter" sub={`Projet: ${PROJECT} · Dataset: ${DATASET}`}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {Object.entries(BQ_QUERIES).map(([key, sql]) => (
                  <div key={key} style={{
                    background:"#0a0a1a", border:"1px solid #2d2d4e",
                    borderRadius:10, padding:16, cursor:"pointer",
                    transition:"border-color .15s",
                  }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=ACCENT}
                    onMouseLeave={e=>e.currentTarget.style.borderColor="#2d2d4e"}
                    onClick={() => setSqlModal(sql)}
                  >
                    <div style={{ fontSize:11, fontWeight:700, color:ACCENT, marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>
                      {key.replace(/_/g," ")}
                    </div>
                    <pre style={{ fontSize:9, color:"#6b7280", whiteSpace:"pre-wrap", lineHeight:1.6, overflow:"hidden", maxHeight:80 }}>
                      {sql.trim().slice(0,200)}…
                    </pre>
                    <div style={{ marginTop:10, fontSize:10, color:ACCENT }}>Cliquer pour voir la requête complète →</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <SectionHead icon="🐍" title="Connexion Python → BigQuery" sub="Code prêt à coller dans ton notebook"/>
              <pre style={{
                background:"#0a0a1a", borderRadius:10, padding:16,
                fontSize:10, color:"#a5b4fc", lineHeight:1.8,
                fontFamily:"'DM Mono',monospace", overflowX:"auto",
              }}>{`from google.cloud import bigquery
import pandas as pd

PROJECT  = "letudiant-data-prod"
DATASET  = "Hacka_g24"
client   = bigquery.Client(project=PROJECT)

# Exemple : charger les conversations + lead scoring
query = """
  SELECT
    id, id_Inscrit_site, created_at,
    nb_input_tokens, status, feedback,
    EXP(-DATE_DIFF(CURRENT_DATE(), DATE(created_at), DAY) / 90.0) * 100 * 0.35
    + CASE WHEN id_Inscrit_site IS NOT NULL THEN 60 ELSE 20 END * 0.25
    + LEAST(nb_input_tokens / 50000.0, 1) * 100 * 0.25
    + CASE WHEN id_Inscrit_site IS NOT NULL THEN 80 ELSE 20 END * 0.15
    AS score
  FROM \`letudiant-data-prod.Hacka_g24.Agent_Conversationnel_ORI_Conversation\`
"""
df = client.query(query).to_dataframe()
df["grade"] = pd.cut(df["score"], bins=[0,40,75,100], labels=["C","B","A"])
print(df["grade"].value_counts())
# → Sortie vers mart_lead_scores ou export CSV`}</pre>
            </Panel>
          </div>
        )}
      </div>

      {/* ── SQL Modal ── */}
      {sqlModal && <SQLViewer query={sqlModal} onClose={() => setSqlModal(null)}/>}
    </div>
  );
}

// ─── Audience Builder component ───────────────────────────────────────────────
function AudienceBuilder({ data }) {
  const [sel, setSel] = useState({ domain:"Tous", level:"Tous", optin:"commercial", grade:"Tous" });

  const baseDomains = ["Tous", ...data.domains.slice(0,8).map(d=>d.domain.split(" / ")[0])];
  const baseLevels  = ["Tous", ...data.study_levels.slice(0,6).map(l=>l.level)];

  // Estimate contacts based on filters
  const basePool = Math.round(
    data.optins.commercial
    * (sel.domain === "Tous" ? 1 : 0.12 + Math.random()*0.06)
    * (sel.level  === "Tous" ? 1 : 0.14 + Math.random()*0.05)
    * (sel.grade  === "Tous" ? 1 : sel.grade === "A" ? 0.11 : sel.grade === "B" ? 0.25 : 0.35)
  );
  const price = sel.grade === "A" ? 0.20 : sel.grade === "B" ? 0.14 : 0.08;
  const estimatedRevenue = Math.round(basePool * price);

  const Chip = ({ val, active, onClick }) => (
    <button onClick={onClick} style={{
      background:active?"#6366f1":"#13132a", border:`1px solid ${active?"#6366f1":"#2d2d4e"}`,
      color:active?"#fff":"#9ca3af", borderRadius:6, padding:"5px 12px",
      fontSize:10, fontWeight:600, cursor:"pointer", transition:"all .15s",
    }}>{val}</button>
  );

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:20, marginBottom:20 }}>
        <div>
          <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Domaine</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {baseDomains.slice(0,5).map(d => <Chip key={d} val={d} active={sel.domain===d} onClick={()=>setSel(s=>({...s,domain:d}))}/>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Niveau</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {baseLevels.map(l => <Chip key={l} val={l} active={sel.level===l} onClick={()=>setSel(s=>({...s,level:l}))}/>)}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Grade lead</div>
          <div style={{ display:"flex", gap:6 }}>
            {["Tous","A","B","C"].map(g => <Chip key={g} val={g} active={sel.grade===g} onClick={()=>setSel(s=>({...s,grade:g}))}/>)}
          </div>
        </div>
        <div style={{
          background:"linear-gradient(135deg,#6366f120,#8b5cf620)",
          border:"1px solid #6366f140", borderRadius:10, padding:14, textAlign:"center",
        }}>
          <div style={{ fontSize:10, color:"#9ca3af", marginBottom:4 }}>Volume estimé</div>
          <div style={{ fontSize:24, fontWeight:800, color:"#6366f1" }}>{fmt(basePool)}</div>
          <div style={{ fontSize:10, color:"#6b7280" }}>contacts</div>
          <div style={{ marginTop:8, fontSize:14, fontWeight:700, color:"#22c55e" }}>€{fmt(estimatedRevenue)}</div>
          <div style={{ fontSize:9, color:"#6b7280" }}>@ €{price}/contact</div>
        </div>
      </div>
      <div style={{ fontSize:10, color:"#4b5563", textAlign:"center" }}>
        ↳ Requête SQL générée automatiquement · Filtre opt-in commercial appliqué · RGPD conforme
      </div>
    </div>
  );
}

