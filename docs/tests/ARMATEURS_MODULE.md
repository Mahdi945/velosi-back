# Module Armateurs - Documentation Complète

## Vue d'ensemble

Le module **Armateurs** gère les compagnies maritimes (armateurs) dans l'ERP Velosi. Il permet de gérer les informations des armateurs, leurs coordonnées, tarifs et statuts.

## Architecture

### Backend (NestJS)

#### Structure des fichiers
```
velosi-back/
├── src/
│   ├── entities/
│   │   └── armateur.entity.ts          # Entité TypeORM
│   ├── dto/
│   │   ├── create-armateur.dto.ts      # DTO de création
│   │   └── update-armateur.dto.ts      # DTO de mise à jour
│   ├── services/
│   │   └── armateurs.service.ts        # Service métier
│   ├── controllers/
│   │   └── armateurs.controller.ts     # Contrôleur REST
│   └── modules/
│       └── armateurs.module.ts         # Module NestJS
└── migrations/
    └── create_armateurs_table.sql      # Script de création de table
```

### Frontend (Angular)

#### Structure des fichiers
```
velosi-front/
└── src/
    └── app/
        ├── models/
        │   └── armateur.interface.ts   # Interface TypeScript
        ├── services/
        │   └── armateurs.service.ts    # Service HTTP
        └── components/
            └── gestion-ressources/
                └── armateurs/
                    ├── armateurs.component.ts    # Composant
                    ├── armateurs.component.html  # Template
                    └── armateurs.component.scss  # Styles
```

## Base de données

### Table: armateurs

```sql
CREATE TABLE armateurs (
  id SERIAL PRIMARY KEY,
  
  -- Informations de base
  code VARCHAR(10) NOT NULL UNIQUE,
  nom VARCHAR(100) NOT NULL,
  abreviation VARCHAR(10),
  
  -- Coordonnées
  adresse VARCHAR(255),
  ville VARCHAR(100),
  pays VARCHAR(100) DEFAULT 'France',
  codePostal VARCHAR(20),
  
  -- Contacts
  telephone VARCHAR(20),
  telephoneSecondaire VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(100),
  siteWeb VARCHAR(150),
  
  -- Tarifs
  tarif20Pieds DECIMAL(10, 2) DEFAULT 0.00,
  tarif40Pieds DECIMAL(10, 2) DEFAULT 0.00,
  tarif45Pieds DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Informations complémentaires
  logo TEXT,
  notes TEXT,
  
  -- Gestion du statut
  isActive BOOLEAN DEFAULT TRUE,
  
  -- Métadonnées
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  createdBy INTEGER,
  updatedBy INTEGER
);
```

### Indexes
- `idx_armateurs_code` : Index sur le code (recherche rapide)
- `idx_armateurs_nom` : Index sur le nom (recherche rapide)
- `idx_armateurs_isActive` : Index sur le statut
- `idx_armateurs_ville` : Index sur la ville
- `idx_armateurs_pays` : Index sur le pays

### Triggers
- `trigger_update_armateurs_timestamp` : Met à jour automatiquement `updatedAt`

## API REST

### Endpoints

#### 1. Créer un armateur
```
POST /armateurs
Content-Type: application/json

{
  "code": "MSC",
  "nom": "Mediterranean Shipping Company",
  "abreviation": "MSC",
  "ville": "Genève",
  "pays": "Suisse",
  "telephone": "+41 22 703 8888",
  "email": "contact@msc.com",
  "siteWeb": "https://www.msc.com",
  "tarif20Pieds": 1200,
  "tarif40Pieds": 2200,
  "tarif45Pieds": 2500
}

Response: 201 Created
```

#### 2. Liste des armateurs avec pagination et filtres
```
GET /armateurs?page=1&limit=10&search=maersk&ville=Copenhagen&pays=Danemark&isActive=true

Response: 200 OK
{
  "data": [...],
  "total": 5,
  "page": 1,
  "limit": 10
}
```

#### 3. Obtenir un armateur par ID
```
GET /armateurs/:id

Response: 200 OK
```

#### 4. Obtenir un armateur par code
```
GET /armateurs/code/:code

Response: 200 OK
```

#### 5. Mettre à jour un armateur
```
PUT /armateurs/:id
Content-Type: application/json

{
  "nom": "Mediterranean Shipping Company SA",
  "tarif20Pieds": 1250
}

Response: 200 OK
```

#### 6. Activer/Désactiver un armateur
```
PUT /armateurs/:id/toggle-active

Response: 200 OK
```

