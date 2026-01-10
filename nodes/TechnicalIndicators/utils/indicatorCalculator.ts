// nodes/TechnicalIndicators/utils/indicatorCalculator.ts
import { 
  RSI, 
  MACD, 
  SMA, 
  EMA, 
  WMA,
  BollingerBands,
  Stochastic,
  StochasticRSI,
  ADX,
  CCI,
  MFI,
  ROC,
  WilliamsR,
  ATR,
  OBV,
  TrueRange
} from 'technicalindicators';

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

// Core indicator computation function
function computeIndicator(indicator: string, data: any, params: any): any {
  const { closes, highs, lows, opens, volumes } = data;

  if (!closes || closes.length === 0) {
    return { error: 'Insufficient data' };
  }

  try {
    switch (indicator) {
      // ===== MOMENTUM INDICATORS =====
      case 'rsi':
        return RSI.calculate({ 
          values: closes, 
          period: params.period || 14 
        });
      
      case 'macd':
        return MACD.calculate({
          values: closes,
          fastPeriod: params.fastPeriod || 12,
          slowPeriod: params.slowPeriod || 26,
          signalPeriod: params.signalPeriod || 9,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        });
      
      case 'stoch':
        return Stochastic.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
          signalPeriod: params.signalPeriod || 3,
        });
      
      case 'stochrsi':
        return StochasticRSI.calculate({
          values: closes,
          rsiPeriod: params.rsiPeriod || 14,
          stochasticPeriod: params.stochasticPeriod || 14,
          kPeriod: params.kPeriod || 3,
          dPeriod: params.dPeriod || 3,
        });
      
      case 'adx':
        return ADX.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'cci':
        return CCI.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 20,
        });
      
      case 'mfi':
        return MFI.calculate({
          high: highs,
          low: lows,
          close: closes,
          volume: volumes,
          period: params.period || 14,
        });
      
      case 'roc':
        return ROC.calculate({
          values: closes,
          period: params.period || 12,
        });
      
      case 'willr':
        return WilliamsR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'mom':
        return calculateMomentum(closes, params.period || 10);
      
      case 'aroon':
        return calculateAroon(highs, lows, params.period || 14);
      
      case 'aroonosc':
        const aroon = calculateAroon(highs, lows, params.period || 14);
        return aroon.map((a: any) => a.up - a.down);
      
      case 'bop':
        return opens.map((o: number, i: number) => 
          (closes[i] - o) / (highs[i] - lows[i])
        );
      
      case 'cmo':
        return calculateCMO(closes, params.period || 14);
      
      case 'ppo':
        const fastEMA = EMA.calculate({ values: closes, period: params.fastPeriod || 12 });
        const slowEMA = EMA.calculate({ values: closes, period: params.slowPeriod || 26 });
        return fastEMA.map((fast: number, i: number) => 
          ((fast - slowEMA[i]) / slowEMA[i]) * 100
        );
      
      case 'ultosc':
        return calculateUltimateOscillator(
          highs, lows, closes,
          params.period1 || 7,
          params.period2 || 14,
          params.period3 || 28
        );

      // ===== MOVING AVERAGES =====
      case 'sma':
        return SMA.calculate({ 
          values: closes, 
          period: params.period || 20 
        });
      
      case 'ema':
        return EMA.calculate({ 
          values: closes, 
          period: params.period || 20 
        });
      
      case 'wma':
        return WMA.calculate({ 
          values: closes, 
          period: params.period || 20 
        });
      
      case 'dema':
        return calculateDEMA(closes, params.period || 20);
      
      case 'tema':
        return calculateTEMA(closes, params.period || 20);
      
      case 'trima':
        return calculateTRIMA(closes, params.period || 20);
      
      case 'hma':
        return calculateHMA(closes, params.period || 9);
      
      case 'vwma':
        return calculateVWMA(closes, volumes, params.period || 20);
      
      case 'ma':
        const maType = params.type || 'SMA';
        if (maType === 'EMA') return EMA.calculate({ values: closes, period: params.period || 20 });
        if (maType === 'WMA') return WMA.calculate({ values: closes, period: params.period || 20 });
        return SMA.calculate({ values: closes, period: params.period || 20 });

      // ===== VOLATILITY INDICATORS =====
      case 'atr':
        return ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
      
      case 'natr':
        const atrVals = ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: params.period || 14,
        });
        return atrVals.map((atr: number, i: number) => 
          (atr / closes[i + (params.period || 14)]) * 100
        );
      
      case 'bbands':
        return BollingerBands.calculate({
          values: closes,
          period: params.period || 20,
          stdDev: params.stdDev || 2,
        });
      
      case 'bbw':
        const bb = BollingerBands.calculate({
          values: closes,
          period: params.period || 20,
          stdDev: params.stdDev || 2,
        });
        return bb.map((band: any) => 
          ((band.upper - band.lower) / band.middle) * 100
        );
      
      case 'stddev':
        return calculateStdDev(closes, params.period || 20);
      
      case 'keltnerchannels':
        return calculateKeltnerChannels(highs, lows, closes, params.period || 20, params.multiplier || 2);
      
      case 'donchianchannels':
        return calculateDonchianChannels(highs, lows, params.period || 20);

      // ===== VOLUME INDICATORS =====
      case 'obv':
        return OBV.calculate({ 
          close: closes, 
          volume: volumes 
        });
      
      case 'vwap':
        return calculateVWAP(highs, lows, closes, volumes);
      
      case 'cmf':
        return calculateCMF(highs, lows, closes, volumes, params.period || 20);
      
      case 'ad':
        return calculateAD(highs, lows, closes, volumes);
      
      case 'volume':
        return volumes;

      // ===== PRICE INDICATORS =====
      case 'avgprice':
        return opens.map((o: number, i: number) => 
          (o + highs[i] + lows[i] + closes[i]) / 4
        );
      
      case 'medprice':
        return highs.map((h: number, i: number) => 
          (h + lows[i]) / 2
        );
      
      case 'typprice':
        return highs.map((h: number, i: number) => 
          (h + lows[i] + closes[i]) / 3
        );
      
      case 'wclprice':
        return highs.map((h: number, i: number) => 
          (h + lows[i] + closes[i] * 2) / 4
        );
      
      case 'tr':
        return TrueRange.calculate({ 
          high: highs, 
          low: lows, 
          close: closes 
        });
      
      case 'price':
        return closes;
      
      case 'candle':
        const last = closes.length - 1;
        return {
          open: opens[last],
          high: highs[last],
          low: lows[last],
          close: closes[last],
          volume: volumes[last]
        };

      // ===== TREND INDICATORS =====
      case 'supertrend':
        return calculateSupertrend(highs, lows, closes, params.period || 10, params.multiplier || 3);
      
      case 'psar':
        return calculatePSAR(highs, lows, params.step || 0.02, params.max || 0.2);
      
      case 'dmi':
        return calculateDMI(highs, lows, closes, params.period || 14);

      // ===== PATTERN RECOGNITION =====
      case 'doji':
        return closes.map((c: number, i: number) => 
          Math.abs(opens[i] - c) <= ((highs[i] - lows[i]) * 0.1)
        );
      
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
          const bullish = opens[i - 1] > closes[i - 1] && c > opens[i] && 
                         opens[i] < closes[i - 1] && c > opens[i - 1];
          const bearish = closes[i - 1] > opens[i - 1] && opens[i] > c && 
                         c < closes[i - 1] && opens[i] > opens[i - 1];
          return bullish || bearish;
        });

      // Default
      default:
        return { error: `Indicator '${indicator}' not yet implemented` };
    }
  } catch (error: any) {
    return { error: `Failed to calculate ${indicator}: ${error?.message || 'Unknown error'}` };
  }
}

