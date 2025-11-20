
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
    <div className="w-full max-w-[1600px] mx-auto mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Inputs */}
        <div className="lg:col-span-5 bg-[#151b2b] rounded-xl border border-slate-800 shadow-lg overflow-hidden flex flex-col">
          
          {/* Mode Toggle Header */}
          <div className="p-4 border-b border-slate-800 bg-[#0f1522]">
             <div className="bg-[#1e293b] p-1 rounded-lg flex text-sm font-bold relative">
                <button 
                  onClick={() => setSettings({...settings, mode: 'INVESTMENT'})}
                  className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all z-10 ${settings.mode === 'INVESTMENT' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                   <Briefcase size={16} /> Novo Investimento
                </button>
                <button 
                  onClick={() => setSettings({...settings, mode: 'BACKTEST'})}
                  className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all z-10 ${settings.mode === 'BACKTEST' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                   <History size={16} /> Backtesting
                </button>
             </div>
          </div>
          
          <div className="p-5 border-b border-slate-800">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Settings size={20} className={settings.mode === 'INVESTMENT' ? "text-emerald-400" : "text-blue-400"} />
              Parâmetros da Carteira
            </h2>
          </div>
          
          <div className="p-5 flex-1 flex flex-col">
            <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">

              {/* Alpha Vantage API Key Input */}
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Alpha Vantage API Key (Opcional)</label>
                 <div className="relative bg-[#0b0f19] border border-slate-700 rounded-lg p-1 flex items-center focus-within:border-emerald-500 transition-colors">
                    <Key className="absolute left-3 text-slate-500" size={16} />
                    <input 
                      type="text" 
                      value={settings.alphaVantageKey}
                      onChange={(e) => setSettings({...settings, alphaVantageKey: e.target.value})}
                      placeholder="Insira sua chave gratuita..."
                      className="w-full bg-transparent border-none text-white pl-10 py-2 outline-none font-mono text-sm"
                    />
                 </div>
                 <p className="text-[10px] text-slate-500 mt-1">
                   Sem chave, o sistema pode falhar em obter dados. <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Obter chave gratuita</a>.
                 </p>
              </div>
              
              {/* Assets Table Input */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-slate-300 uppercase">Ativos & Expectativas</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSuggestPortfolio}
                      className="text-xs bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 px-3 py-2 rounded flex items-center gap-1 transition-colors border border-amber-800/50 font-medium animate-in fade-in"
                      title="Sugerir 10 melhores ativos baseado em Retorno/Volatilidade (Fama-French)"
                    >
                      <Sparkles size={14} /> Sugerir Carteira (IA)
                    </button>

                    <button
                      type="button"
                      onClick={handleFamaFrenchEstimate}
                      className="text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 px-3 py-2 rounded flex items-center gap-1 transition-colors border border-purple-800/50 font-medium"
                      title="Estimar retornos usando modelo Fama-French 5 Fatores"
                    >
                      <Wand2 size={14} /> Auto-Estimar (FF5)
                    </button>
                    <button 
                      type="button" 
                      onClick={handleAddAsset}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-2 rounded flex items-center gap-1 transition-colors border border-slate-700 font-medium"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-3 mb-2 px-2">
                   <div className="col-span-5 text-xs font-bold text-slate-500 uppercase">Ticker (Cód.)</div>
                   <div className="col-span-5 text-xs font-bold text-slate-500 uppercase text-right">Retorno Mensal</div>
                   <div className="col-span-2"></div>
                </div>

                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                  {assets.map((asset, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-[#0b0f19] p-2 rounded border border-slate-800 hover:border-slate-700 transition-colors group">
                      
                      {/* Ticker Input */}
                      <div className="col-span-5 relative">
                         <input
                          type="text"
                          value={asset.ticker}
                          onChange={(e) => handleAssetChange(index, 'ticker', e.target.value)}
                          placeholder="PETR4"
                          className="w-full p-2 bg-transparent text-slate-200 text-base font-bold font-mono uppercase outline-none placeholder-slate-700"
                        />
                      </div>

                      {/* Return Input */}
                      <div className="col-span-5 flex items-center justify-end gap-1 relative">
                         <TrendingUp size={14} className={`absolute left-0 ${asset.expectedMonthlyReturn >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}`} />
                         <input
                            type="number"
                            step="0.1"
                            value={asset.expectedMonthlyReturn}
                            onChange={(e) => handleAssetChange(index, 'expectedMonthlyReturn', e.target.value)}
                            className={`w-24 p-2 bg-transparent text-right text-base font-bold outline-none ${
                                asset.expectedMonthlyReturn > 0 ? 'text-emerald-400' : 
                                asset.expectedMonthlyReturn < 0 ? 'text-rose-400' : 'text-slate-400'
                            }`}
                            placeholder="0.0"
                          />
                          <span className="text-sm text-slate-500 font-medium">%</span>
                      </div>

                      {/* Delete Button */}
                      <div className="col-span-2 flex justify-end">
                        <button 
                          type="button"
                          onClick={() => handleRemoveAsset(index)}
                          className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-800 w-full"></div>

              {/* Strategy Selection */}
              <div>
                 <label className="block text-sm font-bold text-slate-300 uppercase mb-3">Objetivo da Otimização</label>
                 <div className="grid grid-cols-3 gap-3">
                    <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all ${settings.strategy === 'MIN_RISK' ? 'bg-blue-900/20 border-blue-500/50' : 'bg-[#0b0f19] border-slate-700 hover:border-slate-600'}`}>
                        <input type="radio" name="strategy" className="hidden" checked={settings.strategy === 'MIN_RISK'} onChange={() => setSettings({...settings, strategy: 'MIN_RISK'})} />
                        <ShieldCheck size={24} className={settings.strategy === 'MIN_RISK' ? 'text-blue-400' : 'text-slate-500'} />
                        <span className={`text-xs font-bold text-center uppercase ${settings.strategy === 'MIN_RISK' ? 'text-blue-200' : 'text-slate-500'}`}>Menor Risco</span>
                    </label>

                    <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all ${settings.strategy === 'MAX_SHARPE' ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-[#0b0f19] border-slate-700 hover:border-slate-600'}`}>
                        <input type="radio" name="strategy" className="hidden" checked={settings.strategy === 'MAX_SHARPE'} onChange={() => setSettings({...settings, strategy: 'MAX_SHARPE'})} />
                        <BarChart2 size={24} className={settings.strategy === 'MAX_SHARPE' ? 'text-emerald-400' : 'text-slate-500'} />
                        <span className={`text-xs font-bold text-center uppercase ${settings.strategy === 'MAX_SHARPE' ? 'text-emerald-200' : 'text-slate-500'}`}>Max Sharpe</span>
                    </label>

                    <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all ${settings.strategy === 'MAX_RETURN' ? 'bg-purple-900/20 border-purple-500/50' : 'bg-[#0b0f19] border-slate-700 hover:border-slate-600'}`}>
                        <input type="radio" name="strategy" className="hidden" checked={settings.strategy === 'MAX_RETURN'} onChange={() => setSettings({...settings, strategy: 'MAX_RETURN'})} />
                        <Zap size={24} className={settings.strategy === 'MAX_RETURN' ? 'text-purple-400' : 'text-slate-500'} />
                        <span className={`text-xs font-bold text-center uppercase ${settings.strategy === 'MAX_RETURN' ? 'text-purple-200' : 'text-slate-500'}`}>Max Retorno</span>
                    </label>
                 </div>
              </div>

              {/* Mode Specific Inputs */}
              {settings.mode === 'INVESTMENT' ? (
                 <div className="bg-[#0f1522] border border-slate-700 rounded-lg p-4 flex items-start gap-3">
                    <div className="bg-slate-800 p-2 rounded text-emerald-400">
                       <Info size={20} />
                    </div>
                    <div>
                        <h4 className="text-base font-bold text-slate-300">Modo Novo Investimento</h4>
                        <p className="text-sm font-medium text-slate-400 mt-1 leading-relaxed">
                          A otimização será feita com os preços atuais de fechamento.
                        </p>
                    </div>
                 </div>
              ) : (
                <div>
                   <label className="block text-sm font-bold text-slate-300 uppercase mb-2">Data Início Backtest</label>
                   <div className="relative bg-[#0b0f19] border border-slate-700 rounded-lg p-1 flex items-center">
                      <Calendar className="absolute left-3 text-slate-500" size={18} />
                      <input 
                        type="date" 
                        value={settings.backtestDate}
                        onChange={(e) => setSettings({...settings, backtestDate: e.target.value})}
                        className="w-full bg-transparent border-none text-slate-200 pl-10 py-2 outline-none font-mono text-sm"
                        max={new Date().toISOString().split('T')[0]}
                      />
                   </div>
                </div>
              )}

              {/* Capital Input */}
              <div>
                 <label className="block text-sm font-bold text-slate-300 uppercase mb-2">Capital Disponível</label>
                 <div className="relative bg-[#0b0f19] border border-slate-700 rounded-lg p-1 flex items-center focus-within:border-emerald-500 transition-colors">
                    <DollarSign className="absolute left-3 text-emerald-500" size={18} />
                    <input 
                      type="text" 
                      value={capitalDisplay}
                      onChange={handleCapitalChange}
                      className="w-full bg-transparent border-none text-white pl-10 py-2 outline-none font-mono text-lg font-bold"
                    />
                    <span className="absolute right-4 text-slate-500 font-bold text-sm">BRL</span>
                 </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-auto"
              >
                {isLoading ? (
                  <>Processando...</>
                ) : (
                  <><Play size={20} fill="currentColor" /> Executar Otimização</>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Right Panel: Info / Illustration */}
        <div className="lg:col-span-7 flex flex-col gap-6">
           {/* Illustration Area */}
           <div className="bg-[#151b2b] border border-slate-800 rounded-xl p-8 flex-1 flex flex-col justify-center items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-slate-800/[0.2] bg-[length:20px_20px]"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#151b2b] to-transparent"></div>
              
              <div className="relative z-10 max-w-md">
                 <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <BarChart2 size={40} className="text-emerald-500" />
                 </div>
                 <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">
                    Otimizador de Markowitz
                 </h1>
                 <p className="text-slate-400 text-base leading-relaxed">
                    Utilize a Teoria Moderna de Portfólios para encontrar a alocação ideal dos seus ativos. 
                    Maximize seu Índice de Sharpe e visualize a Fronteira Eficiente em tempo real.
                 </p>
                 
                 <div className="grid grid-cols-3 gap-4 mt-10 text-left">
                    <div className="bg-[#0b0f19] p-4 rounded border border-slate-800">
                       <div className="text-emerald-400 font-bold text-lg mb-1">100%</div>
                       <div className="text-slate-500 text-xs uppercase font-bold">Client-Side</div>
                    </div>
                    <div className="bg-[#0b0f19] p-4 rounded border border-slate-800">
                       <div className="text-blue-400 font-bold text-lg mb-1">Market Data</div>
                       <div className="text-slate-500 text-xs uppercase font-bold">15min Delay</div>
                    </div>
                    <div className="bg-[#0b0f19] p-4 rounded border border-slate-800">
                       <div className="text-purple-400 font-bold text-lg mb-1">Simulação</div>
                       <div className="text-slate-500 text-xs uppercase font-bold">Monte Carlo</div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InputSection;
