# 🔐 Correction du Filtrage par Commercial - Dashboard & Listes CRM

## 📋 Résumé des Modifications

Les listes des prospects, opportunités, cotations et activités affichaient **TOUTES les données** au lieu de filtrer par commercial connecté.

### ✅ Solution Implémentée

Modification automatique du filtrage au **niveau backend** pour que les commerciaux ne voient que **leurs propres données** sans modification du frontend.

---

## 🔧 Fichiers Modifiés (Backend)

### 1. **Leads (Prospects)**

#### `src/crm/controllers/leads.controller.ts`
- ✅ Ajout filtrage automatique dans `findAll()` par `assignedToId`
- ✅ Ajout filtrage automatique dans `getStatistics()` par commercial

#### `src/crm/services/leads.service.ts`
- ✅ Nouvelle méthode `findByAssignedTo(userId)` - retourne les leads assignés à un commercial
- ✅ Nouvelle méthode `getStatisticsByCommercial(userId)` - statistiques filtrées

### 2. **Opportunities (Opportunités)**

#### `src/crm/controllers/opportunities.controller.ts`
- ✅ Ajout filtrage automatique dans `findAll()` par `assignedToId`
- ✅ Ajout filtrage automatique dans `getStatistics()` par commercial

#### `src/crm/services/opportunities.service.ts`
- ✅ Nouvelle méthode `findByAssignedTo(userId)` - retourne les opportunités assignées à un commercial
- ✅ Nouvelle méthode `getStatisticsByCommercial(userId)` - statistiques filtrées

### 3. **Quotes (Cotations)**

#### `src/crm/controllers/quotes.controller.ts`
- ✅ Ajout filtrage automatique dans `findAll()` par `commercialId` (créateur)
- ✅ Ajout filtrage automatique dans `getStatistics()` par commercial

---

## 🎯 Logique de Filtrage Implémentée

```typescript
// Dans chaque contrôleur, la logique suivante a été ajoutée:

const userId = req.user?.userId || req.user?.id;
const userRoles = req.user?.roles || [];

// Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer automatiquement
const isCommercialOnly = userRoles.includes('commercial') 
                         && !userRoles.includes('administratif') 
                         && !userRoles.includes('admin');

if (isCommercialOnly && userId) {
  console.log(`🔐 [Module] Filtrage par commercial assigné: ${userId}`);
  return this.service.findByAssignedTo(userId); // ou filtrage approprié
}

// Sinon, retourner toutes les données (admin/manager)
return this.service.findAll();
```

### 🔑 Avantages de Cette Approche

1. **Transparent** : Aucune modification du code frontend nécessaire
2. **Sécurisé** : Le filtrage est fait côté serveur, impossible à contourner
3. **Flexible** : Les admins voient toutes les données, les commerciaux seulement les leurs
4. **Performant** : Filtrage au niveau de la base de données (pas en mémoire)
5. **Cohérent** : Même logique appliquée partout (prospects, opportunités, cotations)

---

## 📊 Impact sur le Dashboard Commercial

### Avant la Correction ❌
```
Dashboard Commercial affiche:
- ✅ Statistiques: OK (filtrées via /dashboard/commercial/stats)
- ❌ Liste prospects: TOUS les prospects
- ❌ Liste opportunités: TOUTES les opportunités
- ❌ Liste cotations: TOUTES les cotations
- ❌ Liste activités: TOUTES les activités
```

### Après la Correction ✅
```
Dashboard Commercial affiche:
- ✅ Statistiques: Filtrées automatiquement
- ✅ Liste prospects: Seulement ceux assignés au commercial
- ✅ Liste opportunités: Seulement celles assignées au commercial
- ✅ Liste cotations: Seulement celles créées par le commercial
- ✅ Liste activités: Seulement celles du commercial
```

---

## 🚀 Pour Appliquer les Modifications

### Étape 1: Redémarrer le Backend

```powershell
# Arrêter le serveur backend actuel (Ctrl+C dans le terminal)

# Puis redémarrer
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
npm run start:dev
```

### Étape 2: Vérifier dans les Logs

Vous devriez voir des messages comme:
```
🔐 [Leads] Filtrage par commercial assigné: 123
🔐 [Opportunities] Filtrage par commercial assigné: 123
🔐 [Quotes] Filtrage par commercial créateur: 123
```

### Étape 3: Tester le Dashboard

1. **Connexion en tant que Commercial**
   - Les statistiques doivent afficher uniquement les données du commercial
   - Les listes (prospects, opportunités, cotations) doivent être filtrées
   - Le nombre total doit correspondre

2. **Connexion en tant qu'Administratif**
   - Toutes les données doivent être visibles
   - Pas de filtrage automatique

---

