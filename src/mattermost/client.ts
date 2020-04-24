import { EventEmitter } from "events";

import MattermostHttpClient, { HttpError } from "./httpClient";
import MattermostWebSocketClient from "./wsClient";
import { UserProfile } from "mattermost-redux/types/users";
import { Team } from "mattermost-redux/types/teams";
import { Channel } from "mattermost-redux/types/channels";
import { Post } from "mattermost-redux/types/posts";

export default class MattermostClient extends EventEmitter {

    private httpClient: MattermostHttpClient;
    private webSocketClient: MattermostWebSocketClient;
    private url: string;

    constructor(url: string) {
        super();

        this.url = url + '/api/v4/';
        this.httpClient = new MattermostHttpClient(this.url);
    }

    async close() {
        if (this.webSocketClient)
            this.webSocketClient.close();
    }

    async login(login: string, password: string, device?:string): Promise<UserProfile> {

        const user = (await this.httpClient.post('users/login', {
            login_id: login,
            password,
            //token: '',
            device_id: device
        })) as UserProfile;

        this.createWebSocketClient();
        return user;
    }

    async loginWithToken(token: string): Promise<UserProfile> {
        this.httpClient.token = token;
        this.createWebSocketClient();
        return (await this.httpClient.get('users/me')) as UserProfile;
    }

    private createWebSocketClient() {
        this.webSocketClient = new MattermostWebSocketClient(this.url + 'websocket', this.httpClient.token);
        this.webSocketClient.on('event', (event, ...args) => this.emit(event, ...args));
    }

    async listTeams(): Promise<Team[]> {
        return (await this.httpClient.get('teams')) as Team[];
    }

    async getTeam(name: string): Promise<Team> {
        try {
            const res = await this.httpClient.get(`teams/name/${name}`);
            if (res['status_code'])
                return undefined; 
            return res as Team;
        } catch (err) {
            if (err instanceof HttpError && err.code === 404)
                return undefined;
            throw err;
        }
    }

    async listChannels(teamId: string, includeDeleted?: boolean): Promise<Channel[]> {
        let channels = Array.from((await this.httpClient.get(`teams/${teamId}/channels`)) as Channel[]);
        if (includeDeleted)
            channels.push(...((await this.httpClient.get(`teams/${teamId}/channels/deleted`)) as Channel[]));
        return channels;
    }

    async getChannel(teamId: string, name: string, includeDeleted?: boolean): Promise<Channel> {
        return (await this.listChannels(teamId, includeDeleted))
            .find((ch) => ch.name === name);
    }

    async createChannel(
        teamId: string, 
        name: string, 
        displayName: string,
        type: 'PUBLIC' | 'PRIVATE',
        purpose?: string,
        header?: string
    ): Promise<Channel> {
        
        return (await this.httpClient.post('channels', {
            team_id: teamId,
            name,
            display_name: displayName,
            purpose,
            header,
            type: type === 'PUBLIC' ? 'O' : 'P'
        })) as Channel;
        
    }

    async createPost(channelId: string, message: string): Promise<Post> {
        
        return (await this.httpClient.post('posts', {
            channel_id: channelId,
            message
        })) as Post;
    }

    async sendTyping(channelId: string): Promise<void> {
        this.webSocketClient.sendTyping(channelId);
    }
}