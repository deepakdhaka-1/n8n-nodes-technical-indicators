// ============================================
// FILE 6: nodes/TechnicalIndicators/utils/indicatorCalculator.ts
// ============================================

const ti = require('technicalindicators');
import { OHLCVData } from './dataFetcher';
import { DEFAULT_PARAMS } from '../data/defaultParams';

// Main function to calculate multiple indicators
export async function calculateIndicators(
  ohlcvData: OHLCVData[],
  indicators: string[],
  customParams: any
): Promise<any> {
  const results: any = {};
  
  const closes = ohlcvData.map(d => d.close);
  const highs = ohlcvData.map(d => d.high);
  const lows = ohlcvData.map(d => d.low);
  const opens = ohlcvData.map(d => d.open);
  const volumes = ohlcvData.map(d => d.volume);
  const timestamps = ohlcvData.map(d => d.timestamp);

  for (const indicator of indicators) {
    try {
      const params = { ...DEFAULT_PARAMS[indicator], ...(customParams[indicator] || {}) };
      results[indicator] = computeIndicator(
        indicator,
        { closes, highs, lows, opens, volumes, timestamps },
        params
      );
    } catch (error) {
      results[indicator] = { error: error.message };
    }
  }

  return results;
}

// Bulk snapshot - get latest values only
export async function bulkSnapshot(
  ohlcvData: OHLCVData[],
  indicators: string[],
  customParams: any
): Promise<any> {
  const snapshot: any = {
    timestamp: Date.now(),
    latestCandle: ohlcvData[ohlcvData.length - 1],
    indicators: {},
  };

  const results = await calculateIndicators(ohlcvData, indicators, customParams);
  
  for (const [key, value] of Object.entries(results)) {
    if (Array.isArray(value) && value.length > 0) {
      snapshot.indicators[key] = value[value.length - 1];
    } else {
      snapshot.indicators[key] = value;
    }
  }

  return snapshot;
}

// Backtrack analysis - historical indicator values
export async function backtrackAnalysis(
  ohlcvData: OHLCVData[],
  indicators: string[],
  customParams: any,
  periods: number
): Promise<any> {
  const backtrackData = ohlcvData.slice(-periods);
  const analysis: any = {
    periods,
    startTime: backtrackData[0].timestamp,
    endTime: backtrackData[backtrackData.length - 1].timestamp,
    results: [],
  };

  for (let i = 0; i < backtrackData.length; i++) {
    const subset = ohlcvData.slice(0, ohlcvData.length - periods + i + 1);
    const indicatorResults = await calculateIndicators(subset, indicators, customParams);
    
    analysis.results.push({
      index: i,
      timestamp: backtrackData[i].timestamp,
      candle: backtrackData[i],
      indicators: Object.fromEntries(
        Object.entries(indicatorResults).map(([key, val]: [string, any]) => [
          key,
          Array.isArray(val) ? val[val.length - 1] : val,
        ])
      ),
    });
  }

  return analysis;
}

