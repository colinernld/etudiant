import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ============================================================================
// COMPOSANT : AUDIENCE TAB (Simulateur & Graphiques segmentés)
// ============================================================================
// Couleurs calquées sur le screenshot pour le dégradé des BarCharts
const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

const AudienceTab = () => {
  const [topDomaines, setTopDomaines] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [filters, setFilters] = useState({ domaine: 'Tous', niveau: 'Tous', grade: 'Tous' });
  const [audienceVolume, setAudienceVolume] = useState(0); 

  // Fetch des graphiques statiques de la vue Audience
  useEffect(() => {
    const fetchAudienceData = async () => {
      try {
        const [resDomaines, resNiveaux] = await Promise.all([
          fetch('http://localhost:3001/api/data/topDomaines').catch(() => null),
          fetch('http://localhost:3001/api/data/repartitionNiveaux').catch(() => null)
        ]);

        if (resDomaines && resDomaines.ok) setTopDomaines(await resDomaines.json());
        if (resNiveaux && resNiveaux.ok) setNiveaux(await resNiveaux.json());
      } catch (error) {
        console.error("Erreur de récupération graphiques Audience:", error);
      }
    };
    fetchAudienceData();
  }, []);

  // Fetch dynamique du simulateur à chaque changement de filtre
  useEffect(() => {
    const fetchVolume = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/data/buildAudience?domaine=${filters.domaine}&niveau=${filters.niveau}`);
        if (res.ok) {
          const data = await res.json();
          // On s'attend à recevoir [{ volume: X }] de BigQuery
          if (data && data[0] && data[0].volume !== undefined) {
            setAudienceVolume(data[0].volume);
          }
        }
      } catch (error) {
        console.error("Erreur simulateur BQ:", error);
      }
    };
    fetchVolume();
  }, [filters]);

  const FilterButton = ({ category, value }) => {
    const isActive = filters[category] === value;
    return (
      <button
        onClick={() => setFilters({ ...filters, [category]: value })}
        className={`px-4 py-2 rounded-lg text-xs transition-colors duration-200 border ${
          isActive 
            ? 'bg-indigo-500 border-indigo-500 text-white' 
            : 'bg-[#151828] border-slate-700 text-slate-300 hover:bg-slate-800'
        }`}
      >
        {value}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-6 text-slate-200 w-full animate-in fade-in duration-500">
      {/* GRAPHIQUES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graphique de gauche : Domaines d'intérêt */}
        <div className="bg-[#11111a] border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">🎓 Top domaines d'intérêt</h2>
              <p className="text-xs text-slate-400 mt-1">Site_Inscrits JOIN dimension_domaine_etude</p>
            </div>
            <span className="px-3 py-1 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20 uppercase">SQL</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDomaines.length ? topDomaines : [{name: 'Chargement...', value: 0}]} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#374151" width={100} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {(topDomaines.length ? topDomaines : [{name: '', value: 0}]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique de droite : Niveaux scolaires */}
        <div className="bg-[#11111a] border border-slate-800 rounded-2xl p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">📚 Répartition niveaux scolaires</h2>
            <p className="text-xs text-slate-400 mt-1">Site_Inscrits JOIN dimension_study_level</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={niveaux.length ? niveaux : [{name: 'Chargement...', value: 0}]} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#1e293b" angle={-30} textAnchor="end" tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} stroke="#1e293b" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000)}k`} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {(niveaux.length ? niveaux : [{name: '', value: 0}]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SIMULATEUR D'AUDIENCE */}
      <div className="bg-[#11111a] border border-slate-800 rounded-2xl p-8 shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🎯</span>
          <div>
            <h2 className="text-xl font-bold text-white">Audience Pack Builder</h2>
            <p className="text-xs text-slate-400 mt-1">Simulateur de segment — données réelles BigQuery</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between gap-12">
          {/* Colonne des Filtres */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-4 uppercase">Domaine</p>
              <div className="flex flex-wrap gap-2">
                {['Tous', 'Commerce', 'International', 'Communication', 'Arts'].map(v => <FilterButton key={v} category="domaine" value={v} />)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-4 uppercase">Niveau</p>
              <div className="flex flex-wrap gap-2">
                {['Tous', 'Terminale', 'Première', '2nde Générale', '3ème', '4ème', 'Bac+1'].map(v => <FilterButton key={v} category="niveau" value={v} />)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-slate-500 mb-4 uppercase">Grade Lead</p>
              <div className="flex flex-wrap gap-2">
                {['Tous', 'A', 'B', 'C'].map(v => <FilterButton key={v} category="grade" value={v} />)}
              </div>
            </div>
          </div>

          {/* Panneau de Résultat (Volume & Prix) */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-8 flex flex-col items-center justify-center min-w-[250px] md:w-80 shadow-inner">
            <p className="text-xs text-slate-400 mb-2">Volume estimé</p>
            <h3 className="text-4xl font-bold text-indigo-400 mb-1">
              {audienceVolume > 0 ? (audienceVolume >= 1000 ? `${(audienceVolume / 1000).toFixed(0)}k` : audienceVolume) : '...'}
            </h3>
            <p className="text-[10px] text-slate-500 mb-6">contacts</p>
            <p className="text-2xl font-bold text-emerald-400">
              €{((audienceVolume * 0.08) / 1000).toFixed(0)}k
            </p>
            <p className="text-[10px] text-slate-500 mt-1">@ €0.08/contact</p>
          </div>
        </div>

        <div className="w-full mt-8 pt-4 text-center text-[10px] text-slate-600 italic">
          ↳ Requête SQL générée automatiquement · Filtre opt-in commercial appliqué · RGPD conforme
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// COMPOSANT PRINCIPAL : APP
// ============================================================================
function App() {
  const [activeTab, setActiveTab] = useState("Audience"); // Changé pour montrer ton nouvel onglet par défaut 😉
  const [data, setData] = useState({
    monthlyConversations: null,
    domainDistribution: null,
    studyLevelDist: null,
    leadScoring: null,
    salonConversion: null,
    crmEngagement: null,
    optinFunnel: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [monthlyRes, domainRes, studyRes, scoringRes, salonRes, crmRes, optinRes] = await Promise.all([
        fetch('http://localhost:3001/api/data/monthly_conversations'),
        fetch('http://localhost:3001/api/data/domain_distribution'),
        fetch('http://localhost:3001/api/data/study_level_dist'),
        fetch('http://localhost:3001/api/data/lead_scoring'),
        fetch('http://localhost:3001/api/data/salon_conversion'),
        fetch('http://localhost:3001/api/data/crm_engagement'),
        fetch('http://localhost:3001/api/data/optin_funnel')
      ]);

      if (!monthlyRes.ok) throw new Error("Erreur serveur BQ");

      setData({
        monthlyConversations: await monthlyRes.json(),
        domainDistribution: await domainRes.json(),
        studyLevelDist: await studyRes.json(),
        leadScoring: await scoringRes.json(),
        salonConversion: await salonRes.json(),
        crmEngagement: await crmRes.json(),
        optinFunnel: await optinRes.json()
      });
    } catch (err) {
      console.error(err);
      setError("Impossible de charger les données. Le serveur Node tourne-t-il ?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= CALCULS KPI =================
  const inscritsActifsTotal = data.optinFunnel?.[0]?.total || 0;
  const inscritsK = inscritsActifsTotal ? (inscritsActifsTotal / 1000).toFixed(0) + 'k' : '...';
  const totalConv = data.monthlyConversations?.reduce((acc, curr) => acc + Number(curr.conversations), 0) || 0;
  const convK = totalConv ? (totalConv / 1000).toFixed(0) + 'k' : '...';
  const optinCommYes = data.optinFunnel?.[0]?.commercial || 0;
  const optinCommRate = inscritsActifsTotal ? ((optinCommYes / inscritsActifsTotal) * 100).toFixed(1) : '...';
  const totalId = data.monthlyConversations?.reduce((acc, curr) => acc + Number(curr.identified), 0) || 0;
  const pctIdentified = totalConv ? ((totalId / totalConv) * 100).toFixed(1) : '...';
  const avgTokensRaw = data.monthlyConversations?.reduce((acc, curr) => acc + Number(curr.avg_tokens), 0) / (data.monthlyConversations?.length || 1);
  const avgTokensK = avgTokensRaw ? (avgTokensRaw / 1000).toFixed(0) + 'k' : '...';
  const salonConvRate = data.salonConversion?.[0]?.taux_conversion || '...';

  // ================= RENDU DES ONGLETS =================
  const renderTabContent = () => {
    if (isLoading && activeTab === "Vue d'ensemble") {
        return <div className="text-center py-20 text-slate-500 animate-pulse">Calcul des données BigQuery en cours...</div>;
    }

    switch (activeTab) {
      case "Vue d'ensemble":
        return (
          <div className="animate-in fade-in duration-500">
            {/* GRILLE KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Profils Inscrits Actifs</h3>
                <p className="text-4xl font-bold mb-1">{inscritsK}</p>
                <p className="text-sm text-slate-500">Base B2C — Site_Inscrits</p>
              </div>
              <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-600"></div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Conversations ORI (YTD)</h3>
                <p className="text-4xl font-bold mb-1">{convK}</p>
                <p className="text-sm text-slate-500">Agent_Conversationnel_ORI</p>
              </div>
              <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Profils Identifiés (Chatbot)</h3>
                <p className="text-4xl font-bold mb-1">{pctIdentified}%</p>
                <p className="text-sm text-slate-500">Conversations avec id_Inscrit_site</p>
              </div>
              <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-teal-500"></div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Opt-in Commercial</h3>
                <p className="text-4xl font-bold mb-1">{optinCommRate}%</p>
                <p className="text-sm text-slate-500">{(optinCommYes/1000).toFixed(0)}k profils activables</p>
              </div>
              <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500"></div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Tokens Moy. / Conversation</h3>
                <p className="text-4xl font-bold mb-1">{avgTokensK}</p>
                <p className="text-sm text-slate-500">Profondeur d'engagement</p>
              </div>
              <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Taux Conversion Salons</h3>
                <p className="text-4xl font-bold mb-1">{salonConvRate}%</p>
                <p className="text-sm text-slate-500">Inscrits → Venants physiques</p>
              </div>
            </div>

            {/* GRAPHIQUES & FUNNEL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="col-span-2 bg-[#11111a] border border-slate-800 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold">Volume conversations / mois</h2>
                    <p className="text-xs text-slate-500">Agent_Conversationnel_ORI_Conversation</p>
                  </div>
                  <span className="bg-indigo-500/10 text-indigo-400 text-xs px-3 py-1 rounded-full border border-indigo-500/20">Live BQ</span>
                </div>
                
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlyConversations} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="conversations" name="Total" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="identified" name="Identifiés" stroke="#10b981" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* OPT-IN FUNNEL */}
              <div className="col-span-1 bg-[#11111a] border border-slate-800 rounded-xl p-6">
                 <div className="flex items-center gap-2 mb-1">
                   <span className="bg-emerald-500 text-white rounded text-[10px] px-1 font-bold">✓</span>
                   <h2 className="text-lg font-bold">Opt-in funnel</h2>
                 </div>
                 <p className="text-xs text-slate-500 mb-6">Site_Inscrits</p>
                 
                 <div className="space-y-5">
                   {isLoading || !data.optinFunnel || !data.optinFunnel[0] ? (
                     <p className="text-sm text-slate-500 animate-pulse">Calcul en cours...</p>
                   ) : (
                     <>
                       <div>
                         <div className="flex justify-between text-xs mb-1 text-slate-300">
                           <span>L'Étudiant</span>
                           <span>{data.optinFunnel[0].letudiant} ({((data.optinFunnel[0].letudiant / data.optinFunnel[0].total) * 100).toFixed(1)}%)</span>
                         </div>
                         <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                           <div className="bg-indigo-500 h-full rounded-full" style={{width: `${(data.optinFunnel[0].letudiant / data.optinFunnel[0].total) * 100}%`}}></div>
                         </div>
                       </div>
                       <div>
                         <div className="flex justify-between text-xs mb-1 text-slate-300">
                           <span>Commercial</span>
                           <span>{data.optinFunnel[0].commercial} ({((data.optinFunnel[0].commercial / data.optinFunnel[0].total) * 100).toFixed(1)}%)</span>
                         </div>
                         <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                           <div className="bg-emerald-500 h-full rounded-full" style={{width: `${(data.optinFunnel[0].commercial / data.optinFunnel[0].total) * 100}%`}}></div>
                         </div>
                       </div>
                       <div>
                         <div className="flex justify-between text-xs mb-1 text-slate-300">
                           <span>Téléphone</span>
                           <span>{data.optinFunnel[0].telephone} ({((data.optinFunnel[0].telephone / data.optinFunnel[0].total) * 100).toFixed(1)}%)</span>
                         </div>
                         <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                           <div className="bg-orange-500 h-full rounded-full" style={{width: `${(data.optinFunnel[0].telephone / data.optinFunnel[0].total) * 100}%`}}></div>
                         </div>
                       </div>
                     </>
                   )}
                 </div>
              </div>
            </div>

            {/* INSIGHT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#11111a] border border-slate-800/50 rounded-xl p-6 text-center hover:border-slate-700 transition-colors">
                <div className="text-2xl mb-3">🔥</div>
                <h3 className="font-bold mb-2">Pic rentrée Sep 2025</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  7 192 conversations en septembre = +70% vs mois suivant. Signal d'anxiété capturable.
                </p>
              </div>

              <div className="bg-[#11111a] border border-slate-800/50 rounded-xl p-6 text-center hover:border-slate-700 transition-colors">
                <div className="text-2xl mb-3">📅</div>
                <h3 className="font-bold mb-2">Boost Parcoursup Jan 2026</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  +147% de conv. en janvier vs décembre. Les vœux déclenchent une demande massive.
                </p>
              </div>

              <div className="bg-[#11111a] border border-slate-800/50 rounded-xl p-6 text-center hover:border-slate-700 transition-colors">
                <div className="text-2xl mb-3">💎</div>
                <h3 className="font-bold mb-2">
                  {isLoading || !data.domainDistribution ? '...' : `${data.domainDistribution[0]?.domaine_etude} en tête`}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isLoading || !data.domainDistribution ? '...' : `${(data.domainDistribution[0]?.cnt / 1000).toFixed(0)}k profils intéressés. Premier vivier pour les écoles.`}
                </p>
              </div>
            </div>
          </div>
        );
      
      case 'Audience':
        return <AudienceTab />;

      case 'Lead Scoring':
        return (
          <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-bold mb-2">Algorithme de Lead Scoring (Basé sur l'ORI)</h2>
            <p className="text-sm text-slate-400 mb-8">Classification des prospects selon l'engagement conversationnel et le profil identifié.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {data.leadScoring?.map((tier, i) => (
                <div key={i} className="bg-[#1e1e2d] p-6 rounded-lg border border-slate-700/50 text-center">
                  <div className={`text-2xl font-bold mb-2 ${i === 0 ? 'text-rose-400' : i === 1 ? 'text-amber-400' : 'text-blue-400'}`}>
                    {tier.grade}
                  </div>
                  <div className="text-4xl font-black mb-2">{tier.count} <span className="text-sm font-normal text-slate-500">leads</span></div>
                  <div className="text-sm text-slate-400">Score moyen : {tier.avg_score}/100</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'CRM & Salons':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
            <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-6">Performances Campagnes CRM</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Type de message</th>
                      <th className="px-4 py-3">Envois</th>
                      <th className="px-4 py-3">Taux d'ouv.</th>
                      <th className="px-4 py-3 rounded-tr-lg">Taux de clic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crmEngagement?.map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-300">{row.MESSAGE_TYPE}</td>
                        <td className="px-4 py-3">{row.envois}</td>
                        <td className="px-4 py-3 text-emerald-400">{row.open_rate}%</td>
                        <td className="px-4 py-3 text-blue-400">{row.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-6">Conversion Venants Salons (Par saison)</h2>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.salonConversion} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="saison" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="inscrits" name="Inscrits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="venus" name="Venus" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </div>
        );

      case 'SQL QUERIES':
        return (
          <div className="bg-[#11111a] border border-slate-800 rounded-xl p-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-bold mb-4">Aperçu des données brutes (JSON via BigQuery)</h2>
            <p className="text-sm text-slate-400 mb-4">Preuve d'intégration "Live" avec l'API Google Cloud.</p>
            <div className="bg-[#0f111a] border border-slate-800 p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono text-emerald-400">
              <pre>{JSON.stringify({ 
                monthly_conversations: data.monthlyConversations?.[0], 
                lead_scoring: data.leadScoring?.[0],
                optin_funnel: data.optinFunnel?.[0]
              }, null, 2)}</pre>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#0f111a] min-h-screen text-white font-sans p-6">
      
      {/* HEADER COMPLET */}
      <header className="mb-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              L'Étudiant · Data Analytics
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">letudiant-data-prod · Hacka_g24 · Données Sandbox</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-full text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              BigQuery connecté
            </div>
            <button onClick={fetchData} disabled={isLoading} className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-2">
              {isLoading ? 'Calcul...' : '↻ Actualiser'}
            </button>
          </div>
        </div>

        {/* NAVIGATION ONGLETS */}
        <nav className="flex gap-2 border-b border-slate-800 pb-px">
          {["Vue d'ensemble", 'Audience', 'Lead Scoring', 'CRM & Salons', 'SQL QUERIES'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === tab 
                  ? 'border-indigo-500 text-white' 
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {tab === "Vue d'ensemble" && "📊 "}
              {tab === "Audience" && "🎯 "}
              {tab === "Lead Scoring" && "🏷️ "}
              {tab === "CRM & Salons" && "📬 "}
              {tab === "SQL QUERIES" && "🔍 "}
              {tab}
            </button>
          ))}
        </nav>
      </header>

      {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-lg mb-6 text-sm">{error}</div>}

      <main>
        {renderTabContent()}
      </main>

    </div>
  );
}

export default App;