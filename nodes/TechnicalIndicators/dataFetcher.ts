// nodes/TechnicalIndicators/dataFetcher.ts

import axios from 'axios';
import WebSocket from 'ws';

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/* ============================
   UNIVERSAL REST FETCHER
============================ */
export async function fetchOHLCV(
  symbol: string,
  source: string,
  interval: string,
  limit: number,
  apiKey?: string
): Promise<OHLCVData[]> {

  if (source === 'binance') return fetchBinance(symbol, interval, limit);
  if (source === 'hyperliquid') return fetchHyperliquid(symbol, interval, limit);

  throw new Error(`Source '${source}' not yet implemented`);
}

/* ============================
   BINANCE REST
============================ */
async function fetchBinance(symbol: string, interval: string, limit: number) {
  const pair = symbol.replace('/', '').toUpperCase();
  const { data } = await axios.get(
    `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`
  );

  return data.map((c: any) => ({
    timestamp: c[0],
    open: +c[1],
    high: +c[2],
    low: +c[3],
    close: +c[4],
    volume: +c[5],
  }));
}

/* ============================
   HYPERLIQUID REST
============================ */
async function fetchHyperliquid(symbol: string, interval: string, limit: number) {
  const coin = symbol.replace('/USDT', '').replace('/USD', '').toUpperCase();

  const { data } = await axios.post('https://api.hyperliquid.xyz/info', {
    type: 'candleSnapshot',
    coin,
    interval,
    startTime: null,
    endTime: null
  });

  return data.slice(-limit).map((c: any) => ({
    timestamp: c.t,
    open: +c.o,
    high: +c.h,
    low: +c.l,
    close: +c.c,
    volume: +c.v
  }));
}

/* ============================
   WEBSOCKET STREAM (BINANCE)
============================ */
export async function streamWebSocket(
  wsUrl: string,
  symbol: string,
  duration: number,
  mode: string,
  source: string,
  indicators: string[],
  params: any
): Promise<any[]> {

  if (source !== 'binance') {
    throw new Error(`WebSocket source '${source}' not yet implemented`);
  }

  const pair = symbol.replace('/', '').toLowerCase();
  const stream = `${pair}@kline_1m`;
  const socket = new WebSocket(`${wsUrl}/${stream}`);

  const results: any[] = [];
  const start = Date.now();

  return new Promise((resolve, reject) => {
    socket.on('message', (msg) => {
      const j = JSON.parse(msg.toString());
      if (!j.k) return;

      const k = j.k;
      results.push({
        timestamp: k.t,
        open: +k.o,
        high: +k.h,
        low: +k.l,
        close: +k.c,
        volume: +k.v,
        isFinal: k.x
      });

      if (duration > 0 && (Date.now() - start) / 1000 >= duration) {
        socket.close();
        resolve(results);
      }
    });

    socket.on('error', reject);
  });
}
