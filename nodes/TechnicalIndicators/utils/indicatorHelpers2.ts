// nodes/TechnicalIndicators/utils/indicatorHelpers2.ts
import { SMA, EMA, ATR } from 'technicalindicators';

// ===== MOMENTUM & OSCILLATOR HELPERS =====

export function calculateCMOHelper(values: number[], period: number): number[] {
  const result = [];
  for (let i = period; i < values.length; i++) {
    let upSum = 0, downSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = values[j] - values[j - 1];
      if (diff > 0) upSum += diff;
      else downSum += Math.abs(diff);
    }
    result.push(((upSum - downSum) / (upSum + downSum || 1)) * 100);
  }
  return result;
}

export function calculateUltimateOscillator(highs: number[], lows: number[], closes: number[], period1: number, period2: number, period3: number): number[] {
  const bp = [], tr = [];
  
  for (let i = 1; i < closes.length; i++) {
    bp.push(closes[i] - Math.min(lows[i], closes[i - 1]));
    tr.push(Math.max(highs[i], closes[i - 1]) - Math.min(lows[i], closes[i - 1]));
  }
  
  const avg1 = calculateAverage(bp, tr, period1);
  const avg2 = calculateAverage(bp, tr, period2);
  const avg3 = calculateAverage(bp, tr, period3);
  
  return avg1.map((a1, i) => ((4 * a1 + 2 * avg2[i] + avg3[i]) / 7) * 100);
}

function calculateAverage(bp: number[], tr: number[], period: number): number[] {
  const result = [];
  for (let i = period - 1; i < bp.length; i++) {
    const sumBP = bp.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sumBP / (sumTR || 1));
  }
  return result;
}

export function calculateRVGI(opens: number[], highs: number[], lows: number[], closes: number[], period: number): number[] {
  const numerator = closes.map((c, i) => c - opens[i]);
  const denominator = highs.map((h, i) => h - lows[i]);
  
  const result = [];
  for (let i = period - 1; i < closes.length; i++) {
    const sumNum = numerator.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumDen = denominator.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sumNum / (sumDen || 1));
  }
  return result;
}

export function calculateSqueeze(highs: number[], lows: number[], closes: number[], period: number, multiplier: number): any[] {
  const bb = closes.map((c, i) => {
    if (i < period - 1) return null;
    const slice = closes.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b) / slice.length;
    const stdDev = Math.sqrt(slice.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / slice.length);
    return { upper: sma + multiplier * stdDev, lower: sma - multiplier * stdDev };
  });
  
  const kc = highs.map((h, i) => {
    if (i < period - 1) return null;
    const ema = EMA.calculate({ values: closes.slice(0, i + 1), period })[0];
    const atrVal = ATR.calculate({ 
      high: highs.slice(Math.max(0, i - period + 1), i + 1),
      low: lows.slice(Math.max(0, i - period + 1), i + 1),
      close: closes.slice(Math.max(0, i - period + 1), i + 1),
      period: Math.min(period, i + 1)
    })[0] || 0;
    return { upper: ema + multiplier * atrVal, lower: ema - multiplier * atrVal };
  });
  
  return bb.map((b, i) => {
    if (!b || !kc[i]) return { squeeze: false, momentum: 0 };
    const squeeze = b.lower > kc[i]!.lower && b.upper < kc[i]!.upper;
    return { squeeze, momentum: closes[i] - SMA.calculate({ values: closes.slice(0, i + 1), period: 20 })[0] };
  }).filter(v => v);
}

export function calculateSTC(closes: number[], fastPeriod: number, slowPeriod: number, cyclePeriod: number): number[] {
  const macd = EMA.calculate({ values: closes, period: fastPeriod })
    .map((f, i) => f - EMA.calculate({ values: closes, period: slowPeriod })[i]);
  
  const result = [];
  for (let i = cyclePeriod - 1; i < macd.length; i++) {
    const slice = macd.slice(i - cyclePeriod + 1, i + 1);
    const minVal = Math.min(...slice);
    const maxVal = Math.max(...slice);
    const stoch = ((macd[i] - minVal) / (maxVal - minVal || 1)) * 100;
    result.push(stoch);
  }
  return result;
}

