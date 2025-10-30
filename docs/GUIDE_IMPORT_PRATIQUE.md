# 🚀 Guide Pratique : Import Automatique des Données

## 📦 Dépendances Installées ✅

Les packages suivants ont été installés avec succès :
- ✅ `axios` - Pour télécharger les données depuis les APIs
- ✅ `papaparse` - Pour parser les fichiers CSV
- ✅ `@types/papaparse` - Types TypeScript pour papaparse

---

## 🎯 Comment Importer les Données d'Aéroports

### Méthode 1 : Via API REST (Recommandé)

#### Étape 1 : Démarrer le Backend

```powershell
cd velosi-back
npm run start:dev
```

#### Étape 2 : Se Connecter et Obtenir un Token JWT

Connectez-vous à votre application et récupérez le token JWT depuis :
- Les DevTools du navigateur (onglet Application > Local Storage)
- Ou depuis la réponse de login

#### Étape 3 : Importer les Aéroports

**Option A : OpenFlights (~7000 aéroports)**

```powershell
# Remplacez VOTRE_TOKEN_JWT par votre vrai token
curl -X POST http://localhost:3000/api/admin/import/aeroports/openflights -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

**Exemple avec un vrai token :**
```powershell
curl -X POST http://localhost:3000/api/admin/import/aeroports/openflights -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Option B : OurAirports (~55 000 aéroports - Plus complet)**

```powershell
curl -X POST http://localhost:3000/api/admin/import/aeroports/ourairports -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

#### Étape 4 : Vérifier les Statistiques

```powershell
curl -X GET http://localhost:3000/api/admin/import/stats -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

**Résultat attendu :**
```json
{
  "totalPorts": 30,
  "activePorts": 30,
  "totalAeroports": 7500,
  "activeAeroports": 7500
}
```

#### Étape 5 : Nettoyer les Doublons (Optionnel)

```powershell
curl -X POST http://localhost:3000/api/admin/import/cleanup -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

---

### Méthode 2 : Via Postman (Plus Simple)

#### 1. Ouvrir Postman

#### 2. Créer une Nouvelle Requête

**Importer OpenFlights :**
- **Méthode** : `POST`
- **URL** : `http://localhost:3000/api/admin/import/aeroports/openflights`
- **Headers** :
  - Key: `Authorization`
  - Value: `Bearer VOTRE_TOKEN_JWT`

#### 3. Cliquer sur "Send"

Vous verrez une réponse comme :
```json
{
  "success": 6837,
  "errors": 12,
  "message": "Import réussi: 6837 aéroports importés, 12 erreurs"
}
```

---

### Méthode 3 : Via l'Interface Frontend (À Implémenter)

Vous pouvez créer une page d'administration dans le frontend :

**Exemple de bouton dans le composant :**

```typescript
// Dans ports-aeroports.component.ts
importAeroports(): void {
  this.loading = true;
  this.http.post('/api/admin/import/aeroports/ourairports', {})
    .subscribe({
      next: (result: any) => {
        this.showSuccess(`${result.success} aéroports importés !`);
        this.loadData();
      },
      error: (error) => {
        this.showError('Erreur lors de l\'import');
      }
    });
}
```

---

## 📊 Fonctionnement Détaillé de l'ImportDataService

### 1. ImportDataService - Le Chef d'Orchestre

**Fichier :** `velosi-back/src/services/import-data.service.ts`

**Ce qu'il fait :**

```
┌─────────────────────────────────────────────┐
│   ImportDataService                         │
├─────────────────────────────────────────────┤
│                                             │
│  1. Télécharge le CSV depuis l'API         │
│     ↓                                       │
│  2. Parse le CSV (ligne par ligne)         │
│     ↓                                       │
│  3. Valide les données (codes IATA, etc.)  │
│     ↓                                       │
│  4. Vérifie si déjà existant               │
│     ↓                                       │
│  5. Insère dans PostgreSQL                 │
│     ↓                                       │
│  6. Retourne statistiques (succès/erreurs) │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Exemple Concret d'Import

**Étape par Étape :**

#### Téléchargement
```typescript
const url = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';
const response = await axios.get(url);
```

#### Parsing du CSV
```typescript
// Ligne du CSV :
// 507,"London Heathrow Airport","London","United Kingdom","LHR","EGLL",-0.461941,51.4706,-11,0,"E","Europe/London","airport","OurAirports"

