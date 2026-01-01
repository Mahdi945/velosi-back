# 🏢 ARCHITECTURE MULTI-TENANT - GUIDE COMPLET

## 📊 PROBLÈME ACTUEL

Vous avez 2 bases de données :
- **`velosi`** - Organisation principale
- **`danino`** - Autre organisation

### ❌ Problèmes identifiés :
1. **Connexion avec utilisateur `danino` → Affiche données de `velosi`**
2. **Profil utilisateur ne s'affiche pas correctement**
3. **Données mélangées entre les organisations**

### 🔍 Cause racine :
**Le JWT ne contient PAS `databaseName` lors du login !**

---

## ✅ SOLUTION : Architecture Multi-Tenant avec Bases Séparées

### 🏗️ Principe de fonctionnement

Chaque organisation a sa **PROPRE BASE DE DONNÉES PostgreSQL** :
```
PostgreSQL Server
├── shipnology (base registre - contient organisations)
├── velosi (données organisation Velosi)
├── danino (données organisation Danino)
└── transport_rapide (données autre organisation)
```

### 📋 Tables avec `organisation_id` (dans shipnology)
```sql
-- Base "shipnology" - Registre central
CREATE TABLE organisations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  database_name VARCHAR(255), -- Ex: "velosi", "danino"
  ...
);

CREATE TABLE admin_msp (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255),
  organisation_id INT REFERENCES organisations(id),
  ...
);
```

### 📋 Tables SANS `organisation_id` (dans chaque base tenant)
```sql
-- Dans "velosi", "danino", etc.
CREATE TABLE personnel (
  id SERIAL PRIMARY KEY,
  organisation_id INT, -- Garde organisation_id pour cohérence
  nom VARCHAR(255),
  ...
);

CREATE TABLE client (
  id SERIAL PRIMARY KEY,
  organisation_id INT, -- Garde organisation_id pour cohérence
  nom VARCHAR(255),
  ...
);

-- TOUTES LES AUTRES TABLES (pas d'organisation_id)
CREATE TABLE crm_leads (...);
CREATE TABLE crm_opportunities (...);
CREATE TABLE crm_quotes (...);
CREATE TABLE engins (...);
CREATE TABLE armateurs (...);
CREATE TABLE navires (...);
```

**🎯 IMPORTANT** : Comme chaque organisation a sa propre base, **PAS BESOIN** de filtrer par `organisation_id` dans les requêtes !

---

## 🔐 FLUX D'AUTHENTIFICATION CORRECT

### 1️⃣ Login (auth.service.ts)

```typescript
async login(loginDto: LoginDto): Promise<AuthResult> {
  // 1. Valider l'utilisateur
  const user = await this.validateUser(loginDto.usernameOrEmail, loginDto.password);
  
  // 2. ⚠️ CRUCIAL : Récupérer l'organisation de l'utilisateur
  let organisationId: number;
  let databaseName: string;
  let organisationName: string;
  
  if (user.userType === 'personnel') {
    organisationId = user.organisation_id;
    // Récupérer le nom de la base depuis la table organisations
    const org = await this.getOrganisationById(organisationId);
    databaseName = org.database_name; // Ex: "velosi", "danino"
    organisationName = org.name;
  } else if (user.userType === 'client') {
    organisationId = user.organisation_id;
    const org = await this.getOrganisationById(organisationId);
    databaseName = org.database_name;
    organisationName = org.name;
  }
  
  // 3. ✅ Créer le JWT avec les infos multi-tenant
  const payload: JwtPayload = {
    sub: user.id.toString(),
    username: user.nom_utilisateur || user.nom,
    email: user.email,
    role: user.role || 'client',
    userType: user.userType,
    // 🏢 MULTI-TENANT (OBLIGATOIRE)
    organisationId: organisationId,
    databaseName: databaseName,      // ⚠️ C'EST LA CLÉ !
    organisationName: organisationName
  };
  
  const access_token = this.jwtService.sign(payload);
  
  return { access_token, refresh_token, user: {...} };
}
```

### 2️⃣ Validation JWT (jwt.strategy.ts)

```typescript
async validate(payload: JwtPayload) {
  // Le JWT contient déjà databaseName et organisationId
  // Pas besoin de requête supplémentaire
  
  return {
    userId: payload.sub,
    username: payload.username,
    role: payload.role,
    userType: payload.userType,
    // ✅ Transmettre les infos multi-tenant
    organisationId: payload.organisationId,
    databaseName: payload.databaseName,
    organisationName: payload.organisationName
  };
}
```

### 3️⃣ Intercepteur Multi-Tenant (multi-tenant.interceptor.ts)

```typescript
@Injectable()
export class MultiTenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // 1. Extraire depuis le header Authorization
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded: any = jwt.decode(token);
      
      if (decoded && decoded.databaseName) {
        // ✅ Stocker dans la requête
        request.organisationDatabase = decoded.databaseName;
        request.organisationId = decoded.organisationId;
        
        console.log(`🏢 Requête vers: ${decoded.databaseName} (Org ID: ${decoded.organisationId})`);
      }
    }
    
    // 2. Fallback si pas trouvé
    if (!request.organisationDatabase) {
      request.organisationDatabase = 'velosi'; // Par défaut
      request.organisationId = 1;
    }
    
    return next.handle();
  }
}
```

### 4️⃣ Utilisation dans les Services

