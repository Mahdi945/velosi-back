# 📧 Variables SMTP à ajouter dans Railway

## ⚠️ IMPORTANT
Ces variables doivent être ajoutées dans **Railway > votre-projet > Variables** pour activer les notifications par email en production.

## 📋 Variables à ajouter

Copiez-collez ces variables dans Railway :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=velosierp@gmail.com
SMTP_PASSWORD=qaasamaktyqqrzet
SMTP_FROM_EMAIL=noreply@velosi.com
SMTP_FROM_NAME=Velosi ERP
```

## 🔧 Comment ajouter dans Railway

### Méthode 1 : Interface Web Railway

1. Allez sur **Railway Dashboard** : https://railway.app/dashboard
2. Sélectionnez votre projet **velosi-back**
3. Cliquez sur l'onglet **Variables**
4. Cliquez sur **+ New Variable** pour chaque variable ci-dessus
5. Copiez le nom et la valeur exactement comme indiqué
6. Cliquez sur **Deploy** pour redémarrer avec les nouvelles variables

### Méthode 2 : Railway CLI (plus rapide)

```powershell
# Depuis le dossier velosi-back
cd "c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

# Ajouter toutes les variables d'un coup
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_SECURE=false
railway variables set SMTP_USER=velosierp@gmail.com
railway variables set SMTP_PASSWORD=qaasamaktyqqrzet
railway variables set SMTP_FROM_EMAIL=noreply@velosi.com
railway variables set SMTP_FROM_NAME="Velosi ERP"

# Redéployer
railway up
```

## 📨 Fonctionnalités Email activées

Une fois configuré, ces emails seront automatiquement envoyés :

✅ **Récupération mot de passe** : Code OTP par email
✅ **Confirmation reset** : Email de confirmation après changement
✅ **Nouveau personnel** : Credentials de connexion
✅ **Nouveau client** : Identifiants d'accès client
✅ **Notifications RH** : Activation/Désactivation/Suspension de compte

## ⚠️ Note sur la sécurité

- ✅ Le mot de passe `qaasamaktyqqrzet` est un **App Password Gmail**
- ✅ Ce n'est PAS votre mot de passe Gmail principal
- ✅ Il est généré depuis : https://myaccount.google.com/apppasswords
- ✅ Si vous changez le mot de passe Gmail, l'App Password reste valide

## 🔒 Si l'envoi échoue

Si les emails ne partent pas après configuration :

1. **Vérifier Gmail** : Assurez-vous que l'App Password est toujours valide
2. **Vérifier les logs Railway** : `railway logs` pour voir les erreurs SMTP
3. **Tester manuellement** :
   ```bash
   # Dans la console Railway
   curl -X POST https://votre-backend.railway.app/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

## ✅ Comportement sans SMTP configuré

**BONNE NOUVELLE** : L'application démarre maintenant **même sans SMTP configuré** !

- ⚠️ Si SMTP n'est pas configuré : Les emails ne seront pas envoyés (warning dans les logs)
- ✅ L'application continue de fonctionner normalement
- 📧 Une fois SMTP ajouté : Les emails partiront automatiquement

## 🎯 Vérification finale

Après avoir ajouté les variables dans Railway :

1. **Redémarrer le service** : Railway → Deploy
2. **Vérifier les logs** : Chercher `✅ Service email initialisé avec succès`
3. **Tester un email** : Utiliser la fonction "Mot de passe oublié"

---

✅ **Fichier mis à jour le** : 24/11/2025
