
import React from 'react';
import { DollarSign, Wifi, WifiOff, BookOpen } from 'lucide-react';

interface HeaderProps {
  isSimulated: boolean;
  onOpenTutorial: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSimulated, onOpenTutorial }) => {
  return (
    <header className="bg-[#151b2b] border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2 rounded-lg">
             <DollarSign className="text-emerald-400 h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-emerald-400 leading-tight tracking-tight uppercase">Gerenciamento de Carteira</h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Markowitz Model Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
            isSimulated 
              ? 'bg-amber-900/20 border-amber-700/50 text-amber-400' 
              : 'bg-emerald-900/20 border-emerald-700/50 text-emerald-400'
          }`}>
            {isSimulated ? <WifiOff size={14} /> : <Wifi size={14} />}
            {isSimulated ? 'CONEXÃO: MODO SIMULADO (FALLBACK)' : 'CONEXÃO: ONLINE (YAHOO FINANCE)'}
          </div>
          
          <button 
            onClick={onOpenTutorial}
            className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded transition-all border border-transparent hover:border-slate-700"
          >
            <BookOpen size={14} />
            Tutorial
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