// Après parsing :
{
  id: 507,
  name: "London Heathrow Airport",
  city: "London",
  country: "United Kingdom",
  iata: "LHR",
  icao: "EGLL"
}
```

#### Validation
```typescript
if (!iata || iata === '\\N' || iata.length !== 3) continue;
// On ignore les aéroports sans code IATA valide
```

#### Vérification d'Existence
```typescript
const existing = await this.aeroportRepository.findOne({
  where: { abbreviation: 'LHR' }
});

if (!existing) {
  // On insère seulement si n'existe pas déjà
}
```

#### Insertion
```typescript
await this.aeroportRepository.save({
  libelle: "London Heathrow Airport",
  abbreviation: "LHR",
  ville: "London",
  pays: "United Kingdom",
  isActive: true
});
```

---

## 🔍 Vérifier les Données Importées

### Via PostgreSQL

```sql
-- Compter les aéroports
SELECT COUNT(*) FROM aeroports;

-- Voir les 10 premiers
SELECT * FROM aeroports ORDER BY libelle LIMIT 10;

-- Aéroports par pays
SELECT pays, COUNT(*) as total 
FROM aeroports 
GROUP BY pays 
ORDER BY total DESC 
LIMIT 10;
```

### Via le Frontend

1. Ouvrez l'application : `http://localhost:4200`
2. Naviguez vers : **Données de référence > Ports & Aéroports**
3. Filtrez par type : **Aéroports uniquement**
4. Vous devriez voir tous les aéroports importés !

---

## 🎬 Scénario Complet d'Utilisation

### Scénario 1 : Première Installation

```powershell
# 1. Créer les tables
cd velosi-back
psql -U postgres -d velosi_db -f migrations/create_ports_aeroports_tables.sql

# 2. Démarrer le backend
npm run start:dev

# 3. Dans un autre terminal, importer les données
# (Remplacez TOKEN par votre vrai token JWT après connexion)
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Importer les aéroports
curl -X POST http://localhost:3000/api/admin/import/aeroports/ourairports -H "Authorization: Bearer $token"

# Vérifier les stats
curl -X GET http://localhost:3000/api/admin/import/stats -H "Authorization: Bearer $token"
```

### Scénario 2 : Mise à Jour Mensuelle

```powershell
# 1. Sauvegarder avant mise à jour
pg_dump -U postgres -d velosi_db -t aeroports > backup_aeroports.sql

# 2. Importer les nouvelles données
curl -X POST http://localhost:3000/api/admin/import/aeroports/ourairports -H "Authorization: Bearer $token"

# 3. Nettoyer les doublons
curl -X POST http://localhost:3000/api/admin/import/cleanup -H "Authorization: Bearer $token"
```

---

## 📝 Sources de Données Disponibles

### Pour les Aéroports

| Source | URL | Nombre | Qualité |
|--------|-----|--------|---------|
| **OpenFlights** | https://openflights.org/data.html | ~7 000 | ⭐⭐⭐ |
| **OurAirports** | https://ourairports.com/data/ | ~55 000 | ⭐⭐⭐⭐⭐ |

### Pour les Ports (Manuel uniquement pour l'instant)

| Source | URL | Nombre | Qualité |
|--------|-----|--------|---------|
| **UN/LOCODE** | https://unece.org/trade/cefact/unlocode | ~100 000 | ⭐⭐⭐⭐⭐ |
| **World Port Index** | https://msi.nga.mil/Publications/WPI | ~3 700 | ⭐⭐⭐⭐ |

---

## ⚠️ Points d'Attention

### 1. Token JWT
- Le token expire après un certain temps (généralement 1h-24h)
- Si vous obtenez une erreur 401, reconnectez-vous pour obtenir un nouveau token

### 2. Temps d'Import
- **OpenFlights** : ~30 secondes
- **OurAirports** : ~2-3 minutes (beaucoup plus de données)

