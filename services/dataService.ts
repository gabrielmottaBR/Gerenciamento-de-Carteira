
import { AssetData } from "../types";
import { processAssetStats } from "./mathService";

// --- Simulation Logic (Fallback) ---

const generateRandomWalk = (days: number, startPrice: number, drift: number, volatility: number): { prices: number[], dates: string[] } => {
  const prices = [startPrice];
  const dates: string[] = [];
  let currentPrice = startPrice;
  
  const today = new Date();
  
  // Generate dates backwards from today
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  // Generate prices (matching length)
  for (let i = 0; i < days; i++) {
    const dt = 1 / 365;
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    const change = currentPrice * (drift * dt + volatility * Math.sqrt(dt) * z);
    currentPrice += change;
    prices.push(Math.max(0.01, currentPrice));
  }
  
  return { 
    prices: prices.slice(0, dates.length), 
    dates 
  };
};

const getMockData = (ticker: string, days: number): { prices: number[], dates: string[] } => {
  const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const volatility = 0.15 + (hash % 30) / 100;
  const drift = 0.05 + (hash % 20) / 100;
  const startPrice = 50 + (hash % 150);
  return generateRandomWalk(days, startPrice, drift, volatility);
};

// --- Yahoo Finance Logic (Backup / Legacy) ---

const PROXY_PROVIDERS = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&timestamp=${Date.now()}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

const fetchYahooPrices = async (ticker: string, period: string): Promise<{ prices: number[], dates: string[] }> => {
  const rangeMap: Record<string, string> = { '1y': '2y', '3y': '5y', '5y': '10y' }; 
  const range = rangeMap[period] || '2y';
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=1d`;

  // Try proxies
  for (const proxyGen of PROXY_PROVIDERS) {
    try {
       const proxyUrl = proxyGen(targetUrl);
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 8000); 
       const response = await fetch(proxyUrl, { signal: controller.signal });
       clearTimeout(timeoutId);

       if (!response.ok) continue;
       const text = await response.text();
       let data;
       try { data = JSON.parse(text); } catch(e) { continue; }

       const result = data.chart?.result?.[0];
       if (!result) continue;

       const timestamps = result.timestamp;
       const quotes = result.indicators.quote[0].close;
       const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes;
       
       const cleanPrices: number[] = [];
       const cleanDates: string[] = [];
       
       for (let i = 0; i < timestamps.length; i++) {
         if (adjClose[i] != null) {
           cleanPrices.push(adjClose[i]);
           cleanDates.push(new Date(timestamps[i] * 1000).toISOString().split('T')[0]);
         }
       }
       return { prices: cleanPrices, dates: cleanDates };
    } catch (e) {
       continue;
    }
  }
  throw new Error("Yahoo proxies failed");
};


// --- Serial Batch Processing ---

async function processInBatches(tickers: string[], period: string): Promise<PromiseSettledResult<{ prices: number[], dates: string[] }>[]> {
  let allResults: PromiseSettledResult<{ prices: number[], dates: string[] }>[] = [];
  
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    
    // Fetch Yahoo Proxy
    const promise = fetchYahooPrices(ticker, period);
    if (i < tickers.length - 1) await new Promise(r => setTimeout(r, 1500));
    
    const result = await Promise.allSettled([promise]);
    allResults.push(result[0]);
  }
  return allResults;
}

// --- Main Fetcher ---

export interface FetchResult {
  data: AssetData[];
  isSimulated: boolean;
}

export const fetchAssetData = async (tickers: string[], period: string): Promise<FetchResult> => {
  const daysMap: Record<string, number> = { '1y': 500, '3y': 1000, '5y': 1500 };
  const days = daysMap[period] || 500;
  let useSimulation = false;
  const processedAssets: AssetData[] = [];

  try {
    const results = await processInBatches(tickers, period);

    results.forEach((res, idx) => {
      const ticker = tickers[idx];
      if (res.status === 'fulfilled') {
        processedAssets.push(processAssetStats(ticker.toUpperCase(), res.value.prices, res.value.dates));
      } else {
        // Warning handled in UI via isSimulated flag or console
        console.warn(`Failed to fetch ${ticker}, falling back to simulation.`);
        useSimulation = true;
        const mock = getMockData(ticker, days);
        processedAssets.push(processAssetStats(ticker.toUpperCase(), mock.prices, mock.dates));
      }
    });
    
    if (results.filter(r => r.status === 'rejected').length > 0) {
      useSimulation = true;
    }

  } catch (e) {
    console.error("Global fetch failure", e);
    useSimulation = true;
    tickers.forEach(ticker => {
      const mock = getMockData(ticker, days);
      processedAssets.push(processAssetStats(ticker.toUpperCase(), mock.prices, mock.dates));
    });
  }

  return {
    data: processedAssets,
    isSimulated: useSimulation
  };
};
