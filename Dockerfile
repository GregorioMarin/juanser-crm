FROM node:22-alpine
WORKDIR /app
ENV UPLOADS_DIR=/app/uploads
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p /app/uploads
RUN npm run build
VOLUME ["/app/uploads"]
EXPOSE 3000
CMD ["npm", "start"]