export function calculateTRIX(closes: number[], period: number): number[] {
  const ema1 = EMA.calculate({ values: closes, period });
  const ema2 = EMA.calculate({ values: ema1, period });
  const ema3 = EMA.calculate({ values: ema2, period });
  return ema3.slice(1).map((e, i) => ((e - ema3[i]) / ema3[i]) * 100);
}

export function calculateWAD(highs: number[], lows: number[], closes: number[]): number[] {
  let wad = 0;
  return closes.map((c, i) => {
    if (i === 0) return 0;
    const trueHigh = Math.max(highs[i], closes[i - 1]);
    const trueLow = Math.min(lows[i], closes[i - 1]);
    
    if (c > closes[i - 1]) wad += c - trueLow;
    else if (c < closes[i - 1]) wad += c - trueHigh;
    
    return wad;
  });
}

export function calculateIchimoku(highs: number[], lows: number[], closes: number[], conversion: number, base: number, span: number, displacement: number): any[] {
  const tenkan = highs.map((h, i) => {
    if (i < conversion - 1) return null;
    const highSlice = highs.slice(i - conversion + 1, i + 1);
    const lowSlice = lows.slice(i - conversion + 1, i + 1);
    return (Math.max(...highSlice) + Math.min(...lowSlice)) / 2;
  });
  
  const kijun = highs.map((h, i) => {
    if (i < base - 1) return null;
    const highSlice = highs.slice(i - base + 1, i + 1);
    const lowSlice = lows.slice(i - base + 1, i + 1);
    return (Math.max(...highSlice) + Math.min(...lowSlice)) / 2;
  });
  
  const senkouA = tenkan.map((t, i) => t && kijun[i] ? (t + kijun[i]) / 2 : null);
  
  const senkouB = highs.map((h, i) => {
    if (i < span - 1) return null;
    const highSlice = highs.slice(i - span + 1, i + 1);
    const lowSlice = lows.slice(i - span + 1, i + 1);
    return (Math.max(...highSlice) + Math.min(...lowSlice)) / 2;
  });
  
  return closes.map((c, i) => ({
    tenkan: tenkan[i],
    kijun: kijun[i],
    senkouA: senkouA[i],
    senkouB: senkouB[i],
    chikou: i >= displacement ? closes[i - displacement] : null
  }));
}

export function calculateDI(highs: number[], lows: number[], closes: number[], period: number, isPlus: boolean): number[] {
  const dm = [];
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    if (isPlus) {
      dm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    } else {
      dm.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
  }
  
  const tr = highs.slice(1).map((h, i) => 
    Math.max(h - lows[i + 1], Math.abs(h - closes[i]), Math.abs(lows[i + 1] - closes[i]))
  );
  
  const smoothDM = SMA.calculate({ values: dm, period });
  const smoothTR = SMA.calculate({ values: tr, period });
  
  return smoothDM.map((d, i) => (d / (smoothTR[i] || 1)) * 100);
}

export function calculateDM(highs: number[], lows: number[], isPlus: boolean): number[] {
  const result = [0];
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    if (isPlus) {
      result.push(upMove > downMove && upMove > 0 ? upMove : 0);
    } else {
      result.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
  }
  return result;
}

export function calculateTDSequential(closes: number[]): any[] {
  const setupCount = [];
  let count = 0;
  
  for (let i = 4; i < closes.length; i++) {
    if (closes[i] < closes[i - 4]) {
      count = count >= 0 ? count + 1 : 1;
    } else if (closes[i] > closes[i - 4]) {
      count = count <= 0 ? count - 1 : -1;
    } else {
      count = 0;
    }
    setupCount.push({ setup: count, countdown: 0 });
  }
  return setupCount;
}

// ===== TREND HELPERS =====

