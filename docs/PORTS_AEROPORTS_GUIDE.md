# 🌍 Module Ports et Aéroports - Guide Complet

Ce guide vous explique comment utiliser le module de gestion des ports maritimes et aéroports.

---

## 📋 Table des Matières

1. [Installation](#installation)
2. [Structure de la Base de Données](#structure-de-la-base-de-données)
3. [Import des Données](#import-des-données)
4. [Utilisation du Frontend](#utilisation-du-frontend)
5. [API Backend](#api-backend)
6. [Maintenance](#maintenance)

---

## 🚀 Installation

### 1. Exécuter la Migration PostgreSQL

```bash
cd velosi-back
psql -U votre_utilisateur -d votre_base_de_données -f migrations/create_ports_aeroports_tables.sql
```

Ou via un client PostgreSQL (pgAdmin, DBeaver, etc.), exécutez le contenu du fichier `create_ports_aeroports_tables.sql`.

### 2. Installer les Dépendances (si nécessaire)

```bash
cd velosi-back
npm install axios papaparse
npm install --save-dev @types/papaparse
```

### 3. Démarrer le Backend

```bash
cd velosi-back
npm run start:dev
```

### 4. Démarrer le Frontend

```bash
cd velosi-front
ng serve
```

---

## 🗄️ Structure de la Base de Données

### Table: `ports`

| Colonne        | Type          | Description                      |
|----------------|---------------|----------------------------------|
| id             | SERIAL        | Clé primaire                     |
| libelle        | VARCHAR(200)  | Nom complet du port              |
| abbreviation   | VARCHAR(10)   | Code UN/LOCODE (unique)          |
| ville          | VARCHAR(100)  | Ville du port                    |
| pays           | VARCHAR(100)  | Pays du port                     |
| isactive       | BOOLEAN       | Statut actif/inactif             |
| createdat      | TIMESTAMP     | Date de création                 |
| updatedat      | TIMESTAMP     | Date de dernière modification    |

### Table: `aeroports`

| Colonne        | Type          | Description                      |
|----------------|---------------|----------------------------------|
| id             | SERIAL        | Clé primaire                     |
| libelle        | VARCHAR(200)  | Nom complet de l'aéroport        |
| abbreviation   | VARCHAR(10)   | Code IATA/ICAO (unique)          |
| ville          | VARCHAR(100)  | Ville de l'aéroport              |
| pays           | VARCHAR(100)  | Pays de l'aéroport               |
| isactive       | BOOLEAN       | Statut actif/inactif             |
| createdat      | TIMESTAMP     | Date de création                 |
| updatedat      | TIMESTAMP     | Date de dernière modification    |

---

## 📥 Import des Données

### Méthode 1: Données d'Exemple (Déjà Incluses)

La migration SQL inclut déjà des exemples de ports et aéroports principaux :
- **Ports**: ~30 ports majeurs (Tunisie, France, Europe, Asie, etc.)
- **Aéroports**: ~35 aéroports internationaux

Ces données sont insérées automatiquement lors de l'exécution de la migration.

### Méthode 2: Import Automatique via API

#### Importer les Aéroports depuis OpenFlights

```bash
curl -X POST http://localhost:3000/api/admin/import/aeroports/openflights \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

**Résultat**: ~7000 aéroports importés automatiquement

#### Importer les Aéroports depuis OurAirports (Plus Complet)

```bash
curl -X POST http://localhost:3000/api/admin/import/aeroports/ourairports \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

**Résultat**: ~55 000 aéroports (grands et moyens uniquement)

#### Nettoyer les Doublons

```bash
curl -X POST http://localhost:3000/api/admin/import/cleanup \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

#### Obtenir les Statistiques

```bash
curl -X GET http://localhost:3000/api/admin/import/stats \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

**Réponse**:
```json
{
  "totalPorts": 150,
  "activePorts": 145,
  "totalAeroports": 7500,
  "activeAeroports": 7300
}
```

### Méthode 3: Import Manuel via CSV

#### Pour les Aéroports

1. Téléchargez le fichier CSV d'OpenFlights:
   ```bash
   wget https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat
   ```

2. Importez via PostgreSQL:
   ```sql
   CREATE TEMP TABLE temp_airports (
       airport_id INT,
       name VARCHAR(200),
       city VARCHAR(100),
       country VARCHAR(100),
       iata VARCHAR(3),
       icao VARCHAR(4),
       latitude DECIMAL,
       longitude DECIMAL,
       altitude INT,
       timezone INT,
       dst VARCHAR(1),
       tz VARCHAR(50),
       type VARCHAR(20),
       source VARCHAR(20)
   );

   COPY temp_airports FROM '/chemin/vers/airports.dat' DELIMITER ',' CSV;

   INSERT INTO aeroports (libelle, abbreviation, ville, pays, isactive)
   SELECT name, iata, city, country, true
   FROM temp_airports
   WHERE iata IS NOT NULL AND iata != ''
   ON CONFLICT (abbreviation) DO NOTHING;

   DROP TABLE temp_airports;
   ```

---

## 💻 Utilisation du Frontend

### Accéder à la Page

Naviguez vers: **Données de référence > Ports & Aéroports**

### Fonctionnalités Disponibles

#### 1. **Affichage Unifié**
- Visualisation des ports ET aéroports dans une seule page
- Statistiques en temps réel (nombre de ports, aéroports, total)

#### 2. **Filtres Avancés**
- **Type**: Afficher tous / ports uniquement / aéroports uniquement
- **Recherche**: Par nom, code, ville ou pays
- **Statut**: Actifs / Inactifs / Tous
- Bouton de réinitialisation des filtres

#### 3. **Créer un Port ou Aéroport**
- Bouton **"Nouveau Port"** (bleu)
- Bouton **"Nouvel Aéroport"** (orange)
- Formulaire avec validation:
  - Libellé (requis)
  - Code UN/LOCODE ou IATA/ICAO (requis, unique)
  - Ville (optionnel)
  - Pays (requis)
  - Statut actif/inactif

#### 4. **Modifier un Port ou Aéroport**
- Cliquez sur une ligne du tableau
- OU cliquez sur le bouton "Modifier" (icône crayon)
- Le type (port/aéroport) ne peut pas être changé en mode édition

#### 5. **Activer/Désactiver**
- Cliquez sur le bouton œil/œil barré
- Confirmation requise

#### 6. **Supprimer**
- Cliquez sur le bouton poubelle
- Confirmation requise (action irréversible)

#### 7. **Pagination**
- 10 éléments par page
- Navigation fluide entre les pages

---

## 🔌 API Backend

### Endpoints Ports

#### GET `/api/ports`
Récupérer tous les ports avec pagination et filtres

**Query Parameters:**
- `page` (number): Numéro de page (défaut: 1)
- `limit` (number): Éléments par page (défaut: 10)
- `search` (string): Recherche textuelle
- `ville` (string): Filtrer par ville
- `pays` (string): Filtrer par pays
- `isActive` (boolean): Filtrer par statut

**Exemple:**
```bash
GET /api/ports?page=1&limit=20&search=tunis&isActive=true
```

#### GET `/api/ports/:id`
Récupérer un port par ID

#### POST `/api/ports`
Créer un nouveau port

**Body:**
```json
{
  "libelle": "Port de Radès",
  "abbreviation": "TNRAD",
  "ville": "Radès",
  "pays": "Tunisie",
  "isActive": true
}
```

#### PUT `/api/ports/:id`
Mettre à jour un port

#### PUT `/api/ports/:id/toggle-active`
Basculer le statut actif/inactif

#### DELETE `/api/ports/:id`
Supprimer un port

### Endpoints Aéroports

Mêmes endpoints que pour les ports, mais avec `/api/aeroports`

#### GET `/api/aeroports`
#### GET `/api/aeroports/:id`
#### POST `/api/aeroports`
#### PUT `/api/aeroports/:id`
#### PUT `/api/aeroports/:id/toggle-active`
#### DELETE `/api/aeroports/:id`

### Endpoints d'Import (Admin)

#### POST `/api/admin/import/aeroports/openflights`
Importer depuis OpenFlights (~7000 aéroports)

#### POST `/api/admin/import/aeroports/ourairports`
Importer depuis OurAirports (~55 000 aéroports)

#### POST `/api/admin/import/cleanup`
Nettoyer les doublons

#### GET `/api/admin/import/stats`
Obtenir les statistiques

---

## 🛠️ Maintenance

### Mise à Jour des Données

**Recommandation**: Mettre à jour les données tous les 3-6 mois

```bash
# 1. Sauvegarder la base actuelle
pg_dump -U user -d database -t ports > backup_ports.sql
pg_dump -U user -d database -t aeroports > backup_aeroports.sql

# 2. Lancer l'import
curl -X POST http://localhost:3000/api/admin/import/aeroports/ourairports \
  -H "Authorization: Bearer TOKEN"

# 3. Nettoyer les doublons
curl -X POST http://localhost:3000/api/admin/import/cleanup \
  -H "Authorization: Bearer TOKEN"
```

### Monitoring

#### Vérifier le nombre d'enregistrements

```sql
SELECT 
  'Ports' as type, 
  COUNT(*) as total, 
  SUM(CASE WHEN isactive THEN 1 ELSE 0 END) as actifs
FROM ports
UNION ALL
SELECT 
  'Aéroports' as type, 
  COUNT(*) as total, 
  SUM(CASE WHEN isactive THEN 1 ELSE 0 END) as actifs
FROM aeroports;
```

#### Trouver les doublons

```sql
-- Ports en doublon
SELECT abbreviation, COUNT(*) 
FROM ports 
GROUP BY abbreviation 
HAVING COUNT(*) > 1;

-- Aéroports en doublon
SELECT abbreviation, COUNT(*) 
FROM aeroports 
GROUP BY abbreviation 
HAVING COUNT(*) > 1;
```

### Performance

Pour optimiser les performances sur de grandes tables :

```sql
-- Analyser les tables
ANALYZE ports;
ANALYZE aeroports;

-- Reconstruire les index
REINDEX TABLE ports;
REINDEX TABLE aeroports;

-- Vacuum (nettoyage)
VACUUM ANALYZE ports;
VACUUM ANALYZE aeroports;
```

---

## 📊 Statistiques et Rapports

### Nombre de Ports/Aéroports par Pays

```sql
SELECT pays, COUNT(*) as total
FROM (
  SELECT pays FROM ports WHERE isactive = true
  UNION ALL
  SELECT pays FROM aeroports WHERE isactive = true
) as combined
GROUP BY pays
ORDER BY total DESC
LIMIT 20;
```

### Top 10 Villes avec le Plus d'Infrastructures

```sql
SELECT ville, 
       SUM(CASE WHEN type = 'port' THEN 1 ELSE 0 END) as ports,
       SUM(CASE WHEN type = 'aeroport' THEN 1 ELSE 0 END) as aeroports,
       COUNT(*) as total
FROM (
  SELECT ville, 'port' as type FROM ports WHERE isactive = true
  UNION ALL
  SELECT ville, 'aeroport' as type FROM aeroports WHERE isactive = true
) as combined
GROUP BY ville
ORDER BY total DESC
LIMIT 10;
```

---

## 🔐 Sécurité

- ✅ Tous les endpoints sont protégés par JWT (`@UseGuards(JwtAuthGuard)`)
- ✅ Les endpoints d'import sont réservés aux administrateurs
- ✅ Validation des données via DTOs (class-validator)
- ✅ Contraintes d'unicité sur les codes (abbreviation)
- ✅ Soft delete disponible via le champ `isActive`

---

## 🐛 Dépannage

### Problème: "duplicate key value violates unique constraint"

**Solution**: Un code (abbreviation) existe déjà
```sql
-- Trouver le doublon
SELECT * FROM ports WHERE abbreviation = 'VOTRE_CODE';
SELECT * FROM aeroports WHERE abbreviation = 'VOTRE_CODE';

-- Supprimer ou modifier
DELETE FROM ports WHERE id = XXX;
```

### Problème: Import très lent

**Solution**: Désactiver temporairement les index
```sql
-- Avant l'import
DROP INDEX idx_ports_abbreviation;
DROP INDEX idx_aeroports_abbreviation;

-- Après l'import
CREATE UNIQUE INDEX idx_ports_abbreviation ON ports(abbreviation);
CREATE UNIQUE INDEX idx_aeroports_abbreviation ON aeroports(abbreviation);
```

---

## 📚 Ressources Supplémentaires

- **Documentation API**: `/api/docs` (Swagger)
- **APIs Publiques**: Voir `APIS_PORTS_AEROPORTS.md`
- **Migration SQL**: `migrations/create_ports_aeroports_tables.sql`

---

## ✅ Checklist Post-Installation

- [ ] Migration SQL exécutée avec succès
- [ ] Tables `ports` et `aeroports` créées
- [ ] Données d'exemple présentes
- [ ] Backend démarré sans erreurs
- [ ] Frontend accessible
- [ ] Page "Ports & Aéroports" fonctionnelle
- [ ] Création/Modification/Suppression testées
- [ ] Import automatique testé (optionnel)
- [ ] Statistiques correctes

---

**Besoin d'aide ?** Consultez les logs du backend ou le Swagger UI à `/api/docs`
