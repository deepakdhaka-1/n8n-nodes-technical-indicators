// nodes/TechnicalIndicators/utils/indicatorHelpers.ts
import { SMA, EMA, WMA, ATR } from 'technicalindicators';

// ===== STATISTICAL FUNCTIONS =====

export function calculateBeta(returns: number[], marketReturns: number[]): number {
  const covariance = calculateCovariance(returns, marketReturns);
  const marketVariance = calculateVarianceSimple(marketReturns);
  return covariance / marketVariance;
}

export function calculateCorrelation(series1: number[], series2: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < series1.length; i++) {
    const slice1 = series1.slice(i - period + 1, i + 1);
    const slice2 = series2.slice(i - period + 1, i + 1);
    
    const mean1 = slice1.reduce((a, b) => a + b) / slice1.length;
    const mean2 = slice2.reduce((a, b) => a + b) / slice2.length;
    
    const cov = slice1.reduce((sum, val, j) => sum + (val - mean1) * (slice2[j] - mean2), 0) / slice1.length;
    const std1 = Math.sqrt(slice1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / slice1.length);
    const std2 = Math.sqrt(slice2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / slice2.length);
    
    result.push(cov / (std1 * std2));
  }
  return result;
}

export function calculateCovariance(series1: number[], series2: number[]): number {
  const mean1 = series1.reduce((a, b) => a + b) / series1.length;
  const mean2 = series2.reduce((a, b) => a + b) / series2.length;
  return series1.reduce((sum, val, i) => sum + (val - mean1) * (series2[i] - mean2), 0) / series1.length;
}

export function calculateVarianceSimple(series: number[]): number {
  const mean = series.reduce((a, b) => a + b) / series.length;
  return series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length;
}

export function calculateVariance(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b) / slice.length;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
    result.push(variance);
  }
  return result;
}

export function calculateLinearRegression(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const x = Array.from({ length: period }, (_, j) => j);
    const { slope, intercept } = linearRegressionFit(x, slice);
    result.push(slope * (period - 1) + intercept);
  }
  return result;
}

export function calculateLinearRegressionAngle(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const x = Array.from({ length: period }, (_, j) => j);
    const { slope } = linearRegressionFit(x, slice);
    result.push(Math.atan(slope) * (180 / Math.PI));
  }
  return result;
}

export function calculateLinearRegressionIntercept(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const x = Array.from({ length: period }, (_, j) => j);
    const { intercept } = linearRegressionFit(x, slice);
    result.push(intercept);
  }
  return result;
}

export function calculateLinearRegressionSlope(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const x = Array.from({ length: period }, (_, j) => j);
    const { slope } = linearRegressionFit(x, slice);
    result.push(slope);
  }
  return result;
}

function linearRegressionFit(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

export function calculateTSF(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const x = Array.from({ length: period }, (_, j) => j);
    const { slope, intercept } = linearRegressionFit(x, slice);
    result.push(slope * period + intercept);
  }
  return result;
}

// ===== MOVING AVERAGE HELPERS =====

export function calculateT3(values: number[], period: number, volumeFactor: number): number[] {
  const c1 = -volumeFactor * volumeFactor * volumeFactor;
  const c2 = 3 * volumeFactor * volumeFactor + 3 * volumeFactor * volumeFactor * volumeFactor;
  const c3 = -6 * volumeFactor * volumeFactor - 3 * volumeFactor - 3 * volumeFactor * volumeFactor * volumeFactor;
  const c4 = 1 + 3 * volumeFactor + volumeFactor * volumeFactor * volumeFactor + 3 * volumeFactor * volumeFactor;
  
  const ema1 = EMA.calculate({ values, period });
  const ema2 = EMA.calculate({ values: ema1, period });
  const ema3 = EMA.calculate({ values: ema2, period });
  const ema4 = EMA.calculate({ values: ema3, period });
  const ema5 = EMA.calculate({ values: ema4, period });
  const ema6 = EMA.calculate({ values: ema5, period });
  
  return ema6.map((e6, i) => c1 * ema6[i] + c2 * ema5[i] + c3 * ema4[i] + c4 * ema3[i]);
}

export function calculateMAMA(values: number[], fastLimit: number, slowLimit: number): any[] {
  // MESA Adaptive Moving Average - simplified implementation
  const result = [];
  let mama = values[0];
  let fama = values[0];
  
  for (let i = 1; i < values.length; i++) {
    const phase = (values[i] - values[i - 1]) / values[i - 1];
    const alpha = Math.min(fastLimit, Math.max(slowLimit, Math.abs(phase)));
    
    mama = alpha * values[i] + (1 - alpha) * mama;
    fama = 0.5 * alpha * mama + (1 - 0.5 * alpha) * fama;
    
    result.push({ mama, fama });
  }
  return result;
}

