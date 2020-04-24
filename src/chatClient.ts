import MattermostClient from "./mattermost/client";
import { UserProfile } from "mattermost-redux/types/users";
import { Team } from "mattermost-redux/types/teams";
import { Channel } from "mattermost-redux/types/channels";

export default class ChatClient {
    
    private mm: MattermostClient;
    private channelPrefix: string;
    private user: UserProfile;
    private team: Team;
    private channel: Channel;
    private postQueue: (() => void)[] = [];
    
    constructor(mattermost: MattermostClient, channelPrefix: string) {
        this.mm = mattermost;
        this.channelPrefix = channelPrefix;
    }

    async login(login: string, password: string, teamName: string): Promise<void> {
        this.user = await this.mm.login(login, password);
        this.team = await this.mm.getTeam(teamName);
    }

    async loginWithToken(token: string, teamName: string): Promise<void> {
        this.user = await this.mm.loginWithToken(token);
        this.team = await this.mm.getTeam(teamName);
    }

    async selectChannel(name: string): Promise<void> {
        this.channel = await this.mm.getChannel(this.team.id, name);
        this.processPostQueue();
    }

    async createNewChannel(displayName: string): Promise<void> {

        let channel;
        while (true) {
            const channelName = this.channelPrefix + Date.now();
            channel = await this.mm.getChannel(this.team.id, channelName, true);
            if (!channel) {
                console.log('creating channel ' + channelName);
                channel = await this.mm.createChannel(this.team.id, channelName, displayName, 'PUBLIC');
                break;
            }
            if (channel.delete_at == 0)
                break;
        }
        this.channel = channel;
        this.processPostQueue();
    }

    private async processPostQueue(): Promise<void> {
        while(this.postQueue.length > 0) {
            const task = this.postQueue.shift();
            task();
        }
    }

    async sendTyping(): Promise<void> {
        return this.execOnChannelSelected(() => this.mm.sendTyping(this.channel.id));
    }

    async post(message: string): Promise<string> {
        return this.execOnChannelSelected(async () => (await this.mm.createPost(this.channel.id, message)).id);
    }

    private async execOnChannelSelected<T>(action: () => Promise<T>): Promise<T> {
        return new Promise((res) => {
            if (!this.channel)
                this.postQueue.push(() => {
                    action().then((val) => res(val));
                });
            else
                action().then((val) => res(val));
        });
    }

    async close(): Promise<void> {
        this.post('Чат закрыт');
        this.mm.close();
    }

    onMessageDeleted(callback: (id: string, my: boolean) => void) {
        this.mm.on('post_deleted', (message) => {
            const post = JSON.parse(message.post);
            if (post.channel_id === this.channel.id)
                callback(post.id, post.user_id === this.user.id);
        });
    }

    onMessage(callback: (id: string, message: string, my: boolean) => void) {
        this.mm.on('posted', (message) => {
            const post = JSON.parse(message.post);
            if (post.channel_id === this.channel.id)
                callback(post.id, post.message, post.user_id === this.user.id);
        });
    }

    onMessageUpdated(callback: (id: string, message: string, my: boolean) => void) {
        this.mm.on('post_edited', (message) => {
            const post = JSON.parse(message.post);
            if (post.channel_id === this.channel.id)
                callback(post.id, post.message, post.user_id === this.user.id);
        });
    }

    onTyping(callback: () => void) {
        this.mm.on('typing', callback);
    }
}