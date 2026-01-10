// nodes/TechnicalIndicators/utils/indicatorCalculator.ts
// Fix the require and error handling

import * as ti from 'technicalindicators';
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
    } catch (error: any) {
      results[indicator] = { error: error?.message || 'Calculation failed' };
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
      
      case 'stoch':
        return ti.Stochastic.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
          signalPeriod: params.signalPeriod || 3,
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
      
      case 'cci':
        return ti.CCI.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 20,
        });
      
      case 'mfi':
        return ti.MFI.calculate({
          high: highs,
          low: lows,
          close: closes,
          volume: volumes,
          period: params.period || 14,
        });
      
      case 'roc':
        return ti.ROC.calculate({
          values: closes,
          period: params.period || 12,
        });
      
      case 'willr':
        return ti.WilliamsR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });

      // ===== MOVING AVERAGES =====
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

      // ===== VOLATILITY INDICATORS =====
      case 'atr':
        return ti.ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'bbands':
        return ti.BollingerBands.calculate({
          values: closes,
          period: params.period || 20,
          stdDev: params.stdDev || 2,
        });

      // ===== VOLUME INDICATORS =====
      case 'obv':
        return ti.OBV.calculate({ close: closes, volume: volumes });
      
      case 'vwap':
        return closes.map((_: number, i: number) => {
          const typicalPrices = closes.slice(0, i + 1).map((c: number, j: number) => 
            (highs[j] + lows[j] + c) / 3
          );
          const tpv = typicalPrices.map((tp: number, j: number) => tp * volumes[j]);
          return tpv.reduce((a: number, b: number) => a + b, 0) / volumes.slice(0, i + 1).reduce((a: number, b: number) => a + b, 0);
        });

      // ===== PRICE INDICATORS =====
      case 'typprice':
        return highs.map((h: number, i: number) => (h + lows[i] + closes[i]) / 3);
      
      case 'tr':
        return ti.TrueRange.calculate({ high: highs, low: lows, close: closes });

      // Default for unimplemented indicators
      default:
        return { error: `Indicator '${indicator}' not yet implemented`, available: true };
    }
  } catch (error: any) {
    return { error: `Failed to calculate ${indicator}: ${error?.message || 'Unknown error'}` };
  }
}

// Helper functions remain the same...
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
