// nodes/TechnicalIndicators/utils/dataFetcher.ts
import axios from 'axios';

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Normalize ticker symbol for different exchanges
function normalizeSymbol(ticker: string, exchange: string): string {
  const cleaned = ticker.replace(/[\s\-_]/g, '').toUpperCase();
  
  switch (exchange) {
    case 'binance':
    case 'binanceus':
    case 'bybit':
    case 'okx':
    case 'mexc':
    case 'bitget':
      return cleaned.replace('/', '');
    
    case 'coinbase':
    case 'coinbasepro':
      return cleaned.replace('/', '-');
    
    case 'kraken':
      // Kraken uses XXBTZUSD format for BTC/USD
      return cleaned.replace('/', '');
    
    case 'kucoin':
    case 'gateio':
    case 'huobi':
    case 'cryptocom':
    case 'hyperliquid':
    case 'lightchain':
      return cleaned.includes('/') ? cleaned : cleaned;
    
    default:
      return cleaned.replace('/', '');
  }
}

// Convert timeframe to exchange-specific format
function convertTimeframe(timeframe: string, exchange: string): string {
  const standardMap: any = {
    '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h',
    '12h': '12h', '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M'
  };

  const krakenMap: any = {
    '1m': '1', '5m': '5', '15m': '15', '30m': '30',
    '1h': '60', '4h': '240', '1d': '1440', '1w': '10080', '15d': '21600'
  };

  const coinbaseMap: any = {
    '1m': '60', '5m': '300', '15m': '900', '1h': '3600',
    '6h': '21600', '1d': '86400'
  };

  const alphaVantageMap: any = {
    '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
    '1h': '60min', '1d': 'daily', '1w': 'weekly', '1M': 'monthly'
  };

  switch (exchange) {
    case 'kraken':
      return krakenMap[timeframe] || '60';
    case 'coinbase':
    case 'coinbasepro':
      return coinbaseMap[timeframe] || '3600';
    case 'alphavantage':
      return alphaVantageMap[timeframe] || 'daily';
    default:
      return standardMap[timeframe] || '1h';
  }
}

