/**
 * Configuration environnement VelosiChat
 * À adapter selon votre environnement de déploiement
 */

export const VeChatConfig = {
  // Configuration générale
  APP_NAME: 'VelosiChat',
  VERSION: '1.0.0',
  
  // Configuration base de données
  DATABASE: {
    // Ces valeurs doivent correspondre à votre configuration existante
    TABLE_PERSONNEL: 'personnel',
    TABLE_CLIENT: 'client',
    TABLE_CONVERSATIONS: 'vechat_conversations',
    TABLE_MESSAGES: 'vechat_messages',
    TABLE_PRESENCE: 'vechat_presence',
    TABLE_SETTINGS: 'vechat_user_settings'
  },
  
  // Configuration des fichiers
  FILES: {
    UPLOAD_PATH: './uploads/vechat',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    PROFILE_PHOTOS_PATH: './uploads/profiles'
  },
  
  // Configuration WebSocket
  WEBSOCKET: {
    CORS_ORIGIN: process.env.FRONTEND_URL || 'http://localhost:4200',
    PORT: process.env.WEBSOCKET_PORT || 3001,
    NAMESPACE: '/vechat'
  },
  
  // Règles métier
  BUSINESS_RULES: {
    // Personnel peut voir tous les utilisateurs
    PERSONNEL_SEE_ALL: true,
    // Commercial ne voit que ses clients assignés
    COMMERCIAL_RESTRICTED: true,
    // Clients peuvent voir le personnel et leurs co-clients selon charge_com
    CLIENT_SEE_PERSONNEL: true,
    CLIENT_SEE_OTHER_CLIENTS: false
  },
  
  // Configuration chat
  CHAT: {
    MESSAGE_MAX_LENGTH: 1000,
    MESSAGES_PER_PAGE: 50,
    TYPING_TIMEOUT: 3000, // 3 secondes
    ONLINE_TIMEOUT: 300000, // 5 minutes
    MAX_CONVERSATIONS_PER_USER: 100
  },
  
  // Configuration notifications
  NOTIFICATIONS: {
    SOUND_ENABLED: true,
    DESKTOP_ENABLED: true,
    SOUND_FILE: '/assets/sounds/message.mp3'
  },
  
  // Configuration UI
  UI: {
    THEME: 'light', // 'light' | 'dark' | 'auto'
    EMOJI_PICKER: true,
    VOICE_MESSAGES: true,
    FILE_PREVIEW: true,
    DEFAULT_AVATAR: 'assets/images/profile/default-avatar.png'
  },
  
  // Configuration sécurité
  SECURITY: {
    // Chiffrement des messages (à implémenter)
    ENCRYPT_MESSAGES: false,
    // Durée de rétention des messages (en jours)
    MESSAGE_RETENTION_DAYS: 365,
    // Limitation de débit (messages par minute)
    RATE_LIMIT_MESSAGES: 60
  }
};

// Configuration pour différents environnements
export const getVeChatConfig = (environment: string = 'development') => {
  switch (environment) {
    case 'production':
      return {
        ...VeChatConfig,
        FILES: {
          ...VeChatConfig.FILES,
          UPLOAD_PATH: '/var/www/uploads/vechat',
          PROFILE_PHOTOS_PATH: '/var/www/uploads/profiles'
        },
        WEBSOCKET: {
          ...VeChatConfig.WEBSOCKET,
          CORS_ORIGIN: 'https://votre-domaine.com'
        }
      };
      
    case 'staging':
      return {
        ...VeChatConfig,
        WEBSOCKET: {
          ...VeChatConfig.WEBSOCKET,
          CORS_ORIGIN: 'https://staging.votre-domaine.com'
        }
      };
      
    default: // development
      return VeChatConfig;
  }
};