// ===== HELPER FUNCTIONS =====

function calculateMomentum(values: number[], period: number): number[] {
  return values.slice(period).map((val, i) => val - values[i]);
}

function calculateAroon(highs: number[], lows: number[], period: number): any[] {
  const result = [];
  for (let i = period - 1; i < highs.length; i++) {
    const slice = highs.slice(i - period + 1, i + 1);
    const sliceLow = lows.slice(i - period + 1, i + 1);
    const highIdx = slice.indexOf(Math.max(...slice));
    const lowIdx = sliceLow.indexOf(Math.min(...sliceLow));
    result.push({
      up: ((period - highIdx - 1) / period) * 100,
      down: ((period - lowIdx - 1) / period) * 100
    });
  }
  return result;
}

function calculateCMO(values: number[], period: number): number[] {
  const result = [];
  for (let i = period; i < values.length; i++) {
    let upSum = 0, downSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - values[j - 1];
      if (diff > 0) upSum += diff;
      else downSum += Math.abs(diff);
    }
    result.push(((upSum - downSum) / (upSum + downSum)) * 100);
  }
  return result;
}

function calculateDEMA(values: number[], period: number): number[] {
  const ema1 = EMA.calculate({ values, period });
  const ema2 = EMA.calculate({ values: ema1, period });
  return ema1.map((e1, i) => 2 * e1 - ema2[i]);
}

function calculateTEMA(values: number[], period: number): number[] {
  const ema1 = EMA.calculate({ values, period });
  const ema2 = EMA.calculate({ values: ema1, period });
  const ema3 = EMA.calculate({ values: ema2, period });
  return ema1.map((e1, i) => 3 * e1 - 3 * ema2[i] + ema3[i]);
}

function calculateTRIMA(values: number[], period: number): number[] {
  const sma1 = SMA.calculate({ values, period });
  return SMA.calculate({ values: sma1, period });
}

function calculateHMA(values: number[], period: number): number[] {
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  const wma1 = WMA.calculate({ values, period: halfPeriod });
  const wma2 = WMA.calculate({ values, period });
  const diff = wma1.map((v: number, i: number) => 2 * v - wma2[i]);
  return WMA.calculate({ values: diff, period: sqrtPeriod });
}

