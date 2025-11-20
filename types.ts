
export interface AssetData {
  ticker: string;
  prices: number[]; // Historical closing prices
  dates: string[]; // ISO Date strings corresponding to prices
  returns: number[]; // Logarithmic returns
  meanReturn: number; // Daily mean
  stdDev: number; // Daily volatility
  lastPrice: number; // Most recent closing price
}

export interface Portfolio {
  weights: number[]; // Corresponds to asset order
  return: number; // Annualized
  risk: number; // Annualized volatility (std dev)
  sharpe: number;
  id: string;
}

export interface UserAssetInput {
  ticker: string;
  expectedMonthlyReturn: number; // User defined monthly return in %
}

export type StrategyType = 'MAX_SHARPE' | 'MIN_RISK' | 'MAX_RETURN';

export interface OptimizationSettings {
  period: '1y' | '3y' | '5y';
  riskFreeRate: number; // e.g., 0.02 for 2%
  simulationCount: number;
  totalCapital: number; // Capital available for investment
  strategy: StrategyType;
  backtestDate: string; // YYYY-MM-DD
  mode: 'INVESTMENT' | 'BACKTEST'; // New mode selector
  alphaVantageKey?: string; // API Key for data fetching
}

export interface BacktestAssetResult {
  ticker: string;
  startPrice: number;
  endPrice: number;
  percent: number; // Realized return
  expectedPercent: number; // User input
  weight: number;
  contribution: number; // Financial contribution
}

export interface BacktestResult {
  startDate: string;
  endDate: string; // +1 month
  startValue: number;
  endValue: number;
  profit: number;
  profitPercent: number;
  assetPerformance: BacktestAssetResult[];
}

export interface SimulationResult {
  portfolios: Portfolio[];
  minRiskPortfolio: Portfolio;
  maxSharpePortfolio: Portfolio;
  maxReturnPortfolio: Portfolio; // New: For aggressive strategy
  covarianceMatrix: number[][];
  correlationMatrix: number[][];
  backtest?: BacktestResult;
}

export enum ViewState {
  INPUT,
  LOADING,
  RESULTS
}
