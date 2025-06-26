# Multi-stage Dockerfile pour Attitudes.vip
# Stage 1: Builder pour les dépendances et build
FROM node:18-alpine AS builder

# Installer les dépendances système nécessaires
RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY tailwind.config.js ./

# Installer les dépendances
RUN npm ci --only=production && npm cache clean --force

# Copier le code source
COPY src/ ./src/
COPY UI.html ./

# Build des assets CSS et JS
RUN npm run build:css || echo "CSS build skipped"
RUN npm run build:js || echo "JS build skipped"

# Stage 2: Production avec nginx optimisé
FROM nginx:alpine AS production

# Installer les outils de sécurité
RUN apk add --no-cache curl

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nginx && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx

# Copier la configuration nginx optimisée
COPY nginx.conf /etc/nginx/nginx.conf

# Copier les fichiers construits depuis le builder
COPY --from=builder /app/ /usr/share/nginx/html/
COPY --from=builder /app/dist/ /usr/share/nginx/html/dist/ 2>/dev/null || true

# Créer les répertoires nécessaires et ajuster les permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Exposer le port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Commande par défaut
CMD ["nginx", "-g", "daemon off;"]

# Stage 3: Development (optionnel)
FROM node:18-alpine AS development

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./
COPY tailwind.config.js ./

# Installer toutes les dépendances (incluant devDependencies)
RUN npm ci

# Copier le code source
COPY . .

# Exposer les ports
EXPOSE 8080 3000

# Commande de développement
CMD ["npm", "run", "dev"]
