
import { AssetData, Portfolio, SimulationResult, BacktestResult, UserAssetInput, BacktestAssetResult } from '../types';

// --- Helper Math Functions ---

const mean = (arr: number[]): number => 
  arr.reduce((a, b) => a + b, 0) / arr.length;

const stdDev = (arr: number[], arrMean: number): number => {
  const variance = arr.reduce((acc, val) => acc + Math.pow(val - arrMean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
};

const covariance = (arr1: number[], mean1: number, arr2: number[], mean2: number): number => {
  if (arr1.length !== arr2.length) return 0;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += (arr1[i] - mean1) * (arr2[i] - mean2);
  }
  return sum / (arr1.length - 1);
};

// Calculates Log Returns: ln(Pt / Pt-1)
export const calculateLogReturns = (prices: number[]): number[] => {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  return returns;
};

// --- Portfolio Math ---

export const processAssetStats = (ticker: string, prices: number[], dates: string[]): AssetData => {
  const returns = calculateLogReturns(prices);
  const m = mean(returns);
  const s = stdDev(returns, m);
  const lastPrice = prices[prices.length - 1];
  
  return {
    ticker,
    prices,
    dates,
    returns,
    meanReturn: m, 
    stdDev: s,
    lastPrice
  };
};

export const calculateMatrices = (assets: AssetData[]) => {
  const n = assets.length;
  const minLen = Math.min(...assets.map(a => a.returns.length));
  
  const covMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  const corrMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const ret1 = assets[i].returns.slice(-minLen);
      const ret2 = assets[j].returns.slice(-minLen);
      
      const cov = covariance(
        ret1, 
        assets[i].meanReturn, 
        ret2, 
        assets[j].meanReturn
      );
      covMatrix[i][j] = cov;
      
      const corr = cov / (assets[i].stdDev * assets[j].stdDev);
      corrMatrix[i][j] = corr;
    }
  }
  return { covMatrix, corrMatrix };
};

// --- Backtesting Logic ---

const findNearestDateIndex = (dates: string[], targetDateStr: string): number => {
  const idx = dates.findIndex(d => d >= targetDateStr);
  return idx;
};

export const calculateBacktest = (
  assets: AssetData[],
  portfolio: Portfolio,
  startDateStr: string,
  totalCapital: number,
  userInputs: UserAssetInput[]
): BacktestResult | undefined => {
  if (!startDateStr) return undefined;

  const startDateObj = new Date(startDateStr);
  const endDateObj = new Date(startDateObj);
  endDateObj.setDate(startDateObj.getDate() + 30);
  const endDateStr = endDateObj.toISOString().split('T')[0];

  const assetPerformance: BacktestAssetResult[] = [];
  let endValue = 0;
  let startValue = 0;

  let validData = true;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const weight = portfolio.weights[i];
    
    const startIdx = findNearestDateIndex(asset.dates, startDateStr);
    const endIdx = findNearestDateIndex(asset.dates, endDateStr);

    if (startIdx === -1 || endIdx === -1 || startIdx >= asset.prices.length || endIdx >= asset.prices.length) {
      if (Math.abs(weight) > 0.001) {
        validData = false;
        break;
      }
      continue;
    }

    const startPrice = asset.prices[startIdx];
    const endPrice = asset.prices[endIdx];

    const allocatedCapital = totalCapital * weight;
    const priceReturn = (endPrice - startPrice) / startPrice;
    const assetPL = allocatedCapital * priceReturn;
    
    const finalAssetValue = allocatedCapital + assetPL;

    startValue += allocatedCapital;
    endValue += finalAssetValue;

    const rawTicker = asset.ticker.replace('.SA', '');
    const userInput = userInputs.find(u => u.ticker.replace('.SA', '') === rawTicker);
    const expectedPercent = userInput ? userInput.expectedMonthlyReturn : 0;

    assetPerformance.push({
      ticker: asset.ticker,
      startPrice,
      endPrice,
      percent: priceReturn * 100,
      expectedPercent: expectedPercent,
      weight: weight,
      contribution: assetPL
    });
  }

  if (!validData) return undefined;

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    startValue: totalCapital,
    endValue,
    profit: endValue - totalCapital,
    profitPercent: ((endValue - totalCapital) / totalCapital) * 100,
    assetPerformance
  };
};

