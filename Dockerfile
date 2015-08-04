FROM google/nodejs

RUN mkdir /app
COPY ./app.js /app/
COPY ./package.json /app/
COPY ./app /app/app/
COPY ./config /app/config/
RUN npm -g install forever
RUN npm install

WORKDIR /app

EXPOSE 18080
CMD npm start