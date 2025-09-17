# Guide d'Authentification - Velosi ERP

## 🔐 Méthodes de Connexion Supportées

L'application Velosi ERP supporte maintenant **deux méthodes de connexion** :

### 1. **Par Nom d'Utilisateur**
- **Personnel** : Utilise le champ `nom_utilisateur` 
- **Client** : Utilise le champ `nom`

### 2. **Par Adresse Email** 
- **Personnel** : Utilise le champ `email`
- **Client** : Utilise le champ `email`

## 📝 Fonctionnement Technique

### Backend - Méthode `validateUser()`
```typescript
// Recherche dans Personnel par nom_utilisateur OU email
const personnel = await this.personnelRepository.findOne({
  where: [
    { nom_utilisateur: username },
    { email: username }
  ]
});

// Recherche dans Client par nom OU email  
const client = await this.clientRepository.findOne({
  where: [
    { nom: username },
    { email: username }
  ]
});
```

### Frontend - Interface Utilisateur
- **Label** : "Nom d'utilisateur ou Email"
- **Placeholder** : "Nom d'utilisateur ou email"
- **Validation** : Accepte les deux formats

## ✅ Exemples de Connexion

### Pour le Personnel :
- `matzzaro` (nom d'utilisateur) + mot de passe
- `mahdibey@gmail.com` (email) + mot de passe

### Pour les Clients :
- `client_nom` (nom) + mot de passe  
- `client@email.com` (email) + mot de passe

## 🔧 Configuration

### Keycloak (Optionnel)
- **Activé** : `KEYCLOAK_ENABLED=true`
- **Désactivé** : `KEYCLOAK_ENABLED=false`

Quand Keycloak est désactivé, l'authentification se fait uniquement via la base de données locale.

## 🛡️ Sécurité

- Mots de passe hachés avec bcrypt (12 rounds)
- Tokens JWT avec expiration configurable
- Validation des comptes (actif/bloqué)
- Gestion des erreurs sans fuite d'informations

---
*Mis à jour : 12 septembre 2025*
