import React, { useState, useEffect } from 'react';
import { OptimizationSettings, UserAssetInput, StrategyType } from '../types';
import { Play, Settings, DollarSign, Plus, Trash2, TrendingUp, ShieldCheck, Zap, BarChart2, Calendar, Wand2, History, Briefcase, Sparkles, Info, Key } from 'lucide-react';
import { calculateFamaFrenchEstimation, suggestBestPortfolio } from '../services/mathService';

interface InputSectionProps {
  onSimulate: (inputs: UserAssetInput[], settings: OptimizationSettings) => void;
  isLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onSimulate, isLoading }) => {
  // Get date 2 months ago as default for backtest
  const getDefaultDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().split('T')[0];
  };

  const [assets, setAssets] = useState<UserAssetInput[]>([
    { ticker: 'PETR4', expectedMonthlyReturn: 2.5 },
    { ticker: 'VALE3', expectedMonthlyReturn: 1.8 },
    { ticker: 'ITUB4', expectedMonthlyReturn: 1.2 },
    { ticker: 'BBDC4', expectedMonthlyReturn: 1.1 },
    { ticker: 'ABEV3', expectedMonthlyReturn: 0.8 }
  ]);

  const [settings, setSettings] = useState<OptimizationSettings>({
    period: '1y',
    riskFreeRate: 0.1075, // Default Selic approx internal value
    simulationCount: 2000,
    totalCapital: 100000,
    strategy: 'MAX_SHARPE',
    backtestDate: getDefaultDate(),
    mode: 'INVESTMENT', // Default mode
    alphaVantageKey: ''
  });

  // Local state for formatted capital display
  const [capitalDisplay, setCapitalDisplay] = useState("100.000");

  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-digits
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) : 0;
    
    // Update internal settings with raw number
    setSettings({ ...settings, totalCapital: numericValue });
    
    // Update display with thousand separators
    setCapitalDisplay(numericValue.toLocaleString('pt-BR'));
  };

  const handleAddAsset = () => {
    setAssets([...assets, { ticker: '', expectedMonthlyReturn: 0 }]);
  };

  const handleRemoveAsset = (index: number) => {
    const newAssets = assets.filter((_, i) => i !== index);
    setAssets(newAssets);
  };

  const handleAssetChange = (index: number, field: keyof UserAssetInput, value: string | number) => {
    const newAssets = assets.map((item, i) => {
      if (i !== index) return item;
      if (field === 'ticker') {
        return { ...item, ticker: (value as string).toUpperCase().replace('.SA', '') };
      } else {
        return { ...item, expectedMonthlyReturn: parseFloat(value as string) };
      }
    });
    setAssets(newAssets);
  };

  const handleFamaFrenchEstimate = () => {
    const updatedAssets = assets.map(asset => {
      if (!asset.ticker) return asset;
      const estimated = calculateFamaFrenchEstimation(asset.ticker);
      return { ...asset, expectedMonthlyReturn: estimated };
    });
    setAssets(updatedAssets);
  };

  const handleSuggestPortfolio = () => {
    const suggestedAssets = suggestBestPortfolio();
    setAssets(suggestedAssets);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validAssets = assets.filter(a => a.ticker.trim().length > 0);
    
    if (validAssets.length < 2) {
      alert("Por favor, insira pelo menos 2 ativos para otimizar a carteira.");
      return;
    }
    
    const processedAssets = validAssets.map(a => ({
      ...a,
      ticker: a.ticker.includes('.SA') ? a.ticker : `${a.ticker}.SA`
    }));

    onSimulate(processedAssets, settings);
  };

  return (
    <div className="w-full h-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-4">
        
        {/* Left Panel: Inputs */}
        <div className="lg:w-5/12 bg-[#151b2b] rounded-xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-full">
          
          {/* Mode Toggle Compact */}
          <div className="px-4 py-2 border-b border-slate-800 bg-[#0f1522]">
             <div className="bg-[#1e293b] p-0.5 rounded-lg flex text-xs font-bold">
                <button 
                  onClick={() => setSettings({...settings, mode: 'INVESTMENT'})}
                  className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition-all ${settings.mode === 'INVESTMENT' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                   <Briefcase size={14} /> Novo Investimento
                </button>
                <button 
                  onClick={() => setSettings({...settings, mode: 'BACKTEST'})}
                  className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition-all ${settings.mode === 'BACKTEST' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                   <History size={14} /> Backtesting
                </button>
             </div>
          </div>
          
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3 overflow-hidden">

              {/* Alpha Vantage Key - Compact */}
              <div className="flex items-center gap-2 bg-[#0b0f19] border border-slate-700 rounded-lg p-1.5 px-3">
                 <Key className="text-slate-500 flex-shrink-0" size={14} />
                 <input 
                    type="text" 
                    value={settings.alphaVantageKey}
                    onChange={(e) => setSettings({...settings, alphaVantageKey: e.target.value})}
                    placeholder="API Key Alpha Vantage (Opcional)"
                    className="w-full bg-transparent border-none text-slate-300 outline-none font-mono text-xs placeholder-slate-600"
                 />
                 <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer" className="text-[10px] text-emerald-500 hover:underline whitespace-nowrap">
                    Obter Key
                 </a>
              </div>
              
              {/* Assets List - Flex Grow */}
              <div className="flex-1 flex flex-col min-h-0 border border-slate-800 rounded-lg bg-[#0b0f19]/50">
                <div className="flex justify-between items-center p-2 border-b border-slate-800 bg-[#0b0f19]">
                  <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Settings size={12} className="text-slate-500"/> Ativos ({assets.length})
                  </label>
                  <div className="flex gap-1">
                    <button type="button" onClick={handleSuggestPortfolio} className="text-[10px] bg-amber-900/30 text-amber-300 px-2 py-1 rounded flex items-center gap-1 border border-amber-800/50 hover:bg-amber-900/50"><Sparkles size={10} /> IA</button>
                    <button type="button" onClick={handleFamaFrenchEstimate} className="text-[10px] bg-purple-900/30 text-purple-300 px-2 py-1 rounded flex items-center gap-1 border border-purple-800/50 hover:bg-purple-900/50"><Wand2 size={10} /> FF5</button>
                    <button type="button" onClick={handleAddAsset} className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-1 rounded flex items-center gap-1 border border-slate-700 hover:bg-slate-700"><Plus size={10} /> Add</button>
                  </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {assets.map((asset, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center bg-[#0b0f19] p-1.5 rounded border border-slate-800 hover:border-slate-700 group">
                      <div className="col-span-5">
                         <input type="text" value={asset.ticker} onChange={(e) => handleAssetChange(index, 'ticker', e.target.value)} placeholder="TICKER" className="w-full bg-transparent text-slate-200 text-sm font-bold font-mono uppercase outline-none placeholder-slate-700" />
                      </div>
                      <div className="col-span-5 flex items-center justify-end gap-1 relative">
                         <TrendingUp size={12} className={`absolute left-0 ${asset.expectedMonthlyReturn >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}`} />
                         <input type="number" step="0.1" value={asset.expectedMonthlyReturn} onChange={(e) => handleAssetChange(index, 'expectedMonthlyReturn', e.target.value)} className={`w-16 bg-transparent text-right text-sm font-bold outline-none ${asset.expectedMonthlyReturn > 0 ? 'text-emerald-400' : asset.expectedMonthlyReturn < 0 ? 'text-rose-400' : 'text-slate-400'}`} placeholder="0.0" />
                         <span className="text-xs text-slate-500 font-medium">%</span>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button type="button" onClick={() => handleRemoveAsset(index)} className="text-slate-600 hover:text-rose-500 p-1 rounded opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategy - Horizontal Compact */}
              <div>
                 <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Objetivo</label>
                 <div className="grid grid-cols-3 gap-2">
                    {['MIN_RISK', 'MAX_SHARPE', 'MAX_RETURN'].map((s) => (
                        <label key={s} className={`cursor-pointer border rounded-md p-2 flex flex-col items-center justify-center gap-1 transition-all ${settings.strategy === s ? (s === 'MIN_RISK' ? 'bg-blue-900/20 border-blue-500/50' : s === 'MAX_SHARPE' ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-purple-900/20 border-purple-500/50') : 'bg-[#0b0f19] border-slate-700 hover:border-slate-600'}`}>
                            <input type="radio" name="strategy" className="hidden" checked={settings.strategy === s} onChange={() => setSettings({...settings, strategy: s as StrategyType})} />
                            {s === 'MIN_RISK' && <ShieldCheck size={16} className={settings.strategy === s ? 'text-blue-400' : 'text-slate-500'} />}
                            {s === 'MAX_SHARPE' && <BarChart2 size={16} className={settings.strategy === s ? 'text-emerald-400' : 'text-slate-500'} />}
                            {s === 'MAX_RETURN' && <Zap size={16} className={settings.strategy === s ? 'text-purple-400' : 'text-slate-500'} />}
                            <span className={`text-[10px] font-bold text-center uppercase whitespace-nowrap ${settings.strategy === s ? 'text-white' : 'text-slate-500'}`}>
                                {s === 'MIN_RISK' ? 'Menor Risco' : s === 'MAX_SHARPE' ? 'Max Sharpe' : 'Max Retorno'}
                            </span>
                        </label>
                    ))}
                 </div>
              </div>

              {/* Bottom Row: Capital & Mode Info */}
              <div className="grid grid-cols-2 gap-3">
                  {/* Capital */}
                  <div>
                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Capital (R$)</label>
                     <div className="relative bg-[#0b0f19] border border-slate-700 rounded-lg p-1 flex items-center focus-within:border-emerald-500 transition-colors h-[42px]">
                        <DollarSign className="absolute left-2 text-emerald-500" size={14} />
                        <input type="text" value={capitalDisplay} onChange={handleCapitalChange} className="w-full bg-transparent border-none text-white pl-7 py-1 outline-none font-mono text-sm font-bold" />
                     </div>
                  </div>

                  {/* Mode Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        {settings.mode === 'INVESTMENT' ? 'Info' : 'Data Início'}
                    </label>
                    {settings.mode === 'INVESTMENT' ? (
                        <div className="bg-[#0f1522] border border-slate-700 rounded-lg px-2 flex items-center h-[42px] text-xs text-slate-300 leading-tight">
                           <span className="text-emerald-400 font-bold mr-1">Hoje:</span> Preços atuais de fechamento.
                        </div>
                    ) : (
                        <div className="relative bg-[#0b0f19] border border-slate-700 rounded-lg p-1 flex items-center h-[42px]">
                          <Calendar className="absolute left-2 text-slate-500" size={14} />
                          <input type="date" value={settings.backtestDate} onChange={(e) => setSettings({...settings, backtestDate: e.target.value})} className="w-full bg-transparent border-none text-slate-200 pl-7 py-1 outline-none font-mono text-xs" max={new Date().toISOString().split('T')[0]} />
                       </div>
                    )}
                  </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 mt-auto">
                {isLoading ? <>Processando...</> : <><Play size={16} fill="currentColor" /> Executar Otimização</>}
              </button>

            </form>
          </div>
        </div>

        {/* Right Panel: Illustration */}
        <div className="lg:w-7/12 flex flex-col h-full">
           <div className="bg-[#151b2b] border border-slate-800 rounded-xl p-6 flex-1 flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-800/[0.2] bg-[length:20px_20px]"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#151b2b] to-transparent"></div>
              
              <div className="relative z-10 max-w-md">
                 <div className="w-16 h-16 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <BarChart2 size={32} className="text-emerald-500" />
                 </div>
                 <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">
                    Otimizador de Markowitz
                 </h1>
                 <p className="text-slate-400 text-sm leading-relaxed mb-8">
                    Utilize a Teoria Moderna de Portfólios para encontrar a alocação ideal dos seus ativos. 
                    Visualize a Fronteira Eficiente e tome decisões baseadas em dados.
                 </p>
                 
                 <div className="grid grid-cols-3 gap-3 text-left">
                    <div className="bg-[#0b0f19] p-3 rounded border border-slate-800">
                       <div className="text-emerald-400 font-bold text-base mb-0.5">100%</div>
                       <div className="text-slate-500 text-[10px] uppercase font-bold">Client-Side</div>
                    </div>
                    <div className="bg-[#0b0f19] p-3 rounded border border-slate-800">
                       <div className="text-blue-400 font-bold text-base mb-0.5">Data</div>
                       <div className="text-slate-500 text-[10px] uppercase font-bold">15min Delay</div>
                    </div>
                    <div className="bg-[#0b0f19] p-3 rounded border border-slate-800">
                       <div className="text-purple-400 font-bold text-base mb-0.5">Monte Carlo</div>
                       <div className="text-slate-500 text-[10px] uppercase font-bold">Simulação</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
    </div>
  );
};

export default InputSection;