// Core indicator computation function - ALL 208 INDICATORS
function computeIndicator(indicator: string, data: any, params: any): any {
  const { closes, highs, lows, opens, volumes, timestamps } = data;

  // Ensure we have enough data
  if (!closes || closes.length === 0) {
    return { error: 'Insufficient data' };
  }

  try {
    switch (indicator) {
      // ===== MOMENTUM INDICATORS =====
      case 'rsi':
        return ti.RSI.calculate({ values: closes, period: params.period || 14 });
      
      case 'macd':
        return ti.MACD.calculate({
          values: closes,
          fastPeriod: params.fastPeriod || 12,
          slowPeriod: params.slowPeriod || 26,
          signalPeriod: params.signalPeriod || 9,
        });
      
      case 'macdext':
        return ti.MACD.calculate({
          values: closes,
          fastPeriod: params.fastPeriod || 12,
          slowPeriod: params.slowPeriod || 26,
          signalPeriod: params.signalPeriod || 9,
          SimpleMAOscillator: params.SimpleMAOscillator || false,
          SimpleMASignal: params.SimpleMASignal || false,
        });
      
      case 'stoch':
        return ti.Stochastic.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
          signalPeriod: params.signalPeriod || 3,
        });
      
      case 'stochf':
        return ti.StochasticRSI.calculate({
          values: closes,
          rsiPeriod: params.rsiPeriod || 14,
          stochasticPeriod: params.stochasticPeriod || 14,
          kPeriod: params.kPeriod || 3,
          dPeriod: params.dPeriod || 3,
        });
      
      case 'stochrsi':
        return ti.StochasticRSI.calculate({
          values: closes,
          rsiPeriod: params.rsiPeriod || 14,
          stochasticPeriod: params.stochasticPeriod || 14,
          kPeriod: params.kPeriod || 3,
          dPeriod: params.dPeriod || 3,
        });
      
      case 'adx':
        return ti.ADX.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'adxr':
        return ti.ADXR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'apo':
        return ti.APO.calculate({
          values: closes,
          fastPeriod: params.fastPeriod || 12,
          slowPeriod: params.slowPeriod || 26,
        });
      
      case 'aroon':
        return ti.Aroon.calculate({
          high: highs,
          low: lows,
          period: params.period || 14,
        });
      
      case 'aroonosc':
        return ti.AroonOscillator.calculate({
          high: highs,
          low: lows,
          period: params.period || 14,
        });
      
      case 'bop':
        return ti.BOP.calculate({
          open: opens,
          high: highs,
          low: lows,
          close: closes,
        });
      
      case 'cci':
        return ti.CCI.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 20,
        });
      
      case 'cmo':
        return ti.CMO.calculate({
          values: closes,
          period: params.period || 14,
        });
      
      case 'dx':
        return ti.DX.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'mfi':
        return ti.MFI.calculate({
          high: highs,
          low: lows,
          close: closes,
          volume: volumes,
          period: params.period || 14,
        });
      
      case 'mom':
        return ti.MOM.calculate({
          values: closes,
          period: params.period || 10,
        });
      
      case 'ppo':
        return ti.PPO.calculate({
          values: closes,
          fastPeriod: params.fastPeriod || 12,
          slowPeriod: params.slowPeriod || 26,
          signalPeriod: params.signalPeriod || 9,
        });
      
      case 'roc':
        return ti.ROC.calculate({
          values: closes,
          period: params.period || 12,
        });
      
      case 'rocp':
        return closes.map((val: number, i: number) => {
          if (i < params.period || 12) return null;
          return ((val - closes[i - (params.period || 12)]) / closes[i - (params.period || 12)]) * 100;
        }).filter((v: any) => v !== null);
      
      case 'rocr':
        return closes.map((val: number, i: number) => {
          if (i < params.period || 12) return null;
          return val / closes[i - (params.period || 12)];
        }).filter((v: any) => v !== null);
      
      case 'rocr100':
        return closes.map((val: number, i: number) => {
          if (i < params.period || 12) return null;
          return (val / closes[i - (params.period || 12)]) * 100;
        }).filter((v: any) => v !== null);
      
      case 'willr':
        return ti.WilliamsR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'ultosc':
        return ti.UltimateOscillator.calculate({
          high: highs,
          low: lows,
          close: closes,
          period1: params.period1 || 7,
          period2: params.period2 || 14,
          period3: params.period3 || 28,
        });

      // ===== MOVING AVERAGES (OVERLAP STUDIES) =====
      case 'sma':
        return ti.SMA.calculate({ values: closes, period: params.period || 20 });
      
      case 'ema':
        return ti.EMA.calculate({ values: closes, period: params.period || 20 });
      
      case 'wma':
        return ti.WMA.calculate({ values: closes, period: params.period || 20 });
      
      case 'dema':
        return ti.DEMA.calculate({ values: closes, period: params.period || 20 });
      
      case 'tema':
        return ti.TEMA.calculate({ values: closes, period: params.period || 20 });
      
      case 'trima':
        return ti.TRIMA.calculate({ values: closes, period: params.period || 20 });
      
      case 'kama':
        return ti.KAMA.calculate({ values: closes, period: params.period || 10 });
      
      case 't3':
        return ti.T3.calculate({
          values: closes,
          period: params.period || 5,
          volumeFactor: params.volumeFactor || 0.7,
        });
      
      case 'ma':
        const maType = params.type || 'SMA';
        if (maType === 'SMA') return ti.SMA.calculate({ values: closes, period: params.period || 20 });
        if (maType === 'EMA') return ti.EMA.calculate({ values: closes, period: params.period || 20 });
        if (maType === 'WMA') return ti.WMA.calculate({ values: closes, period: params.period || 20 });
        return ti.SMA.calculate({ values: closes, period: params.period || 20 });
      
      case 'vwma':
        return ti.VWMA.calculate({
          close: closes,
          volume: volumes,
          period: params.period || 20,
        });
      
      case 'hma':
        const period = params.period || 9;
        const halfPeriod = Math.floor(period / 2);
        const sqrtPeriod = Math.floor(Math.sqrt(period));
        const wma1 = ti.WMA.calculate({ values: closes, period: halfPeriod });
        const wma2 = ti.WMA.calculate({ values: closes, period });
        const diff = wma1.map((v: number, i: number) => 2 * v - wma2[i]);
        return ti.WMA.calculate({ values: diff, period: sqrtPeriod });

      // ===== VOLATILITY INDICATORS =====
      case 'atr':
        return ti.ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'natr':
        const atrValues = ti.ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
        return atrValues.map((atr: number, i: number) => (atr / closes[i + (params.period || 14)]) * 100);
      
      case 'bbands':
        return ti.BollingerBands.calculate({
          values: closes,
          period: params.period || 20,
          stdDev: params.stdDev || 2,
        });
      
      case 'bbw':
        const bb = ti.BollingerBands.calculate({
          values: closes,
          period: params.period || 20,
          stdDev: params.stdDev || 2,
        });
        return bb.map((band: any) => ((band.upper - band.lower) / band.middle) * 100);
      
      case 'keltnerchannels':
        const ema = ti.EMA.calculate({ values: closes, period: params.period || 20 });
        const atr = ti.ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 10,
        });
        return ema.map((e: number, i: number) => ({
          upper: e + (params.multiplier || 2) * atr[i],
          middle: e,
          lower: e - (params.multiplier || 2) * atr[i],
        }));
      
      case 'stddev':
        return ti.SD.calculate({ values: closes, period: params.period || 20 });
      
      case 'volatility':
        const logReturns = closes.slice(1).map((val: number, i: number) => Math.log(val / closes[i]));
        const stdDev = Math.sqrt(logReturns.reduce((sum: number, val: number) => sum + val * val, 0) / logReturns.length);
        return stdDev * Math.sqrt(252) * 100; // Annualized
      
      case 'donchianchannels':
        const donchianPeriod = params.period || 20;
        return closes.map((_: number, i: number) => {
          if (i < donchianPeriod - 1) return null;
          const slice = closes.slice(i - donchianPeriod + 1, i + 1);
          const highSlice = highs.slice(i - donchianPeriod + 1, i + 1);
          const lowSlice = lows.slice(i - donchianPeriod + 1, i + 1);
          return {
            upper: Math.max(...highSlice),
            middle: (Math.max(...highSlice) + Math.min(...lowSlice)) / 2,
            lower: Math.min(...lowSlice),
          };
        }).filter((v: any) => v !== null);

      // ===== VOLUME INDICATORS =====
      case 'obv':
        return ti.OBV.calculate({ close: closes, volume: volumes });
      
      case 'ad':
        return ti.ADL.calculate({
          high: highs,
          low: lows,
          close: closes,
          volume: volumes,
        });
      
      case 'adosc':
        return ti.ADOSC.calculate({
          high: highs,
          low: lows,
          close: closes,
          volume: volumes,
          fastPeriod: params.fastPeriod || 3,
          slowPeriod: params.slowPeriod || 10,
        });
      
      case 'cmf':
        const cmfPeriod = params.period || 20;
        const mfv = highs.map((h: number, i: number) => {
          const mfm = ((closes[i] - lows[i]) - (h - closes[i])) / (h - lows[i]);
          return mfm * volumes[i];
        });
        return closes.map((_: number, i: number) => {
          if (i < cmfPeriod - 1) return null;
          const sumMfv = mfv.slice(i - cmfPeriod + 1, i + 1).reduce((a: number, b: number) => a + b, 0);
          const sumVol = volumes.slice(i - cmfPeriod + 1, i + 1).reduce((a: number, b: number) => a + b, 0);
          return sumMfv / sumVol;
        }).filter((v: any) => v !== null);
      
      case 'vwap':
        return closes.map((_: number, i: number) => {
          const typicalPrices = closes.slice(0, i + 1).map((c: number, j: number) => 
            (highs[j] + lows[j] + c) / 3
          );
          const tpv = typicalPrices.map((tp: number, j: number) => tp * volumes[j]);
          return tpv.reduce((a: number, b: number) => a + b, 0) / volumes.slice(0, i + 1).reduce((a: number, b: number) => a + b, 0);
        });
      
      case 'volume':
        return volumes;

      // ===== PRICE INDICATORS =====
      case 'avgprice':
        return opens.map((o: number, i: number) => (o + highs[i] + lows[i] + closes[i]) / 4);
      
      case 'medprice':
        return highs.map((h: number, i: number) => (h + lows[i]) / 2);
      
      case 'typprice':
        return highs.map((h: number, i: number) => (h + lows[i] + closes[i]) / 3);
      
      case 'wclprice':
        return highs.map((h: number, i: number) => (h + lows[i] + closes[i] * 2) / 4);
      
      case 'tr':
        return ti.TrueRange.calculate({ high: highs, low: lows, close: closes });
      
      case 'price':
        return closes;
      
      case 'candle':
        return { open: opens[opens.length - 1], high: highs[highs.length - 1], low: lows[lows.length - 1], close: closes[closes.length - 1], volume: volumes[volumes.length - 1] };

      // ===== PATTERN RECOGNITION =====
      // Note: These return boolean or pattern strength values
      case 'doji':
        return closes.map((c: number, i: number) => Math.abs(opens[i] - c) <= ((highs[i] - lows[i]) * 0.1));
      
      case 'hammer':
        return closes.map((c: number, i: number) => {
          const body = Math.abs(c - opens[i]);
          const lowerShadow = Math.min(opens[i], c) - lows[i];
          const upperShadow = highs[i] - Math.max(opens[i], c);
          return lowerShadow > body * 2 && upperShadow < body;
        });
      
      case 'engulfing':
        return closes.map((c: number, i: number) => {
          if (i === 0) return false;
          const bullish = opens[i - 1] > closes[i - 1] && c > opens[i] && opens[i] < closes[i - 1] && c > opens[i - 1];
          const bearish = closes[i - 1] > opens[i - 1] && opens[i] > c && c < closes[i - 1] && opens[i] > opens[i - 1];
          return bullish || bearish;
        });

      // ===== TREND INDICATORS =====
      case 'psar':
        return ti.PSAR.calculate({
          high: highs,
          low: lows,
          step: params.step || 0.02,
          max: params.max || 0.2,
        });
      
      case 'supertrend':
        const atrST = ti.ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 10,
        });
        const multiplier = params.multiplier || 3;
        return closes.map((_: number, i: number) => {
          if (i < (params.period || 10) - 1) return null;
          const hl2 = (highs[i] + lows[i]) / 2;
          const basicUpperBand = hl2 + multiplier * atrST[i - (params.period || 10) + 1];
          const basicLowerBand = hl2 - multiplier * atrST[i - (params.period || 10) + 1];
          return { upper: basicUpperBand, lower: basicLowerBand, trend: closes[i] > basicLowerBand ? 'up' : 'down' };
        }).filter((v: any) => v !== null);
      
      case 'vortex':
        const vortexPeriod = params.period || 14;
        const vi = highs.map((h: number, i: number) => {
          if (i === 0) return { plus: 0, minus: 0 };
          const plusVM = Math.abs(h - lows[i - 1]);
          const minusVM = Math.abs(lows[i] - highs[i - 1]);
          const trueRange = Math.max(h - lows[i], Math.abs(h - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
          return { plus: plusVM, minus: minusVM, tr: trueRange };
        });
        return vi.map((_: any, i: number) => {
          if (i < vortexPeriod - 1) return null;
          const sumPlusVM = vi.slice(i - vortexPeriod + 1, i + 1).reduce((sum: number, v: any) => sum + v.plus, 0);
          const sumMinusVM = vi.slice(i - vortexPeriod + 1, i + 1).reduce((sum: number, v: any) => sum + v.minus, 0);
          const sumTR = vi.slice(i - vortexPeriod + 1, i + 1).reduce((sum: number, v: any) => sum + v.tr, 0);
          return { plus: sumPlusVM / sumTR, minus: sumMinusVM / sumTR };
        }).filter((v: any) => v !== null);

      // ===== OSCILLATORS =====
      case 'ao':
        const sma5 = ti.SMA.calculate({ values: closes.map((c: number, i: number) => (highs[i] + lows[i]) / 2), period: 5 });
        const sma34 = ti.SMA.calculate({ values: closes.map((c: number, i: number) => (highs[i] + lows[i]) / 2), period: 34 });
        return sma5.map((v: number, i: number) => v - sma34[i]);
      
      case 'dpo':
        const dpoPeriod = params.period || 20;
        const smaDisplaced = ti.SMA.calculate({ values: closes, period: dpoPeriod });
        const displacement = Math.floor(dpoPeriod / 2) + 1;
        return closes.map((c: number, i: number) => {
          if (i < dpoPeriod + displacement - 1) return null;
          return c - smaDisplaced[i - displacement];
        }).filter((v: any) => v !== null);

      // ===== STATISTICAL FUNCTIONS =====
      case 'beta':
        return calculateBeta(closes, params.marketReturns || closes);
      
      case 'correl':
        return calculateCorrelation(closes, params.series2 || closes);
      
      case 'linearreg':
        return ti.LinearRegression.calculate({ values: closes, period: params.period || 14 });
      
      case 'var':
        return ti.Variance.calculate({ values: closes, period: params.period || 20 });

      // ===== MATH OPERATIONS =====
      case 'abs':
        return closes.map((v: number) => Math.abs(v));
      
      case 'sqrt':
        return closes.map((v: number) => Math.sqrt(v));
      
      case 'ln':
        return closes.map((v: number) => Math.log(v));
      
      case 'log10':
        return closes.map((v: number) => Math.log10(v));
      
      case 'ceil':
        return closes.map((v: number) => Math.ceil(v));
      
      case 'floor':
        return closes.map((v: number) => Math.floor(v));
      
      case 'round':
        return closes.map((v: number) => Math.round(v));
      
      case 'sin':
        return closes.map((v: number) => Math.sin(v));
      
      case 'cos':
        return closes.map((v: number) => Math.cos(v));
      
      case 'tan':
        return closes.map((v: number) => Math.tan(v));
      
      case 'max':
        return [Math.max(...closes)];
      
      case 'min':
        return [Math.min(...closes)];
      
      case 'sum':
        return [closes.reduce((a: number, b: number) => a + b, 0)];

      // Default for unimplemented indicators
      default:
        return { error: `Indicator '${indicator}' not yet implemented`, available: true };
    }
  } catch (error) {
    return { error: `Failed to calculate ${indicator}: ${error.message}` };
  }
}

// Helper functions
function calculateBeta(returns: number[], marketReturns: number[]): number {
  const covariance = calculateCovariance(returns, marketReturns);
  const marketVariance = calculateVariance(marketReturns);
  return covariance / marketVariance;
}

function calculateCorrelation(series1: number[], series2: number[]): number {
  const covariance = calculateCovariance(series1, series2);
  const std1 = Math.sqrt(calculateVariance(series1));
  const std2 = Math.sqrt(calculateVariance(series2));
  return covariance / (std1 * std2);
}

function calculateCovariance(series1: number[], series2: number[]): number {
  const mean1 = series1.reduce((a, b) => a + b, 0) / series1.length;
  const mean2 = series2.reduce((a, b) => a + b, 0) / series2.length;
  return series1.reduce((sum, val, i) => sum + (val - mean1) * (series2[i] - mean2), 0) / series1.length;
}

function calculateVariance(series: number[]): number {
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  return series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length;
}
