import {WebSocketServer, WebSocket} from 'ws';

export class Application {
  constructor(
    private readonly webSocketServer = new WebSocketServer({port: Number(process.env.PORT)}),
    private readonly clients: Set<WebSocket> = new Set()
  ) {}

  public startServer = () => {
    this.webSocketServer.on('connection', (webSocket) => {
      this.clients.add(webSocket);

      webSocket.on('message', (data) => {
        console.log(data.toString('utf8'));

        for (const client of this.clients) {
          client.send(data.toString('utf8'));
        }
      });
    });
  };
}