function calculateVWMA(closes: number[], volumes: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    let sumPV = 0, sumV = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumPV += closes[j] * volumes[j];
      sumV += volumes[j];
    }
    result.push(sumPV / sumV);
  }
  return result;
}

function calculateStdDev(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b) / slice.length;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
    result.push(Math.sqrt(variance));
  }
  return result;
}

function calculateKeltnerChannels(highs: number[], lows: number[], closes: number[], period: number, multiplier: number): any[] {
  const ema = EMA.calculate({ values: closes, period });
  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period });
  return ema.map((e, i) => ({
    upper: e + multiplier * atr[i],
    middle: e,
    lower: e - multiplier * atr[i]
  }));
}

function calculateDonchianChannels(highs: number[], lows: number[], period: number): any[] {
  const result = [];
  for (let i = period - 1; i < highs.length; i++) {
    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);
    const upper = Math.max(...highSlice);
    const lower = Math.min(...lowSlice);
    result.push({ upper, middle: (upper + lower) / 2, lower });
  }
  return result;
}

function calculateVWAP(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
  let cumTPV = 0, cumV = 0;
  return closes.map((c, i) => {
    const tp = (highs[i] + lows[i] + c) / 3;
    cumTPV += tp * volumes[i];
    cumV += volumes[i];
    return cumTPV / cumV;
  });
}

function calculateCMF(highs: number[], lows: number[], closes: number[], volumes: number[], period: number): number[] {
  const mfv = highs.map((h, i) => {
    const mfm = ((closes[i] - lows[i]) - (h - closes[i])) / (h - lows[i]);
    return mfm * volumes[i];
  });
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const sumMfv = mfv.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumVol = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sumMfv / sumVol);
  }
  return result;
}

function calculateAD(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
  let ad = 0;
  return closes.map((c, i) => {
    const mfm = ((c - lows[i]) - (highs[i] - c)) / (highs[i] - lows[i]);
    ad += mfm * volumes[i];
    return ad;
  });
}

function calculateSupertrend(highs: number[], lows: number[], closes: number[], period: number, multiplier: number): any[] {
  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period });
  const result = [];
  for (let i = 0; i < atr.length; i++) {
    const hl2 = (highs[i + period - 1] + lows[i + period - 1]) / 2;
    const upper = hl2 + multiplier * atr[i];
    const lower = hl2 - multiplier * atr[i];
    const trend = closes[i + period - 1] > lower ? 'up' : 'down';
    result.push({ upper, lower, trend });
  }
  return result;
}

function calculatePSAR(highs: number[], lows: number[], step: number, max: number): number[] {
  const psar = [lows[0]];
  let af = step;
  let ep = highs[0];
  let trend = 1;
  
  for (let i = 1; i < highs.length; i++) {
    psar[i] = psar[i - 1] + af * (ep - psar[i - 1]);
    
    if (trend === 1) {
      if (lows[i] < psar[i]) {
        trend = -1;
        psar[i] = ep;
        ep = lows[i];
        af = step;
      } else if (highs[i] > ep) {
        ep = highs[i];
        af = Math.min(af + step, max);
      }
    } else {
      if (highs[i] > psar[i]) {
        trend = 1;
        psar[i] = ep;
        ep = highs[i];
        af = step;
      } else if (lows[i] < ep) {
        ep = lows[i];
        af = Math.min(af + step, max);
      }
    }
  }
  return psar;
}

function calculateDMI(highs: number[], lows: number[], closes: number[], period: number): any[] {
  const plusDM = [], minusDM = [], tr = [];
  
  for (let i = 1; i < highs.length; i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  
  const smoothPlusDM = SMA.calculate({ values: plusDM, period });
  const smoothMinusDM = SMA.calculate({ values: minusDM, period });
  const smoothTR = SMA.calculate({ values: tr, period });
  
  return smoothPlusDM.map((pdm, i) => ({
    plusDI: (pdm / smoothTR[i]) * 100,
    minusDI: (smoothMinusDM[i] / smoothTR[i]) * 100
  }));
}

function calculateUltimateOscillator(highs: number[], lows: number[], closes: number[], p1: number, p2: number, p3: number): number[] {
  const bp = [], tr = [];
  
  for (let i = 1; i < closes.length; i++) {
    bp.push(closes[i] - Math.min(lows[i], closes[i - 1]));
    tr.push(Math.max(highs[i], closes[i - 1]) - Math.min(lows[i], closes[i - 1]));
  }
  
  const avg1 = calculateAverage(bp, tr, p1);
  const avg2 = calculateAverage(bp, tr, p2);
  const avg3 = calculateAverage(bp, tr, p3);
  
  return avg1.map((a1, i) => 
    ((4 * a1 + 2 * avg2[i] + avg3[i]) / 7) * 100
  );
}

function calculateAverage(bp: number[], tr: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < bp.length; i++) {
    const sumBP = bp.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sumBP / sumTR);
  }
  return result;
}
