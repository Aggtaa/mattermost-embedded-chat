import WebSocket from 'ws';
import MattermostClient from './mattermost/client';
import ChatClient from './chatClient';

export type ChatServerOptions = {
    port: number;
    botToken: string;
    teamName: string;
    staticChannelName: string;
};

export default class ChatServer {

    private server: WebSocket.Server;
    private mattermost: MattermostClient;
    private options: ChatServerOptions;
    
    constructor(mattermost: MattermostClient, options: ChatServerOptions) {
        this.options = options;
        this.mattermost = mattermost;
        
        this.server = new WebSocket.Server({port: this.options.port});
        this.server.on('connection', (conn) => this.onConnection(conn));
    }

    async onConnection(connection: WebSocket): Promise<void> {

        connection.on('message', async (message) => {
            console.log(message);
            const json = JSON.parse(message as string);
            if (json.event === 'message') {
                const id = await mmChat.post(json.data);
                connection.send(JSON.stringify({event: 'id.remap', id: json.id, newId: id}))
            } 
            else if (json.event === 'typing') {
                await mmChat.sendTyping();
            }
        });

        connection.on('close', () => {
            mmChat.close();
        });

        console.log('new chat created');
        const mmChat = new ChatClient(this.mattermost, 'web_');
        mmChat.onMessageDeleted((id) => {
            console.log(`Message #${id} deleted`);
            connection.send(JSON.stringify({event: 'message.delete', id}));
        });
        mmChat.onMessage((id, message, my) => {
            console.log(`Message #${id} added: ${message} ${my?'(my)':''}`);
        
            if (my)
                return;

            if (message === 'stop') {
                mmChat.close();
                connection.close(0, 'Chat closed on the other side');
            }
            else
                connection.send(JSON.stringify({event: 'message', id, data: message}));
        });
        mmChat.onMessageUpdated((id, message) => {
            console.log(`Message #${id} updated: ${message}`);
            connection.send(JSON.stringify({event: 'message.update', id, data: message}));
        });
        mmChat.onTyping(() => {
            connection.send(JSON.stringify({event: 'typing'}));
        });
        await mmChat.loginWithToken(this.options.botToken, this.options.teamName);
        await mmChat.selectChannel(this.options.staticChannelName);
        
        // connection.send('Добрый день');
    }
}
