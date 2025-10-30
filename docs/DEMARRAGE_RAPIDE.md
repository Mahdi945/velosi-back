# 🚀 Démarrage Rapide - Module Ports & Aéroports

## ⚡ 3 Étapes pour Démarrer

### Étape 1 : Créer les Tables PostgreSQL

**Option A : Via Script PowerShell (Recommandé)**
```powershell
cd velosi-back
.\run-migration.ps1
```

**Option B : Via pgAdmin ou DBeaver**
1. Ouvrez votre client PostgreSQL
2. Connectez-vous à votre base de données
3. Ouvrez le fichier `migrations/create_ports_aeroports_tables.sql`
4. Exécutez le script

**Option C : Via psql en ligne de commande**
```powershell
cd velosi-back
psql -U postgres -d velosi_db -f migrations/create_ports_aeroports_tables.sql
```

✅ **Résultat attendu :**
- Table `ports` créée avec ~30 ports d'exemple
- Table `aeroports` créée avec ~35 aéroports d'exemple

---

### Étape 2 : Démarrer le Backend

```powershell
cd velosi-back
npm run start:dev
```

✅ **Vérifiez dans la console :**
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] PortsModule dependencies initialized
[Nest] LOG [InstanceLoader] AeroportsModule dependencies initialized
[Nest] LOG [RoutesResolver] PortsController {/api/ports}
[Nest] LOG [RoutesResolver] AeroportsController {/api/aeroports}
[Nest] LOG [NestApplication] Nest application successfully started
```

---

### Étape 3 : Tester l'Application

#### A. Frontend

```powershell
# Dans un nouveau terminal
cd velosi-front
ng serve
```

Puis ouvrez : **http://localhost:4200**

Naviguez vers : **Données de référence > Ports & Aéroports**

#### B. API Backend (Swagger)

Ouvrez : **http://localhost:3000/api/docs**

Vous verrez la documentation complète des endpoints :
- `/api/ports`
- `/api/aeroports`
- `/api/admin/import`

---

## 🎯 Fonctionnalités Disponibles

### ✅ Ce qui Fonctionne Immédiatement

1. **Liste unifiée** - Voir tous les ports et aéroports
2. **Filtrage par type** - Ports / Aéroports / Tous
3. **Recherche** - Par nom, code, ville, pays
4. **Création** - Ajouter des ports et aéroports
5. **Modification** - Éditer les informations
6. **Activation/Désactivation** - Gérer le statut
7. **Suppression** - Retirer des éléments
8. **Statistiques** - Compteurs en temps réel

---

## 📥 Import Automatique (Optionnel)

Pour importer des milliers d'aéroports depuis les APIs publiques :

### 1. Se Connecter à l'Application

Connectez-vous et récupérez votre token JWT :
- Ouvrez les DevTools (F12)
- Onglet "Application" > "Local Storage"
- Copiez le token JWT

### 2. Importer les Données

**Via PowerShell :**
```powershell
$token = "VOTRE_TOKEN_JWT_ICI"

# Importer ~7000 aéroports (OpenFlights)
curl.exe -X POST http://localhost:3000/api/admin/import/aeroports/openflights -H "Authorization: Bearer $token"

# OU importer ~55000 aéroports (OurAirports - plus complet)
curl.exe -X POST http://localhost:3000/api/admin/import/aeroports/ourairports -H "Authorization: Bearer $token"
```

**Via Postman :**
1. Méthode : `POST`
2. URL : `http://localhost:3000/api/admin/import/aeroports/openflights`
3. Headers : `Authorization: Bearer VOTRE_TOKEN`
4. Send

### 3. Vérifier les Statistiques

```powershell
curl.exe -X GET http://localhost:3000/api/admin/import/stats -H "Authorization: Bearer $token"
```

**Réponse :**
```json
{
  "totalPorts": 30,
  "activePorts": 30,
  "totalAeroports": 7000,
  "activeAeroports": 7000
}
```

---

## 🧪 Tests Rapides

### Test 1 : Vérifier les Tables

```sql
-- Dans pgAdmin ou psql
SELECT COUNT(*) FROM ports;     -- Devrait retourner ~30
SELECT COUNT(*) FROM aeroports; -- Devrait retourner ~35
```

### Test 2 : Tester l'API

```powershell
# Lister les ports (sans authentification si JWT désactivé)
curl.exe http://localhost:3000/api/ports?page=1&limit=5

# Lister les aéroports
curl.exe http://localhost:3000/api/aeroports?page=1&limit=5
```

### Test 3 : Tester le Frontend

1. Ouvrez http://localhost:4200
2. Connectez-vous
3. Menu : **Données de référence > Ports & Aéroports**
4. Testez les filtres :
   - Type : "Ports uniquement"
   - Recherche : "tunis"
   - Statut : "Actifs"

