import MattermostClient from './mattermost/client';
import ChatServer from './chatServer';

import options from '../config';

const chatServer = new ChatServer(new MattermostClient('http://10.0.64.8:8065'), options);
