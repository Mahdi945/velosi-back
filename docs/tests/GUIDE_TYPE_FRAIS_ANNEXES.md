# 📋 Guide d'implémentation - Types de Frais Annexes Dynamiques

## ✅ Résumé des modifications

Cette fonctionnalité permet de gérer dynamiquement les types de frais annexes dans les cotations, au lieu d'utiliser une liste statique codée en dur.

---

## 🗄️ 1. BASE DE DONNÉES

### Migration SQL à exécuter

Exécuter le fichier : `MIGRATION_TYPE_FRAIS_ANNEXES.sql`

```bash
# Connexion à PostgreSQL (Railway, Supabase, ou local)
psql -h <host> -U <user> -d <database> -f MIGRATION_TYPE_FRAIS_ANNEXES.sql
```

**Exemple pour Supabase:**
```bash
psql "postgresql://postgres.xxxxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" -f MIGRATION_TYPE_FRAIS_ANNEXES.sql
```

### Ce que fait la migration

1. ✅ Crée la table `type_frais_annexes` avec :
   - `id` : Identifiant unique auto-incrémenté
   - `description` : Description du type (unique, max 200 caractères)
   - `is_active` : Indicateur actif/inactif (défaut: true)
   - `created_at` : Date de création
   - `updated_at` : Date de mise à jour

2. ✅ Insère les 18 types existants depuis l'ancien `fraisAnnexesList`

3. ✅ Crée un index sur `is_active` pour les performances

4. ✅ Ajoute un trigger pour mettre à jour automatiquement `updated_at`

---

## 🔧 2. BACKEND (NestJS)

### Fichiers créés

#### Entité TypeORM
- `src/crm/entities/type-frais-annexe.entity.ts`

#### DTOs
- `src/crm/dto/type-frais-annexe.dto.ts`

#### Service
- `src/crm/services/type-frais-annexe.service.ts`

#### Controller
- `src/crm/controllers/type-frais-annexe.controller.ts`

### Fichiers modifiés

#### Module
- `src/modules/crm/quote.module.ts`
  - Ajout de `TypeFraisAnnexe` dans les entités
  - Ajout de `TypeFraisAnnexeService` et `TypeFraisAnnexeController`

#### Configuration BDD
- `src/config/database.config.ts`
  - Ajout de `TypeFraisAnnexe` dans la liste des entités

---

## 📡 API Endpoints

### Pour tous les utilisateurs (authentifiés)

#### GET `/crm/type-frais-annexes/active`
Récupère tous les types de frais annexes actifs

**Réponse:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "description": "Frais de douane",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    ...
  ]
}
```

### Pour les administrateurs uniquement

#### GET `/crm/type-frais-annexes`
Récupère tous les types (actifs et inactifs)

#### POST `/crm/type-frais-annexes`
Créer un nouveau type

**Body:**
```json
{
  "description": "Frais de transit",
  "isActive": true
}
```

#### PUT `/crm/type-frais-annexes/:id`
Mettre à jour un type

**Body:**
```json
{
  "description": "Nouveau nom",
  "isActive": false
}
```

#### PATCH `/crm/type-frais-annexes/:id/activate`
Activer un type

#### PATCH `/crm/type-frais-annexes/:id/deactivate`
Désactiver un type

#### DELETE `/crm/type-frais-annexes/:id`
Supprimer définitivement un type

---

## 🎨 3. FRONTEND (Angular)

### Fichiers créés

#### Interface
- `src/app/interfaces/type-frais-annexe.interface.ts`

#### Service
- `src/app/services/crm/type-frais-annexe.service.ts`

### Fichiers modifiés

#### Composant Quotes
- `src/app/components/crm/quotes/quotes/quotes.component.ts`
  - Ajout de `TypeFraisAnnexeService` dans le constructeur
  - Remplacement de `fraisAnnexesList` (array statique) par `typeFraisAnnexesList` (data dynamique)
  - Ajout de la méthode `loadTypeFraisAnnexes()`
  - Ajout des méthodes pour gérer l'ajout de nouveaux types

#### Template Quotes
- `src/app/components/crm/quotes/quotes/quotes.component.html`
  - Modification du `<select>` pour utiliser `typeFraisAnnexesList`
  - Ajout d'un bouton `+` pour ajouter un nouveau type
  - Ajout du modal d'ajout de type

---

## 🚀 4. DÉPLOIEMENT

### Étape 1: Exécuter la migration SQL

```bash
# Se connecter à la base de données de production
psql <connection_string> -f MIGRATION_TYPE_FRAIS_ANNEXES.sql
```

### Étape 2: Déployer le backend

```bash
cd velosi-back
npm run build
# Redémarrer le serveur (Railway redémarre automatiquement)
```

### Étape 3: Déployer le frontend

```bash
cd velosi-front
npm run build
# Déployer sur Vercel
vercel --prod
```

---

## 📝 5. UTILISATION

### Pour les utilisateurs (Commerciaux)

1. **Créer/Modifier une cotation**
2. **Ajouter une ligne de type "Frais Annexe"**
3. **Sélectionner un type** dans la liste déroulante
4. **OU cliquer sur le bouton `+`** pour ajouter un nouveau type
5. Le nouveau type sera immédiatement disponible pour toutes les cotations

### Pour les administrateurs

Les administrateurs peuvent également :
- Gérer tous les types via l'API REST
- Activer/désactiver des types
- Modifier les descriptions
- Supprimer définitivement des types

---

## 🧪 6. TESTS

### Test Backend

```bash
# Tester l'endpoint GET active
curl -H "Authorization: Bearer <token>" http://localhost:3000/crm/type-frais-annexes/active

# Tester la création (admin uniquement)
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"description":"Test Frais","isActive":true}' \
  http://localhost:3000/crm/type-frais-annexes
```

### Test Frontend

1. Ouvrir l'application
2. Aller dans **CRM > Cotations**
3. Cliquer sur **Nouvelle cotation**
4. Ajouter une ligne **Frais Annexe**
5. Vérifier que la liste déroulante contient les types
6. Cliquer sur le bouton **`+`**
7. Ajouter un nouveau type "Test"
8. Vérifier qu'il apparaît immédiatement dans la liste

---

## ⚠️ 7. NOTES IMPORTANTES

### Contraintes

- La description doit être **unique** (pas de doublons)
- Longueur : **3 à 200 caractères**
- Un type ne peut pas être supprimé s'il est utilisé dans des cotations existantes (à implémenter si nécessaire)

### Performance

- Index créé sur `is_active` pour améliorer les performances
- Les types inactifs ne sont pas retournés dans la liste déroulante

### Sécurité

- Seuls les **administrateurs** peuvent créer/modifier/supprimer des types
- Les **commerciaux** peuvent uniquement consulter et utiliser les types actifs

---

## 🔄 8. MIGRATION DES DONNÉES EXISTANTES

Si des cotations existent avec l'ancien système (champ texte libre), elles continueront de fonctionner. La description est stockée directement dans `quote_items.description`.

---

## 📞 Support

En cas de problème:
1. Vérifier les logs backend: `Railway logs`
2. Vérifier les logs frontend: Console navigateur
3. Vérifier que la migration SQL a bien été exécutée
4. Vérifier les permissions Keycloak (rôle admin pour la gestion)

---

✅ **Implémentation terminée avec succès !**
