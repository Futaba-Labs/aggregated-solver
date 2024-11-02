import axios from 'axios';
import querystring from 'querystring';
import { parseUnits } from 'viem';
import { WebSocket } from 'ws';

import { Config, IntentFilter } from '../config/config';
import env from '../config/env';
import { CustomFilter, FillRequest, Intent, IntentExecution } from '../types';
import { logWithLabel } from '../utils';

type IntentAggregatorFilter = {
  src: string[];
  dst: string[];
};

export class IntentAggregaterClient {
  private apiUrl: string;
  private websocketUrl: string;
  private filter: IntentAggregatorFilter;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private ws: WebSocket | null = null;

  constructor(
    private readonly intentFilter: IntentFilter,
    private readonly config: Config
  ) {
    this.apiUrl = env.AGGREGATOR_URL;
    this.websocketUrl = env.AGGREGATOR_WS_URL;

    const dstFilter = [];
    for (const chain of intentFilter.dstChains) {
      for (const token of chain.supportTokens) {
        dstFilter.push(`${chain.chainId}`);
        // dstFilter.push(`${chain.chainId}:${token.address}:${parseUnits(token.minAmount.toString(), token.decimals)}:${parseUnits(token.maxAmount.toString(), token.decimals)}`);
      }
    }

    this.filter = {
      src: intentFilter.srcChains.map((chain) => `${chain.chainId}`),
      dst: dstFilter,
    };
  }

  subscribeIntent(onEvent: IntentExecution, filter: CustomFilter) {
    logWithLabel({
      labelText: 'IntentAggregaterClient:subscribeIntent',
      level: 'info',
      message: `Subscribing to intent with filter: ${JSON.stringify(this.filter, null, 2)}`,
    });
    const qs = querystring.stringify(this.filter);

    this.ws = new WebSocket(`${this.websocketUrl}/ws?${qs}`);

    this.ws.on('message', async (data) => {
      const intent = JSON.parse(data.toString());

      if (await filter(intent, this.config)) {
        logWithLabel({
          labelText: 'IntentAggregaterClient:subscribeIntent',
          level: 'info',
          message: `Received intent: ${JSON.stringify(intent, null, 2)}`,
        });

        onEvent(intent, this.config, this);
      }
    });

    this.ws.on('close', (code, reason) => {
      logWithLabel({
        labelText: 'IntentAggregaterClient:subscribeIntent',
        level: 'info',
        message: `Connection closed: ${code} - ${reason}`,
      });
      this.subscribeIntent(onEvent, filter);
    });

    this.ws.on('error', (err) => {
      logWithLabel({
        labelText: 'IntentAggregaterClient:subscribeIntent',
        level: 'error',
        message: `WebSocket error: ${err.message}`,
      });
      if (this.ws) {
        this.ws.close();
      }
    });

    setInterval(() => {
      if (
        this.ws?.readyState === WebSocket.CLOSED ||
        this.ws?.readyState === WebSocket.CLOSING
      ) {
        logWithLabel({
          labelText: 'IntentAggregaterClient:subscribeIntent',
          level: 'debug',
          message: 'Detected closed connection, scheduling reconnect...',
        });
        this.websocketReconnect(onEvent, filter);
      }
    }, 10000);
  }

  async fetchIntent(limit: number = 5, lastId?: string) {
    const query = {
      limit,
      lastId,
      ...this.filter,
    };

    logWithLabel({
      labelText: 'IntentAggregaterClient:fetchIntent',
      level: 'info',
      message: `Fetching intent with filter: ${JSON.stringify(query, null, 2)}`,
    });

    const qs = querystring.stringify(query);

    const response = await axios.get(`${this.apiUrl}/api/intents?${qs}`);
    return response.data;
  }

  async fetchFillData(
    intent: Intent,
    repaymentChain: 'source' | 'destination'
  ) {
    const response = await axios.post(
      `${this.apiUrl}/api/intents/${intent.id}/request`,
      {
        signer: this.config.common.relayerAddress,
        repaymentChain,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data as FillRequest;
  }

  async sendIntent(intent: Intent, signedTx: string) {
    const response = await axios.post(
      `${this.apiUrl}/api/intents/${intent.id}/fill`,
      {
        signedTransaction: signedTx,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  private websocketReconnect(onEvent: IntentExecution, filter: CustomFilter) {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    this.reconnectInterval = setInterval(() => {
      if (
        this.ws?.readyState === WebSocket.CLOSED ||
        this.ws?.readyState === WebSocket.CLOSING
      ) {
        logWithLabel({
          labelText: 'IntentAggregaterClient:websocketReconnect',
          level: 'debug',
          message: 'Attempting to reconnect...',
        });
        this.subscribeIntent(onEvent, filter);
      }
    }, 5000);
  }
}