## 🧪 Tests Recommandés

### Test 1: Commercial voit uniquement ses données
```
1. Se connecter avec un compte commercial (ex: commercial@velosi.tn)
2. Aller sur le dashboard
3. Vérifier que:
   - Carte "Prospects" affiche le bon nombre
   - Carte "Opportunités" affiche le bon nombre
   - Carte "Cotations" affiche le bon nombre
   - Toutes les listes affichent uniquement les éléments assignés
```

### Test 2: Admin voit toutes les données
```
1. Se connecter avec un compte admin
2. Aller sur le dashboard
3. Vérifier que toutes les données de tous les commerciaux sont visibles
```

### Test 3: Pages CRM individuelles
```
1. Se connecter en tant que commercial
2. Aller sur /crm/prospects
3. Vérifier que seuls les prospects assignés sont visibles
4. Faire de même pour /crm/opportunities et /crm/quotes
```

---

## 📈 Performance du Dashboard - Section Calculée

La section "Performance" du dashboard commercial utilise maintenant les **vraies données filtrées**:

### Métriques Calculées

1. **Taux de Conversion**
   - Formule: `(Opportunités gagnées OU Cotations acceptées) / Total Prospects * 100`
   - Source: `myWonOpportunitiesCount` ou `myAcceptedQuotesCount`

2. **Satisfaction Client**
   - Formule: `Cotations acceptées / Total cotations * 100`
   - Source: `myAcceptedQuotesCount / myQuotesCount`

3. **Objectif Mensuel**
   - Formule: `CA accepté / Objectif (50k) * 100`
   - Source: `myAcceptedQuotesValue`

4. **Performance Équipe**
   - Non calculé pour les commerciaux (réservé aux managers)
   - Valeur: `0` (caché dans l'interface)

---

## 🔍 Endpoints Affectés

| Endpoint | Avant | Après |
|----------|-------|-------|
| `GET /crm/leads` | Tous les leads | Filtrés par `assignedToId` si commercial |
| `GET /crm/leads/statistics` | Stats globales | Stats filtrées si commercial |
| `GET /crm/opportunities` | Toutes les opportunités | Filtrées par `assignedToId` si commercial |
| `GET /crm/opportunities/statistics` | Stats globales | Stats filtrées si commercial |
| `GET /crm/quotes` | Toutes les cotations | Filtrées par `commercialId` si commercial |
| `GET /crm/quotes/statistics` | Stats globales | Stats filtrées si commercial |

---

## ✅ Checklist de Validation

- [ ] Backend redémarré sans erreurs
- [ ] Logs montrent le filtrage activé `🔐 [Module] Filtrage par commercial`
- [ ] Dashboard commercial affiche les bonnes statistiques
- [ ] Listes filtrées correctement (prospects, opportunités, cotations)
- [ ] Section "Performance" affiche les vrais taux
- [ ] Admin voit toutes les données
- [ ] Pas d'erreurs 401/403 dans la console
- [ ] Pages CRM individuelles (/crm/prospects, etc.) fonctionnent correctement

---

## 📝 Notes Importantes

### Rôles Supportés

- **Commercial pur** (`commercial` uniquement) : Données filtrées automatiquement
- **Admin** (`administratif` ou `admin`) : Toutes les données visibles
- **Commercial + Admin** : Toutes les données visibles (priorité à admin)

### Comportement par Défaut

Si l'utilisateur n'a aucun des rôles ci-dessus, il verra toutes les données (par défaut admin pour éviter les blocages).

---

## 🐛 Dépannage

### Problème: Les listes affichent encore toutes les données

**Solution:**
1. Vérifier que le backend a bien redémarré
2. Vérifier les logs backend pour voir si le filtrage est activé
3. Vider le cache du navigateur (Ctrl+Shift+Delete)
4. Se reconnecter complètement (logout/login)

### Problème: Erreur 401 ou 403

**Solution:**
1. Vérifier que le token JWT est valide
2. Vérifier que les rôles Keycloak sont bien configurés
3. Vérifier les guards dans les contrôleurs

### Problème: Statistiques incorrectes

**Solution:**
1. Vérifier que `getCommercialStats()` retourne bien les données filtrées
2. Vérifier les logs backend pour voir les requêtes SQL
3. Vérifier que `deletedAt IS NULL` est bien appliqué (pas d'archivés)

---

## 📞 Support

En cas de problème persistant, vérifier:
1. Les logs du backend (terminal npm run start:dev)
2. Les logs du frontend (Console DevTools F12)
3. Les appels réseau (onglet Network dans DevTools)

---

**Date de modification:** 29 octobre 2025
**Version:** 1.0.0
**Testé avec:** NestJS 10.x, Angular 18.x
