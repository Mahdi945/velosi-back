# Configuration Email Setup - Shipnology ERP

## 📋 Modifications effectuées

### 1. **Service Email Setup** (`email-setup.service.ts`)

#### ✅ Changements appliqués :

1. **Remplacement de "Velosi ERP" par "Shipnology ERP"**
   - Dans le sujet de l'email
   - Dans le contenu HTML du template
   - Dans le footer de l'email
   - Dans l'email de support (`support@shipnology-erp.com`)

2. **Amélioration de la gestion du logo**
   - Ajout d'une méthode `getCompanyLogoBase64()` pour charger le logo
   - Recherche du logo dans plusieurs emplacements :
     - `assets/dlogimaster.png` (prioritaire)
     - `assets/logo_societee.png` (fallback)
   - Le logo est converti en base64 et intégré directement dans l'email
   - Affichage du logo dans le header de l'email

3. **Amélioration de la gestion des erreurs d'envoi**
   - Logs détaillés lors de l'envoi
   - Vérification du succès d'envoi avec message explicite
   - Message d'erreur clair si la configuration SMTP n'est pas valide

#### 📝 Code ajouté :

```typescript
/**
 * Obtenir le logo de la société en base64
 */
private getCompanyLogoBase64(): string {
  try {
    const possiblePaths = [
      path.join(process.cwd(), 'assets', 'dlogimaster.png'),
      path.join(process.cwd(), 'assets', 'logo_societee.png'),
      // ... autres chemins
    ];
    
    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        const dataUri = `data:image/png;base64,${logoBase64}`;
        return dataUri;
      }
    }
    
    return '';
  } catch (error) {
    this.logger.error('❌ Erreur lors du chargement du logo:', error);
    return '';
  }
}
```

### 2. **Frontend - Composant Organisations** (`organisations.component.html`)

- ✅ Changement du placeholder : `velosi_transport_rapide` → `shipnology_transport_rapide`

---

## 🚀 Actions requises

### 1. **Ajouter le logo dlogimaster.png**

Pour que le logo s'affiche dans les emails, vous devez :

```bash
# Placez votre fichier logo dans le dossier assets du backend
cp /chemin/vers/votre/dlogimaster.png velosi-back/assets/dlogimaster.png
```

**Spécifications du logo recommandées :**
- Format : PNG avec transparence
- Dimensions : 180-200px de largeur
- Taille : < 100KB pour optimiser les emails
- Nom : `dlogimaster.png` (exactement)

### 2. **Vérifier la configuration SMTP**

Le service utilise les variables d'environnement suivantes (configurées dans `EmailService`) :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-mot-de-passe-application
SMTP_FROM=noreply@shipnology.com
SMTP_FROM_NAME=Shipnology ERP
SMTP_SECURE=false
```

**Vérification de la configuration :**

1. Le service `EmailService` vérifie automatiquement si les identifiants SMTP sont configurés
2. Si `SMTP_USER` ou `SMTP_PASSWORD` sont manquants :
   - L'application démarre quand même (ne bloque pas)
   - Un warning est affiché dans les logs
   - Les emails ne seront pas envoyés

3. Le service `EmailSetupService` :
   - Tente d'envoyer l'email
   - Retourne `false` si la configuration SMTP n'est pas valide
   - Lance une exception avec un message clair

---

## 🧪 Tester l'envoi d'email

### 1. **Via l'interface Admin**

1. Connectez-vous en tant qu'administrateur MSP
2. Allez dans "Gestion des Organisations"
3. Cliquez sur "Nouvelle Organisation"
4. Remplissez les informations de base :
   - Nom de l'organisation
   - Email de contact (utilisez un email valide que vous pouvez vérifier)
   - Téléphone
5. Cliquez sur "Créer et Envoyer l'invitation"

### 2. **Vérifier dans les logs**

Le backend affiche des logs détaillés :

```
✅ Email d'invitation envoyé avec succès à contact@exemple.com pour Transport Rapide
```

Ou en cas d'erreur :

```
❌ Échec d'envoi de l'email - Vérifiez la configuration SMTP
❌ Erreur lors de l'envoi de l'email à contact@exemple.com: [détails de l'erreur]
```

### 3. **Vérifier l'email reçu**

L'email doit contenir :
- ✅ Le logo Shipnology en haut
- ✅ Le titre "Bienvenue sur Shipnology ERP"
- ✅ Le nom de l'organisation
- ✅ Un bouton "Configurer mon espace maintenant"
- ✅ Le lien d'invitation valide pendant 7 jours
- ✅ L'email de support : `support@shipnology-erp.com`

---

## 🔍 Diagnostic des problèmes

### Problème : "Email non envoyé"

**Vérifications :**

1. **Configuration SMTP manquante**
   ```bash
   # Vérifier les variables d'environnement
   echo $SMTP_USER
   echo $SMTP_PASSWORD
   ```

2. **Identifiants incorrects**
   - Vérifiez que les identifiants SMTP sont valides
   - Pour Gmail, utilisez un "mot de passe d'application" plutôt que votre mot de passe principal

3. **Port bloqué**
   - Port 587 (TLS) ou 465 (SSL) doivent être accessibles
   - Vérifiez les règles de firewall

### Problème : "Logo ne s'affiche pas"

**Vérifications :**

1. **Fichier présent**
   ```bash
   ls -la velosi-back/assets/dlogimaster.png
   ```

2. **Chemins de recherche** (vérifiez les logs)
   ```
   ✅ Logo chargé avec succès depuis: /app/assets/dlogimaster.png
   ```
   Ou :
   ```
   ⚠️ Aucun logo trouvé
   ```

3. **Permissions de lecture**
   ```bash
   chmod 644 velosi-back/assets/dlogimaster.png
   ```

---

## 📚 Ressources supplémentaires

### Structure similaire dans EmailService

Le service `EmailSetupService` suit la même architecture que `EmailService` :

- ✅ Vérification de la configuration SMTP avant envoi
- ✅ Logs détaillés avec émojis pour faciliter le débogage
- ✅ Gestion du logo en base64 intégré dans l'email
- ✅ Template HTML responsive et professionnel
- ✅ Gestion des erreurs avec messages explicites

### Prochaines étapes possibles

1. **Personnalisation par organisation**
   - Permettre à chaque organisation d'avoir son propre logo
   - Personnaliser les couleurs du template selon l'organisation

2. **Traçabilité des emails**
   - Logger tous les emails envoyés dans une table dédiée
   - Afficher l'historique des invitations dans l'interface admin

3. **Tests automatisés**
   - Ajouter des tests unitaires pour `EmailSetupService`
   - Tester l'envoi d'email avec un serveur SMTP de test (Mailtrap, Ethereal)