// --- Fama-French 5 Factor Heuristics ---

interface FactorBetas {
  mkt: number;
  smb: number;
  hml: number;
  rmw: number;
  cma: number;
  avgVol: number; // Estimated monthly volatility for ranking
}

// Heuristic database for B3 Universe (Simulated Scanning for ~100 assets)
const FAMA_FRENCH_DB: Record<string, FactorBetas> = {
  // --- Major Banks & Financials (15) ---
  'ITUB4': { mkt: 0.9, smb: -0.4, hml: 0.5, rmw: 0.3, cma: 0.1, avgVol: 5.5 },
  'BBDC4': { mkt: 1.0, smb: -0.4, hml: 0.5, rmw: 0.2, cma: 0.1, avgVol: 6.0 },
  'BBAS3': { mkt: 1.1, smb: -0.3, hml: 0.6, rmw: 0.1, cma: 0.2, avgVol: 6.5 },
  'SANB11': { mkt: 0.9, smb: -0.3, hml: 0.4, rmw: 0.2, cma: 0.1, avgVol: 5.8 },
  'BPAC11': { mkt: 1.4, smb: 0.2, hml: 0.1, rmw: 0.4, cma: 0.0, avgVol: 8.5 },
  'ABCB4': { mkt: 0.8, smb: 0.1, hml: 0.4, rmw: 0.3, cma: 0.1, avgVol: 5.0 },
  'BRSR6': { mkt: 1.0, smb: 0.0, hml: 0.5, rmw: 0.1, cma: 0.2, avgVol: 6.2 },
  'B3SA3': { mkt: 1.1, smb: -0.1, hml: 0.0, rmw: 0.5, cma: 0.1, avgVol: 6.2 },
  'CIEL3': { mkt: 1.0, smb: 0.1, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 7.5 },
  'IRBR3': { mkt: 1.5, smb: 0.2, hml: 0.1, rmw: -0.2, cma: -0.1, avgVol: 12.0 },
  'BBSE3': { mkt: 0.7, smb: -0.2, hml: 0.2, rmw: 0.5, cma: 0.2, avgVol: 4.8 },
  'CXSE3': { mkt: 0.7, smb: -0.1, hml: 0.3, rmw: 0.4, cma: 0.1, avgVol: 4.5 },
  'PSSA3': { mkt: 0.8, smb: -0.1, hml: 0.1, rmw: 0.3, cma: 0.1, avgVol: 5.2 },
  'BMGB4': { mkt: 1.2, smb: 0.3, hml: 0.4, rmw: -0.1, cma: 0.1, avgVol: 8.0 },
  'CLSA3': { mkt: 1.3, smb: 0.4, hml: 0.0, rmw: 0.1, cma: 0.0, avgVol: 9.0 },

  // --- Energy, Oil & Gas (15) ---
  'PETR4': { mkt: 1.3, smb: -0.3, hml: 0.6, rmw: 0.4, cma: 0.4, avgVol: 8.0 },
  'PETR3': { mkt: 1.3, smb: -0.3, hml: 0.6, rmw: 0.4, cma: 0.4, avgVol: 8.1 },
  'PRIO3': { mkt: 1.4, smb: 0.1, hml: 0.2, rmw: 0.3, cma: 0.2, avgVol: 9.0 },
  'CSAN3': { mkt: 1.1, smb: 0.0, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 7.0 },
  'VBBR3': { mkt: 1.0, smb: 0.1, hml: 0.2, rmw: 0.1, cma: 0.1, avgVol: 6.8 },
  'UGPA3': { mkt: 0.9, smb: 0.0, hml: 0.2, rmw: 0.2, cma: 0.1, avgVol: 6.5 },
  'RRRP3': { mkt: 1.6, smb: 0.3, hml: 0.1, rmw: -0.1, cma: 0.2, avgVol: 10.0 },
  'RECV3': { mkt: 1.5, smb: 0.4, hml: 0.1, rmw: 0.1, cma: 0.1, avgVol: 9.5 },
  'ENAT3': { mkt: 1.2, smb: 0.3, hml: 0.3, rmw: 0.1, cma: 0.1, avgVol: 8.2 },
  'RAIZ4': { mkt: 1.0, smb: 0.1, hml: 0.1, rmw: 0.1, cma: 0.1, avgVol: 6.5 },
  'RPAI3': { mkt: 1.3, smb: 0.4, hml: 0.1, rmw: 0.0, cma: 0.1, avgVol: 8.5 },
  'LUPA3': { mkt: 1.4, smb: 0.5, hml: 0.2, rmw: -0.1, cma: 0.0, avgVol: 11.0 },
  'AURE3': { mkt: 1.1, smb: 0.1, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 7.5 },
  'MEGA3': { mkt: 1.0, smb: 0.1, hml: 0.1, rmw: 0.3, cma: 0.1, avgVol: 6.0 },
  'VAMO3': { mkt: 1.3, smb: 0.2, hml: 0.1, rmw: 0.3, cma: 0.0, avgVol: 8.5 },

  // --- Materials & Mining (10) ---
  'VALE3': { mkt: 1.1, smb: -0.3, hml: 0.4, rmw: 0.5, cma: 0.3, avgVol: 7.5 },
  'CSNA3': { mkt: 1.5, smb: 0.0, hml: 0.5, rmw: 0.1, cma: 0.3, avgVol: 10.0 },
  'GGBR4': { mkt: 1.2, smb: -0.1, hml: 0.4, rmw: 0.2, cma: 0.2, avgVol: 7.8 },
  'GOAU4': { mkt: 1.2, smb: -0.1, hml: 0.4, rmw: 0.2, cma: 0.2, avgVol: 7.7 },
  'USIM5': { mkt: 1.6, smb: 0.1, hml: 0.5, rmw: 0.0, cma: 0.3, avgVol: 10.5 },
  'SUZB3': { mkt: 0.8, smb: -0.2, hml: 0.1, rmw: 0.4, cma: 0.1, avgVol: 6.5 },
  'KLBN11': { mkt: 0.8, smb: -0.1, hml: 0.1, rmw: 0.3, cma: 0.1, avgVol: 6.2 },
  'DXCO3': { mkt: 1.1, smb: 0.2, hml: 0.2, rmw: 0.1, cma: 0.1, avgVol: 8.0 },
  'UNIP6': { mkt: 0.7, smb: 0.2, hml: 0.1, rmw: 0.6, cma: 0.2, avgVol: 5.5 },
  'CMIN3': { mkt: 1.3, smb: 0.2, hml: 0.3, rmw: 0.3, cma: 0.2, avgVol: 9.0 },
  'CBAV3': { mkt: 1.4, smb: 0.3, hml: 0.2, rmw: 0.1, cma: 0.1, avgVol: 9.5 },

  // --- Utilities (15) ---
  'ELET3': { mkt: 1.1, smb: -0.1, hml: 0.4, rmw: 0.0, cma: 0.2, avgVol: 7.0 },
  'ELET6': { mkt: 1.1, smb: -0.1, hml: 0.4, rmw: 0.0, cma: 0.2, avgVol: 7.0 },
  'EGIE3': { mkt: 0.6, smb: -0.2, hml: 0.2, rmw: 0.4, cma: 0.3, avgVol: 4.0 }, 
  'TAEE11': { mkt: 0.4, smb: -0.3, hml: 0.2, rmw: 0.3, cma: 0.1, avgVol: 3.5 }, 
  'TRPL4': { mkt: 0.5, smb: -0.2, hml: 0.3, rmw: 0.2, cma: 0.2, avgVol: 4.0 },
  'CPLE6': { mkt: 0.7, smb: -0.1, hml: 0.2, rmw: 0.3, cma: 0.2, avgVol: 5.0 },
  'CPFE3': { mkt: 0.6, smb: -0.1, hml: 0.2, rmw: 0.4, cma: 0.2, avgVol: 4.5 },
  'CMIG4': { mkt: 0.9, smb: -0.1, hml: 0.3, rmw: 0.2, cma: 0.2, avgVol: 6.0 },
  'EQTL3': { mkt: 0.8, smb: 0.0, hml: 0.1, rmw: 0.5, cma: 0.1, avgVol: 5.5 },
  'NEOE3': { mkt: 0.7, smb: 0.0, hml: 0.2, rmw: 0.3, cma: 0.1, avgVol: 5.2 },
  'ALUP11': { mkt: 0.5, smb: 0.0, hml: 0.2, rmw: 0.4, cma: 0.2, avgVol: 4.0 },
  'SBSP3': { mkt: 0.9, smb: -0.1, hml: 0.3, rmw: 0.2, cma: 0.1, avgVol: 6.5 },
  'CSMG3': { mkt: 0.8, smb: 0.1, hml: 0.2, rmw: 0.3, cma: 0.1, avgVol: 5.8 },
  'SAPR11': { mkt: 0.7, smb: 0.0, hml: 0.2, rmw: 0.4, cma: 0.2, avgVol: 4.8 },
  'AESB3': { mkt: 0.9, smb: 0.1, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 6.0 },

  // --- Consumption & Retail (15) ---
  'MGLU3': { mkt: 1.8, smb: 0.3, hml: -0.3, rmw: -0.2, cma: -0.2, avgVol: 15.0 },
  'LREN3': { mkt: 1.1, smb: 0.0, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 8.5 },
  'VIIA3': { mkt: 2.0, smb: 0.4, hml: -0.2, rmw: -0.4, cma: -0.3, avgVol: 18.0 },
  'ABEV3': { mkt: 0.7, smb: -0.5, hml: 0.1, rmw: 0.6, cma: 0.2, avgVol: 4.5 },
  'RADL3': { mkt: 0.6, smb: -0.1, hml: -0.2, rmw: 0.7, cma: 0.3, avgVol: 5.0 },
  'ASAI3': { mkt: 0.8, smb: 0.1, hml: 0.0, rmw: 0.3, cma: 0.1, avgVol: 6.0 },
  'CRFB3': { mkt: 0.8, smb: 0.0, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 6.2 },
  'NTCO3': { mkt: 1.3, smb: 0.1, hml: -0.1, rmw: 0.1, cma: 0.0, avgVol: 9.0 },
  'ARZZ3': { mkt: 1.2, smb: 0.2, hml: 0.0, rmw: 0.4, cma: 0.1, avgVol: 8.0 },
  'SOMA3': { mkt: 1.3, smb: 0.3, hml: -0.1, rmw: 0.2, cma: 0.0, avgVol: 9.5 },
  'AMER3': { mkt: 2.5, smb: 0.5, hml: -0.5, rmw: -0.8, cma: -0.5, avgVol: 25.0 },
  'PETZ3': { mkt: 1.4, smb: 0.3, hml: -0.2, rmw: 0.1, cma: 0.0, avgVol: 10.0 },
  'SMTO3': { mkt: 1.1, smb: 0.2, hml: 0.1, rmw: 0.3, cma: 0.1, avgVol: 7.5 },
  'MDIA3': { mkt: 0.9, smb: 0.1, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 6.5 },
  'ALPA4': { mkt: 1.4, smb: 0.2, hml: -0.1, rmw: 0.1, cma: 0.0, avgVol: 9.0 },
  'GRND3': { mkt: 0.8, smb: 0.1, hml: 0.1, rmw: 0.3, cma: 0.1, avgVol: 5.5 },

  // --- Agro (5) ---
  'SLCE3': { mkt: 1.1, smb: 0.1, hml: 0.2, rmw: 0.4, cma: 0.2, avgVol: 7.5 },
  'AGRO3': { mkt: 0.9, smb: 0.2, hml: 0.3, rmw: 0.3, cma: 0.2, avgVol: 6.8 },
  'KEPL3': { mkt: 1.2, smb: 0.3, hml: 0.2, rmw: 0.4, cma: 0.1, avgVol: 8.5 },
  'SOJA3': { mkt: 1.0, smb: 0.2, hml: 0.2, rmw: 0.2, cma: 0.1, avgVol: 7.0 },
  'TTEN3': { mkt: 1.3, smb: 0.4, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 9.0 },

  // --- Real Estate / Builders (10) ---
  'CYRE3': { mkt: 1.4, smb: 0.2, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 9.0 },
  'EZTC3': { mkt: 1.2, smb: 0.2, hml: 0.1, rmw: 0.3, cma: 0.2, avgVol: 8.5 },
  'MRVE3': { mkt: 1.5, smb: 0.3, hml: 0.1, rmw: 0.1, cma: 0.1, avgVol: 10.0 },
  'JHSF3': { mkt: 1.3, smb: 0.2, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 9.2 },
  'TEND3': { mkt: 1.4, smb: 0.3, hml: 0.0, rmw: 0.1, cma: 0.1, avgVol: 9.5 },
  'EVEN3': { mkt: 1.5, smb: 0.4, hml: 0.1, rmw: 0.0, cma: 0.0, avgVol: 10.5 },
  'MULT3': { mkt: 1.0, smb: 0.1, hml: 0.2, rmw: 0.3, cma: 0.0, avgVol: 7.0 },
  'IGTI11': { mkt: 1.1, smb: 0.1, hml: 0.2, rmw: 0.3, cma: 0.0, avgVol: 7.2 },
  'ALSO3': { mkt: 1.2, smb: 0.2, hml: 0.1, rmw: 0.1, cma: 0.0, avgVol: 8.0 },
  'HBRE3': { mkt: 1.4, smb: 0.4, hml: 0.1, rmw: -0.1, cma: 0.0, avgVol: 10.0 },

  // --- Health (6) ---
  'HYPE3': { mkt: 0.7, smb: 0.0, hml: -0.1, rmw: 0.4, cma: 0.1, avgVol: 5.8 },
  'FLRY3': { mkt: 0.8, smb: 0.1, hml: 0.0, rmw: 0.4, cma: 0.1, avgVol: 5.5 },
  'HAPV3': { mkt: 1.4, smb: 0.2, hml: -0.2, rmw: 0.0, cma: -0.1, avgVol: 10.0 },
  'ODPV3': { mkt: 0.7, smb: -0.1, hml: -0.1, rmw: 0.6, cma: 0.2, avgVol: 5.0 },
  'RDOR3': { mkt: 1.0, smb: 0.1, hml: 0.0, rmw: 0.3, cma: 0.1, avgVol: 7.0 },
  'QUAL3': { mkt: 1.6, smb: 0.4, hml: -0.1, rmw: -0.2, cma: -0.1, avgVol: 14.0 },

  // --- Tech & Telecom (8) ---
  'WEGE3': { mkt: 0.8, smb: -0.2, hml: -0.3, rmw: 0.7, cma: 0.2, avgVol: 5.5 },
  'TOTS3': { mkt: 0.9, smb: 0.0, hml: -0.2, rmw: 0.4, cma: 0.1, avgVol: 6.8 },
  'LWSA3': { mkt: 2.1, smb: 0.5, hml: -0.3, rmw: -0.5, cma: -0.4, avgVol: 16.0 },
  'CASH3': { mkt: 2.4, smb: 0.6, hml: -0.4, rmw: -0.6, cma: -0.5, avgVol: 20.0 },
  'VIVT3': { mkt: 0.6, smb: -0.3, hml: 0.3, rmw: 0.4, cma: 0.2, avgVol: 4.5 },
  'TIMS3': { mkt: 0.7, smb: -0.2, hml: 0.3, rmw: 0.3, cma: 0.2, avgVol: 5.0 },
  'INTB3': { mkt: 1.3, smb: 0.2, hml: -0.2, rmw: 0.4, cma: 0.0, avgVol: 8.5 },
  'MLAS3': { mkt: 1.5, smb: 0.3, hml: -0.1, rmw: 0.1, cma: 0.0, avgVol: 10.0 },

  // --- Industrial & Logistics (6) ---
  'EMBR3': { mkt: 1.2, smb: 0.1, hml: 0.2, rmw: 0.2, cma: 0.1, avgVol: 8.0 },
  'RENT3': { mkt: 1.1, smb: 0.1, hml: 0.1, rmw: 0.3, cma: 0.1, avgVol: 8.0 },
  'RAIL3': { mkt: 1.0, smb: 0.1, hml: 0.1, rmw: 0.1, cma: 0.1, avgVol: 7.5 },
  'CCRO3': { mkt: 0.9, smb: 0.0, hml: 0.2, rmw: 0.2, cma: 0.1, avgVol: 6.5 },
  'ECOR3': { mkt: 1.0, smb: 0.1, hml: 0.2, rmw: 0.1, cma: 0.1, avgVol: 7.0 },
  'STBP3': { mkt: 1.1, smb: 0.2, hml: 0.1, rmw: 0.2, cma: 0.1, avgVol: 7.8 }
};

