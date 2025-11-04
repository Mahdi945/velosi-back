# 🔐 Guide: Créer un Administrateur dans Supabase

## 📋 Problème
Les mots de passe importés depuis PostgreSQL vers Supabase ne fonctionnent pas car le format de hash peut être différent ou corrompu.

## ✅ Solution
Créer un nouvel administrateur **Ahmed** avec un mot de passe correctement haché en bcrypt.

---

## 🚀 Méthode 1: Script SQL Direct (RECOMMANDÉ)

### Étapes:

1. **Ouvrir Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Sélectionner le projet **Velosi**

2. **Ouvrir SQL Editor**
   - Menu gauche → **SQL Editor**
   - Ou accès direct: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

3. **Exécuter le script**
   - Ouvrir le fichier: `create_admin_ahmed.sql`
   - Copier tout le contenu
   - Coller dans SQL Editor
   - Cliquer sur **Run** (ou `Ctrl+Enter`)

4. **Vérifier la création**
   - Le résultat doit afficher:
     ```
     id | nom   | prenom          | email              | role  | statut
     ---|-------|-----------------|--------------------| ------|-------
     X  | Ahmed | Administrateur  | ahmed@velosi.com   | admin | actif
     ```

5. **Tester la connexion**
   - URL: https://velosi-front.vercel.app/login
   - Email: `ahmed@velosi.com`
   - Mot de passe: `87Eq8384`

---

## 🔧 Méthode 2: Générateur de Hash PowerShell

Si vous voulez utiliser un **autre mot de passe**, utilisez le générateur:

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
.\generate-bcrypt-hash.ps1
```

**Le script va:**
1. Demander le mot de passe
2. Générer le hash bcrypt
3. Copier le hash dans le presse-papiers
4. Afficher le SQL d'exemple

**Ensuite:**
- Remplacer le hash dans `create_admin_ahmed.sql`
- Exécuter le script SQL dans Supabase

---

## 🧪 Méthode 3: Vérification du Hash (Debug)

Pour vérifier si un hash bcrypt est valide:

```bash
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
node verify-password.js
```

**Modification du script:**
```javascript
// Dans verify-password.js, ligne 10-11
const testPassword = 'VotreMotDePasse';
const testHash = '$2a$10$...VotreHash...';
```

---

## 📊 Informations Techniques

### Hash Bcrypt Généré
- **Mot de passe**: `87Eq8384`
- **Hash**: `$2a$10$fHkoz9vaBbS.1a8WoMnGtunJdEBiYfgoWAxu9xocSmJGxpiKHNpZa`
- **Algorithme**: bcrypt (10 rounds)
- **Bibliothèque**: bcryptjs v2.4.3

### Pourquoi Bcrypt?
- ✅ **Sécurité**: Résistant aux attaques par force brute
- ✅ **Salt automatique**: Chaque hash est unique
- ✅ **Compatible**: Fonctionne avec NestJS backend
- ✅ **Standard**: Utilisé par la plupart des frameworks modernes

---

## ❓ Problèmes Courants

### 1. "Invalid login credentials"
**Cause**: Hash bcrypt incorrect ou mot de passe mal tapé  
**Solution**: 
- Vérifier que le script SQL a bien été exécuté
- Utiliser `verify-password.js` pour vérifier le hash
- Réinitialiser le mot de passe avec un nouveau hash

### 2. "User not found"
**Cause**: L'utilisateur n'existe pas dans `crm_personnel`  
**Solution**: 
- Vérifier dans Supabase → Table Editor → `crm_personnel`
- Réexécuter `create_admin_ahmed.sql`

### 3. Hash commence par `$2b$` au lieu de `$2a$`
**Cause**: Version de bcrypt différente  
**Solution**: Les deux sont compatibles, ça fonctionne quand même

---

## 🔄 Script SQL Complet

```sql
-- Supprimer l'ancien utilisateur
DELETE FROM crm_personnel WHERE email = 'ahmed@velosi.com';

-- Créer le nouvel administrateur
INSERT INTO crm_personnel (
    nom, prenom, email, password, role, statut,
    telephone, date_embauche, created_at, updated_at
) VALUES (
    'Ahmed', 'Administrateur', 'ahmed@velosi.com',
    '$2a$10$fHkoz9vaBbS.1a8WoMnGtunJdEBiYfgoWAxu9xocSmJGxpiKHNpZa',
    'admin', 'actif', '+33612345678',
    CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- Vérifier
SELECT id, nom, prenom, email, role, statut 
FROM crm_personnel 
WHERE email = 'ahmed@velosi.com';
```

---

## 📞 Identifiants de Connexion

| Champ | Valeur |
|-------|--------|
| **Email** | ahmed@velosi.com |
| **Mot de passe** | 87Eq8384 |
| **Rôle** | admin |
| **Statut** | actif |

---

## ✅ Checklist de Vérification

- [ ] Script SQL exécuté dans Supabase SQL Editor
- [ ] Utilisateur créé avec succès (vérifier le résultat)
- [ ] Hash bcrypt valide (tester avec verify-password.js)
- [ ] Frontend déployé sur Vercel
- [ ] Backend déployé sur Railway
- [ ] Variables CORS configurées dans Railway
- [ ] Cache navigateur vidé
- [ ] Test de connexion sur https://velosi-front.vercel.app/login

---

## 🎯 Résultat Attendu

Après avoir exécuté le script SQL et testé la connexion:

```
✅ Connexion réussie
✅ Token JWT généré
✅ Redirection vers le dashboard administratif
✅ Données utilisateur chargées
```

---

## 📚 Ressources

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Frontend Vercel**: https://velosi-front.vercel.app
- **Backend Railway**: https://velosi-back-production.up.railway.app
- **Documentation Bcrypt**: https://github.com/dcodeIO/bcrypt.js

---

**Auteur**: Assistant IA  
**Date**: 4 novembre 2025  
**Version**: 1.0