---

## 📊 Données d'Exemple Incluses

### Ports (~30)
- 🇹🇳 Tunisie : Radès, Bizerte, Sfax, Sousse, Zarzis
- 🇫🇷 France : Marseille, Le Havre
- 🇳🇱 Pays-Bas : Rotterdam
- 🇧🇪 Belgique : Anvers
- 🇩🇪 Allemagne : Hambourg
- 🇪🇸 Espagne : Valence, Barcelone
- 🇨🇳 Chine : Shanghai
- 🇸🇬 Singapour
- 🇺🇸 États-Unis : Los Angeles, New York

### Aéroports (~35)
- 🇹🇳 Tunisie : TUN, MIR, DJE, TOE, SFA
- 🇫🇷 France : CDG, ORY, LYS, MRS, NCE
- 🇬🇧 Royaume-Uni : LHR (Heathrow)
- 🇳🇱 Pays-Bas : AMS (Schiphol)
- 🇩🇪 Allemagne : FRA, MUC
- 🇦🇪 Émirats : DXB (Dubaï)
- 🇹🇷 Turquie : IST (Istanbul)
- 🇸🇬 Singapour : SIN
- 🇺🇸 États-Unis : JFK, LAX, ORD, MIA

---

## 🔧 Configuration

### Backend (velosi-back)

**Fichiers clés :**
- `src/entities/port.entity.ts` - Entité Port
- `src/entities/aeroport.entity.ts` - Entité Aéroport
- `src/controllers/ports.controller.ts` - API Ports
- `src/controllers/aeroports.controller.ts` - API Aéroports
- `src/services/import-data.service.ts` - Import automatique

**Modules enregistrés dans `app.module.ts` :**
```typescript
import { PortsModule } from './modules/ports.module';
import { AeroportsModule } from './modules/aeroports.module';

@Module({
  imports: [
    // ...
    PortsModule,
    AeroportsModule,
  ],
})
```

### Frontend (velosi-front)

**Fichiers clés :**
- `src/app/components/gestion-ressources/ports-aeroports/` - Composant principal
- `src/app/services/ports.service.ts` - Service Ports
- `src/app/services/aeroports.service.ts` - Service Aéroports
- `src/app/models/port.interface.ts` - Interface Port
- `src/app/models/aeroport.interface.ts` - Interface Aéroport

---

## ⚠️ Problèmes Courants

### Problème 1 : "relation ports does not exist"

**Cause :** Les tables n'ont pas été créées

**Solution :**
```powershell
cd velosi-back
.\run-migration.ps1
```

### Problème 2 : "Cannot find module @nestjs/swagger"

**Cause :** Dépendances manquantes

**Solution :**
```powershell
cd velosi-back
npm install @nestjs/swagger swagger-ui-express --legacy-peer-deps
```

### Problème 3 : "Error: connect ECONNREFUSED"

**Cause :** PostgreSQL n'est pas démarré

**Solution :**
- Démarrez PostgreSQL via services Windows
- Ou via pgAdmin

### Problème 4 : Erreur 401 lors de l'import

**Cause :** Token JWT expiré ou manquant

**Solution :**
- Reconnectez-vous à l'application
- Récupérez un nouveau token JWT
- Réessayez l'import

---

## 📚 Documentation Complète

- **Guide Complet** : `docs/PORTS_AEROPORTS_GUIDE.md`
- **APIs Publiques** : `docs/APIS_PORTS_AEROPORTS.md`
- **Guide d'Import** : `docs/GUIDE_IMPORT_PRATIQUE.md`
- **Récapitulatif** : `docs/RECAPITULATIF_PORTS_AEROPORTS.md`

---

## ✅ Checklist de Vérification

Après avoir suivi ce guide :

- [ ] Tables `ports` et `aeroports` créées dans PostgreSQL
- [ ] Backend démarré sans erreurs
- [ ] Frontend accessible sur http://localhost:4200
- [ ] Page "Ports & Aéroports" affiche des données
- [ ] Filtres fonctionnent (Type, Recherche, Statut)
- [ ] Création d'un port fonctionne
- [ ] Création d'un aéroport fonctionne
- [ ] Modification fonctionne
- [ ] Suppression fonctionne
- [ ] Swagger accessible sur http://localhost:3000/api/docs

---

## 🎉 C'est Tout !

Votre module Ports & Aéroports est maintenant **opérationnel** !

**Prochaines étapes suggérées :**
1. Personnaliser les filtres selon vos besoins
2. Importer plus de données depuis les APIs
3. Ajouter des exports Excel/PDF
4. Intégrer avec d'autres modules (cotations, commandes, etc.)

**Besoin d'aide ?**
- Consultez la documentation complète
- Vérifiez les logs du backend
- Testez les endpoints via Swagger

---

**Bon développement ! 🚀**
