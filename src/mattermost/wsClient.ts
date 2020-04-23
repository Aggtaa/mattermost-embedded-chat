import WebSocket from 'ws';
import { EventEmitter } from 'events';

export default class MattermostWebSocketClient extends EventEmitter {
    
    private ws: WebSocket;
    private seq = 1;

    constructor(url: string, token: string) {
        super();

        console.log(url);
        this.ws = new WebSocket(url);
        this.ws.on('error', (err) => {
            throw err;
        });
        this.ws.on('open', () => {
            this.ws.send(JSON.stringify({
                seq: this.seq++,
                action: "authentication_challenge",
                data: {
                    token
                }
            }));
        });
        this.ws.on('message', (data) => {
            const json = JSON.parse(String(data));
            this.emit('event', json['event'], json['data']);
        });
        this.ws.on('close', (code, reason) => {
            this.emit('close', code, reason);
        })
    }

    close() {
        this.ws.close();
    }

    sendTyping(channelId: string) {
        this.ws.send(JSON.stringify({
            action: "user_typing",
            seq: this.seq++,
            data: {
                channel_id: channelId
            }
        }));
    }

}