# 🚀 Commandes de Migration Keycloak - Résumé Rapide

## ✅ Améliorations Appliquées
- ✅ Assignation automatique des rôles personnel lors de la création
- ✅ Assignation automatique du rôle "client" lors de la création
- ✅ Script de migration prêt avec assignation de rôles

---

## 📋 Commandes à Exécuter (dans l'ordre)

### Étape 1️⃣ : Configuration Automatique de Keycloak

```powershell
cd c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back
.\configure-keycloak.ps1
```

**Ce que cette commande fait :**
- ✅ Crée le realm `ERP_Velosi`
- ✅ Configure les sessions (8h idle, 10h max)
- ✅ Crée le client `velosi_auth` avec le secret
- ✅ Crée les 6 rôles : commercial, administratif, chauffeur, exploitation, finance, client

**Durée :** ~5-10 secondes

**Résultat attendu :**
```
✅ Token obtenu avec succès
✅ Realm créé avec succès
✅ Client créé avec succès
✅ Rôle 'commercial' créé
✅ Rôle 'administratif' créé
✅ Rôle 'chauffeur' créé
✅ Rôle 'exploitation' créé
✅ Rôle 'finance' créé
✅ Rôle 'client' créé
📋 Configuration Terminée ✅
```

---

### Étape 2️⃣ : Migration des Utilisateurs Existants

```powershell
npm run sync:keycloak
```

**Ce que cette commande fait :**
- ✅ Synchronise tous les personnels actifs vers Keycloak
- ✅ Assigne les rôles appropriés (commercial, administratif, etc.)
- ✅ Synchronise uniquement les clients permanents (is_permanent=true)
- ✅ Assigne le rôle "client" aux clients permanents
- ✅ Sauvegarde les keycloak_id dans PostgreSQL
- ✅ Affiche les statistiques de migration

**Durée :** ~2-5 secondes par utilisateur (dépend du nombre d'utilisateurs)

**Résultat attendu :**
```
🚀 Démarrage de la synchronisation avec Keycloak...

📋 SYNCHRONISATION DU PERSONNEL
══════════════════════════════════════════════════
Personnel actif trouvé : 15

🔄 Création de jean.dupont (commercial)...
   ✅ Créé avec succès - ID Keycloak: abc-123-def
🔄 Création de marie.martin (administratif)...
   ✅ Créé avec succès - ID Keycloak: ghi-789-jkl
...

📋 SYNCHRONISATION DES CLIENTS PERMANENTS
══════════════════════════════════════════════════
Clients permanents actifs trouvés : 8

🔄 Création de ACME Corporation (client permanent)...
   ✅ Créé avec succès - ID Keycloak: mno-345-pqr
...

📊 RÉCAPITULATIF DE LA SYNCHRONISATION
══════════════════════════════════════════════════
✅ Personnel synchronisé : 15
✅ Clients synchronisés : 8
❌ Erreurs totales : 0
✨ Total synchronisé : 23
══════════════════════════════════════════════════
🏁 Synchronisation terminée !
```

---

### Étape 3️⃣ : Vérification dans Keycloak Admin Console

Ouvrez votre navigateur :
```
URL: http://localhost:8080/admin
Username: admin
Password: 87Eq8384
```

**Vérifications à faire :**
1. ✅ Sélectionner le realm `ERP_Velosi`
2. ✅ Aller dans "Users" → "View all users"
3. ✅ Vérifier que tous les personnels actifs sont présents
4. ✅ Vérifier que tous les clients permanents sont présents
5. ✅ Cliquer sur un utilisateur → Onglet "Role mapping"
6. ✅ Vérifier que le rôle approprié est assigné

---

### Étape 4️⃣ : Démarrer le Backend et Tester

```powershell
npm run start:dev
```

**Test avec Postman/Thunder Client :**
```http
GET http://localhost:3000/auth/personnel/1/sessions
GET http://localhost:3000/auth/personnel/1/activity
DELETE http://localhost:3000/auth/personnel/1/sessions
```

---

## 🔍 Vérification dans PostgreSQL (Optionnel)

Si vous voulez vérifier que les keycloak_id ont été sauvegardés :

```sql
-- Personnel synchronisé
SELECT id, nom, prenom, role, statut, keycloak_id 
FROM personnel 
WHERE statut = 'actif' 
ORDER BY id;

-- Clients permanents synchronisés
SELECT c.id, c.nom, c.is_permanent, c.statut, c.keycloak_id
FROM client c
WHERE c.is_permanent = true AND c.statut = 'actif'
ORDER BY c.id;

-- Statistiques
SELECT 
  'Personnel' as type, 
  COUNT(*) as total, 
  COUNT(keycloak_id) as synchronises
FROM personnel WHERE statut = 'actif'
UNION ALL
SELECT 
  'Client Permanent' as type, 
  COUNT(*) as total, 
  COUNT(keycloak_id) as synchronises
FROM client WHERE is_permanent = true AND statut = 'actif';
```

---

## ⚠️ Points d'Attention

### AVANT d'exécuter npm run sync:keycloak :
1. ✅ Keycloak doit être démarré (http://localhost:8080)
2. ✅ Le script `configure-keycloak.ps1` doit avoir été exécuté
3. ✅ Le realm et les rôles doivent exister dans Keycloak
4. ✅ Le backend NestJS doit être ARRÊTÉ (éviter conflits de connexion BD)

### Après la migration :
1. ✅ Tous les personnels actifs auront un keycloak_id
2. ✅ Tous les clients permanents actifs auront un keycloak_id
3. ✅ Les clients temporaires n'auront PAS de keycloak_id (normal)
4. ✅ Les rôles seront assignés dans Keycloak

### Ré-exécution :
- ✅ Le script est **idempotent** : vous pouvez le ré-exécuter sans problème
- ✅ Les utilisateurs déjà synchronisés seront ignorés
- ✅ Seuls les nouveaux utilisateurs seront créés

---

## 🆘 Dépannage Rapide

### Erreur : "Cannot connect to Keycloak"
```powershell
# Vérifier que Keycloak est démarré
Start-Process "http://localhost:8080"

# Si pas démarré, le démarrer
cd c:\keycloak-old\bin
.\kc.bat start-dev
```

### Erreur : "Realm ERP_Velosi not found"
```powershell
# Re-exécuter le script de configuration
.\configure-keycloak.ps1
```

### Erreur : "Role 'commercial' not found"
```powershell
# Re-exécuter le script de configuration
.\configure-keycloak.ps1
```

---

## 📚 Documentation Complète

- **Guide Complet** : `GUIDE_MIGRATION_KEYCLOAK.md`
- **Implémentation** : `KEYCLOAK_IMPLEMENTATION_COMPLETE.md`
- **Analyse** : `ANALYSE_SYNCHRONISATION_KEYCLOAK.md`
- **Setup Guide** : `KEYCLOAK_SETUP_GUIDE.md`

---

**Date** : 3 novembre 2025  
**Statut** : ✅ Prêt pour exécution
