
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import ResultsSection from './components/ResultsSection';
import TutorialModal from './components/TutorialModal';
import { fetchAssetData } from './services/dataService';
import { calculateMatrices, runMonteCarloSimulation } from './services/mathService';
import { AssetData, SimulationResult, ViewState, OptimizationSettings, UserAssetInput } from './types';
import { AlertTriangle } from 'lucide-react';

const LoadingView = () => {
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    const duration = 60; // seconds
    const intervalTime = 100; // update every 100ms
    const steps = duration * (1000 / intervalTime);
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const newProgress = Math.min((step / steps) * 100, 100);
      setProgress(newProgress);

      // Update seconds remaining every second (approx)
      if (step % 10 === 0) {
        setSeconds(prev => Math.max(prev - 1, 0));
      }

      if (step >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500 p-8">
      <div className="relative mb-8">
        <div className="w-20 h-20 border-4 border-slate-800 border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center font-mono font-bold text-emerald-500 text-lg">
          {Math.round(progress)}%
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-200 mb-2 text-center">Processando Dados...</h2>
      <p className="text-slate-500 text-sm mb-6 text-center max-w-xs">Otimizando carteira e calculando fronteira eficiente</p>

      {/* Animated Bar */}
      <div className="w-full max-w-md bg-slate-800 h-3 rounded-full overflow-hidden relative shadow-inner">
        <div 
          className="h-full bg-emerald-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="mt-3 font-mono text-slate-400 text-sm">
        Tempo restante estimado: <span className="text-white font-bold">{seconds}s</span>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.INPUT);
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulatedData, setIsSimulatedData] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<OptimizationSettings | null>(null);
  const [currentInputs, setCurrentInputs] = useState<UserAssetInput[]>([]); // Store inputs for ResultsSection
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  const handleSimulation = async (inputs: UserAssetInput[], settings: OptimizationSettings) => {
    try {
      setViewState(ViewState.LOADING);
      setCurrentSettings(settings);
      setCurrentInputs(inputs);
      
      const tickers = inputs.map(i => i.ticker);

      // 1. Fetch Historical Data
      const { data, isSimulated } = await fetchAssetData(tickers, settings.period);
      
      // 2. Override Mean Return with User Input
      const assetsWithUserReturns = data.map(asset => {
        const userInput = inputs.find(i => i.ticker === asset.ticker);
        const userMonthlyReturn = userInput ? userInput.expectedMonthlyReturn : 0;
        const dailyMeanProxy = (userMonthlyReturn / 100) / 21;
        return { ...asset, meanReturn: dailyMeanProxy };
      });

      setAssets(assetsWithUserReturns);
      setIsSimulatedData(isSimulated);

      // 3. Calculations
      setTimeout(() => {
        const { covMatrix } = calculateMatrices(assetsWithUserReturns);
        
        const result = runMonteCarloSimulation(
          assetsWithUserReturns, 
          covMatrix, 
          settings.simulationCount, 
          settings.riskFreeRate
        );

        // Note: Backtest calculation has been moved to ResultsSection to be dynamic
        setSimulationResult(result);
        setViewState(ViewState.RESULTS);
      }, 100);

    } catch (error) {
      console.error("Simulation Failed", error);
      alert("Erro ao processar dados. Verifique os tickers e tente novamente.");
      setViewState(ViewState.INPUT);
    }
  };

  return (
    // Standard responsive web layout
    <div className="w-full min-h-screen bg-[#05080f] font-sans text-slate-300">
      
      {/* Main Container */}
      <div className="w-full min-h-screen bg-[#0b0f19] shadow-2xl flex flex-col relative">
        
        <Header isSimulated={isSimulatedData} onOpenTutorial={() => setIsTutorialOpen(true)} />
        
        <TutorialModal isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} />

        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          
          {isSimulatedData && viewState === ViewState.RESULTS && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-amber-900/90 backdrop-blur border border-amber-700/50 rounded-full px-4 py-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
               <AlertTriangle className="text-amber-500 shrink-0" size={14} />
               <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Dados Simulados (Conexão Falhou)</span>
            </div>
          )}

          {viewState === ViewState.INPUT && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <InputSection onSimulate={handleSimulation} isLoading={false} />
            </div>
          )}

          {viewState === ViewState.LOADING && (
            <LoadingView />
          )}

          {viewState === ViewState.RESULTS && simulationResult && (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-700 pb-8">
                <ResultsSection 
                  data={simulationResult} 
                  assets={assets} 
                  totalCapital={currentSettings?.totalCapital || 100000}
                  targetStrategy={currentSettings?.strategy}
                  userInputs={currentInputs}
                  backtestDate={currentSettings?.backtestDate}
                  mode={currentSettings?.mode}
                  onReset={() => setViewState(ViewState.INPUT)} 
                />
              </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;
