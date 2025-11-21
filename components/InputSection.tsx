
import React, { useState } from 'react';
import { OptimizationSettings, UserAssetInput, StrategyType } from '../types';
import { Play, Settings, DollarSign, Plus, Trash2, TrendingUp, ShieldCheck, Zap, BarChart2, Calendar, Wand2, History, Briefcase, Sparkles, BookOpen, Activity, MousePointer, Globe, Flag } from 'lucide-react';
import { calculateFamaFrenchEstimation, suggestBestPortfolio, formatTickerForYahoo } from '../services/mathService';

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
  });

  // Interaction State
  const [showMarketSelector, setShowMarketSelector] = useState(false);

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

  const handleSuggestPortfolio = (market: 'BR' | 'US' | 'MIXED') => {
    const suggestedAssets = suggestBestPortfolio(market);
    setAssets(suggestedAssets);
    setShowMarketSelector(false);
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
      ticker: formatTickerForYahoo(a.ticker)
    }));

    onSimulate(processedAssets, settings);
  };

  return (
    <div className="w-full h-full max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6 p-2">
        
        {/* Left Panel: Inputs */}
        <div className="lg:w-5/12 bg-[#151b2b] rounded-xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-full">
          
          {/* Mode Toggle Compact */}
          <div className="px-5 py-3 border-b border-slate-800 bg-[#0f1522]">
             <div className="bg-[#1e293b] p-1 rounded-lg flex text-sm font-bold">
                <button 
                  onClick={() => setSettings({...settings, mode: 'INVESTMENT'})}
                  className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${settings.mode === 'INVESTMENT' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                   <Briefcase size={16} /> Novo Investimento
                </button>
                <button 
                  onClick={() => setSettings({...settings, mode: 'BACKTEST'})}
                  className={`flex-1 py-2 rounded-md flex items-center justify-center gap-2 transition-all ${settings.mode === 'BACKTEST' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                   <History size={16} /> Backtesting
                </button>
             </div>
          </div>
          
          <div className="flex-1 flex flex-col p-5 overflow-hidden">
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 overflow-hidden">
              
              {/* Smart Tools Section */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Ferramentas Inteligentes</label>
                <div className="grid grid-cols-2 gap-3">
                  
                  {/* AI Suggestion with Market Selection Logic */}
                  {!showMarketSelector ? (
                    <button 
                      type="button"
                      onClick={() => setShowMarketSelector(true)}
                      className="bg-amber-900/20 hover:bg-amber-900/30 border border-amber-800/50 text-amber-200 rounded-lg p-3 flex items-center justify-center gap-2 transition-colors group"
                    >
                      <Sparkles size={18} className="text-amber-400 group-hover:scale-110 transition-transform"/>
                      <div className="text-left">
                         <div className="text-sm font-bold">Sugestão de Carteira (IA)</div>
                         <div className="text-[10px] text-amber-400/60 font-medium">Seleciona top 10 ativos eficientes</div>
                      </div>
                    </button>
                  ) : (
                    <div className="col-span-2 grid grid-cols-4 gap-2 animate-in fade-in zoom-in-95 duration-200">
                      <button type="button" onClick={() => handleSuggestPortfolio('BR')} className="bg-green-900/20 border border-green-800/50 hover:bg-green-900/40 rounded-lg flex flex-col items-center justify-center py-2 gap-1">
                         <Flag size={16} className="text-green-400"/> <span className="text-xs font-bold text-green-100">Brasil</span>
                      </button>
                      <button type="button" onClick={() => handleSuggestPortfolio('US')} className="bg-blue-900/20 border border-blue-800/50 hover:bg-blue-900/40 rounded-lg flex flex-col items-center justify-center py-2 gap-1">
                         <Flag size={16} className="text-blue-400"/> <span className="text-xs font-bold text-blue-100">EUA</span>
                      </button>
                      <button type="button" onClick={() => handleSuggestPortfolio('MIXED')} className="bg-purple-900/20 border border-purple-800/50 hover:bg-purple-900/40 rounded-lg flex flex-col items-center justify-center py-2 gap-1">
                         <Globe size={16} className="text-purple-400"/> <span className="text-xs font-bold text-purple-100">Mista</span>
                      </button>
                      <button type="button" onClick={() => setShowMarketSelector(false)} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400">
                         Cancelar
                      </button>
                    </div>
                  )}
                  
                  {/* FF5 Predictor (Hidden if selector is active to save space) */}
                  {!showMarketSelector && (
                    <button 
                      type="button"
                      onClick={handleFamaFrenchEstimate}
                      className="bg-purple-900/20 hover:bg-purple-900/30 border border-purple-800/50 text-purple-200 rounded-lg p-3 flex items-center justify-center gap-2 transition-colors group"
                    >
                      <Wand2 size={18} className="text-purple-400 group-hover:rotate-12 transition-transform"/>
                      <div className="text-left">
                         <div className="text-sm font-bold">Prever Retornos (FF5)</div>
                         <div className="text-[10px] text-purple-400/60 font-medium">Estima retorno via modelo fatorial</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Assets List - Flex Grow to fill vertical space */}
              <div className="flex-1 flex flex-col min-h-0 border border-slate-800 rounded-lg bg-[#0b0f19]/50">
                <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-[#0b0f19]">
                  <label className="text-xs font-bold text-slate-300 uppercase flex items-center gap-2 tracking-wider">
                    <Settings size={14} className="text-slate-500"/> Ativos Selecionados ({assets.length})
                  </label>
                  <button type="button" onClick={handleAddAsset} className="text-xs bg-slate-800 text-emerald-400 px-3 py-1.5 rounded flex items-center gap-1.5 border border-slate-700 hover:bg-slate-700 font-medium transition-colors"><Plus size={12} /> Adicionar</button>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {assets.map((asset, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-[#0b0f19] p-2 rounded border border-slate-800 hover:border-slate-700 group transition-colors">
                      <div className="col-span-5">
                         <input type="text" value={asset.ticker} onChange={(e) => handleAssetChange(index, 'ticker', e.target.value)} placeholder="TICKER" className="w-full bg-transparent text-slate-200 text-base font-bold font-mono uppercase outline-none placeholder-slate-700" />
                      </div>
                      <div className="col-span-5 flex items-center justify-end gap-2 relative">
                         <TrendingUp size={14} className={`absolute left-0 ${asset.expectedMonthlyReturn >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}`} />
                         <input type="number" step="0.1" value={asset.expectedMonthlyReturn} onChange={(e) => handleAssetChange(index, 'expectedMonthlyReturn', e.target.value)} className={`w-20 bg-transparent text-right text-base font-bold outline-none ${asset.expectedMonthlyReturn > 0 ? 'text-emerald-400' : asset.expectedMonthlyReturn < 0 ? 'text-rose-400' : 'text-slate-400'}`} placeholder="0.0" />
                         <span className="text-sm text-slate-500 font-medium">%</span>
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <button type="button" onClick={() => handleRemoveAsset(index)} className="text-slate-600 hover:text-rose-500 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategy - Horizontal Compact */}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Objetivo da Otimização</label>
                 <div className="grid grid-cols-3 gap-3">
                    {['MIN_RISK', 'MAX_SHARPE', 'MAX_RETURN'].map((s) => (
                        <label key={s} className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-1.5 transition-all ${settings.strategy === s ? (s === 'MIN_RISK' ? 'bg-blue-900/20 border-blue-500/50' : s === 'MAX_SHARPE' ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-purple-900/20 border-purple-500/50') : 'bg-[#0b0f19] border-slate-700 hover:border-slate-600'}`}>
                            <input type="radio" name="strategy" className="hidden" checked={settings.strategy === s} onChange={() => setSettings({...settings, strategy: s as StrategyType})} />
                            {s === 'MIN_RISK' && <ShieldCheck size={20} className={settings.strategy === s ? 'text-blue-400' : 'text-slate-500'} />}
                            {s === 'MAX_SHARPE' && <BarChart2 size={20} className={settings.strategy === s ? 'text-emerald-400' : 'text-slate-500'} />}
                            {s === 'MAX_RETURN' && <Zap size={20} className={settings.strategy === s ? 'text-purple-400' : 'text-slate-500'} />}
                            <span className={`text-xs font-bold text-center uppercase whitespace-nowrap ${settings.strategy === s ? 'text-white' : 'text-slate-500'}`}>
                                {s === 'MIN_RISK' ? 'Menor Risco' : s === 'MAX_SHARPE' ? 'Max Sharpe' : 'Max Retorno'}
                            </span>
                        </label>
                    ))}
                 </div>
              </div>

              {/* Bottom Row: Capital & Mode Info */}
              <div className="grid grid-cols-2 gap-4">
                  {/* Capital */}
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Capital (R$)</label>
                     <div className="relative bg-[#0b0f19] border border-slate-700 rounded-lg p-1 flex items-center focus-within:border-emerald-500 transition-colors h-[50px]">
                        <DollarSign className="absolute left-3 text-emerald-500" size={18} />
                        <input type="text" value={capitalDisplay} onChange={handleCapitalChange} className="w-full bg-transparent border-none text-white pl-9 py-1 outline-none font-mono text-lg font-bold" />
                     </div>
                  </div>

                  {/* Mode Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">
                        {settings.mode === 'INVESTMENT' ? 'Informação' : 'Data Início'}
                    </label>
                    {settings.mode === 'INVESTMENT' ? (
                        <div className="bg-[#0f1522] border border-slate-700 rounded-lg px-3 flex items-center h-[50px] text-sm text-slate-300 leading-tight">
                           <span className="text-emerald-400 font-bold mr-2">Hoje:</span> Preços de fechamento.
                        </div>
                    ) : (
                        <div className="relative bg-[#0b0f19] border border-slate-700 rounded-lg p-1 flex items-center h-[50px]">
                          <Calendar className="absolute left-3 text-slate-500" size={18} />
                          <input type="date" value={settings.backtestDate} onChange={(e) => setSettings({...settings, backtestDate: e.target.value})} className="w-full bg-transparent border-none text-slate-200 pl-10 py-1 outline-none font-mono text-sm" max={new Date().toISOString().split('T')[0]} />
                       </div>
                    )}
                  </div>
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg py-3.5 rounded-lg shadow-lg shadow-emerald-900/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 mt-auto">
                {isLoading ? <>Processando...</> : <><Play size={20} fill="currentColor" /> Executar Otimização</>}
              </button>

            </form>
          </div>
        </div>

        {/* Right Panel: Tutorial & Concepts (Equal height to Left Panel) */}
        <div className="lg:w-7/12 flex flex-col h-full min-h-0">
           <div className="bg-[#151b2b] border border-slate-800 rounded-xl flex-1 flex flex-col shadow-lg overflow-hidden">
              
              <div className="flex items-center gap-4 p-8 border-b border-slate-700 shrink-0">
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                     <BookOpen size={28} />
                  </div>
                  <div>
                     <h2 className="text-2xl font-bold text-slate-100">Guia & Conceitos</h2>
                     <p className="text-sm text-slate-400 uppercase tracking-wider">Teoria Moderna de Portfólios (Markowitz)</p>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6 space-y-8">
                {/* Section 1 */}
                <section>
                    <h3 className="text-emerald-400 font-bold text-base uppercase tracking-wider mb-4 border-l-4 border-emerald-500 pl-4">
                    1. O Modelo Matemático
                    </h3>
                    <div className="grid grid-cols-1 gap-5">
                        <div className="bg-[#0b0f19] p-5 rounded-lg border border-slate-800">
                            <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2"><Activity size={18} className="text-blue-400"/> Fronteira Eficiente</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                É o conjunto de carteiras que oferecem o <strong>maior retorno esperado</strong> para um nível definido de risco. Qualquer ponto abaixo da curva é considerado "ineficiente", pois você poderia obter mais retorno correndo o mesmo risco.
                            </p>
                        </div>
                        <div className="bg-[#0b0f19] p-5 rounded-lg border border-slate-800">
                            <h4 className="font-bold text-white text-base mb-2 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-400"/> Índice de Sharpe</h4>
                            <p className="text-sm text-slate-400 leading-relaxed">
                                Mede o "custo-benefício" do investimento. Calcula quanto retorno excedente você recebe para cada unidade de risco (volatilidade) que assume. <strong>Quanto maior, melhor.</strong>
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 2 */}
                <section>
                    <h3 className="text-emerald-400 font-bold text-base uppercase tracking-wider mb-4 border-l-4 border-emerald-500 pl-4">
                    2. Como utilizar
                    </h3>
                    
                    <div className="space-y-5">
                        <div className="flex gap-5 bg-[#0f1522] p-4 rounded-lg border border-slate-800/50">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base text-emerald-400">1</div>
                            <div>
                                <h4 className="font-bold text-slate-200 text-base">Defina os Ativos e Expectativas</h4>
                                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                Insira os códigos das ações (ex: PETR4 ou AAPL). O sistema busca a volatilidade histórica, mas você deve inserir o <strong>Retorno Mensal Esperado</strong> ou usar a função "FF5" para estimar via Fama-French.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-5 bg-[#0f1522] p-4 rounded-lg border border-slate-800/50">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base text-emerald-400">2</div>
                            <div>
                                <h4 className="font-bold text-slate-200 text-base">Escolha sua Estratégia</h4>
                                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                Selecione entre <strong>Menor Risco</strong> (Conservador), <strong>Max Sharpe</strong> (Equilibrado) ou <strong>Max Retorno</strong> (Agressivo).
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-5 bg-[#0f1522] p-4 rounded-lg border border-slate-800/50">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base text-emerald-400">3</div>
                            <div>
                                <h4 className="font-bold text-slate-200 text-base">Backtesting (Prova Real)</h4>
                                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                Utilize o modo "Backtesting" para simular a compra da carteira em uma data passada e verificar o resultado financeiro 30 dias depois.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3 */}
                <section className="bg-emerald-900/10 p-5 rounded-lg border border-emerald-900/30 mb-4">
                    <h4 className="text-base font-bold text-emerald-400 mb-2 flex items-center gap-2"><MousePointer size={18}/> Interatividade</h4>
                    <p className="text-sm text-emerald-100/70 leading-relaxed">
                        No gráfico de resultados, cada ponto cinza é uma simulação de carteira possível.
                        Você pode <strong>clicar em qualquer ponto</strong> do gráfico para ver a composição exata daquela carteira na tabela.
                    </p>
                </section>
              </div>
           </div>
        </div>
    </div>
  );
};

export default InputSection;
