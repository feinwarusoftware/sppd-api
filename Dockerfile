FROM node:12-alpine

WORKDIR /app

COPY . .

RUN yarn
RUN yarn build

EXPOSE 1337

ENTRYPOINT ["yarn", "start"]
