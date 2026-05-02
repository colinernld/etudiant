import React, { useState, useEffect } from 'react';
import './App.css'; // Assure-toi que Tailwind est bien configuré ici
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  // 1. Initialisation des états pour stocker les résultats de BigQuery
  const [data, setData] = useState({
    monthlyConversations: null,
    domainDistribution: null,
    leadScoring: null,
    salonConversion: null,
    optinFunnel: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Fonction d'appel à ton serveur Node.js (qui lui-même appelle BigQuery)
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Exécution des requêtes en parallèle pour que le dashboard charge vite
      const [monthlyRes, domainRes, scoringRes, salonRes, optinRes] = await Promise.all([
        fetch('http://localhost:3001/api/data/monthly_conversations'),
        fetch('http://localhost:3001/api/data/domain_distribution'),
        fetch('http://localhost:3001/api/data/lead_scoring'),
        fetch('http://localhost:3001/api/data/salon_conversion'),
        fetch('http://localhost:3001/api/data/optin_funnel')
      ]);

      if (!monthlyRes.ok) throw new Error("Erreur de connexion au serveur API Local");

      const monthlyConversations = await monthlyRes.json();
      const domainDistribution = await domainRes.json();
      const leadScoring = await scoringRes.json();
      const salonConversion = await salonRes.json();
      const optinFunnel = await optinRes.json();

      setData({
        monthlyConversations,
        domainDistribution,
        leadScoring,
        salonConversion,
        optinFunnel
      });
    } catch (err) {
      console.error("Erreur Fetch:", err);
      setError("Impossible de charger les données BQ. Le serveur Node (port 3001) est-il lancé ?");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Charger les données une première fois au démarrage
  useEffect(() => {
    fetchData();
  }, []);

  // 4. Extraction sécurisée des données pour l'affichage dans les cartes
  const salonConvRate = data.salonConversion?.[0]?.taux_conversion || '--';
  
  // Calculs pour la carte Opt-in Commercial (basés sur ta requête optin_funnel)
  const optinCommTotal = data.optinFunnel?.[0]?.total || 0;
  const optinCommYes = data.optinFunnel?.[0]?.commercial || 0;
  const optinCommRate = optinCommTotal ? ((optinCommYes / optinCommTotal) * 100).toFixed(1) : '--';
  const optinCommK = optinCommYes ? (optinCommYes / 1000).toFixed(0) : '--';

  return (
    <div className="bg-[#0f111a] min-h-screen text-white p-6 font-sans">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-xl font-bold">L'Étudiant · Data Analytics</h1>
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            letudiant-data-prod · Hacka_g24 · Données Sandbox
          </p>
        </div>
        
        {/* BOUTONS D'ACTION (Status BQ + Actualiser) */}
        <div className="flex gap-4">
          <div className="flex items-center gap-2 bg-[#1a1d2d] px-4 py-2 rounded-md text-sm text-green-400 border border-green-900/30">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            BigQuery connecté
          </div>
          
          <button 
            onClick={fetchData} 
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Chargement...' : '↻ Actualiser'}
          </button>
        </div>
      </header>

      {/* MESSAGE D'ERREUR */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* GRILLE DES KPI (6 cartes reproduisant ta maquette) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        
        {/* KPI 1 - Statique d'après ta maquette */}
        <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Profils Inscrits Actifs</h3>
          <p className="text-4xl font-bold mb-1">693k</p>
          <p className="text-sm text-gray-500 mb-4">Base B2C — Site_Inscrits</p>
          <p className="text-xs text-green-400">▲ 4.2% vs mois préc.</p>
        </div>

        {/* KPI 2 - Statique d'après ta maquette */}
        <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-600"></div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Conversations ORI (YTD)</h3>
          <p className="text-4xl font-bold mb-1">124k</p>
          <p className="text-sm text-gray-500 mb-4">Agent_Conversationnel_ORI</p>
          <p className="text-xs text-green-400">▲ 12.1% vs mois préc.</p>
        </div>

        {/* KPI 3 - DYNAMIQUE (Branché sur BigQuery / optin_funnel) */}
        <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-teal-500"></div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Opt-in Commercial</h3>
          <p className="text-4xl font-bold mb-1">
            {isLoading ? '...' : `${optinCommRate}%`}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {isLoading ? '...' : `${optinCommK}k profils activables`}
          </p>
        </div>

        {/* KPI 4 - Statique d'après ta maquette */}
        <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500"></div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Profils Identifiés (Chatbot)</h3>
          <p className="text-4xl font-bold mb-1">34.5%</p>
          <p className="text-sm text-gray-500">Conversations avec id_Inscrit_site</p>
        </div>

        {/* KPI 5 - Statique d'après ta maquette */}
        <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500"></div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Tokens Moy. / Conversation</h3>
          <p className="text-4xl font-bold mb-1">7k</p>
          <p className="text-sm text-gray-500">Profondeur d'engagement</p>
        </div>

        {/* KPI 6 - DYNAMIQUE (Branché sur BigQuery / salon_conversion) */}
        <div className="bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Taux Conversion Salons</h3>
          <p className="text-4xl font-bold mb-1">
            {isLoading ? '...' : `${salonConvRate}%`}
          </p>
          <p className="text-sm text-gray-500">Inscrits → Venants physiques</p>
        </div>
      </div>
      {/* ================= SECTION GRAPHIQUES ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* 1. GRAPHIQUE LIGNE (Volume BQ) */}
        <div className="col-span-2 bg-[#151828] border border-gray-800 rounded-xl p-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold">Volume conversations / mois</h2>
              <p className="text-xs text-gray-500">Agent_Conversationnel_ORI_Conversation</p>
            </div>
            <span className="bg-indigo-900/50 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-700/50">Live BQ</span>
          </div>
          
          <div className="h-64 w-full">
            {isLoading || !data.monthlyConversations ? (
              <div className="flex h-full items-center justify-center text-gray-500 animate-pulse">Chargement BQ...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyConversations} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis dataKey="month" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  {/* Courbe violette : Total */}
                  <Line type="monotone" dataKey="conversations" name="Total Conversations" stroke="#8b5cf6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  {/* Courbe verte : Identifiés */}
                  <Line type="monotone" dataKey="identified" name="Profils Identifiés" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. FUNNEL OPT-IN (Barres dynamiques) */}
        <div className="col-span-1 bg-[#151828] border border-gray-800 rounded-xl p-6">
           <div className="flex items-center gap-2 mb-1">
             <span className="bg-green-500 text-white rounded text-[10px] px-1 font-bold">✓</span>
             <h2 className="text-lg font-bold">Opt-in funnel</h2>
           </div>
           <p className="text-xs text-gray-500 mb-6">Site_Inscrits</p>
           
           <div className="space-y-5">
             {isLoading || !data.optinFunnel || !data.optinFunnel[0] ? (
               <p className="text-sm text-gray-500 animate-pulse">Calcul en cours...</p>
             ) : (
               <>
                 {/* Barre L'Étudiant */}
                 <div>
                   <div className="flex justify-between text-xs mb-1 text-gray-300">
                     <span>Opt-in L'Étudiant</span>
                     <span>{data.optinFunnel[0].letudiant} ({((data.optinFunnel[0].letudiant / data.optinFunnel[0].total) * 100).toFixed(1)}%)</span>
                   </div>
                   <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                     <div className="bg-indigo-500 h-full rounded-full" style={{width: `${(data.optinFunnel[0].letudiant / data.optinFunnel[0].total) * 100}%`}}></div>
                   </div>
                 </div>
                 
                 {/* Barre Commercial */}
                 <div>
                   <div className="flex justify-between text-xs mb-1 text-gray-300">
                     <span>Opt-in Commercial</span>
                     <span>{data.optinFunnel[0].commercial} ({((data.optinFunnel[0].commercial / data.optinFunnel[0].total) * 100).toFixed(1)}%)</span>
                   </div>
                   <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                     <div className="bg-green-500 h-full rounded-full" style={{width: `${(data.optinFunnel[0].commercial / data.optinFunnel[0].total) * 100}%`}}></div>
                   </div>
                 </div>

                 {/* Barre Téléphone */}
                 <div>
                   <div className="flex justify-between text-xs mb-1 text-gray-300">
                     <span>Opt-in Téléphone</span>
                     <span>{data.optinFunnel[0].telephone} ({((data.optinFunnel[0].telephone / data.optinFunnel[0].total) * 100).toFixed(1)}%)</span>
                   </div>
                   <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                     <div className="bg-orange-500 h-full rounded-full" style={{width: `${(data.optinFunnel[0].telephone / data.optinFunnel[0].total) * 100}%`}}></div>
                   </div>
                 </div>

                 {/* Barre Coaching */}
                 <div>
                   <div className="flex justify-between text-xs mb-1 text-gray-300">
                     <span>Opt-in Coaching</span>
                     <span>{data.optinFunnel[0].coaching} ({((data.optinFunnel[0].coaching / data.optinFunnel[0].total) * 100).toFixed(1)}%)</span>
                   </div>
                   <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                     <div className="bg-pink-500 h-full rounded-full" style={{width: `${(data.optinFunnel[0].coaching / data.optinFunnel[0].total) * 100}%`}}></div>
                   </div>
                 </div>

                 {/* Barre Finance */}
                 <div>
                   <div className="flex justify-between text-xs mb-1 text-gray-300">
                     <span>Opt-in Finance</span>
                     <span>{data.optinFunnel[0].finance} ({((data.optinFunnel[0].finance / data.optinFunnel[0].total) * 100).toFixed(1)}%)</span>
                   </div>
                   <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                     <div className="bg-cyan-500 h-full rounded-full" style={{width: `${(data.optinFunnel[0].finance / data.optinFunnel[0].total) * 100}%`}}></div>
                   </div>
                 </div>
               </>
             )}
           </div>
        </div>
      </div>

      {/* ================= GRAPHIQUES INSIGHTS (En bas) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#11131d] border border-gray-800/50 rounded-xl p-6 text-center hover:border-gray-700 transition-colors">
          <div className="text-2xl mb-3">🔥</div>
          <h3 className="font-bold mb-2">Pic rentrée Sep 2025</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            7 192 conversations en septembre = 70% de plus que le mois suivant. Signal fort d'anxiété d'orientation capturable.
          </p>
        </div>

        <div className="bg-[#11131d] border border-gray-800/50 rounded-xl p-6 text-center hover:border-gray-700 transition-colors">
          <div className="text-2xl mb-3">📅</div>
          <h3 className="font-bold mb-2">Boost Parcoursup Jan 2026</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            +147% de conversations en janvier vs décembre. Les vœux Parcoursup déclenchent une demande massive de conseil.
          </p>
        </div>

        <div className="bg-[#11131d] border border-gray-800/50 rounded-xl p-6 text-center hover:border-gray-700 transition-colors">
          <div className="text-2xl mb-3">💎</div>
          <h3 className="font-bold mb-2">
            {isLoading || !data.domainDistribution ? '...' : `${data.domainDistribution[0]?.domaine_etude} en tête`}
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            {isLoading || !data.domainDistribution ? '...' : `${(data.domainDistribution[0]?.cnt / 1000).toFixed(0)}k profils intéressés par ce domaine. Premier vivier pour les écoles.`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;