// nodes/TechnicalIndicators/TechnicalIndicators.node.ts
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import { fetchOHLCV, streamWebSocket } from './dataFetcher';

import { calculateIndicators, bulkSnapshot, backtrackAnalysis } from './utils/indicatorCalculator';
import { INDICATOR_LIST } from './data/indicatorList';

export class TechnicalIndicators implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Technical Indicators',
    name: 'technicalIndicators',
    icon: 'file:indicators.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Complete 208 technical indicators with REST and WebSocket support (HIP-3 compatible)',
    defaults: {
      name: 'Technical Indicators',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'REST API',
            value: 'rest',
          },
          {
            name: 'WebSocket (Real-time)',
            value: 'websocket',
          },
        ],
        default: 'rest',
        description: 'Choose between REST API or WebSocket for real-time data',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['rest'],
          },
        },
        options: [
          {
            name: 'Get OHLCV Data',
            value: 'getOHLCV',
            description: 'Fetch historical candlestick data',
          },
          {
            name: 'Calculate Indicators',
            value: 'calculateIndicators',
            description: 'Calculate selected technical indicators',
          },
          {
            name: 'Bulk Indicators Snapshot',
            value: 'bulkSnapshot',
            description: 'Get latest values for multiple indicators at once',
          },
          {
            name: 'Backtrack Analysis',
            value: 'backtrack',
            description: 'Historical analysis of indicators over time',
          },
        ],
        default: 'getOHLCV',
        noDataExpression: true,
      },
      {
        displayName: 'WebSocket Operation',
        name: 'wsOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['websocket'],
          },
        },
        options: [
          {
            name: 'Stream Real-Time OHLCV',
            value: 'streamOHLCV',
            description: 'Stream live candlestick data (even before candle close)',
          },
          {
            name: 'Stream with Indicators',
            value: 'streamWithIndicators',
            description: 'Real-time data with calculated indicators',
          },
        ],
        default: 'streamOHLCV',
        noDataExpression: true,
      },
      {
        displayName: 'Ticker Symbol',
        name: 'ticker',
        type: 'string',
        default: '',
        placeholder: 'BTC/USDT, AAPL, ETH/USD',
        description: 'Trading pair or stock symbol (HIP-3 assets supported)',
        required: true,
      },
      {
        displayName: 'Data Source',
        name: 'dataSource',
        type: 'options',
        options: [
          { name: 'Binance', value: 'binance' },
          { name: 'Binance US', value: 'binanceus' },
          { name: 'Coinbase', value: 'coinbase' },
          { name: 'Kraken', value: 'kraken' },
          { name: 'Bitfinex', value: 'bitfinex' },
          { name: 'KuCoin', value: 'kucoin' },
          { name: 'Bybit', value: 'bybit' },
          { name: 'Alpha Vantage (Stocks)', value: 'alphavantage' },
          { name: 'Twelve Data (Stocks)', value: 'twelvedata' },
          { name: 'Custom API', value: 'custom' },
        ],
        default: 'binance',
        description: 'Data source for OHLCV data',
      },
      {
        displayName: 'Timeframe / Interval',
        name: 'timeframe',
        type: 'options',
        options: [
          { name: '1 Second', value: '1s' },
          { name: '1 Minute', value: '1m' },
          { name: '3 Minutes', value: '3m' },
          { name: '5 Minutes', value: '5m' },
          { name: '15 Minutes', value: '15m' },
          { name: '30 Minutes', value: '30m' },
          { name: '1 Hour', value: '1h' },
          { name: '2 Hours', value: '2h' },
          { name: '4 Hours', value: '4h' },
          { name: '6 Hours', value: '6h' },
          { name: '8 Hours', value: '8h' },
          { name: '12 Hours', value: '12h' },
          { name: '1 Day', value: '1d' },
          { name: '3 Days', value: '3d' },
          { name: '1 Week', value: '1w' },
          { name: '1 Month', value: '1M' },
        ],
        default: '1h',
        description: 'Candlestick timeframe',
      },
      {
        displayName: 'Limit (Candles)',
        name: 'limit',
        type: 'number',
        default: 100,
        description: 'Number of candles to fetch (max varies by exchange)',
        displayOptions: {
          show: {
            resource: ['rest'],
          },
        },
      },
      {
        displayName: 'Indicators',
        name: 'indicators',
        type: 'multiOptions',
        displayOptions: {
          show: {
            operation: ['calculateIndicators', 'bulkSnapshot', 'backtrack'],
          },
        },
        typeOptions: {
          loadOptionsMethod: 'getIndicators',
        },
        default: ['rsi', 'ema', 'macd'],
        description: 'Select one or more indicators to calculate (208 available)',
      },
      {
        displayName: 'Indicator Parameters (JSON)',
        name: 'indicatorParams',
        type: 'json',
        displayOptions: {
          show: {
            operation: ['calculateIndicators', 'bulkSnapshot', 'backtrack'],
          },
        },
        default: '{\n  "rsi": {"period": 14},\n  "ema": {"period": 20},\n  "macd": {"fastPeriod": 12, "slowPeriod": 26, "signalPeriod": 9}\n}',
        description: 'Custom parameters for indicators (uses defaults if not specified)',
        typeOptions: {
          alwaysOpenEditWindow: true,
        },
      },
      {
        displayName: 'WebSocket URL',
        name: 'wsUrl',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['websocket'],
          },
        },
        default: 'wss://stream.binance.com:9443/ws',
        placeholder: 'wss://stream.binance.com:9443/ws',
        description: 'WebSocket endpoint URL (auto-configured for selected exchange)',
      },
      {
        displayName: 'Stream Duration (seconds)',
        name: 'duration',
        type: 'number',
        displayOptions: {
          show: {
            resource: ['websocket'],
          },
        },
        default: 60,
        description: 'How long to stream data (0 for continuous)',
      },
      {
        displayName: 'Backtrack Periods',
        name: 'backtrackPeriods',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['backtrack'],
          },
        },
        default: 50,
        description: 'Number of historical periods to analyze',
      },
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        displayOptions: {
          show: {
            dataSource: ['alphavantage', 'twelvedata'],
          },
        },
        default: '',
        description: 'API key for stock data providers',
      },
    ],
  };

  methods = {
    loadOptions: {
      async getIndicators() {
        return INDICATOR_LIST;
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === 'rest') {
          const operation = this.getNodeParameter('operation', i) as string;
          const ticker = this.getNodeParameter('ticker', i) as string;
          const dataSource = this.getNodeParameter('dataSource', i) as string;
          const timeframe = this.getNodeParameter('timeframe', i) as string;
          const limit = this.getNodeParameter('limit', i) as number;
          const apiKey = this.getNodeParameter('apiKey', i, '') as string;

          if (operation === 'getOHLCV') {
            const ohlcvData = await fetchOHLCV(ticker, dataSource, timeframe, limit, apiKey);
            returnData.push({ 
              json: { 
                ticker, 
                timeframe, 
                dataSource,
                candleCount: ohlcvData.length,
                data: ohlcvData 
              } 
            });

          } else if (operation === 'calculateIndicators') {
            const indicators = this.getNodeParameter('indicators', i) as string[];
            const paramsJson = this.getNodeParameter('indicatorParams', i) as string;
            const params = JSON.parse(paramsJson);
            
            const ohlcvData = await fetchOHLCV(ticker, dataSource, timeframe, limit, apiKey);
            const results = await calculateIndicators(ohlcvData, indicators, params);
            
            returnData.push({ 
              json: { 
                ticker, 
                timeframe, 
                dataSource,
                indicators: results,
                candleCount: ohlcvData.length,
              } 
            });

          } else if (operation === 'bulkSnapshot') {
            const indicators = this.getNodeParameter('indicators', i) as string[];
            const paramsJson = this.getNodeParameter('indicatorParams', i) as string;
            const params = JSON.parse(paramsJson);
            
            const ohlcvData = await fetchOHLCV(ticker, dataSource, timeframe, limit, apiKey);
            const snapshot = await bulkSnapshot(ohlcvData, indicators, params);
            
            returnData.push({ 
              json: { 
                ticker, 
                timeframe,
                dataSource,
                snapshot 
              } 
            });

          } else if (operation === 'backtrack') {
            const periods = this.getNodeParameter('backtrackPeriods', i) as number;
            const indicators = this.getNodeParameter('indicators', i) as string[];
            const paramsJson = this.getNodeParameter('indicatorParams', i) as string;
            const params = JSON.parse(paramsJson);
            
            const ohlcvData = await fetchOHLCV(ticker, dataSource, timeframe, limit, apiKey);
            const backtrackResults = await backtrackAnalysis(ohlcvData, indicators, params, periods);
            
            returnData.push({ 
              json: { 
                ticker, 
                timeframe,
                dataSource,
                backtrack: backtrackResults 
              } 
            });
          }

        } else if (resource === 'websocket') {
          const wsOperation = this.getNodeParameter('wsOperation', i) as string;
          const ticker = this.getNodeParameter('ticker', i) as string;
          const wsUrl = this.getNodeParameter('wsUrl', i) as string;
          const duration = this.getNodeParameter('duration', i) as number;
          const dataSource = this.getNodeParameter('dataSource', i) as string;

          let indicators: string[] = [];
          let params: any = {};

          if (wsOperation === 'streamWithIndicators') {
            indicators = this.getNodeParameter('indicators', i) as string[];
            const paramsJson = this.getNodeParameter('indicatorParams', i) as string;
            params = JSON.parse(paramsJson);
          }

          const wsData = await streamWebSocket(
            wsUrl, 
            ticker, 
            duration, 
            wsOperation, 
            dataSource,
            indicators,
            params
          );
          
          returnData.push({ 
            json: { 
              ticker, 
              dataSource,
              realTimeData: wsData,
              streamDuration: duration,
              tickCount: wsData.length
            } 
          });
        }

      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({ 
            json: { 
              error: error?.message || 'Unknown error',
              ticker: this.getNodeParameter('ticker', i, 'unknown') as string
            } 
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error?.message || 'Unknown error occurred');
      }
    }

    return [returnData];
  }
}
