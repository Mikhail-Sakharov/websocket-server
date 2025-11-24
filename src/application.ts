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
