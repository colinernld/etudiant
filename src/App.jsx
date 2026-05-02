//import React, { useState, useEffect } from 'react';
//import './App.css'; // Assure-toi que Tailwind est bien configuré ici
//import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('Audience');
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
      // On va chercher TOUTES tes requêtes SQL définies dans queries.js
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

  // ================= CALCULS 100% DYNAMIQUES DES KPI =================
  // 1. Profils Inscrits (Total issu du optin_funnel)
  const inscritsActifsTotal = data.optinFunnel?.[0]?.total || 0;
  const inscritsK = inscritsActifsTotal ? (inscritsActifsTotal / 1000).toFixed(0) + 'k' : '...';

  // 2. Conversations ORI (Somme de tous les mois)
  const totalConv = data.monthlyConversations?.reduce((acc, curr) => acc + Number(curr.conversations), 0) || 0;
  const convK = totalConv ? (totalConv / 1000).toFixed(0) + 'k' : '...';

  // 3. Opt-in Commercial
  const optinCommYes = data.optinFunnel?.[0]?.commercial || 0;
  const optinCommRate = inscritsActifsTotal ? ((optinCommYes / inscritsActifsTotal) * 100).toFixed(1) : '...';

  // 4. Profils Identifiés (Chatbot)
  const totalId = data.monthlyConversations?.reduce((acc, curr) => acc + Number(curr.identified), 0) || 0;
  const pctIdentified = totalConv ? ((totalId / totalConv) * 100).toFixed(1) : '...';

  // 5. Tokens Moyens
  const avgTokensRaw = data.monthlyConversations?.reduce((acc, curr) => acc + Number(curr.avg_tokens), 0) / (data.monthlyConversations?.length || 1);
  const avgTokensK = avgTokensRaw ? (avgTokensRaw / 1000).toFixed(0) + 'k' : '...';

  // 6. Conversion Salons
  const salonConvRate = data.salonConversion?.[0]?.taux_conversion || '...';


  // ================= RENDU DES ONGLETS =================
  const renderTabContent = () => {
    if (isLoading) return <div className="text-center py-20 text-gray-500 animate-pulse">Calcul des données BigQuery en cours...</div>;

    switch (activeTab) {
      case 'Audience':
        return (
          <>
            {/* GRILLE KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Profils Inscrits Actifs</h3>
                <p className="text-4xl font-bold mb-1">{inscritsK}</p>
                <p className="text-sm text-gray-500">Base B2C — Site_Inscrits</p>
              </div>
              <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-600"></div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Conversations ORI (YTD)</h3>
                <p className="text-4xl font-bold mb-1">{convK}</p>
                <p className="text-sm text-gray-500">Agent_Conversationnel_ORI</p>
              </div>
              <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Profils Identifiés (Chatbot)</h3>
                <p className="text-4xl font-bold mb-1">{pctIdentified}%</p>
                <p className="text-sm text-gray-500">Conversations avec id_Inscrit_site</p>
              </div>
              <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-teal-500"></div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Opt-in Commercial</h3>
                <p className="text-4xl font-bold mb-1">{optinCommRate}%</p>
                <p className="text-sm text-gray-500">{(optinCommYes/1000).toFixed(0)}k profils activables</p>
              </div>
              <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500"></div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Tokens Moy. / Conversation</h3>
                <p className="text-4xl font-bold mb-1">{avgTokensK}</p>
                <p className="text-sm text-gray-500">Profondeur d'engagement</p>
              </div>
              <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Taux Conversion Salons</h3>
                <p className="text-4xl font-bold mb-1">{salonConvRate}%</p>
                <p className="text-sm text-gray-500">Inscrits → Venants physiques</p>
              </div>
            </div>

            {/* GRAPHIQUES AUDIENCE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="col-span-2 bg-[#151828] border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-6">Volume conversations / mois</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthlyConversations} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="month" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} />
                      <Line type="monotone" dataKey="conversations" name="Total" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="identified" name="Identifiés" stroke="#10b981" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="col-span-1 bg-[#151828] border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-bold mb-6">Répartition par domaine</h2>
                <div className="space-y-3">
                  {data.domainDistribution?.slice(0, 6).map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1 text-gray-300">
                        <span className="truncate w-40">{item.domaine_etude}</span>
                        <span>{item.cnt}</span>
                      </div>
                      <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{width: `${(item.cnt / data.domainDistribution[0].cnt) * 100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );

      case 'Lead Scoring':
        return (
          <div className="bg-[#151828] border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-2">Algorithme de Lead Scoring (Basé sur l'ORI)</h2>
            <p className="text-sm text-gray-400 mb-8">Classification des prospects selon l'engagement conversationnel et le profil identifié.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {data.leadScoring?.map((tier, i) => (
                <div key={i} className="bg-[#11131d] p-6 rounded-lg border border-gray-700/50 text-center">
                  <div className={`text-2xl font-bold mb-2 ${i === 0 ? 'text-red-400' : i === 1 ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {tier.grade}
                  </div>
                  <div className="text-4xl font-black mb-2">{tier.count} <span className="text-sm font-normal text-gray-500">leads</span></div>
                  <div className="text-sm text-gray-400">Score moyen : {tier.avg_score}/100</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'CRM & Salons':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#151828] border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-6">Performances Campagnes CRM</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Type de message</th>
                      <th className="px-4 py-3">Envois</th>
                      <th className="px-4 py-3">Taux d'ouv.</th>
                      <th className="px-4 py-3 rounded-tr-lg">Taux de clic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.crmEngagement?.map((row, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="px-4 py-3 font-medium text-gray-300">{row.MESSAGE_TYPE}</td>
                        <td className="px-4 py-3">{row.envois}</td>
                        <td className="px-4 py-3 text-green-400">{row.open_rate}%</td>
                        <td className="px-4 py-3 text-blue-400">{row.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-[#151828] border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-6">Conversion Venants Salons (Par saison)</h2>
              <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.salonConversion} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                      <XAxis dataKey="saison" stroke="#4b5563" fontSize={12} />
                      <YAxis stroke="#4b5563" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
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
          <div className="bg-[#151828] border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Aperçu des données brutes (JSON via BigQuery)</h2>
            <p className="text-sm text-gray-400 mb-4">Preuve d'intégration "Live" avec l'API Google Cloud.</p>
            <div className="bg-[#0a0c10] p-4 rounded-lg overflow-auto max-h-96 text-xs font-mono text-green-400">
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
        <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              L'Étudiant · Data Analytics
            </h1>
            <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">letudiant-data-prod · Hacka_g24 · Live BQ</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-[#1a1d2d] px-4 py-2 rounded-md text-sm text-green-400 border border-green-900/30">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Connecté
            </div>
            <button onClick={fetchData} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              {isLoading ? 'Calcul...' : '↻ Actualiser Base'}
            </button>
          </div>
        </div>

        {/* NAVIGATION ONGLETS */}
        <nav className="flex gap-2 border-b border-gray-800 pb-px">
          {['Audience', 'Lead Scoring', 'CRM & Salons', 'SQL QUERIES'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-900/10' 
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-md mb-6">{error}</div>}

      {/* CONTENU DYNAMIQUE DE L'ONGLET */}
      <main>
        {renderTabContent()}
      </main>

    </div>
  );
}

export default App;