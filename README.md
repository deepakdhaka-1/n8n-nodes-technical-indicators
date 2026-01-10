# n8n-nodes-technical-indicators

Complete technical analysis node for n8n with 208+ indicators, REST API and WebSocket support.

## Features

- 🎯 **208+ Technical Indicators** - Complete coverage of all TAAPI.IO indicators
- 📊 **REST API Operations** - Fetch OHLCV, calculate indicators, bulk snapshots, backtrack analysis
- 🔴 **WebSocket Streaming** - Real-time data even before candle close
- 💎 **HIP-3 Asset Support** - Works with any ticker format
- 📡 **Multiple Exchanges** - Binance, Coinbase, Kraken, Bybit, KuCoin, Bitfinex, Alpha Vantage, Twelve Data
- ⚙️ **Flexible Configuration** - Default parameters with user customization
- 🚀 **Multi-Indicator Support** - Calculate multiple indicators in one request

## Installation

```bash
npm install n8n-nodes-technical-indicators
```

## Quick Start

1. Add the "Technical Indicators" node to your workflow
2. Select REST or WebSocket mode
3. Choose your data source
4. Enter ticker symbol (e.g., BTC/USDT, AAPL)
5. Select indicators to calculate
6. Customize parameters (optional)

## Indicators Included

### Momentum (40+)
RSI, MACD, Stochastic, ADX, CCI, MFI, ROC, Aroon, Williams %R, Ultimate Oscillator, and more

### Moving Averages (20+)
SMA, EMA, WMA, DEMA, TEMA, HMA, KAMA, VWMA, Ichimoku, and more

### Volatility (10+)
ATR, Bollinger Bands, Keltner Channels, Donchian Channels, Standard Deviation, and more

### Volume (10+)
OBV, VWAP, Chaikin Money Flow, A/D Line, Volume Oscillator, and more

### Pattern Recognition (50+)
Doji, Hammer, Engulfing, Harami, Morning Star, Evening Star, Three Black Crows, and more

### Trend (10+)
Supertrend, PSAR, Vortex, DMI, Williams Alligator, and more

## Example Usage

### Calculate RSI and MACD
```json
{
  "ticker": "BTC/USDT",
  "indicators": ["rsi", "macd"],
  "indicatorParams": {
    "rsi": {"period": 14},
    "macd": {"fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9}
  }
}
```

### WebSocket Real-time Streaming
```json
{
  "resource": "websocket",
  "ticker": "ETH/USDT",
  "duration": 60,
  "wsOperation": "streamWithIndicators",
  "indicators": ["rsi", "ema", "bbands"]
}
```

## License

MIT

## Support

For issues and feature requests, please visit our GitHub repository.
*/
