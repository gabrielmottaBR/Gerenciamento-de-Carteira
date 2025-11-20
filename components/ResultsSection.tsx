
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
  
  useEffect(() => {
    if (targetStrategy === 'MIN_RISK') {
      setSelectedPortfolio(data.minRiskPortfolio);
    } else if (targetStrategy === 'MAX_RETURN') {
      setSelectedPortfolio(data.maxReturnPortfolio);
    } else {
      setSelectedPortfolio(data.maxSharpePortfolio);
    }
  }, [targetStrategy, data]);

  const cloudData = useMemo(() => {
    return data.portfolios.map(p => ({
      x: p.risk * 100,
      y: p.return * 100,
      z: p.sharpe,
      payload: p
    }));
  }, [data.portfolios]);

  const highlightPoints = useMemo(() => {
    const points = [
      { 
        ...data.maxSharpePortfolio, 
        x: data.maxSharpePortfolio.risk * 100, 
        y: data.maxSharpePortfolio.return * 100, 
        color: '#34d399', // Neon Emerald
        name: 'Max Sharpe',
        payload: data.maxSharpePortfolio 
      },
      { 
        ...data.minRiskPortfolio, 
        x: data.minRiskPortfolio.risk * 100, 
        y: data.minRiskPortfolio.return * 100, 
        color: '#60a5fa', // Neon Blue
        name: 'Min Risco',
        payload: data.minRiskPortfolio
      },
      {
         ...data.maxReturnPortfolio,
         x: data.maxReturnPortfolio.risk * 100,
         y: data.maxReturnPortfolio.return * 100,
         color: '#c084fc', // Neon Purple 
         name: 'Max Retorno',
         payload: data.maxReturnPortfolio
      }
    ];

    const isMax = selectedPortfolio.id === data.maxSharpePortfolio.id;
    const isMin = selectedPortfolio.id === data.minRiskPortfolio.id;
    const isMaxRet = selectedPortfolio.id === data.maxReturnPortfolio.id;
    
    if (!isMax && !isMin && !isMaxRet) {
       points.push({ 
         ...selectedPortfolio, 
         x: selectedPortfolio.risk * 100, 
         y: selectedPortfolio.return * 100, 
         color: '#ffffff', 
         name: 'Selecionado',
         payload: selectedPortfolio
       });
    } else {
       const p = points.find(pt => pt.payload.id === selectedPortfolio.id);
       if (p) p.name += ' (Sel.)';
    }
    return points;
  }, [data, selectedPortfolio]);

  // Calculate actual allocation based on Standard Lots (100 shares)
  const allocationTableData = useMemo(() => {
    return assets.map((asset, idx) => {
      const weight = selectedPortfolio.weights[idx];
      const theoreticalValue = weight * totalCapital;
      const price = asset.lastPrice;
      
      // Calculate shares
      const theoreticalShares = theoreticalValue / price;
      
      // Constraint Logic: Use Math.floor to strictly ensure we do not exceed capital allocated to this slot.
      // By flooring every asset, the Sum(RealValues) <= Sum(TheoreticalValues) = TotalCapital.
      const standardLots = Math.floor(theoreticalShares / 100);
      const realShares = standardLots * 100;
      
      const realValue = realShares * price;
      
      return {
        ticker: asset.ticker,
        price,
        weight, // Theoretical Weight
        realShares,
        realValue,
        color: COLORS[idx % COLORS.length]
      };
    }).filter(item => Math.abs(item.weight) > 0.001); // Filter out negligible weights
  }, [assets, selectedPortfolio, totalCapital]);

  const totalRealValue = allocationTableData.reduce((acc, item) => acc + item.realValue, 0);
  const remainingCash = totalCapital - totalRealValue;
  const totalTheoreticalWeight = selectedPortfolio.weights.reduce((a, b) => a + b, 0) * 100;

  const pieData = allocationTableData.map(item => ({
    name: item.ticker,
    value: Math.abs(item.realValue),
    fill: item.color
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p: Portfolio = payload[0].payload.payload; 
      return (
        <div className="bg-[#1e293b] p-4 border border-slate-600 shadow-xl rounded text-sm z-50">
          <p className="font-bold text-slate-200 mb-2 border-b border-slate-600 pb-2">
            {payload[0].payload.name || "Portfólio Simulado"}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
             <span className="text-slate-400">Retorno:</span>
             <span className="font-mono font-semibold text-emerald-400 text-right">{(p.return * 100).toFixed(2)}%</span>
             <span className="text-slate-400">Risco:</span>
             <span className="font-mono font-semibold text-rose-400 text-right">{(p.risk * 100).toFixed(2)}%</span>
             <span className="text-slate-400">Sharpe:</span>
             <span className="font-mono font-semibold text-blue-400 text-right">{p.sharpe.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const formatAxis = (val: number) => `${val.toFixed(0)}%`;

  // --- Backtest Display Logic ---
  const backtest = data.backtest;
  const isBacktestValid = backtest && backtest.endDate;

  // Totais para o rodapé do Backtest
  const backtestTotals = useMemo(() => {
    if (!isBacktestValid) return null;
    
    // Calculate Weighted Expected Return of the Portfolio
    const totalExpectedReturn = backtest.assetPerformance.reduce((acc, item) => {
        return acc + (item.weight * item.expectedPercent);
    }, 0);

    // The Portfolio Realized Return is already calculated in backtest.profitPercent
    const totalRealizedReturn = backtest.profitPercent;

    const totalDelta = totalRealizedReturn - totalExpectedReturn;
    const totalFinancialResult = backtest.profit;
    const totalWeight = backtest.assetPerformance.reduce((acc, item) => acc + item.weight, 0) * 100;

    return { totalExpectedReturn, totalRealizedReturn, totalDelta, totalFinancialResult, totalWeight };
  }, [backtest, isBacktestValid]);


  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-10">
      
      <div className="bg-[#151b2b] rounded-xl border border-slate-800 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
            Análise de Portfólio: <span className="text-white">Otimização Realizada</span>
          </h2>
          <button onClick={onReset} className="text-sm text-slate-400 hover:text-white transition-colors border border-slate-700 px-4 py-2 rounded hover:bg-slate-800 font-medium">
             Nova Simulação
          </button>
        </div>

        {/* KPI Cards */}
        <div className={`grid grid-cols-1 ${isBacktestValid ? 'md:grid-cols-5' : 'md:grid-cols-2'} gap-px bg-slate-800 border-b border-slate-800`}>
           
           {/* Strategy Cards */}
           <div onClick={() => setSelectedPortfolio(data.maxSharpePortfolio)} className={`bg-[#151b2b] p-8 cursor-pointer hover:bg-[#1e293b] transition-colors ${selectedPortfolio.id === data.maxSharpePortfolio.id ? 'bg-[#1e293b] border-b-4 md:border-b-0 md:border-l-4 border-emerald-500' : ''}`}>
              <div className="text-sm text-slate-400 font-bold uppercase mb-2">Max Sharpe Ratio</div>
              <div className="text-4xl font-bold text-white mb-2">{(data.maxSharpePortfolio.sharpe).toFixed(2)}</div>
              <div className="text-sm text-emerald-500 flex items-center gap-1 font-bold"> <TrendingUp size={16} /> Recomendado </div>
           </div>

           <div onClick={() => setSelectedPortfolio(data.minRiskPortfolio)} className={`bg-[#151b2b] p-8 cursor-pointer hover:bg-[#1e293b] transition-colors ${selectedPortfolio.id === data.minRiskPortfolio.id ? 'bg-[#1e293b] border-b-4 md:border-b-0 md:border-l-4 border-blue-500' : ''}`}>
              <div className="text-sm text-slate-400 font-bold uppercase mb-2">Risco Mínimo</div>
              <div className="text-4xl font-bold text-white mb-2">{(data.minRiskPortfolio.risk * 100).toFixed(2)}%</div>
              <div className="text-sm text-blue-400 flex items-center gap-1 font-bold"> <ShieldCheck size={16} /> Conservador </div>
           </div>

           {/* Backtest Card - Only visible if backtest exists */}
           {isBacktestValid && (
             <div className="bg-[#151b2b] p-8 border-l border-slate-800 col-span-1 md:col-span-3">
                  <div className="flex flex-col h-full justify-between">
                     <div className="flex justify-between items-start">
                        <div>
                          <div className="text-sm text-slate-400 font-bold uppercase mb-2 flex items-center gap-2">
                            <Calendar size={16} /> Backtest (30 Dias)
                          </div>
                          <div className="text-sm text-slate-500 flex items-center gap-2 font-mono">
                             <span>{backtest.startDate}</span>
                             <ArrowRight size={14} />
                             <span>{backtest.endDate}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                           <div className={`text-4xl font-bold mb-1 ${backtest.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {backtest.profitPercent > 0 ? '+' : ''}{backtest.profitPercent.toFixed(2)}%
                           </div>
                           <div className={`text-sm font-bold ${backtest.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {backtest.profit >= 0 ? 'Lucro: ' : 'Prejuízo: '} {formatCurrency(backtest.profit)}
                           </div>
                        </div>
                     </div>
                     <div className="w-full bg-slate-800 h-2 mt-4 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${backtest.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                          style={{width: `${Math.min(Math.abs(backtest.profitPercent) * 10, 100)}%`}}
                        ></div>
                     </div>
                  </div>
             </div>
           )}

        </div>

        {/* Main Content: Chart + Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[700px]">
          
          {/* Chart Area */}
          <div className="lg:col-span-8 p-8 border-r border-slate-800 bg-[#0f1522]">
            <div className="flex justify-between items-center mb-8">
               <h3 className="text-base font-bold text-slate-200 border-l-4 border-emerald-500 pl-3">Fronteira Eficiente de Markowitz</h3>
               <div className="flex gap-6 text-xs uppercase font-bold tracking-wider">
                  <span className="flex items-center gap-2 text-emerald-400 cursor-pointer" onClick={() => setSelectedPortfolio(data.maxSharpePortfolio)}>
                      <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div> Max Sharpe
                  </span>
                  <span className="flex items-center gap-2 text-blue-400 cursor-pointer" onClick={() => setSelectedPortfolio(data.minRiskPortfolio)}>
                      <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div> Min Risco
                  </span>
                  <span className="flex items-center gap-2 text-purple-400 cursor-pointer" onClick={() => setSelectedPortfolio(data.maxReturnPortfolio)}>
                      <div className="w-3 h-3 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]"></div> Max Retorno
                  </span>
               </div>
            </div>
            
            <div className="h-[550px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={true} horizontal={true} opacity={0.5} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Risco" 
                    unit="%" 
                    tickFormatter={formatAxis} 
                    stroke="#94a3b8" 
                    tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 500}} 
                    tickLine={false} 
                    axisLine={{ stroke: '#475569' }} 
                    domain={['auto', 'auto']} 
                    dy={10}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Retorno" 
                    unit="%" 
                    tickFormatter={formatAxis} 
                    stroke="#94a3b8" 
                    tick={{fontSize: 12, fill: '#94a3b8', fontWeight: 500}} 
                    tickLine={false} 
                    axisLine={{ stroke: '#475569' }} 
                    domain={['auto', 'auto']} 
                    dx={-10}
                  />
                  <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#fff', strokeWidth: 1 }} content={<CustomTooltip />} isAnimationActive={false} />
                  
                  {/* Simulation Cloud - Slightly bigger points */}
                  <Scatter name="Simulações" data={cloudData} fill="#64748b" isAnimationActive={false} onClick={(p: any) => setSelectedPortfolio(p.payload.payload)} style={{ cursor: 'pointer' }}>
                    {cloudData.map((entry, index) => (
                       <Cell 
                         key={`cell-${index}`} 
                         fill={entry.z > (data.maxSharpePortfolio.sharpe * 0.85) ? '#60a5fa' : '#475569'} 
                         fillOpacity={entry.z > (data.maxSharpePortfolio.sharpe * 0.85) ? 0.6 : 0.3} 
                         r={4} 
                       />
                    ))}
                  </Scatter>

                  {/* Highlight Points - Much bigger, brighter, no border */}
                  <Scatter data={highlightPoints} zAxisId={10} isAnimationActive={false} onClick={(p: any) => setSelectedPortfolio(p.payload.payload)} style={{ cursor: 'pointer' }}>
                     {highlightPoints.map((entry, index) => (
                        <Cell 
                          key={`highlight-${index}`} 
                          fill={entry.color}
                          r={12} // Increased size significantly
                        />
                     ))}
                     <LabelList dataKey="name" position="top" offset={15} style={{ fill: '#f1f5f9', fontSize: 12, fontWeight: 800, textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }} />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              
              <div className="flex justify-center items-center mt-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Risco (Volatilidade Anualizada)</div>
              </div>
              <div className="absolute top-1/2 left-4 transform -rotate-90 -translate-y-1/2 origin-left text-center">
                 <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Retorno Esperado (Anualizado)</div>
              </div>
            </div>
          </div>

          {/* Scanner Table / Details */}
          <div className="lg:col-span-4 bg-[#0b0f19] flex flex-col border-l border-slate-800">
             <div className="p-6 border-b border-slate-800 bg-[#151b2b]">
                <h3 className="text-base font-bold text-slate-200">Composição da Carteira</h3>
                <div className="flex justify-between items-end mt-1">
                   <p className="text-xs text-slate-400">Pesos para: <strong className="text-white text-sm">{selectedPortfolio.id === data.maxSharpePortfolio.id ? 'Max Sharpe' : selectedPortfolio.id === data.minRiskPortfolio.id ? 'Risco Mínimo' : selectedPortfolio.id === data.maxReturnPortfolio.id ? 'Max Retorno' : 'Seleção Manual'}</strong></p>
                   <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-1 rounded flex items-center gap-1 border border-emerald-900/30 font-bold">
                      <Layers size={10} /> Lote Padrão: 100
                   </span>
                </div>
             </div>

             <div className="h-[220px] border-b border-slate-800 relative bg-[#0b0f19] py-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={pieData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={55} 
                      outerRadius={80} 
                      paddingAngle={3} 
                      dataKey="value" 
                      stroke="none" 
                      startAngle={90} 
                      endAngle={-270}
                    >
                      {allocationTableData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => `${formatCurrency(val)}`} contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '14px'}} itemStyle={{color: '#fff'}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                   <span className="block text-3xl font-bold text-white tracking-tighter">{allocationTableData.length}</span>
                   <span className="text-[10px] text-slate-500 uppercase font-bold">Ativos</span>
                </div>
             </div>

             <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="text-xs font-bold text-slate-500 uppercase bg-[#151b2b] sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-800">Ativo</th>
                      <th className="px-4 py-3 text-right border-b border-slate-800">Peso</th>
                      <th className="px-4 py-3 text-right border-b border-slate-800">Qtd.</th>
                      <th className="px-4 py-3 text-right border-b border-slate-800">Alocação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {allocationTableData.map((item) => {
                      const weightPct = item.weight * 100;
                      return (
                        <tr key={item.ticker} className="hover:bg-[#151b2b] transition-colors group">
                          <td className="px-4 py-3 font-bold text-slate-200 flex items-center gap-2 text-base">
                            <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}`}}></div>
                            {item.ticker.replace('.SA', '')}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono text-base font-bold ${weightPct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{weightPct.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right font-mono text-base text-slate-300">{item.realShares}</td>
                          <td className="px-4 py-3 text-right text-slate-400 group-hover:text-white transition-colors text-base font-mono font-bold">{formatCurrency(item.realValue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[#151b2b] border-t border-slate-700 sticky bottom-0">
                     {/* Row for Total Invested */}
                     <tr>
                        <td className="px-4 py-2 font-bold text-xs uppercase text-slate-400">Total Investido</td>
                        <td className="px-4 py-2 text-right font-mono text-sm font-bold text-slate-300">{totalTheoreticalWeight.toFixed(0)}%</td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-right font-mono text-lg font-bold text-emerald-400">{formatCurrency(totalRealValue)}</td>
                     </tr>
                     {/* Row for Cash Remaining */}
                     <tr className="bg-[#1e293b]">
                        <td className="px-4 py-2 font-bold text-xs uppercase text-slate-400 flex items-center gap-1"><Wallet size={12}/> Caixa Livre</td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-right font-mono text-lg font-bold text-blue-300">{formatCurrency(remainingCash)}</td>
                     </tr>
                  </tfoot>
                </table>
             </div>
          </div>
        </div>

        <div className="bg-[#151b2b] p-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500 animate-pulse"><Zap size={24} /></div>
              <div>
                 <div className="text-xs text-slate-500 font-bold uppercase">Recomendação do Modelo</div>
                 <div className="text-base font-bold text-white tracking-wide">
                    {selectedPortfolio.id === data.maxSharpePortfolio.id && 'COMPRAR PORTFÓLIO (MAX SHARPE)'}
                    {selectedPortfolio.id === data.minRiskPortfolio.id && 'COMPRAR PORTFÓLIO (RISCO MÍNIMO)'}
                    {selectedPortfolio.id === data.maxReturnPortfolio.id && 'COMPRAR PORTFÓLIO (RETORNO MÁXIMO)'}
                    {!['maxSharpe', 'minRisk', 'maxReturn'].some(k => (data as any)[k + 'Portfolio']?.id === selectedPortfolio.id) && 'PORTFÓLIO PERSONALIZADO'}
                 </div>
              </div>
           </div>
           <div className="flex gap-10 pr-4">
              <div className="text-right">
                 <div className="text-xs text-slate-500 uppercase font-bold mb-1">Risco Financeiro (VaR Proxy)</div>
                 <div className="text-xl font-mono text-rose-400 font-bold">{formatCurrency(selectedPortfolio.risk * totalRealValue)}</div>
              </div>
              <div className="text-right">
                 <div className="text-xs text-slate-500 uppercase font-bold mb-1">Índice Sharpe</div>
                 <div className="text-xl font-mono text-emerald-400 font-bold">{selectedPortfolio.sharpe.toFixed(3)}</div>
              </div>
           </div>
        </div>
      </div>

      {/* Backtest Detailed Analysis - Only visible if Valid */}
      {isBacktestValid && (
        <div className="bg-[#151b2b] rounded-xl border border-slate-800 shadow-lg overflow-hidden">
           <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-[#0f1522]">
             <Target className="text-blue-400" size={20} />
             <h3 className="text-base font-bold text-slate-200">Detalhes do Backtest: Realizado vs Expectativa</h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="text-sm text-slate-500 uppercase bg-[#0f1522]">
                  <tr>
                    <th className="px-6 py-4 font-bold border-b border-slate-800">Ativo</th>
                    <th className="px-6 py-4 font-bold text-right border-b border-slate-800">Peso na Carteira</th>
                    <th className="px-6 py-4 font-bold text-right border-b border-slate-800">Retorno Realizado</th>
                    <th className="px-6 py-4 font-bold text-right border-b border-slate-800">Expectativa (Mês)</th>
                    <th className="px-6 py-4 font-bold text-right border-b border-slate-800">Delta (Real - Exp)</th>
                    <th className="px-6 py-4 font-bold text-right border-b border-slate-800">Resultado (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {backtest.assetPerformance.filter(a => Math.abs(a.weight) > 0.01).map((item) => {
                     const delta = item.percent - item.expectedPercent;
                     const isPositive = delta >= 0;
                     const isRealizedPositive = item.percent >= 0;
                     
                     return (
                       <tr key={item.ticker} className="hover:bg-[#1e293b] transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-300 flex flex-col">
                             <span className="text-base">{item.ticker.replace('.SA', '')}</span>
                             <span className="text-xs font-normal text-slate-500 mt-1">
                               {formatCurrency(item.startPrice)} <ArrowRight size={10} className="inline mx-0.5"/> {formatCurrency(item.endPrice)}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-400 text-base">
                             {(item.weight * 100).toFixed(1)}%
                          </td>
                          <td className={`px-6 py-4 text-right font-mono font-bold text-base ${isRealizedPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                             {item.percent > 0 ? '+' : ''}{item.percent.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-400 text-base">
                             {item.expectedPercent.toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 text-right text-base">
                             <div className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-bold ${isPositive ? 'bg-emerald-900/20 text-emerald-400' : 'bg-rose-900/20 text-rose-400'}`}>
                                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {delta > 0 ? '+' : ''}{delta.toFixed(2)}%
                             </div>
                          </td>
                          <td className={`px-6 py-4 text-right font-mono font-bold text-base ${item.contribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                             {formatCurrency(item.contribution)}
                          </td>
                       </tr>
                     );
                  })}
                </tbody>
                {/* Tabela Totais / Footer */}
                {backtestTotals && (
                   <tfoot className="bg-[#151b2b] border-t border-slate-700 font-bold text-sm sticky bottom-0 shadow-lg">
                       <tr>
                           <td className="px-6 py-4 text-slate-300 uppercase text-xs tracking-wider">Total</td>
                           <td className="px-6 py-4 text-right font-mono text-slate-300">{backtestTotals.totalWeight.toFixed(1)}%</td>
                           <td className={`px-6 py-4 text-right font-mono text-base ${backtestTotals.totalRealizedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                               {backtestTotals.totalRealizedReturn > 0 ? '+' : ''}{backtestTotals.totalRealizedReturn.toFixed(2)}%
                           </td>
                           <td className="px-6 py-4 text-right font-mono text-slate-400 text-base">
                               {backtestTotals.totalExpectedReturn.toFixed(2)}%
                           </td>
                           <td className="px-6 py-4 text-right">
                                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-bold ${backtestTotals.totalDelta >= 0 ? 'bg-emerald-900/20 text-emerald-400' : 'bg-rose-900/20 text-rose-400'}`}>
                                   {backtestTotals.totalDelta > 0 ? '+' : ''}{backtestTotals.totalDelta.toFixed(2)}%
                                </div>
                           </td>
                           <td className={`px-6 py-4 text-right font-mono text-base ${backtestTotals.totalFinancialResult >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                               {formatCurrency(backtestTotals.totalFinancialResult)}
                           </td>
                       </tr>
                   </tfoot>
                )}
             </table>
           </div>
        </div>
      )}

      {/* Correlation Matrix */}
      <div className="bg-[#151b2b] rounded-xl border border-slate-800 shadow-lg p-8">
         <h3 className="text-base font-bold text-slate-300 mb-6 uppercase tracking-wider border-l-4 border-purple-500 pl-3">Matriz de Correlação</h3>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-400 border-collapse">
              <thead>
                <tr>
                  <th className="p-4 text-left bg-[#0f1522] border-b border-slate-800 font-bold text-slate-300">ATIVO</th>
                  {assets.map(a => <th key={a.ticker} className="p-4 font-bold text-slate-300 bg-[#0f1522] border-b border-slate-800">{a.ticker.replace('.SA','')}</th>)}
                </tr>
              </thead>
              <tbody>
                {assets.map((rowAsset, rIdx) => (
                  <tr key={rowAsset.ticker} className="border-b border-slate-800/50 last:border-0 hover:bg-[#1e293b] transition-colors">
                    <td className="p-4 font-bold text-slate-300 bg-[#0f1522] border-r border-slate-800">{rowAsset.ticker.replace('.SA','')}</td>
                    {assets.map((colAsset, cIdx) => {
                      const val = data.correlationMatrix[rIdx][cIdx];
                      let bg = '';
                      let text = 'text-slate-500';
                      if (rIdx === cIdx) {
                        text = 'text-slate-700';
                      } else {
                        if (val > 0.8) { text = 'text-emerald-400 font-bold'; bg = 'bg-emerald-900/10'; }
                        else if (val > 0.5) { text = 'text-emerald-500'; }
                        else if (val < -0.5) { text = 'text-rose-400 font-bold'; bg = 'bg-rose-900/10'; }
                        else if (val < 0) { text = 'text-rose-500'; }
                      }
                      return <td key={colAsset.ticker} className={`p-4 text-center ${text} ${bg}`}>{val.toFixed(2)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default ResultsSection;
