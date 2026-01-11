// nodes/TechnicalIndicators/TechnicalIndicators.node.ts
import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
  INodeProperties,
} from 'n8n-workflow';

import { fetchOHLCV } from './utils/dataFetcher';
import { calculateIndicators } from './utils/indicatorCalculator';
import { INDICATOR_LIST } from './data/indicatorList';

export class TechnicalIndicators implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Technical Indicators',
    name: 'technicalIndicators',
    icon: 'file:indicators.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Complete 208 technical indicators with multi-exchange support',
    defaults: {
      name: 'Technical Indicators',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Get OHLCV Data',
            value: 'getOHLCV',
            description: 'Fetch historical candlestick data',
          },
          {
            name: 'Calculate Indicators',
            value: 'calculateIndicators',
            description: 'Calculate technical indicators with auto-adjusted candles',
          },
        ],
        default: 'getOHLCV',
      },
      {
        displayName: 'Ticker Symbol',
        name: 'ticker',
        type: 'string',
        default: '',
        placeholder: 'BTC/USDT, AAPL, ETH/USD',
        description: 'Trading pair or stock symbol',
        required: true,
      },
      {
        displayName: 'Exchange',
        name: 'exchange',
        type: 'options',
        options: [
          { name: 'Hyperliquid', value: 'hyperliquid' },
          { name: 'Binance', value: 'binance' },
          { name: 'Binance US', value: 'binanceus' },
          { name: 'Coinbase', value: 'coinbase' },
          { name: 'Coinbase Pro', value: 'coinbasepro' },
          { name: 'Kraken', value: 'kraken' },
          { name: 'Bitfinex', value: 'bitfinex' },
          { name: 'KuCoin', value: 'kucoin' },
          { name: 'Bybit', value: 'bybit' },
          { name: 'OKX', value: 'okx' },
          { name: 'Huobi', value: 'huobi' },
          { name: 'Gate.io', value: 'gateio' },
          { name: 'Bitget', value: 'bitget' },
          { name: 'MEXC', value: 'mexc' },
          { name: 'Crypto.com', value: 'cryptocom' },
          { name: 'Alpha Vantage (Stocks)', value: 'alphavantage' },
          { name: 'Twelve Data (Stocks)', value: 'twelvedata' },
          { name: 'Polygon.io (Stocks)', value: 'polygon' },
          { name: 'Yahoo Finance', value: 'yahoo' },
        ],
        default: 'hyperliquid',
        description: 'Select exchange or data provider',
      },
      {
        displayName: 'Timeframe',
        name: 'timeframe',
        type: 'options',
        options: [
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
        default: 500,
        description: 'Number of candles to fetch',
        displayOptions: {
          show: {
            operation: ['getOHLCV'],
          },
        },
      },
      {
        displayName: 'Indicators',
        name: 'indicators',
        type: 'multiOptions',
        displayOptions: {
          show: {
            operation: ['calculateIndicators'],
          },
        },
        typeOptions: {
          loadOptionsMethod: 'getIndicators',
        },
        default: ['rsi'],
        description: 'Select indicators to calculate',
        required: true,
      },
      {
        displayName: 'Result Count',
        name: 'resultCount',
        type: 'number',
        default: 1,
        description: 'Number of result values to return for each indicator',
        displayOptions: {
          show: {
            operation: ['calculateIndicators'],
          },
        },
      },
      {
        displayName: 'Backtrack',
        name: 'backtrack',
        type: 'number',
        default: 0,
        description: 'Skip N latest candles (0 = use latest candle, 1 = skip latest and use previous)',
        displayOptions: {
          show: {
            operation: ['calculateIndicators'],
          },
        },
      },
      {
        displayName: 'Indicator Parameters',
        name: 'indicatorParams',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        displayOptions: {
          show: {
            operation: ['calculateIndicators'],
          },
        },
        default: {},
        placeholder: 'Add Parameter',
        options: [
          {
            name: 'parameter',
            displayName: 'Parameter',
            values: [
              {
                displayName: 'Indicator',
                name: 'indicator',
                type: 'string',
                default: '',
                placeholder: 'rsi',
                description: 'Indicator name',
              },
              {
                displayName: 'Parameter Name',
                name: 'paramName',
                type: 'string',
                default: '',
                placeholder: 'period',
                description: 'Parameter name (e.g., period, fastPeriod, slowPeriod)',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'number',
                default: 14,
                description: 'Parameter value',
              },
            ],
          },
        ],
        description: 'Custom parameters for indicators',
      },
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        displayOptions: {
          show: {
            exchange: ['alphavantage', 'twelvedata', 'polygon'],
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

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const ticker = this.getNodeParameter('ticker', i) as string;
        const exchange = this.getNodeParameter('exchange', i) as string;
        const timeframe = this.getNodeParameter('timeframe', i) as string;

        if (operation === 'getOHLCV') {
          const limit = this.getNodeParameter('limit', i) as number;
          const apiKey = this.getNodeParameter('apiKey', i, '') as string;

          const ohlcvData = await fetchOHLCV(ticker, exchange, timeframe, limit, apiKey);
          
          returnData.push({
            json: {
              ticker,
              exchange,
              timeframe,
              candleCount: ohlcvData.length,
              data: ohlcvData,
            },
          });

        } else if (operation === 'calculateIndicators') {
          const indicators = this.getNodeParameter('indicators', i) as string[];
          const resultCount = this.getNodeParameter('resultCount', i) as number;
          const backtrack = this.getNodeParameter('backtrack', i) as number;
          const apiKey = this.getNodeParameter('apiKey', i, '') as string;
          
          // Parse indicator parameters from fixedCollection
          const paramCollection = this.getNodeParameter('indicatorParams', i) as any;
          const customParams: any = {};
          
          if (paramCollection.parameter && Array.isArray(paramCollection.parameter)) {
            for (const param of paramCollection.parameter) {
              if (!customParams[param.indicator]) {
                customParams[param.indicator] = {};
              }
              customParams[param.indicator][param.paramName] = param.value;
            }
          }

          // Calculate indicators with auto-adjusted candles
          const results = await calculateIndicators(
            ticker,
            exchange,
            timeframe,
            indicators,
            customParams,
            resultCount,
            backtrack,
            apiKey
          );

          returnData.push({
            json: {
              ticker,
              exchange,
              timeframe,
              resultCount,
              backtrack,
              indicators: results,
            },
          });
        }

      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error?.message || 'Unknown error',
              ticker: this.getNodeParameter('ticker', i, 'unknown') as string,
            },
          });
          continue;
        }
        throw new NodeOperationError(
          this.getNode(),
          error?.message || 'Unknown error occurred'
        );
      }
    }

    return [returnData];
  }
}