### 3. Doublons
- Les codes IATA sont **uniques** (contrainte dans la base)
- Si un aéroport existe déjà, il sera **ignoré** (pas d'erreur)
- Utilisez l'endpoint `/cleanup` pour supprimer les vrais doublons

### 4. Mémoire
- Pour OurAirports (55 000 aéroports), assurez-vous d'avoir suffisamment de RAM
- Le processus peut prendre quelques minutes

---

## 🐛 Dépannage

### Erreur : "Cannot find module 'axios'"

**Solution :**
```powershell
npm install axios papaparse --legacy-peer-deps
```

### Erreur : "duplicate key value violates unique constraint"

**Solution :** Un aéroport avec ce code IATA existe déjà
```sql
-- Voir lequel
SELECT * FROM aeroports WHERE abbreviation = 'JFK';

-- Le supprimer si besoin
DELETE FROM aeroports WHERE abbreviation = 'JFK';
```

### Erreur : "Unauthorized" (401)

**Solution :** Votre token JWT est expiré ou invalide
- Reconnectez-vous à l'application
- Récupérez un nouveau token

### Import Très Lent

**Solution :** Désactivez temporairement les index
```sql
-- Avant l'import
DROP INDEX idx_aeroports_abbreviation;

-- Lancer l'import

-- Après l'import
CREATE UNIQUE INDEX idx_aeroports_abbreviation ON aeroports(abbreviation);
```

---

## ✅ Checklist de Vérification

Après l'import, vérifiez :

- [ ] Les données sont présentes : `SELECT COUNT(*) FROM aeroports;`
- [ ] Pas de doublons : Endpoint `/cleanup`
- [ ] Frontend affiche les données : Page "Ports & Aéroports"
- [ ] Recherche fonctionne : Testez avec "Paris" ou "London"
- [ ] Filtres fonctionnent : "Aéroports uniquement"

---

## 📞 Commandes Utiles

```powershell
# Voir les logs en temps réel
npm run start:dev

# Tester la connexion
curl http://localhost:3000/api/aeroports

# Compter les aéroports
psql -U postgres -d velosi_db -c "SELECT COUNT(*) FROM aeroports;"

# Voir les derniers importés
psql -U postgres -d velosi_db -c "SELECT * FROM aeroports ORDER BY createdat DESC LIMIT 10;"
```

---

**Tout est prêt ! 🎉** Vous pouvez maintenant importer automatiquement des milliers d'aéroports dans votre base de données.

cd "c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

# Récupérez d'abord votre token (dans la console browser)
# Puis lancez :
.\import-data.ps1 -Token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJtYWhkaTQ1IiwiZW1haWwiOiJtYWhkaWJleXlAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmF0aWYiLCJ1c2VyVHlwZSI6InBlcnNvbm5lbCIsImlhdCI6MTc2MTgxNzk3OSwiZXhwIjoxNzYxODQ2Nzc5LCJhdWQiOiJ2ZWxvc2ktdXNlcnMiLCJpc3MiOiJ2ZWxvc2ktZXJwIn0.8O0EHARj3IWxUUvqViV8Y8CdPMaL5sJEDkcPQVrFj8A" -Source "openflights"

# Ou pour OurAirports :
.\import-data.ps1 -Token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJtYWhkaTQ1IiwiZW1haWwiOiJtYWhkaWJleXlAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmF0aWYiLCJ1c2VyVHlwZSI6InBlcnNvbm5lbCIsImlhdCI6MTc2MTgxNzk3OSwiZXhwIjoxNzYxODQ2Nzc5LCJhdWQiOiJ2ZWxvc2ktdXNlcnMiLCJpc3MiOiJ2ZWxvc2ktZXJwIn0.8O0EHARj3IWxUUvqViV8Y8CdPMaL5sJEDkcPQVrFj8A" -Source "ourairports"

# Ou les deux :
.\import-data.ps1 -Token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJtYWhkaTQ1IiwiZW1haWwiOiJtYWhkaWJleXlAZ21haWwuY29tIiwicm9sZSI6ImFkbWluaXN0cmF0aWYiLCJ1c2VyVHlwZSI6InBlcnNvbm5lbCIsImlhdCI6MTc2MTgxNzk3OSwiZXhwIjoxNzYxODQ2Nzc5LCJhdWQiOiJ2ZWxvc2ktdXNlcnMiLCJpc3MiOiJ2ZWxvc2ktZXJwIn0.8O0EHARj3IWxUUvqViV8Y8CdPMaL5sJEDkcPQVrFj8A" -Source "both"