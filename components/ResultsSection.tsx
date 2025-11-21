
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  Tooltip, Cell, PieChart, Pie, CartesianGrid, LabelList
} from 'recharts';
import { SimulationResult, Portfolio, AssetData, StrategyType } from '../types';
import { TrendingUp, ShieldCheck, Zap, Calendar, ArrowRight, Target, TrendingDown, Layers, Wallet } from 'lucide-react';

interface ResultsSectionProps {
  data: SimulationResult;
  assets: AssetData[];
  totalCapital: number;
  targetStrategy?: StrategyType;
  onReset: () => void;
}

// Neon colors for better contrast on dark bg
const COLORS = ['#34d399', '#60a5fa', '#c084fc', '#fbbf24', '#f472b6', '#22d3ee', '#818cf8', '#f87171'];

const ResultsSection: React.FC<ResultsSectionProps> = ({ data, assets, totalCapital, targetStrategy = 'MAX_SHARPE', onReset }) => {
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio>(data.maxSharpePortfolio);

  // Auto-select portfolio based on strategy when data loads
  useEffect(() => {
    if (targetStrategy === 'MIN_RISK') {
      setSelectedPortfolio(data.minRiskPortfolio);
    } else if (targetStrategy === 'MAX_RETURN') {
      setSelectedPortfolio(data.maxReturnPortfolio);
    } else {
      setSelectedPortfolio(data.maxSharpePortfolio);
    }
  }, [data, targetStrategy]);

  // Separate clouds for better chart layering
  const cloudData = useMemo(() => data.portfolios, [data]);
  
  const highlightPoints = useMemo(() => [
    { ...data.minRiskPortfolio, type: 'Min Risk', color: '#60a5fa' },
    { ...data.maxSharpePortfolio, type: 'Max Sharpe', color: '#34d399' },
    { ...data.maxReturnPortfolio, type: 'Max Return', color: '#c084fc' }
  ], [data]);

  // Prepare Pie Data
  const pieData = useMemo(() => {
    return selectedPortfolio.weights.map((w, i) => ({
      name: assets[i].ticker,
      value: Math.abs(w), // Show magnitude in pie
      rawWeight: w,
      fill: COLORS[i % COLORS.length]
    })).filter(item => Math.abs(item.rawWeight) > 0.01); // Hide tiny positions
  }, [selectedPortfolio, assets]);

  // Calculations for Allocation Table
  const allocationTable = useMemo(() => {
    let totalValue = 0;
    
    const rows = selectedPortfolio.weights.map((w, i) => {
      const asset = assets[i];
      const idealAlloc = totalCapital * w;
      
      // Logic: Standard Lot (100 shares)
      // Round DOWN (floor) to ensure we don't exceed capital
      // If weight is negative (short), we calculate shares as if buying, but flag as short
      const rawQty = Math.abs(idealAlloc) / asset.lastPrice;
      const lotQty = Math.floor(rawQty / 100) * 100;
      
      // Actual financial exposure based on physical lots
      const realExposure = lotQty * asset.lastPrice * (w < 0 ? -1 : 1);
      
      totalValue += realExposure;

      return {
        ticker: asset.ticker,
        lastPrice: asset.lastPrice,
        idealWeight: w,
        qty: lotQty,
        exposure: realExposure,
        color: COLORS[i % COLORS.length]
      };
    }).sort((a, b) => b.idealWeight - a.idealWeight);

    const cash = totalCapital - totalValue;

    return { rows, totalValue, cash };
  }, [selectedPortfolio, assets, totalCapital]);

  return (
    <div className="flex flex-col h-full gap-4">
      
      {/* Header & KPIs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
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

      {/* KPI Cards - Responsive Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4`}>
         
         {/* Max Sharpe Card */}
         <div 
           onClick={() => setSelectedPortfolio(data.maxSharpePortfolio)}
           className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedPortfolio.id === data.maxSharpePortfolio.id ? 'bg-[#132e27] border-emerald-500/50 ring-1 ring-emerald-500/50' : 'bg-[#151b2b] border-slate-800 hover:border-slate-700'}`}
         >
            <div className="flex justify-between items-start mb-2">
               <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Max Sharpe Ratio</span>
               {selectedPortfolio.id === data.maxSharpePortfolio.id && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>}
            </div>
            <div className="text-4xl font-bold text-slate-100 mb-1">{data.maxSharpePortfolio.sharpe.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
               <TrendingUp size={14} /> Recomendado
            </div>
         </div>

         {/* Min Risk Card */}
         <div 
            onClick={() => setSelectedPortfolio(data.minRiskPortfolio)}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedPortfolio.id === data.minRiskPortfolio.id ? 'bg-[#13253a] border-blue-500/50 ring-1 ring-blue-500/50' : 'bg-[#151b2b] border-slate-800 hover:border-slate-700'}`}
         >
            <div className="flex justify-between items-start mb-2">
               <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Risco Mínimo</span>
               {selectedPortfolio.id === data.minRiskPortfolio.id && <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>}
            </div>
            <div className="text-4xl font-bold text-slate-100 mb-1">{(data.minRiskPortfolio.risk * 100).toFixed(2)}%</div>
            <div className="flex items-center gap-1 text-blue-400 text-sm font-medium">
               <ShieldCheck size={14} /> Conservador
            </div>
         </div>

         {/* Max Return Card */}
         <div 
            onClick={() => setSelectedPortfolio(data.maxReturnPortfolio)}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedPortfolio.id === data.maxReturnPortfolio.id ? 'bg-[#2a1836] border-purple-500/50 ring-1 ring-purple-500/50' : 'bg-[#151b2b] border-slate-800 hover:border-slate-700'}`}
         >
            <div className="flex justify-between items-start mb-2">
               <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Retorno Máx.</span>
               {selectedPortfolio.id === data.maxReturnPortfolio.id && <div className="h-2 w-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]"></div>}
            </div>
            <div className="text-4xl font-bold text-slate-100 mb-1">{(data.maxReturnPortfolio.return * 100).toFixed(2)}%</div>
            <div className="flex items-center gap-1 text-purple-400 text-sm font-medium">
               <Zap size={14} /> Agressivo
            </div>
         </div>

         {/* Current Selection Info */}
         <div className="p-5 rounded-xl border bg-[#151b2b] border-slate-800">
             <div className="flex justify-between items-start mb-2">
               <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Volatilidade</span>
            </div>
            <div className="text-4xl font-bold text-rose-400 mb-1">{(selectedPortfolio.risk * 100).toFixed(2)}%</div>
            <span className="text-xs text-slate-500">Desvio Padrão Anual</span>
         </div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[450px]">
         
         {/* Efficient Frontier Chart */}
         <div className="lg:col-span-7 bg-[#151b2b] rounded-xl border border-slate-800 p-4 flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
               <h3 className="font-bold text-slate-200 flex items-center gap-2">
                  <Target size={18} className="text-emerald-500"/> Fronteira Eficiente
               </h3>
               <div className="flex gap-3 text-[10px] font-bold uppercase">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-600/50"></div> Carteiras</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]"></div> Max Sharpe</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_5px_#60a5fa]"></div> Min Risco</div>
               </div>
            </div>
            
            <div className="flex-1 min-h-0 relative">
               <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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
                     {/* Cloud of portfolios */}
                     <Scatter data={cloudData} fill="#334155" fillOpacity={0.4} shape="circle" />
                     
                     {/* Highlighted Points (Larger, Glow, No Stroke) */}
                     <Scatter data={highlightPoints} shape="circle">
                        {highlightPoints.map((entry, index) => (
                           <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              r={8} /* Increased size */
                              className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                           />
                        ))}
                     </Scatter>
                     
                     {/* Currently Selected Point */}
                     <Scatter data={[selectedPortfolio]} fill="#ffffff" shape="cross" />
                  </ScatterChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Allocation Panel (Pie + Table) */}
         <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Pie Chart */}
            <div className="bg-[#151b2b] rounded-xl border border-slate-800 p-4 flex-1 min-h-[200px]">
               <div className="flex h-full items-center">
                   <div className="w-1/2 h-full min-h-[180px] relative">
                      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                         <span className="text-4xl font-bold text-slate-200">{assets.length}</span>
                         <span className="text-[10px] text-slate-500 uppercase tracking-widest">Ativos</span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie
                               data={pieData}
                               cx="50%"
                               cy="50%"
                               innerRadius={50}
                               outerRadius={70}
                               paddingAngle={4}
                               dataKey="value"
                               stroke="none"
                            >
                               {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                               ))}
                            </Pie>
                            <Tooltip 
                               contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#e2e8f0'}}
                               formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                            />
                         </PieChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="w-1/2 pl-2 space-y-1 overflow-y-auto max-h-[180px] custom-scrollbar">
                      {pieData.map((entry, index) => (
                         <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.fill}}></div>
                               <span className="text-slate-300 font-bold text-sm">{entry.name.replace('.SA', '')}</span>
                            </div>
                            <span className="text-slate-400 text-sm">{(entry.rawWeight * 100).toFixed(1)}%</span>
                         </div>
                      ))}
                   </div>
               </div>
            </div>

            {/* Detailed List */}
            <div className="bg-[#151b2b] rounded-xl border border-slate-800 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto custom-scrollbar">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-[#0f1522] border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                            <th className="p-3 font-bold">Ativo</th>
                            <th className="p-3 font-bold text-right">Peso Ideal</th>
                            <th className="p-3 font-bold text-right">Qtd. (Ações)</th>
                            <th className="p-3 font-bold text-right">Alocação (R$)</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                         {allocationTable.rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                               <td className="p-3">
                                  <div className="flex items-center gap-2">
                                     <div className="w-1 h-6 rounded-full" style={{backgroundColor: row.color}}></div>
                                     <span className="font-bold text-slate-200 text-base">{row.ticker.replace('.SA', '')}</span>
                                  </div>
                               </td>
                               <td className={`p-3 text-right font-mono font-bold text-base ${row.idealWeight > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
                             <td colSpan={3} className="p-3 text-right text-xs font-bold text-slate-500 uppercase">Total Investido</td>
                             <td className="p-3 text-right font-mono font-bold text-emerald-400 text-lg">
                                {allocationTable.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                             </td>
                          </tr>
                          {allocationTable.cash > 0 && (
                             <tr>
                                <td colSpan={3} className="p-3 text-right text-xs font-bold text-slate-500 uppercase">Caixa Livre (Sobra)</td>
                                <td className="p-3 text-right font-mono font-bold text-slate-400 text-lg">
                                   {allocationTable.cash.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                             </tr>
                          )}
                      </tfoot>
                   </table>
                </div>
            </div>
         </div>
      </div>

      {/* Backtest Section (Conditional) */}
      {data.backtest && (
         <div className="bg-[#151b2b] rounded-xl border border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="p-4 border-b border-slate-800 bg-[#0f1522] flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                     <Calendar className="text-blue-400" size={20} />
                  </div>
                  <div>
                     <h3 className="font-bold text-slate-200">Backtest Realizado</h3>
                     <p className="text-xs text-slate-500">Período: {new Date(data.backtest.startDate).toLocaleDateString('pt-BR')} a {new Date(data.backtest.endDate).toLocaleDateString('pt-BR')}</p>
                  </div>
               </div>
               <div className={`px-4 py-2 rounded-lg border text-lg font-bold font-mono ${data.backtest.profit >= 0 ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-400' : 'bg-rose-900/20 border-rose-700/50 text-rose-400'}`}>
                  {data.backtest.profit >= 0 ? '+' : ''} {data.backtest.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  <span className="text-sm ml-2 opacity-75">({data.backtest.profitPercent.toFixed(2)}%)</span>
               </div>
            </div>

            <div className="p-4">
               <div className="mb-4">
                   <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Detalhes do Backtest: Realizado vs Expectativa</h4>
                   <div className="overflow-x-auto custom-scrollbar rounded-lg border border-slate-800">
                      <table className="w-full text-left text-sm">
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
                            {data.backtest.assetPerformance.map((asset, i) => (
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
                               <td className={`p-3 text-center ${data.backtest.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {data.backtest.profitPercent.toFixed(2)}%
                               </td>
                               <td className="p-3 text-center text-slate-400">-</td>
                               <td className="p-3 text-center">-</td>
                               <td className="p-3 text-right text-slate-400">100%</td>
                               <td className={`p-3 text-right ${data.backtest.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {data.backtest.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
