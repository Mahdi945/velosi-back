# ===============================================
# Dockerfile optimisé pour Railway - Velosi Backend
# ===============================================
# Ce Dockerfile résout le problème EBUSY avec le cache npm

# Stage 1: Builder
FROM node:20-alpine AS builder

# Installer les dépendances système nécessaires
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer TOUTES les dépendances (dev + prod)
RUN npm ci --legacy-peer-deps

# Copier le code source
COPY . .

# Build de l'application
RUN npm run build

# Nettoyer les dev dependencies APRÈS le build
RUN npm prune --production --legacy-peer-deps

# Stage 2: Production
FROM node:20-alpine AS production

# Installer uniquement les dépendances runtime nécessaires
RUN apk add --no-cache dumb-init

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copier node_modules et dist depuis le builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/assets ./assets

# Copier le script de vérification des variables d'environnement
COPY --from=builder --chown=nodejs:nodejs /app/check-env.js ./check-env.js

# Créer le dossier uploads avec les bonnes permissions
RUN mkdir -p uploads/profiles uploads/activites uploads/autorisations uploads/bons-de-commande uploads/correspondants-logo uploads/logos_armateurs uploads/logos_fournisseurs uploads/vechat && \
    chown -R nodejs:nodejs uploads

# Utiliser l'utilisateur non-root
USER nodejs

# Exposer le port
EXPOSE 3000

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/auth/check', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Démarrer l'application avec vérification des variables d'environnement
# puis lancement avec dumb-init pour gérer les signaux proprement
CMD ["sh", "-c", "node check-env.js && dumb-init node dist/main.js"]