const FF_CONSTANTS = {
  RF: 0.37,
  MKT_RF: 0.46,
  SMB: 0.17,
  HML: 0.33,
  RMW: 0.25,
  CMA: 0.25
};

export const calculateFamaFrenchEstimation = (ticker: string): number => {
  const cleanTicker = ticker.replace('.SA', '').toUpperCase().trim();
  
  const defaultBetas: FactorBetas = { mkt: 1.0, smb: 0.1, hml: 0.0, rmw: 0.0, cma: 0.0, avgVol: 8.0 };
  const betas = FAMA_FRENCH_DB[cleanTicker] || defaultBetas;

  const expectedReturn = 
    FF_CONSTANTS.RF + 
    (betas.mkt * FF_CONSTANTS.MKT_RF) + 
    (betas.smb * FF_CONSTANTS.SMB) + 
    (betas.hml * FF_CONSTANTS.HML) + 
    (betas.rmw * FF_CONSTANTS.RMW) + 
    (betas.cma * FF_CONSTANTS.CMA);

  return Number(expectedReturn.toFixed(2));
};

export const suggestBestPortfolio = (): UserAssetInput[] => {
  const candidates = Object.entries(FAMA_FRENCH_DB).map(([ticker, betas]) => {
    // 1. Calculate FF5 Return
    const expectedReturn = 
      FF_CONSTANTS.RF + 
      (betas.mkt * FF_CONSTANTS.MKT_RF) + 
      (betas.smb * FF_CONSTANTS.SMB) + 
      (betas.hml * FF_CONSTANTS.HML) + 
      (betas.rmw * FF_CONSTANTS.RMW) + 
      (betas.cma * FF_CONSTANTS.CMA);

    // 2. Calculate Efficiency Score (Return / Volatility)
    // We want High Return AND Low Volatility. 
    // A simple ratio Return/Vol works as a proxy for Sharpe.
    const efficiencyScore = expectedReturn / betas.avgVol;

    return {
      ticker,
      expectedReturn: Number(expectedReturn.toFixed(2)),
      avgVol: betas.avgVol,
      score: efficiencyScore
    };
  });

  // 3. Sort by Score Descending
  candidates.sort((a, b) => b.score - a.score);

  // 4. Take Top 10
  const top10 = candidates.slice(0, 10);

  // 5. Convert to UserAssetInput format
  return top10.map(c => ({
    ticker: c.ticker,
    expectedMonthlyReturn: c.expectedReturn
  }));
};