export function calculateSupertrend(highs: number[], lows: number[], closes: number[], period: number, multiplier: number): any[] {
  const atr = ATR.calculate({ high: highs, low: lows, close: closes, period });
  const result = [];
  
  for (let i = 0; i < atr.length; i++) {
    const idx = i + period - 1;
    const hl2 = (highs[idx] + lows[idx]) / 2;
    const upper = hl2 + multiplier * atr[i];
    const lower = hl2 - multiplier * atr[i];
    const trend = closes[idx] > lower ? 'up' : 'down';
    result.push({ upper, lower, trend, value: trend === 'up' ? lower : upper });
  }
  return result;
}

export function calculateVortex(highs: number[], lows: number[], closes: number[], period: number): any[] {
  const vi = [];
  
  for (let i = 1; i < highs.length; i++) {
    const plusVM = Math.abs(highs[i] - lows[i - 1]);
    const minusVM = Math.abs(lows[i] - highs[i - 1]);
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    vi.push({ plus: plusVM, minus: minusVM, tr });
  }
  
  const result = [];
  for (let i = period - 1; i < vi.length; i++) {
    const slice = vi.slice(i - period + 1, i + 1);
    const sumPlus = slice.reduce((sum, v) => sum + v.plus, 0);
    const sumMinus = slice.reduce((sum, v) => sum + v.minus, 0);
    const sumTR = slice.reduce((sum, v) => sum + v.tr, 0);
    result.push({ plus: sumPlus / (sumTR || 1), minus: sumMinus / (sumTR || 1) });
  }
  return result;
}

export function calculateQStick(opens: number[], closes: number[], period: number): number[] {
  const diff = opens.map((o, i) => closes[i] - o);
  return SMA.calculate({ values: diff, period });
}

export function calculateDirectionalMovement(highs: number[], lows: number[]): any[] {
  const result = [{ plusDM: 0, minusDM: 0 }];
  
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;
    
    result.push({ plusDM, minusDM });
  }
  return result;
}

export function calculateDMI(highs: number[], lows: number[], closes: number[], period: number): any[] {
  const dm = calculateDirectionalMovement(highs, lows);
  const tr = highs.slice(1).map((h, i) => 
    Math.max(h - lows[i + 1], Math.abs(h - closes[i]), Math.abs(lows[i + 1] - closes[i]))
  );
  
  const smoothPlusDM = SMA.calculate({ values: dm.map(d => d.plusDM), period });
  const smoothMinusDM = SMA.calculate({ values: dm.map(d => d.minusDM), period });
  const smoothTR = SMA.calculate({ values: tr, period });
  
  return smoothPlusDM.map((pdm, i) => ({
    plusDI: (pdm / (smoothTR[i] || 1)) * 100,
    minusDI: (smoothMinusDM[i] / (smoothTR[i] || 1)) * 100,
    adx: Math.abs((pdm - smoothMinusDM[i]) / (pdm + smoothMinusDM[i] || 1)) * 100
  }));
}

// ===== OSCILLATOR HELPERS =====

export function calculateAcceleratorOscillator(highs: number[], lows: number[], closes: number[]): number[] {
  const medianPrices = highs.map((h, i) => (h + lows[i]) / 2);
  const sma5 = SMA.calculate({ values: medianPrices, period: 5 });
  const sma34 = SMA.calculate({ values: medianPrices, period: 34 });
  const ao = sma5.map((s5, i) => s5 - sma34[i]);
  const aoSMA = SMA.calculate({ values: ao, period: 5 });
  return ao.map((a, i) => a - aoSMA[i]);
}

export function calculateChoppiness(highs: number[], lows: number[], closes: number[], period: number): number[] {
  const result = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);
    
    const trSum = highSlice.reduce((sum, h, j) => {
      const tr = Math.max(h - lowSlice[j], Math.abs(h - slice[j - 1] || h), Math.abs(lowSlice[j] - slice[j - 1] || lowSlice[j]));
      return sum + tr;
    }, 0);
    
    const highLow = Math.max(...highSlice) - Math.min(...lowSlice);
    const chop = 100 * Math.log10(trSum / (highLow || 1)) / Math.log10(period);
    result.push(chop);
  }
  return result;
}

