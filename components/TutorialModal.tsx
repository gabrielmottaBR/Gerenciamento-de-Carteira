
import React from 'react';
import { X, BookOpen, TrendingUp, Shield, Activity, MousePointer } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#151b2b] w-full max-w-3xl max-h-[90vh] rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-[#0f1522]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
               <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Tutorial & Conceitos</h2>
              <p className="text-xs text-slate-400">Entenda a Teoria Moderna de Portfólios (Markowitz)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar text-slate-300 space-y-8">
          
          {/* Seção 1: Conceitos */}
          <section>
            <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-3">
              1. O Modelo Matemático
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-[#0b0f19] p-4 rounded border border-slate-800">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Activity size={16} className="text-blue-400"/> Fronteira Eficiente</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    É o conjunto de carteiras que oferecem o <strong>maior retorno esperado</strong> para um nível definido de risco. Qualquer ponto abaixo da curva é considerado "ineficiente", pois você poderia obter mais retorno correndo o mesmo risco.
                  </p>
               </div>
               <div className="bg-[#0b0f19] p-4 rounded border border-slate-800">
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400"/> Índice de Sharpe</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mede o "custo-benefício" do investimento. Calcula quanto retorno excedente você recebe para cada unidade de risco (volatilidade) que assume. <strong>Quanto maior, melhor.</strong>
                  </p>
               </div>
            </div>
          </section>

          {/* Seção 2: Como Usar */}
          <section>
            <h3 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-4 border-l-2 border-emerald-500 pl-3">
              2. Como utilizar o MPO Optimizer
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400">1</div>
                 <div>
                    <h4 className="font-bold text-slate-200 text-sm">Defina os Ativos e Expectativas</h4>
                    <p className="text-xs text-slate-400 mt-1">
                       Insira os códigos das ações (ex: PETR4, VALE3). O sistema busca automaticamente a volatilidade histórica. 
                       <br/><span className="text-emerald-500/80 italic">Importante:</span> Você deve inserir manualmente o <strong>Retorno Mensal Esperado</strong> para cada ativo com base na sua análise fundamentalista.
                    </p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400">2</div>
                 <div>
                    <h4 className="font-bold text-slate-200 text-sm">Escolha sua Estratégia</h4>
                    <p className="text-xs text-slate-400 mt-1">
                       Selecione entre <strong>Menor Risco</strong> (foco em preservação), <strong>Max Sharpe</strong> (equilíbrio ideal) ou <strong>Max Retorno</strong> (agressivo).
                       Isso define qual portfólio será destacado nos resultados.
                    </p>
                 </div>
              </div>

              <div className="flex gap-4">
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400">3</div>
                 <div>
                    <h4 className="font-bold text-slate-200 text-sm">Backtesting (Prova Real)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                       Informe uma data passada. O sistema simulará a compra da carteira sugerida naquela data e verificará o resultado financeiro exato 30 dias depois.
                       Isso ajuda a validar se a matemática "funciona" na prática.
                    </p>
                 </div>
              </div>
            </div>
          </section>

           {/* Seção 3: Gráfico */}
           <section className="bg-emerald-900/10 p-4 rounded border border-emerald-900/30">
              <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2"><MousePointer size={16}/> Interatividade</h4>
              <p className="text-xs text-emerald-100/70">
                 No gráfico de resultados, cada ponto cinza é uma simulação de carteira possível. Os pontos coloridos são os destaques.
                 Você pode <strong>clicar em qualquer ponto</strong> do gráfico para ver a composição exata daquela carteira específica na tabela ao lado.
              </p>
           </section>

        </div>

        <div className="p-4 border-t border-slate-700 bg-[#0f1522] flex justify-end">
           <button 
             onClick={onClose}
             className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded text-sm font-medium transition-colors"
           >
             Entendi
           </button>
        </div>

      </div>
    </div>
  );
};

export default TutorialModal;