// --- Monte Carlo Simulation ---

export const runMonteCarloSimulation = (
  assets: AssetData[], 
  covMatrix: number[][], 
  iterations: number,
  riskFreeRate: number
): SimulationResult => {
  const portfolios: Portfolio[] = [];
  const TRADING_DAYS = 252;

  let minRisk = Infinity;
  let maxSharpe = -Infinity;
  let maxReturn = -Infinity;

  let minRiskPort: Portfolio | null = null;
  let maxSharpePort: Portfolio | null = null;
  let maxReturnPort: Portfolio | null = null;

  const MAX_ATTEMPTS_PER_PORTFOLIO = 200; // Increased attempts due to stricter constraints

  for (let i = 0; i < iterations; i++) {
    let weights: number[] = [];
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < MAX_ATTEMPTS_PER_PORTFOLIO) {
      attempts++;
      // Rejection sampling
      
      const rawWeights = assets.map(() => (Math.random() * 2) - 0.5); // -0.5 to 0.5
      const sum = rawWeights.reduce((a, b) => a + b, 0);
      const normalizedWeights = rawWeights.map(w => w / sum);
      
      // Check constraints
      // 1. Each weight between -50% and +50%
      // 2. Exclusion Zone: Weight cannot be between -10% and 10%
      const satisfyConstraints = normalizedWeights.every(w => {
        const isWithinLimits = w >= -0.5 && w <= 0.5;
        const isOutsideExclusion = w <= -0.1 || w >= 0.1; 
        return isWithinLimits && isOutsideExclusion;
      });

      if (satisfyConstraints) {
        weights = normalizedWeights;
        valid = true;
      }
    }

    if (!valid) continue;

    let portDailyReturn = 0;
    for (let j = 0; j < assets.length; j++) {
      portDailyReturn += weights[j] * assets[j].meanReturn;
    }
    const annualReturn = portDailyReturn * TRADING_DAYS;

    let portVariance = 0;
    for (let r = 0; r < assets.length; r++) {
      for (let c = 0; c < assets.length; c++) {
        portVariance += weights[r] * weights[c] * covMatrix[r][c];
      }
    }
    const annualRisk = Math.sqrt(portVariance * TRADING_DAYS);
    const sharpe = (annualReturn - riskFreeRate) / annualRisk;

    const p: Portfolio = {
      weights,
      return: annualReturn,
      risk: annualRisk,
      sharpe,
      id: i.toString()
    };

    portfolios.push(p);

    if (annualRisk < minRisk) {
      minRisk = annualRisk;
      minRiskPort = p;
    }
    if (sharpe > maxSharpe) {
      maxSharpe = sharpe;
      maxSharpePort = p;
    }
    if (annualReturn > maxReturn) {
      maxReturn = annualReturn;
      maxReturnPort = p;
    }
  }

  const { corrMatrix } = calculateMatrices(assets);

  if (portfolios.length === 0) {
     // Fallback if constraints are too tight: return equal weights but warned
     const equalWeight = 1 / assets.length;
     const dummy = { weights: Array(assets.length).fill(equalWeight), return:0, risk:0, sharpe:0, id: 'error' };
     minRiskPort = dummy;
     maxSharpePort = dummy;
     maxReturnPort = dummy;
  }

  return {
    portfolios,
    minRiskPortfolio: minRiskPort!,
    maxSharpePortfolio: maxSharpePort!,
    maxReturnPortfolio: maxReturnPort!,
    covarianceMatrix: covMatrix,
    correlationMatrix: corrMatrix
  };
};
