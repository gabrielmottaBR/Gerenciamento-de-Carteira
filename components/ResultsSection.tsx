
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  Tooltip, Cell, PieChart, Pie, CartesianGrid, LabelList
} from 'recharts';
import { SimulationResult, Portfolio, AssetData, StrategyType, UserAssetInput } from '../types';
import { TrendingUp, ShieldCheck, Zap, Calendar, ArrowRight, Target, TrendingDown, Layers, Wallet } from 'lucide-react';
import { calculateBacktest } from '../services/mathService';

interface ResultsSectionProps {
  data: SimulationResult;
  assets: AssetData[];
  totalCapital: number;
  targetStrategy?: StrategyType;
  userInputs: UserAssetInput[];
  backtestDate?: string;
  mode?: 'INVESTMENT' | 'BACKTEST';
  onReset: () => void;
}

// Neon colors for better contrast on dark bg
const COLORS = ['#34d399', '#60a5fa', '#c084fc', '#fbbf24', '#f472b6', '#22d3ee', '#818cf8', '#f87171'];

const ResultsSection: React.FC<ResultsSectionProps> = ({ 
  data, 
  assets, 
  totalCapital, 
  targetStrategy = 'MAX_SHARPE', 
  userInputs,
  backtestDate,
  mode = 'INVESTMENT',
  onReset 
}) => {
  // Local state to track which portfolio is selected
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio>(data.maxSharpePortfolio);
  // Separate state to track which "Card" is visually active (resolves issue where multiple strategies might share the same portfolio ID)
  const [activeCard, setActiveCard] = useState<StrategyType | 'CUSTOM'>('MAX_SHARPE');

  // Initialize selection based on strategy prop
  useEffect(() => {
    if (targetStrategy === 'MIN_RISK') {
      setSelectedPortfolio(data.minRiskPortfolio);
      setActiveCard('MIN_RISK');
    } else if (targetStrategy === 'MAX_RETURN') {
      setSelectedPortfolio(data.maxReturnPortfolio);
      setActiveCard('MAX_RETURN');
    } else {
      setSelectedPortfolio(data.maxSharpePortfolio);
      setActiveCard('MAX_SHARPE');
    }
  }, [data, targetStrategy]);

  // Handle manual clicks
  const handleCardClick = (portfolio: Portfolio, type: StrategyType) => {
    setSelectedPortfolio(portfolio);
    setActiveCard(type);
  };

  // Dynamic Backtest Calculation: Re-runs whenever selectedPortfolio changes
  const dynamicBacktest = useMemo(() => {
    if (mode === 'BACKTEST' && backtestDate) {
      return calculateBacktest(
        assets, 
        selectedPortfolio, 
        backtestDate, 
        totalCapital, 
        userInputs
      );
    }
    return null;
  }, [selectedPortfolio, assets, backtestDate, totalCapital, userInputs, mode]);

  // Separate clouds for better chart layering
  const cloudData = useMemo(() => data.portfolios, [data]);
  
  const highlightPoints = useMemo(() => [
    { ...data.minRiskPortfolio, type: 'Min Risk', color: '#60a5fa' },
    { ...data.maxSharpePortfolio, type: 'Max Sharpe', color: '#34d399' },
    { ...data.maxReturnPortfolio, type: 'Max Return', color: '#c084fc' }
  ], [data]);

  // Calculations for Allocation Table AND Pie Chart
  const allocationData = useMemo(() => {
    let totalRealValue = 0;
    
    // Process each asset
    const processedRows = selectedPortfolio.weights.map((w, i) => {
      const asset = assets[i];
      const idealAlloc = totalCapital * w;
      
      // Logic: Standard Lot (100 shares)
      const rawQty = Math.abs(idealAlloc) / asset.lastPrice;
      const lotQty = Math.floor(rawQty / 100) * 100;
      
      // Actual financial exposure based on physical lots
      const realExposure = lotQty * asset.lastPrice * (w < 0 ? -1 : 1);
      
      if (lotQty > 0) {
        totalRealValue += Math.abs(realExposure);
      }

      return {
        ticker: asset.ticker,
        lastPrice: asset.lastPrice,
        idealWeight: w,
        qty: lotQty,
        exposure: realExposure,
        color: COLORS[i % COLORS.length]
      };
    }).sort((a, b) => b.idealWeight - a.idealWeight);

    // Filter for Pie Chart (Only non-zero positions)
    const pieRows = processedRows
      .filter(r => r.qty > 0)
      .map(r => ({
        name: r.ticker,
        value: Math.abs(r.exposure),
        fill: r.color
      }));

    const cash = totalCapital - processedRows.reduce((acc, r) => acc + (r.exposure > 0 ? r.exposure : 0), 0);

    return { 
      rows: processedRows, 
      pieRows, 
      totalRealValue: processedRows.reduce((acc, r) => acc + r.exposure, 0),
      cash 
    };
  }, [selectedPortfolio, assets, totalCapital]);

  return (
    <div className="flex flex-col gap-8 pb-10">
      
      {/* Header & KPIs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
         <div className="flex items-center gap-3">
           <div className="bg-emerald-500/20 p-2 rounded-lg">
             <Layers className="text-emerald-400" size={24} />
           </div>
           <div>
             <h2 className="text-xl font-bold text-slate-100">Análise de Portfólio</h2>
             <p className="text-xs text-slate-400 uppercase tracking-wider">Otimização Realizada</p>
           </div>
         </div>
         <button onClick={onReset} className="text-xs text-slate-500 hover:text-white underline">
            Fechar Análise
         </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
         
         {/* Max Sharpe Card */}
         <div 
           onClick={() => handleCardClick(data.maxSharpePortfolio, 'MAX_SHARPE')}
           className={`p-4 rounded-xl border cursor-pointer transition-all ${activeCard === 'MAX_SHARPE' ? 'bg-[#132e27] border-emerald-500/50 ring-1 ring-emerald-500/50' : 'bg-[#151b2b] border-slate-800 hover:border-slate-700'}`}
         >
            <div className="flex justify-between items-start mb-2">
               <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Max Sharpe</span>
               {activeCard === 'MAX_SHARPE' && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>}
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-slate-100 mb-1">{data.maxSharpePortfolio.sharpe.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
               <TrendingUp size={14} /> Recomendado
            </div>
         </div>

         {/* Min Risk Card */}
         <div 
            onClick={() => handleCardClick(data.minRiskPortfolio, 'MIN_RISK')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${activeCard === 'MIN_RISK' ? 'bg-[#13253a] border-blue-500/50 ring-1 ring-blue-500/50' : 'bg-[#151b2b] border-slate-800 hover:border-slate-700'}`}
         >
            <div className="flex justify-between items-start mb-2">
               <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Risco Mínimo</span>
               {activeCard === 'MIN_RISK' && <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>}
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-slate-100 mb-1">{(data.minRiskPortfolio.risk * 100).toFixed(2)}%</div>
            <div className="flex items-center gap-1 text-blue-400 text-sm font-medium">
               <ShieldCheck size={14} /> Conservador
            </div>
         </div>

         {/* Max Return Card */}
         <div 
            onClick={() => handleCardClick(data.maxReturnPortfolio, 'MAX_RETURN')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${activeCard === 'MAX_RETURN' ? 'bg-[#2a1836] border-purple-500/50 ring-1 ring-purple-500/50' : 'bg-[#151b2b] border-slate-800 hover:border-slate-700'}`}
         >
            <div className="flex justify-between items-start mb-2">
               <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Retorno Máx.</span>
               {activeCard === 'MAX_RETURN' && <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></div>}
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-slate-100 mb-1">{(data.maxReturnPortfolio.return * 100).toFixed(2)}%</div>
            <div className="flex items-center gap-1 text-purple-400 text-sm font-medium">
               <Zap size={14} /> Agressivo
            </div>
         </div>

         {/* Current Selection Info */}
         <div className="p-4 rounded-xl border bg-[#151b2b] border-slate-800">
             <div className="flex justify-between items-start mb-2">
               <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Volatilidade</span>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-rose-400 mb-1">{(selectedPortfolio.risk * 100).toFixed(2)}%</div>
            <span className="text-xs text-slate-500">Desvio Padrão Anual</span>
         </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         
         {/* Efficient Frontier Chart */}
         <div className="lg:col-span-7 bg-[#151b2b] rounded-xl border border-slate-800 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-2 px-2 shrink-0">
               <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Target size={18} className="text-emerald-500"/> Fronteira Eficiente
               </h3>
               <div className="hidden sm:flex gap-3 text-[10px] font-bold uppercase">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-600/50"></div> Carteiras</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]"></div> Max Sharpe</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_5px_#60a5fa]"></div> Min Risco</div>
               </div>
            </div>
            
            {/* Explicit height ensures Recharts can render properly */}
            <div className="w-full h-[400px] md:h-[500px] relative">
               <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart 
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    onClick={(e) => {
                      if (e && e.activePayload && e.activePayload[0]) {
                        const clickedPortfolio = e.activePayload[0].payload;
                        setSelectedPortfolio(clickedPortfolio);
                        setActiveCard('CUSTOM');
                      }
                    }}
                  >
                     <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                     <XAxis 
                        type="number" 
                        dataKey="risk" 
                        name="Risco" 
                        unit="" 
                        stroke="#64748b" 
                        tick={{fill: '#64748b', fontSize: 12}}
                        tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                        label={{ value: 'Risco (Volatilidade Anual)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 12 }}
                        domain={['auto', 'auto']}
                     />
                     <YAxis 
                        type="number" 
                        dataKey="return" 
                        name="Retorno" 
                        unit="" 
                        stroke="#64748b" 
                        tick={{fill: '#64748b', fontSize: 12}}
                        tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                        label={{ value: 'Retorno Esperado (Anual)', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }}
                        domain={['auto', 'auto']}
                     />
                     <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                           if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                 <div className="bg-[#0f172a] border border-slate-700 p-3 rounded shadow-xl">
                                    <p className="text-slate-200 font-bold mb-1">{data.type || 'Carteira Simulada'}</p>
                                    <p className="text-emerald-400 text-sm">Retorno: {(data.return * 100).toFixed(2)}%</p>
                                    <p className="text-rose-400 text-sm">Risco: {(data.risk * 100).toFixed(2)}%</p>
                                    <p className="text-blue-400 text-sm">Sharpe: {data.sharpe.toFixed(2)}</p>
                                 </div>
                              );
                           }
                           return null;
                        }}
                     />
                     <Scatter data={cloudData} fill="#334155" fillOpacity={0.4} shape="circle" cursor="pointer" />
                     <Scatter data={highlightPoints} shape="circle" pointerEvents="none">
                        {highlightPoints.map((entry, index) => (
                           <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              r={8}
                              className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                           />
                        ))}
                     </Scatter>
                     <Scatter data={[selectedPortfolio]} fill="#ffffff" shape="cross" pointerEvents="none" />
                  </ScatterChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Allocation Panel (Pie + Table) */}
         <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Pie Chart */}
            <div className="bg-[#151b2b] rounded-xl border border-slate-800 p-4 shrink-0">
               <div className="flex flex-col sm:flex-row items-center gap-6">
                   <div className="w-full sm:w-1/2 h-[220px] relative">
                      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                         <span className="text-4xl font-bold text-slate-200">{allocationData.pieRows.length}</span>
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest">Ativos Reais</span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie
                               data={allocationData.pieRows}
                               cx="50%"
                               cy="50%"
                               innerRadius={55}
                               outerRadius={80}
                               paddingAngle={4}
                               dataKey="value"
                               stroke="none"
                            >
                               {allocationData.pieRows.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                               ))}
                            </Pie>
                            <Tooltip 
                               contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#e2e8f0'}}
                               formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                            />
                         </PieChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="w-full sm:w-1/2 space-y-1">
                      {allocationData.pieRows.map((entry, index) => (
                         <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full" style={{backgroundColor: entry.fill}}></div>
                               <span className="text-slate-300 font-bold text-sm">{entry.name.replace('.SA', '')}</span>
                            </div>
                            <span className="text-slate-500">{Math.round((entry.value / allocationData.totalRealValue) * 100)}%</span>
                         </div>
                      ))}
                      {allocationData.pieRows.length === 0 && (
                        <div className="text-xs text-slate-500 italic text-center">Nenhum ativo atingiu o lote mínimo.</div>
                      )}
                   </div>
               </div>
            </div>

            {/* Detailed List */}
            <div className="bg-[#151b2b] rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full text-left border-collapse min-w-[350px]">
                      <thead className="">
                         <tr className="bg-[#0f1522] border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider shadow-sm">
                            <th className="p-3 font-bold">Ativo</th>
                            <th className="p-3 font-bold text-right hidden sm:table-cell">Peso Ideal</th>
                            <th className="p-3 font-bold text-right">Qtd.</th>
                            <th className="p-3 font-bold text-right">Alocação (R$)</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                         {allocationData.rows.map((row, idx) => (
                            <tr key={idx} className={`hover:bg-slate-800/30 transition-colors ${row.qty === 0 ? 'opacity-40' : ''}`}>
                               <td className="p-3">
                                  <div className="flex items-center gap-2">
                                     <div className="w-1 h-6 rounded-full" style={{backgroundColor: row.color}}></div>
                                     <div className="flex flex-col">
                                       <span className="font-bold text-slate-200 text-base">{row.ticker.replace('.SA', '')}</span>
                                       {row.qty === 0 && <span className="text-[10px] text-amber-500 uppercase">Insuficiente</span>}
                                     </div>
                                  </div>
                               </td>
                               <td className={`p-3 text-right font-mono font-bold text-base hidden sm:table-cell ${row.idealWeight > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {(row.idealWeight * 100).toFixed(2)}%
                               </td>
                               <td className="p-3 text-right font-mono text-slate-300 text-base">
                                  {row.qty}
                               </td>
                               <td className="p-3 text-right font-mono text-slate-200 font-bold text-lg">
                                  {row.exposure.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                      <tfoot className="bg-[#0f1522] border-t border-slate-800">
                          <tr>
                             <td colSpan={2} className="p-3 text-right text-xs font-bold text-slate-500 uppercase">Total Executado</td>
                             <td colSpan={2} className="p-3 text-right font-mono font-bold text-emerald-400 text-lg">
                                {allocationData.totalRealValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             </td>
                          </tr>
                          {allocationData.cash > 0 && (
                             <tr>
                                <td colSpan={2} className="p-3 text-right text-xs font-bold text-slate-500 uppercase">Caixa Livre</td>
                                <td colSpan={2} className="p-3 text-right font-mono font-bold text-slate-400 text-lg">
                                   {allocationData.cash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                             </tr>
                          )}
                      </tfoot>
                   </table>
                </div>
            </div>
         </div>
      </div>

      {/* Backtest Section */}
      {dynamicBacktest && (
         <div className="bg-[#151b2b] rounded-xl border border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500 shrink-0">
            <div className="p-4 border-b border-slate-800 bg-[#0f1522] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
               <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                     <Calendar className="text-blue-400" size={20} />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-200">Backtest Realizado</h3>
                     <p className="text-xs text-slate-500">Período: {new Date(dynamicBacktest.startDate).toLocaleDateString('pt-BR')} a {new Date(dynamicBacktest.endDate).toLocaleDateString('pt-BR')}</p>
                  </div>
               </div>
               <div className={`w-full sm:w-auto px-4 py-2 rounded-lg border text-lg font-bold font-mono text-center sm:text-right ${dynamicBacktest.profit >= 0 ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-400' : 'bg-rose-900/20 border-rose-700/50 text-rose-400'}`}>
                  {dynamicBacktest.profit >= 0 ? '+' : ''} {dynamicBacktest.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  <span className="text-sm ml-2 opacity-75">({dynamicBacktest.profitPercent.toFixed(2)}%)</span>
               </div>
            </div>

            <div className="p-4">
               <div className="mb-4">
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Detalhes do Backtest: Realizado vs Expectativa</h4>
                   <div className="overflow-x-auto custom-scrollbar rounded-lg border border-slate-800">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                         <thead className="bg-[#0f1522] text-slate-400 font-medium uppercase text-sm">
                            <tr>
                               <th className="p-3">Ativo</th>
                               <th className="p-3 text-right">Preço Início</th>
                               <th className="p-3 text-right">Preço Fim</th>
                               <th className="p-3 text-center">Retorno Real</th>
                               <th className="p-3 text-center">Sua Expectativa</th>
                               <th className="p-3 text-center">Delta</th>
                               <th className="p-3 text-right">Peso Executado</th>
                               <th className="p-3 text-right">Resultado (R$)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                            {dynamicBacktest.assetPerformance.map((asset, i) => (
                               <tr key={i} className="hover:bg-slate-800/20">
                                  <td className="p-3 font-bold text-slate-200 text-base">{asset.ticker.replace('.SA', '')}</td>
                                  <td className="p-3 text-right text-slate-400 text-base">R$ {asset.startPrice.toFixed(2)}</td>
                                  <td className="p-3 text-right text-slate-400 text-base">R$ {asset.endPrice.toFixed(2)}</td>
                                  <td className={`p-3 text-center font-bold text-base ${asset.percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                     {asset.percent.toFixed(2)}%
                                  </td>
                                  <td className="p-3 text-center text-slate-300 text-base">{asset.expectedPercent.toFixed(2)}%</td>
                                  <td className="p-3 text-center">
                                     <span className={`text-xs font-bold px-2 py-1 rounded ${asset.percent - asset.expectedPercent >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        {(asset.percent - asset.expectedPercent).toFixed(2)}%
                                     </span>
                                  </td>
                                  <td className="p-3 text-right font-mono text-slate-300 text-base">{(asset.weight * 100).toFixed(1)}%</td>
                                  <td className={`p-3 text-right font-mono font-bold text-base ${asset.contribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                     {asset.contribution.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                         <tfoot className="bg-[#0f1522] font-bold border-t border-slate-800 text-slate-200 text-base">
                            <tr>
                               <td className="p-3" colSpan={3}>TOTAIS</td>
                               <td className={`p-3 text-center ${dynamicBacktest.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {dynamicBacktest.profitPercent.toFixed(2)}%
                               </td>
                               <td className="p-3 text-center text-slate-400">-</td>
                               <td className="p-3 text-center">-</td>
                               <td className="p-3 text-right text-slate-400">100%</td>
                               <td className={`p-3 text-right ${dynamicBacktest.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {dynamicBacktest.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                               </td>
                            </tr>
                         </tfoot>
                      </table>
                   </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ResultsSection;
