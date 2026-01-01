# Migration Dashboard Service vers Multi-Tenant

## Méthodes converties
✅ `getDashboardStats()` - FAIT

## Méthodes à convertir

### 1. `getSalesEvolution(databaseName, filters)`
- Remplacer les repositories par `connection.query()`
- Convertir les boucles avec requêtes TypeORM

### 2. `getCRMStats(databaseName, filters)`
- Convertir tous les `leadRepository.count()` en SQL
- Convertir tous les `opportunityRepository.createQueryBuilder()`

### 3. `getRecentActivities(databaseName, limit, filters)`
- JOIN manuel pour récupérer createdBy

### 4. `getTransportDistribution(databaseName, filters)`
- Requêtes d'agrégation SQL

### 5. `getCommercialStats(databaseName, userId)`
- Important: Beaucoup de requêtes complexes

### 6. `getCommercialPerformance(databaseName, userId, filters)`
- Requêtes d'agrégation par mois

### 7. `getImportExportStats(databaseName, filters)`
- Déjà en SQL mais à nettoyer

## Structure des signatures
Toutes les méthodes doivent avoir `databaseName: string` comme premier paramètre.

## Controller
Ajouter `getDatabaseName(req)` dans toutes les routes et passer `databaseName` aux méthodes du service.