export function calculateDPO(closes: number[], period: number): number[] {
  const sma = SMA.calculate({ values: closes, period });
  const displacement = Math.floor(period / 2) + 1;
  
  return closes.slice(period + displacement - 1).map((c, i) => c - sma[i]);
}

export function calculateEOM(highs: number[], lows: number[], volumes: number[], period: number): number[] {
  const distance = highs.map((h, i) => {
    if (i === 0) return 0;
    return ((h + lows[i]) / 2) - ((highs[i - 1] + lows[i - 1]) / 2);
  });
  
  const boxRatio = volumes.map((v, i) => v / ((highs[i] - lows[i]) || 1));
  const emv = distance.map((d, i) => d / (boxRatio[i] || 1));
  
  return SMA.calculate({ values: emv, period });
}

export function calculateFOSC(closes: number[], period: number): number[] {
  const linearReg = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const x = Array.from({ length: period }, (_, j) => j);
    const sumX = x.reduce((a, b) => a + b);
    const sumY = slice.reduce((a, b) => a + b);
    const sumXY = x.reduce((sum, xi, j) => sum + xi * slice[j], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / period;
    linearReg.push(slope * (period - 1) + intercept);
  }
  
  return linearReg.map((lr, i) => ((closes[i + period - 1] - lr) / closes[i + period - 1]) * 100);
}

// ===== PRICE HELPERS =====

export function calculatePriorSwingHigh(highs: number[], lookback: number): number[] {
  const result = [];
  
  for (let i = lookback; i < highs.length; i++) {
    const slice = highs.slice(i - lookback, i + 1);
    const max = Math.max(...slice);
    const maxIdx = slice.indexOf(max);
    
    if (maxIdx > 0 && maxIdx < slice.length - 1) {
      result.push(max);
    } else {
      result.push(result[result.length - 1] || max);
    }
  }
  return result;
}

export function calculatePriorSwingLow(lows: number[], lookback: number): number[] {
  const result = [];
  
  for (let i = lookback; i < lows.length; i++) {
    const slice = lows.slice(i - lookback, i + 1);
    const min = Math.min(...slice);
    const minIdx = slice.indexOf(min);
    
    if (minIdx > 0 && minIdx < slice.length - 1) {
      result.push(min);
    } else {
      result.push(result[result.length - 1] || min);
    }
  }
  return result;
}

// ===== SUPPORT & RESISTANCE =====

export function calculatePivotPoints(highs: number[], lows: number[], closes: number[], type: string): any[] {
  return closes.map((c, i) => {
    if (i === 0) return null;
    const h = highs[i - 1];
    const l = lows[i - 1];
    const pivot = (h + l + c) / 3;
    
    if (type === 'fibonacci') {
      return {
        pivot,
        r1: pivot + 0.382 * (h - l),
        r2: pivot + 0.618 * (h - l),
        r3: pivot + (h - l),
        s1: pivot - 0.382 * (h - l),
        s2: pivot - 0.618 * (h - l),
        s3: pivot - (h - l)
      };
    } else {
      return {
        pivot,
        r1: 2 * pivot - l,
        r2: pivot + (h - l),
        r3: h + 2 * (pivot - l),
        s1: 2 * pivot - h,
        s2: pivot - (h - l),
        s3: l - 2 * (h - pivot)
      };
    }
  }).filter(v => v);
}

export function calculateFibRetracement(highs: number[], lows: number[], closes: number[]): any {
  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const diff = high - low;
  
  return {
    level_0: high,
    level_236: high - 0.236 * diff,
    level_382: high - 0.382 * diff,
    level_500: high - 0.5 * diff,
    level_618: high - 0.618 * diff,
    level_786: high - 0.786 * diff,
    level_100: low
  };
}
