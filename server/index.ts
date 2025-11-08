/**
 * Main server entry point
 * WebSocket server for Cribbage Remote Deck
 */

import { WebSocketServer, WebSocket } from 'ws';
import { PlayerId } from '../shared/types.js';
import {
  handleConnection,
  handleMessage,
  handleDisconnection,
} from './websocket-handler.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

// Track all connections
const connections = new Map<
  WebSocket,
  { sessionCode: string; playerId: PlayerId }
>();

wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');
  handleConnection(ws);

  ws.on('message', (data: Buffer) => {
    handleMessage(ws, data.toString(), connections);
  });

  ws.on('close', () => {
    handleDisconnection(ws, connections);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

console.log(`Cribbage Remote Deck server running on ws://localhost:${PORT}`);
console.log('Ready for connections...');