// Main fetch function
export async function fetchOHLCV(
  ticker: string,
  exchange: string,
  timeframe: string,
  limit: number,
  apiKey?: string
): Promise<OHLCVData[]> {
  const symbol = normalizeSymbol(ticker, exchange);
  const interval = convertTimeframe(timeframe, exchange);

  try {
    switch (exchange) {
      case 'binance':
        return await fetchBinance(symbol, interval, limit);
      case 'binanceus':
        return await fetchBinanceUS(symbol, interval, limit);
      case 'coinbase':
      case 'coinbasepro':
        return await fetchCoinbase(symbol, interval, limit);
      case 'kraken':
        return await fetchKraken(symbol, interval, limit);
      case 'bitfinex':
        return await fetchBitfinex(symbol, interval, limit);
      case 'kucoin':
        return await fetchKuCoin(symbol, interval, limit);
      case 'bybit':
        return await fetchBybit(symbol, interval, limit);
      case 'okx':
        return await fetchOKX(symbol, interval, limit);
      case 'huobi':
        return await fetchHuobi(symbol, interval, limit);
      case 'gateio':
        return await fetchGateIO(symbol, interval, limit);
      case 'bitget':
        return await fetchBitget(symbol, interval, limit);
      case 'mexc':
        return await fetchMEXC(symbol, interval, limit);
      case 'cryptocom':
        return await fetchCryptoCom(symbol, interval, limit);
      case 'alphavantage':
        if (!apiKey) throw new Error('API key required for Alpha Vantage');
        return await fetchAlphaVantage(symbol, interval, apiKey, limit);
      case 'twelvedata':
        if (!apiKey) throw new Error('API key required for Twelve Data');
        return await fetchTwelveData(symbol, interval, apiKey, limit);
      case 'polygon':
        if (!apiKey) throw new Error('API key required for Polygon.io');
        return await fetchPolygon(symbol, interval, apiKey, limit);
      case 'yahoo':
        return await fetchYahoo(symbol, interval, limit);
      case 'hyperliquid':
        return await fetchHyperliquid(symbol, interval, limit);
      case 'lightchain':
        return await fetchLightchain(symbol, interval, limit);
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch OHLCV from ${exchange}: ${error?.message || 'Unknown error'}`);
  }
}

// ===== EXCHANGE IMPLEMENTATIONS =====

// Binance
async function fetchBinance(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.binance.com/api/v3/klines`;
  const response = await axios.get(url, {
    params: { symbol, interval, limit: Math.min(limit, 1000) }
  });
  return response.data.map((c: any) => ({
    timestamp: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// Binance US
async function fetchBinanceUS(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.binance.us/api/v3/klines`;
  const response = await axios.get(url, {
    params: { symbol, interval, limit: Math.min(limit, 1000) }
  });
  return response.data.map((c: any) => ({
    timestamp: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// Coinbase
async function fetchCoinbase(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.exchange.coinbase.com/products/${symbol}/candles`;
  const response = await axios.get(url, {
    params: { granularity: interval }
  });
  return response.data.slice(0, limit).reverse().map((c: any) => ({
    timestamp: c[0] * 1000,
    open: parseFloat(c[3]),
    high: parseFloat(c[2]),
    low: parseFloat(c[1]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// Kraken
async function fetchKraken(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.kraken.com/0/public/OHLC`;
  const response = await axios.get(url, {
    params: { pair: symbol, interval }
  });
  const pair = Object.keys(response.data.result).filter(k => k !== 'last')[0];
  const data = response.data.result[pair];
  return data.slice(-limit).map((c: any) => ({
    timestamp: c[0] * 1000,
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[6]),
  }));
}

// Bitfinex
async function fetchBitfinex(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api-pub.bitfinex.com/v2/candles/trade:${interval}:t${symbol}/hist`;
  const response = await axios.get(url, {
    params: { limit: Math.min(limit, 10000) }
  });
  return response.data.reverse().map((c: any) => ({
    timestamp: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[3]),
    low: parseFloat(c[4]),
    close: parseFloat(c[2]),
    volume: parseFloat(c[5]),
  }));
}

// KuCoin
async function fetchKuCoin(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.kucoin.com/api/v1/market/candles`;
  const response = await axios.get(url, {
    params: { symbol, type: interval }
  });
  return response.data.data.slice(0, limit).reverse().map((c: any) => ({
    timestamp: parseInt(c[0]) * 1000,
    open: parseFloat(c[1]),
    close: parseFloat(c[2]),
    high: parseFloat(c[3]),
    low: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// Bybit
async function fetchBybit(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.bybit.com/v5/market/kline`;
  const response = await axios.get(url, {
    params: { category: 'spot', symbol, interval, limit: Math.min(limit, 1000) }
  });
  return response.data.result.list.reverse().map((c: any) => ({
    timestamp: parseInt(c[0]),
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// OKX
async function fetchOKX(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://www.okx.com/api/v5/market/candles`;
  const response = await axios.get(url, {
    params: { instId: symbol, bar: interval, limit: Math.min(limit, 300) }
  });
  return response.data.data.reverse().map((c: any) => ({
    timestamp: parseInt(c[0]),
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// Huobi
async function fetchHuobi(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.huobi.pro/market/history/kline`;
  const response = await axios.get(url, {
    params: { symbol: symbol.toLowerCase(), period: interval, size: Math.min(limit, 2000) }
  });
  return response.data.data.reverse().map((c: any) => ({
    timestamp: c.id * 1000,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.vol,
  }));
}

// Gate.io
async function fetchGateIO(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.gateio.ws/api/v4/spot/candlesticks`;
  const response = await axios.get(url, {
    params: { currency_pair: symbol, interval, limit: Math.min(limit, 1000) }
  });
  return response.data.reverse().map((c: any) => ({
    timestamp: parseInt(c[0]) * 1000,
    open: parseFloat(c[5]),
    high: parseFloat(c[3]),
    low: parseFloat(c[4]),
    close: parseFloat(c[2]),
    volume: parseFloat(c[1]),
  }));
}

// Bitget
async function fetchBitget(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.bitget.com/api/spot/v1/market/candles`;
  const response = await axios.get(url, {
    params: { symbol, period: interval, limit: Math.min(limit, 1000) }
  });
  return response.data.data.reverse().map((c: any) => ({
    timestamp: parseInt(c[0]),
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// MEXC
async function fetchMEXC(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.mexc.com/api/v3/klines`;
  const response = await axios.get(url, {
    params: { symbol, interval, limit: Math.min(limit, 1000) }
  });
  return response.data.map((c: any) => ({
    timestamp: c[0],
    open: parseFloat(c[1]),
    high: parseFloat(c[2]),
    low: parseFloat(c[3]),
    close: parseFloat(c[4]),
    volume: parseFloat(c[5]),
  }));
}

// Crypto.com
async function fetchCryptoCom(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.crypto.com/v2/public/get-candlestick`;
  const response = await axios.get(url, {
    params: { instrument_name: symbol, timeframe: interval }
  });
  return response.data.result.data.slice(0, limit).map((c: any) => ({
    timestamp: c.t,
    open: parseFloat(c.o),
    high: parseFloat(c.h),
    low: parseFloat(c.l),
    close: parseFloat(c.c),
    volume: parseFloat(c.v),
  }));
}

// Alpha Vantage (Stocks)
async function fetchAlphaVantage(symbol: string, interval: string, apiKey: string, limit: number): Promise<OHLCVData[]> {
  const functionMap: any = {
    '1min': 'TIME_SERIES_INTRADAY', '5min': 'TIME_SERIES_INTRADAY',
    '15min': 'TIME_SERIES_INTRADAY', '30min': 'TIME_SERIES_INTRADAY',
    '60min': 'TIME_SERIES_INTRADAY', 'daily': 'TIME_SERIES_DAILY',
    'weekly': 'TIME_SERIES_WEEKLY', 'monthly': 'TIME_SERIES_MONTHLY'
  };
  
  const func = functionMap[interval] || 'TIME_SERIES_DAILY';
  const url = `https://www.alphavantage.co/query`;
  const params: any = { function: func, symbol, apikey: apiKey, outputsize: 'full' };
  
  if (func === 'TIME_SERIES_INTRADAY') {
    params.interval = interval;
  }
  
  const response = await axios.get(url, { params });
  const timeSeriesKey = Object.keys(response.data).find(k => k.includes('Time Series'));
  
  if (!timeSeriesKey) throw new Error('Invalid Alpha Vantage response');
  
  const timeSeries = response.data[timeSeriesKey];
  const entries = Object.entries(timeSeries).slice(0, limit);
  
  return entries.map(([timestamp, data]: any) => ({
    timestamp: new Date(timestamp).getTime(),
    open: parseFloat(data['1. open']),
    high: parseFloat(data['2. high']),
    low: parseFloat(data['3. low']),
    close: parseFloat(data['4. close']),
    volume: parseFloat(data['5. volume']),
  }));
}

// Twelve Data (Stocks)
async function fetchTwelveData(symbol: string, interval: string, apiKey: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.twelvedata.com/time_series`;
  const response = await axios.get(url, {
    params: { symbol, interval, apikey: apiKey, outputsize: limit }
  });
  
  if (!response.data.values) throw new Error('Invalid Twelve Data response');
  
  return response.data.values.reverse().map((c: any) => ({
    timestamp: new Date(c.datetime).getTime(),
    open: parseFloat(c.open),
    high: parseFloat(c.high),
    low: parseFloat(c.low),
    close: parseFloat(c.close),
    volume: parseFloat(c.volume),
  }));
}

// Polygon.io (Stocks)
async function fetchPolygon(symbol: string, interval: string, apiKey: string, limit: number): Promise<OHLCVData[]> {
  const now = Date.now();
  const from = now - (limit * 86400000); // Approximate
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${now}`;
  
  const response = await axios.get(url, {
    params: { apiKey, limit }
  });
  
  return response.data.results.map((c: any) => ({
    timestamp: c.t,
    open: c.o,
    high: c.h,
    low: c.l,
    close: c.c,
    volume: c.v,
  }));
}

// Yahoo Finance
async function fetchYahoo(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const period2 = Math.floor(Date.now() / 1000);
  const period1 = period2 - (limit * 86400);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  
  const response = await axios.get(url, {
    params: { period1, period2, interval: interval || '1d' }
  });
  
  const quote = response.data.chart.result[0];
  const timestamps = quote.timestamp;
  const prices = quote.indicators.quote[0];
  
  return timestamps.map((t: number, i: number) => ({
    timestamp: t * 1000,
    open: prices.open[i],
    high: prices.high[i],
    low: prices.low[i],
    close: prices.close[i],
    volume: prices.volume[i],
  }));
}

// Hyperliquid (HIP-3 Priority)
async function fetchHyperliquid(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  const url = `https://api.hyperliquid.xyz/info`;
  
  // Hyperliquid uses different interval format
  const intervalMap: any = {
    '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1h', '2h': '2h', '4h': '4h', '1d': '1d', '1w': '1w'
  };
  
  const response = await axios.post(url, {
    type: 'candleSnapshot',
    req: {
      coin: symbol,
      interval: intervalMap[interval] || '1h',
      startTime: Date.now() - (limit * 3600000), // Approximate
      endTime: Date.now()
    }
  });
  
  if (!response.data || !Array.isArray(response.data)) {
    throw new Error('Invalid Hyperliquid response');
  }
  
  return response.data.slice(0, limit).map((c: any) => ({
    timestamp: c.t,
    open: parseFloat(c.o),
    high: parseFloat(c.h),
    low: parseFloat(c.l),
    close: parseFloat(c.c),
    volume: parseFloat(c.v),
  }));
}

// Lightchain (HIP-3 Priority)
async function fetchLightchain(symbol: string, interval: string, limit: number): Promise<OHLCVData[]> {
  // Lightchain AI's API endpoint
  const url = `https://api.lightchain.ai/v1/market/candles`;
  
  // Convert interval to Lightchain format
  const intervalMap: any = {
    '1m': '60', '5m': '300', '15m': '900', '30m': '1800',
    '1h': '3600', '4h': '14400', '1d': '86400', '1w': '604800'
  };
  
  const response = await axios.get(url, {
    params: {
      symbol: symbol,
      resolution: intervalMap[interval] || '3600',
      limit: Math.min(limit, 5000),
      from: Math.floor((Date.now() / 1000) - (limit * parseInt(intervalMap[interval] || '3600'))),
      to: Math.floor(Date.now() / 1000)
    }
  });
  
  if (!response.data || !response.data.t) {
    throw new Error('Invalid Lightchain response');
  }
  
  return response.data.t.map((timestamp: number, i: number) => ({
    timestamp: timestamp * 1000,
    open: parseFloat(response.data.o[i]),
    high: parseFloat(response.data.h[i]),
    low: parseFloat(response.data.l[i]),
    close: parseFloat(response.data.c[i]),
    volume: parseFloat(response.data.v[i]),
  }));
}
