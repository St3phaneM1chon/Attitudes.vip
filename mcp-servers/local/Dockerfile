FROM node:18-alpine

WORKDIR /app

# Installer les dépendances
RUN npm init -y && npm install express

# Copier le serveur approprié
ARG SERVER_TYPE=echo
COPY ${SERVER_TYPE}-server.js server.js

EXPOSE 3000

CMD ["node", "server.js"]
