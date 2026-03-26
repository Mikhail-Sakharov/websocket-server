import {createServer} from 'https';
import {WebSocketServer, WebSocket} from 'ws';
import {readFileSync} from 'fs';

export class Application {
  constructor(
    private readonly server = process.env.CERT && process.env.KEY ? createServer({
      cert: readFileSync(process.env.CERT),
      key: readFileSync(process.env.KEY)
    }) : null,
    private readonly webSocketServer = new WebSocketServer(this.server ? {server: this.server, port: Number(process.env.PORT)} : {port: Number(process.env.PORT)}),
    private readonly clients: Set<WebSocket> = new Set(),
    private readonly backendUrl = process.env.BACKEND_URL || 'http://localhost:3000/api/telemetry'
  ) {}

  public startServer = () => {
    this.webSocketServer.on('connection', (webSocket) => {
      this.clients.add(webSocket);

      // Удаляем клиента из Set при отключении, чтобы не копить мусор
      webSocket.on('close', () => this.clients.delete(webSocket));

      webSocket.on('message', async (data) => {
        const payload = data.toString('utf8');
        console.log('Received from ESP32:', payload);

        // 1. Рассылка подключенным клиентам
        for (const client of this.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }

        // 2. Отправка данных на основной бэкенд для записи в БД
        try {
          // Используем встроенный fetch (Node.js 18+)
          const response = await fetch(this.backendUrl, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: payload // ESP32 обычно шлет JSON строку
          });

          if (!response.ok) {
            console.error(`Backend error: ${response.statusText}`);
          }
        } catch (error) {
          console.error('Failed to send data to backend:', error);
        }
      });
    });
  };
}