#### 7. Supprimer un armateur
```
DELETE /armateurs/:id

Response: 204 No Content
```

#### 8. Obtenir les statistiques
```
GET /armateurs/stats

Response: 200 OK
{
  "total": 50,
  "actifs": 45,
  "inactifs": 5,
  "parPays": [
    { "pays": "France", "count": 15 },
    { "pays": "Suisse", "count": 10 }
  ]
}
```

#### 9. Liste des villes
```
GET /armateurs/villes

Response: 200 OK
["Marseille", "Genève", "Copenhagen", ...]
```

#### 10. Liste des pays
```
GET /armateurs/pays

Response: 200 OK
["France", "Suisse", "Danemark", ...]
```

## Fonctionnalités Frontend

### 1. Liste des armateurs
- Affichage paginé (10 par page par défaut)
- Recherche en temps réel (code, nom, ville, pays)
- Filtres : ville, pays, statut
- Tri par nom
- Indicateur de statut (actif/inactif)
- Affichage des tarifs formatés en euros

### 2. Création d'armateur
- Modal de formulaire
- Validation des champs obligatoires (code, nom)
- Champs organisés par sections :
  - Informations de base
  - Coordonnées
  - Contacts
  - Tarifs
  - Informations complémentaires

### 3. Modification d'armateur
- Modal de formulaire pré-rempli
- Code non modifiable
- Validation des données
- Mise à jour partielle

### 4. Activation/Désactivation
- Modal de confirmation
- Changement de statut sans suppression
- Conservation des données

### 5. Suppression
- Modal de confirmation avec avertissement
- Suppression définitive
- Message de confirmation

### 6. Modals de feedback
- Modal de succès (vert)
- Modal d'erreur (rouge)
- Modal de confirmation (selon l'action)

## Validation des données

### Backend (Class Validator)
- `code` : String, max 10 caractères, unique, requis
- `nom` : String, max 100 caractères, requis
- `email` : Format email valide
- `tarifs` : Nombres décimaux >= 0

### Frontend (Angular)
- Validation en temps réel
- Désactivation du bouton si formulaire invalide
- Messages d'erreur clairs

## Gestion des erreurs

### Codes d'erreur
- `409 Conflict` : Code armateur déjà existant
- `404 Not Found` : Armateur introuvable
- `400 Bad Request` : Données invalides
- `500 Internal Server Error` : Erreur serveur

### Messages utilisateur
- Messages clairs et en français
- Détails de l'erreur affichés
- Possibilité de réessayer

## Installation et configuration

### 1. Base de données
```bash
# Exécuter le script SQL
psql -U postgres -d velosi_db -f migrations/create_armateurs_table.sql
```

### 2. Backend
Le module est automatiquement chargé via `AppModule`.

### 3. Frontend
Aucune configuration supplémentaire nécessaire. Le service utilise l'URL de l'API définie dans `environment.ts`.

## Tests

### Données de test
Le script SQL inclut 5 armateurs de test :
- MSC (Mediterranean Shipping Company)
- MAERSK (Maersk Line)
- CMA-CGM (CMA CGM Group)
- COSCO (COSCO Shipping Lines)
- HAPAG (Hapag-Lloyd)

### Tests manuels
1. Créer un nouvel armateur
2. Rechercher par code/nom
3. Filtrer par ville/pays
4. Modifier les tarifs
5. Désactiver un armateur
6. Réactiver un armateur
7. Supprimer un armateur

## Améliorations futures

### Phase 1
- [ ] Export Excel/PDF
- [ ] Import CSV
- [ ] Historique des modifications

### Phase 2
- [ ] Upload de logo
- [ ] Documents attachés
- [ ] Contrats et accords

### Phase 3
- [ ] Intégration avec module Booking
- [ ] Calcul automatique des coûts
- [ ] Comparaison des tarifs

## Points d'attention

1. **Unicité du code** : Le code doit être unique et ne peut pas être modifié après création
2. **Tarifs** : Les tarifs sont en euros par défaut
3. **Soft delete** : Utiliser la désactivation plutôt que la suppression
4. **Performance** : Index sur les colonnes de recherche fréquente

## Support

Pour toute question ou problème :
1. Vérifier les logs backend (NestJS)
2. Vérifier la console frontend (DevTools)
3. Consulter cette documentation
4. Contacter l'équipe de développement

---

**Date de création** : 29 octobre 2025  
**Version** : 1.0.0  
**Auteur** : Équipe Velosi
