import request from "request";

export class HttpError extends Error {
    
    status: string;
    code: number;

    constructor (httpCode: number, httpMessage: string | undefined, body: unknown) {
      super(String(body));

      Error.captureStackTrace(this, this.constructor);

      this.name = this.constructor.name;
      this.code = httpCode;
      this.status = httpMessage;
    }
  };

export default class MattermostHttpClient {
    
    private cookies = request.jar();
    private url: string;
    
    token: string = undefined;

    constructor(url: string) {
        console.log(url);
        this.url = url;
    }

    private async exec(path: string, method: 'POST' | 'GET', data?: unknown, headers?: {[key: string]: any;}): Promise<unknown> {

        const url = `${this.url}${path}`;

        if (!headers)
            headers = {};

        if (this.token)
            headers['Authorization'] = `Bearer ${this.token}`;
        headers['content-type'] = `application/json`;

        return new Promise((res, rej) => {
            request({
                url,
                method,
                json: data,
                jar: this.cookies,
                headers
            }, (error, response, body) => {
                if (error) 
                    rej(error);
                else if (response.statusCode < 200 && response.statusCode >= 300) 
                    rej(new HttpError(response.statusCode, response.statusMessage, body));
                else {
                    const token = response.headers['token'];
                    if (token)
                        this.token = token as string;
                    res(typeof(body) === 'string' ? JSON.parse(String(body)) : body);
                }
            });
        });
    }

    public async post(path: string, data?: unknown, headers?: {[key: string]: any;}): Promise<unknown> {
        return this.exec(path, 'POST', data, headers);
    }

    public async get(path: string, headers?: {[key: string]: any;}): Promise<unknown> {
        return this.exec(path, 'GET', undefined, headers);
    }
}