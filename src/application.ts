import {WebSocketServer} from 'ws';

export class Application {
  constructor(
    private readonly webSocketServer = new WebSocketServer({port: Number(process.env.PORT)})
  ) {}

  public startServer = () => {
    this.webSocketServer.on('connection', (webSocket) => {
      webSocket.on('message', (data) => {
        webSocket.send(data.toString('utf8'));
      });
    });
  };
}
