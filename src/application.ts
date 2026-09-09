import {createServer} from 'https';
import {WebSocketServer, WebSocket} from 'ws';
import {readFileSync} from 'fs';

export class Application {
  // Хранилище для ESP32: ключ — ID теплицы, значение — WebSocket
  private readonly greenhouses: Map<number, WebSocket> = new Map();

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

      webSocket.on('close', () => {
        this.clients.delete(webSocket);
        // Удаляем из хранилища теплиц, если этот сокет был зарегистрирован
        for (const [id, ws] of this.greenhouses.entries()) {
          if (ws === webSocket) {
            this.greenhouses.delete(id);
            console.log(`Теплица ${id} отключена`);
            break;
          }
        }
      });

      webSocket.on('message', async (data) => {
        const payload = data.toString('utf8');
        console.log('Received:', payload);

        try {
          const parsed = JSON.parse(payload);

          // ========== 1. ЕСЛИ ЭТО ДАННЫЕ ОТ ESP32 (содержит id и t) ==========
          if (parsed.id && parsed.t !== undefined) {
            // Регистрируем теплицу
            this.greenhouses.set(parsed.id, webSocket);
            console.log(`Теплица ${parsed.id} зарегистрирована`);

            // Рассылка всем клиентам (фронтенд)
            for (const client of this.clients) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
              }
            }

            // Отправка на бэкенд
            try {
              const response = await fetch(this.backendUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: payload
              });
              if (!response.ok) {
                console.error(`Backend error: ${response.statusText}`);
              }
            } catch (error) {
              console.error('Failed to send data to backend:', error);
            }
          }

          // ========== 2. ЕСЛИ ЭТО КОМАНДА ОТ ФРОНТЕНДА (содержит cmd и targetId) ==========
          if (parsed.cmd && parsed.targetId) {
            const targetWs = this.greenhouses.get(parsed.targetId);
            if (targetWs && targetWs.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({cmd: parsed.cmd}));
              console.log(`Команда "${parsed.cmd}" отправлена теплице ${parsed.targetId}`);
            } else {
              console.log(`Теплица ${parsed.targetId} не подключена`);
              // Можно отправить ответ фронтенду об ошибке
              webSocket.send(JSON.stringify({
                status: 'error',
                message: `Теплица ${parsed.targetId} не подключена`
              }));
            }
          }

          // ========== 3. СТАТУСНОЕ СООБЩЕНИЕ (мгновенное обновление) ==========
          if (parsed.type === 'status_update' && parsed.data) {
            // Ретранслируем всем клиентам (фронтенд)
            for (const client of this.clients) {
              if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
              }
            }
            console.log('Ретранслировано статусное сообщение:', payload);
          }

        } catch (e) {
          console.error('Ошибка парсинга JSON:', e);
        }
      });
    });

    console.log(`WebSocket сервер запущен на порту ${process.env.PORT}`);
  };
}