export function calculateMidpoint(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    result.push((Math.max(...slice) + Math.min(...slice)) / 2);
  }
  return result;
}

export function calculateMidprice(highs: number[], lows: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < highs.length; i++) {
    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);
    result.push((Math.max(...highSlice) + Math.min(...lowSlice)) / 2);
  }
  return result;
}

export function calculateSMMA(values: number[], period: number): number[] {
  const result = [];
  let sum = values.slice(0, period).reduce((a, b) => a + b, 0);
  result.push(sum / period);
  
  for (let i = period; i < values.length; i++) {
    const smma = (result[result.length - 1] * (period - 1) + values[i]) / period;
    result.push(smma);
  }
  return result;
}

export function calculateVIDYA(values: number[], period: number): number[] {
  // CMO helper inline
  const cmo = [];
  for (let i = period; i < values.length; i++) {
    let upSum = 0, downSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - values[j - 1];
      if (diff > 0) upSum += diff;
      else downSum += Math.abs(diff);
    }
    cmo.push(((upSum - downSum) / (upSum + downSum || 1)) * 100);
  }
  
  const result = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const alpha = Math.abs(cmo[i - 1] || 0) / 100;
    const vidya = alpha * values[i] + (1 - alpha) * result[result.length - 1];
    result.push(vidya);
  }
  return result;
}

export function calculateWilders(values: number[], period: number): number[] {
  return calculateSMMA(values, period);
}

export function calculateZLEMA(values: number[], period: number): number[] {
  const lag = Math.floor((period - 1) / 2);
  const adjusted = values.map((v, i) => i >= lag ? 2 * v - values[i - lag] : v);
  return EMA.calculate({ values: adjusted, period });
}

export function calculateWilliamsAlligator(highs: number[], lows: number[], jawPeriod: number, teethPeriod: number, lipsPeriod: number): any[] {
  const medianPrices = highs.map((h, i) => (h + lows[i]) / 2);
  const jaw = calculateSMMA(medianPrices, jawPeriod);
  const teeth = calculateSMMA(medianPrices, teethPeriod);
  const lips = calculateSMMA(medianPrices, lipsPeriod);
  
  return jaw.map((j, i) => ({ jaw: j, teeth: teeth[i], lips: lips[i] }));
}

export function calculateHTTrendline(values: number[]): number[] {
  // Simplified Hilbert Transform Trendline
  return SMA.calculate({ values, period: 5 });
}

export function calculateCoppockCurve(values: number[], longPeriod: number, shortPeriod: number, wmaPeriod: number): number[] {
  const roc1 = values.slice(longPeriod).map((v, i) => ((v - values[i]) / values[i]) * 100);
  const roc2 = values.slice(shortPeriod).map((v, i) => ((v - values[i]) / values[i]) * 100);
  const combined = roc1.map((r1, i) => r1 + roc2[i + (longPeriod - shortPeriod)]);
  return WMA.calculate({ values: combined, period: wmaPeriod });
}

// ===== VOLATILITY HELPERS =====

export function calculateStdDev(values: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b) / slice.length;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
    result.push(Math.sqrt(variance));
  }
  return result;
}

export function calculateVolatility(values: number[], period: number): number[] {
  const returns = values.slice(1).map((v, i) => Math.log(v / values[i]));
  const result = [];
  
  for (let i = period - 1; i < returns.length; i++) {
    const slice = returns.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b) / slice.length;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
    result.push(Math.sqrt(variance * 252) * 100); // Annualized
  }
  return result;
}

export function calculateMassIndex(highs: number[], lows: number[], period: number): number[] {
  const ema9 = EMA.calculate({ values: highs.map((h, i) => h - lows[i]), period: 9 });
  const ema9ema9 = EMA.calculate({ values: ema9, period: 9 });
  const ratio = ema9.map((e, i) => e / ema9ema9[i]);
  
  const result = [];
  for (let i = period - 1; i < ratio.length; i++) {
    result.push(ratio.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0));
  }
  return result;
}

export function calculateKeltnerChannels(highs: number[], lows: number[], closes: number[], period: number, multiplier: number): any[] {
  const ema = EMA.calculate({ values: closes, period });
  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period });
  
  return ema.map((e, i) => ({
    upper: e + multiplier * atr[i],
    middle: e,
    lower: e - multiplier * atr[i]
  }));
}