```typescript
@Injectable()
export class DashboardService {
  async getDashboardStats(
    databaseName: string,  // Reçu depuis le contrôleur
    organisationId: number
  ): Promise<DashboardStatsResponse> {
    
    // 1. Se connecter à la bonne base
    const connection = await this.databaseConnectionService
      .getOrganisationConnection(databaseName);
    
    // 2. Requêtes SQL - AVEC organisation_id pour personnel/client
    const personnelResult = await connection.query(
      `SELECT COUNT(*) as count 
       FROM personnel 
       WHERE organisation_id = $1 AND statut = 'actif'`,
      [organisationId]
    );
    
    // 3. Requêtes SQL - SANS organisation_id pour CRM
    const leadsResult = await connection.query(
      `SELECT COUNT(*) as count 
       FROM crm_leads 
       WHERE status = 'active'` // Pas d'organisation_id !
    );
    
    // La connexion à la bonne base suffit pour isoler les données
  }
}
```

### 5️⃣ Contrôleur (dashboard.controller.ts)

```typescript
@Controller('dashboard')
export class DashboardController {
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req) {
    // ✅ Extraire depuis req.user (injecté par JwtStrategy)
    const databaseName = req.user.databaseName;
    const organisationId = req.user.organisationId;
    
    console.log(`📊 Stats pour: ${databaseName} (Org: ${organisationId})`);
    
    return this.dashboardService.getDashboardStats(
      databaseName,
      organisationId
    );
  }
}
```

---

## 🔧 CORRECTIONS À APPLIQUER

### ✅ 1. Corriger auth.service.ts - Méthode `login()`

**AJOUTER** : Récupération de l'organisation et ajout au JWT

```typescript
// Après validation de l'utilisateur
const user = await this.validateUser(...);

// 🏢 RÉCUPÉRER L'ORGANISATION
let organisationId = user.organisation_id;
const orgQuery = await this.databaseConnectionService.getMainConnection();
const orgResult = await orgQuery.query(
  'SELECT id, name, database_name FROM organisations WHERE id = $1',
  [organisationId]
);

if (!orgResult || orgResult.length === 0) {
  throw new UnauthorizedException('Organisation non trouvée');
}

const organisation = orgResult[0];

// ✅ JWT avec databaseName
const payload: JwtPayload = {
  sub: user.id.toString(),
  username: user.nom_utilisateur || user.nom,
  email: userEmail,
  role: user.role || 'client',
  userType: user.userType,
  organisationId: organisation.id,
  databaseName: organisation.database_name, // ⚠️ CRUCIAL
  organisationName: organisation.name
};
```

### ✅ 2. Corriger dashboard.service.ts

**SUPPRIMER** `organisation_id` des requêtes sur tables CRM :

```sql
-- ❌ AVANT
SELECT COUNT(*) FROM crm_leads WHERE organisation_id = $1
SELECT COUNT(*) FROM crm_opportunities WHERE organisation_id = $1
LEFT JOIN personnel p ON p.id = l.created_by AND p.organisation_id = l.organisation_id

-- ✅ APRÈS
SELECT COUNT(*) FROM crm_leads
SELECT COUNT(*) FROM crm_opportunities
LEFT JOIN personnel p ON p.id = l.created_by -- personnel a organisation_id
```

### ✅ 3. Vérifier jwt.strategy.ts

S'assurer que `validate()` retourne bien `databaseName` et `organisationId`.

### ✅ 4. Vérifier tous les contrôleurs

Extraire `databaseName` depuis `req.user` et le passer aux services.

---

## 🎯 RÉSULTAT ATTENDU

### Scénario 1 : Connexion utilisateur Velosi
```
1. Login avec utilisateur de organisation_id = 1
2. JWT contient: { databaseName: "velosi", organisationId: 1 }
3. Toutes les requêtes vont vers la base "velosi"
4. ✅ Affiche uniquement les données Velosi
```

### Scénario 2 : Connexion utilisateur Danino
```
1. Login avec utilisateur de organisation_id = 2
2. JWT contient: { databaseName: "danino", organisationId: 2 }
3. Toutes les requêtes vont vers la base "danino"
4. ✅ Affiche uniquement les données Danino
```

### Scénario 3 : Profil utilisateur
```
1. GET /auth/profile
2. Contrôleur extrait: databaseName = "danino", organisationId = 2
3. Service se connecte à la base "danino"
4. Requête: SELECT * FROM personnel WHERE id = $1 AND organisation_id = $2
5. ✅ Profil correct de l'utilisateur Danino
```

---

## 📝 CHECKLIST DE VÉRIFICATION

- [ ] Table `organisations` existe dans base `shipnology`
- [ ] Chaque utilisateur (personnel/client) a un `organisation_id` valide
- [ ] JWT créé lors du login contient `databaseName`
- [ ] JWT créé lors du login contient `organisationId`
- [ ] MultiTenantInterceptor extrait correctement `databaseName` du JWT
- [ ] Tous les services utilisent `getOrganisationConnection(databaseName)`
- [ ] Requêtes sur tables CRM n'utilisent PAS `organisation_id`
- [ ] Requêtes sur personnel/client utilisent `organisation_id`

---

## ❓ QUESTIONS À VÉRIFIER

1. **La table `organisations` existe-t-elle dans `shipnology` ?**
2. **Les utilisateurs ont-ils un `organisation_id` valide ?**
3. **Les bases `velosi` et `danino` existent-elles toutes les deux ?**

Voulez-vous que j'applique ces corrections maintenant ?
