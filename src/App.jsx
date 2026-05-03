// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // States pour la data
  const [totalInscrits, setTotalInscrits] = useState(0);
  const [domaineData, setDomaineData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fonction fetch vers notre API locale (qui simulera BQ plus tard)
  const fetchQuery = async (sqlQuery) => {
    try {
      const response = await fetch('http://localhost:3000/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery })
      });
      if (!response.ok) throw new Error('Erreur réseau');
      return await response.json();
    } catch (error) {
      console.error("Erreur SQL:", error);
      return [];
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverviewData();
    }
  }, [activeTab]);

  const loadOverviewData = async () => {
    setLoading(true);
    
    // 1. KPI : Total Inscrits
    const totalData = await fetchQuery(`SELECT COUNT(*) as total FROM Site_Inscrits`);
    if (totalData && totalData.length > 0) {
      setTotalInscrits(totalData[0].total);
    }

    // 2. Graphique : Top 5 Domaines d'études (Jointure entre la table de faits et la dimension)
    const domaineQuery = `
      SELECT d.domaine_etude as name, COUNT(s.id_Inscrit_site) as total 
      FROM Site_Inscrits s 
      JOIN Domaine_Etude d ON s.id_domaine_etude = d.id_domaine_etude 
      GROUP BY d.domaine_etude 
      ORDER BY total DESC 
      LIMIT 5
    `;
    const chartData = await fetchQuery(domaineQuery);
    setDomaineData(chartData);

    setLoading(false);
  };

  const tabs = [
    { id: 'overview', label: "Vue d'ensemble" },
    { id: 'audience', label: "Audience" },
    { id: 'scoring', label: "Lead Scoring" },
    { id: 'crm', label: "CRM & Salons" },
    { id: 'sql', label: "SQL Queries" }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#004b87] text-white p-4 shadow-md flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Hacka_g24 🚀 Analytics</h1>
        <div className="text-sm opacity-90 bg-[#f26522] px-3 py-1 rounded-full font-semibold">
          Mode Local (AlaSQL)
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 flex gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#f26522] text-[#f26522]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu Principal */}
      <main className="flex-1 p-6 bg-[#f5f7fa]">
        {activeTab === 'overview' && (
          <div className="animate-fade-in text-gray-800">
            <h2 className="text-2xl font-bold mb-6 text-[#004b87]">Vue d'ensemble</h2>
            
            {loading ? (
              <div className="flex justify-center items-center h-32 text-gray-500 font-medium">
                Extraction des données... ⏳
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* KPI Total Inscrits */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Profils Analysés</h3>
                    <p className="text-4xl font-extrabold text-[#f26522]">{totalInscrits.toLocaleString('fr-FR')}</p>
                  </div>
                  
                  {/* Placeholders pour les autres KPIs */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center opacity-60">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Taux d'Opt-in</h3>
                    <p className="text-2xl font-bold text-[#004b87]">- %</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center opacity-60">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Campagnes Actives</h3>
                    <p className="text-2xl font-bold text-[#004b87]">-</p>
                  </div>
                </div>

                {/* Graphique Recharts */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-[#004b87] mb-6">Top 5 - Répartition par Domaine d'Étude</h3>
                  <div className="h-80 w-full">
                    {domaineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={domaineData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                          <Tooltip cursor={{fill: '#f5f7fa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Bar dataKey="total" fill="#f26522" radius={[0, 4, 4, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex justify-center items-center h-full text-gray-400">Aucune donnée disponible</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Autres onglets */}
        {activeTab === 'audience' && <div>Contenu Audience en construction...</div>}
        {activeTab === 'scoring' && <div>Contenu Lead Scoring en construction...</div>}
        {activeTab === 'crm' && <div>Contenu CRM & Salons en construction...</div>}
        {activeTab === 'sql' && <div>L'éditeur SQL sera injecté ici...</div>}
      </main>
    </div>
  );
}

export default App;