export function calculateDonchianChannels(highs: number[], lows: number[], period: number): any[] {
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

export function calculateAccelerationBands(highs: number[], lows: number[], closes: number[], period: number): any[] {
  const sma = SMA.calculate({ values: closes, period });
  return sma.map((s, i) => {
    const idx = i + period - 1;
    const range = highs[idx] - lows[idx];
    return {
      upper: s * (1 + 2 * (range / s)),
      middle: s,
      lower: s * (1 - 2 * (range / s))
    };
  });
}

// ===== VOLUME HELPERS =====

export function calculateAD(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
  let ad = 0;
  return closes.map((c, i) => {
    const mfm = ((c - lows[i]) - (highs[i] - c)) / (highs[i] - lows[i] || 1);
    ad += mfm * volumes[i];
    return ad;
  });
}

export function calculateADOSC(highs: number[], lows: number[], closes: number[], volumes: number[], fastPeriod: number, slowPeriod: number): number[] {
  const ad = calculateAD(highs, lows, closes, volumes);
  const fastEMA = EMA.calculate({ values: ad, period: fastPeriod });
  const slowEMA = EMA.calculate({ values: ad, period: slowPeriod });
  return fastEMA.map((f, i) => f - slowEMA[i]);
}

export function calculateCMF(highs: number[], lows: number[], closes: number[], volumes: number[], period: number): number[] {
  const mfv = highs.map((h, i) => {
    const mfm = ((closes[i] - lows[i]) - (h - closes[i])) / (h - lows[i] || 1);
    return mfm * volumes[i];
  });
  
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const sumMfv = mfv.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumVol = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sumMfv / (sumVol || 1));
  }
  return result;
}

export function calculateVWAP(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
  let cumTPV = 0, cumV = 0;
  return closes.map((c, i) => {
    const tp = (highs[i] + lows[i] + c) / 3;
    cumTPV += tp * volumes[i];
    cumV += volumes[i];
    return cumTPV / (cumV || 1);
  });
}

export function calculateNVI(closes: number[], volumes: number[]): number[] {
  const result = [1000];
  for (let i = 1; i < closes.length; i++) {
    if (volumes[i] < volumes[i - 1]) {
      result.push(result[i - 1] + ((closes[i] - closes[i - 1]) / closes[i - 1]) * result[i - 1]);
    } else {
      result.push(result[i - 1]);
    }
  }
  return result;
}

export function calculatePVI(closes: number[], volumes: number[]): number[] {
  const result = [1000];
  for (let i = 1; i < closes.length; i++) {
    if (volumes[i] > volumes[i - 1]) {
      result.push(result[i - 1] + ((closes[i] - closes[i - 1]) / closes[i - 1]) * result[i - 1]);
    } else {
      result.push(result[i - 1]);
    }
  }
  return result;
}

export function calculateVOSC(volumes: number[], shortPeriod: number, longPeriod: number): number[] {
  const shortSMA = SMA.calculate({ values: volumes, period: shortPeriod });
  const longSMA = SMA.calculate({ values: volumes, period: longPeriod });
  return shortSMA.map((s, i) => ((s - longSMA[i]) / longSMA[i]) * 100);
}

export function calculateVolumeSplit(closes: number[], volumes: number[]): any[] {
  return closes.map((c, i) => {
    if (i === 0) return { buyVolume: 0, sellVolume: 0 };
    if (c > closes[i - 1]) return { buyVolume: volumes[i], sellVolume: 0 };
    if (c < closes[i - 1]) return { buyVolume: 0, sellVolume: volumes[i] };
    return { buyVolume: volumes[i] / 2, sellVolume: volumes[i] / 2 };
  });
}

export function calculateKVO(highs: number[], lows: number[], closes: number[], volumes: number[], shortPeriod: number, longPeriod: number): number[] {
  const trend = closes.map((c, i) => i === 0 ? 0 : c + highs[i] + lows[i] > closes[i - 1] + highs[i - 1] + lows[i - 1] ? 1 : -1);
  const dm = highs.map((h, i) => h - lows[i]);
  const cm: number[] = [dm[0]];
  
  for (let i = 1; i < dm.length; i++) {
    cm.push(trend[i] === trend[i - 1] ? cm[i - 1] + dm[i] : dm[i]);
  }
  
  const vf = volumes.map((v, i) => v * trend[i] * 100 * (dm[i] / (cm[i] || 1)));
  
  const shortEMA = EMA.calculate({ values: vf, period: shortPeriod });
  const longEMA = EMA.calculate({ values: vf, period: longPeriod });
  return shortEMA.map((s, i) => s - longEMA[i]);
}

// Continue with remaining helpers in next part...
