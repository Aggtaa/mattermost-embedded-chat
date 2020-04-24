FROM node:12

WORKDIR /app
VOLUME [ "/app" ]

RUN npm install

EXPOSE 8087

CMD [ "npx", "ts-node", "src/index.ts" ]
