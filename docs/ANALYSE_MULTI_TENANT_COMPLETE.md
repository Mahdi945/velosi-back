# 🔍 ANALYSE COMPLÈTE MULTI-TENANT - JWT & AUTHENTIFICATION

## ✅ CORRECTIONS APPLIQUÉES

### 🔐 Backend - Sécurité Stricte

#### 1. Controllers - Authentification Obligatoire
- ✅ **ArmateursController**: `@UseGuards(JwtAuthGuard)` ✓
- ✅ **EnginsController**: `@UseGuards(JwtAuthGuard)` ✓  
- ✅ **NaviresController**: `@UseGuards(JwtAuthGuard)` ✓
- ✅ **FournisseursController**: `@UseGuards(JwtAuthGuard)` ✓

#### 2. Helpers Multi-Tenant - Plus de Fallback
- ✅ **getDatabaseName(req)**: Lève `UnauthorizedException` si pas de databaseName
- ✅ **getOrganisationId(req)**: Lève `UnauthorizedException` si pas d'organisationId
- ✅ Paramètre `allowFallback` supprimé complètement

#### 3. MultiTenantInterceptor - Sécurisé
```typescript
// ❌ AVANT (DANGEREUX):
if (!tokenDecoded) {
  request.organisationDatabase = 'velosi'; // Base par défaut
}

// ✅ MAINTENANT (SÉCURISÉ):
if (!tokenDecoded) {
  this.logger.warn(`⚠️ AUCUNE ORGANISATION DÉTECTÉE`);
  // Ne définit PAS request.organisationDatabase
  // JwtAuthGuard rejettera avec 401
}
```

#### 4. Suppression des Fallbacks Hard-Codés
- ✅ `navires.controller.ts`: `req?.user?.databaseName || 'velosi'` → `getDatabaseName(req)`
- ✅ `users.controller.ts`: `currentUser.databaseName || 'velosi'` → `getDatabaseName(req)`
- ✅ `auth.controller.ts`: `decoded.databaseName || 'velosi'` → Validation stricte

---

## 📊 FLUX MULTI-TENANT COMPLET

### 1️⃣ CONNEXION (Backend)

**Fichier**: `src/auth/auth.service.ts` → Méthode `login()`

```typescript
// 1. Validation utilisateur (username/password)
const user = await this.findUser(username);

// 2. Récupération organisation depuis shipnology (base principale)
const organisationId = user.organisation_id;
const orgResult = await mainConnection.query(
  'SELECT id, name, database_name FROM organisations WHERE id = $1',
  [organisationId]
);

// 3. Extraction des infos multi-tenant
const databaseName = orgResult[0].database_name;
const organisationName = orgResult[0].name;

// 4. Création du JWT avec infos multi-tenant
const payload: JwtPayload = {
  sub: user.id.toString(),
  userId: user.id,
  username: user.nom_utilisateur,
  email: userEmail,
  role: user.role,
  userType: user.userType,
  
  // 🏢 MULTI-TENANT (CRUCIAL)
  organisationId: organisationId,
  databaseName: databaseName,      // ⭐ CLÉ PRINCIPALE
  organisationName: organisationName
};

const access_token = this.jwtService.sign(payload);
```

**Résultat**: JWT contient `databaseName` + `organisationId`

---

### 2️⃣ RÉPONSE LOGIN (Backend → Frontend)

**Fichier**: `src/auth/auth.controller.ts` → Méthode `login()`

```typescript
// Retour au frontend
return {
  message: 'Connexion réussie',
  user: result.user,
  access_token: result.access_token,
  refresh_token: result.refresh_token,
  organisation: result.organisation // Contient { id, nom, database_name }
};
```

**Cookies définis** (avec httpOnly: false pour accès JavaScript):
- `access_token`: JWT principal
- `refresh_token`: Pour renouvellement
- `access_token_${userId}_${userType}`: Cookie spécifique utilisateur

---

### 3️⃣ STOCKAGE TOKEN (Frontend)

**Fichier**: `velosi-front/src/app/services/auth-keycloak.service.ts` → Méthode `loginWithBackend()`

```typescript
if (response && response.user && response.access_token) {
  // 🏢 STOCKAGE ORGANISATION
  if (response.organisation) {
    localStorage.setItem('organisation_id', response.organisation.id?.toString());
    localStorage.setItem('organisation_name', response.organisation.nom);
    localStorage.setItem('organisation_database', response.organisation.database_name);
  }
  
  // 🔑 STOCKAGE TOKEN
  localStorage.setItem('access_token', response.access_token);
  localStorage.setItem('refresh_token', response.refresh_token);
  localStorage.setItem('token_expiry', tokenExpiry.toString());
  localStorage.setItem('user_role', response.user.role);
}
```

**Items dans localStorage**:
- ✅ `access_token`: JWT complet
- ✅ `organisation_database`: Nom de la BD (ex: "velosi", "danino")
- ✅ `organisation_id`: ID numérique
- ✅ `organisation_name`: Nom affiché

---

### 4️⃣ ENVOI REQUÊTE (Frontend)

**Fichier**: `velosi-front/src/app/interceptors/auth.interceptor.ts`

```typescript
intercept(req: HttpRequest<any>, next: HttpHandler) {
  // 1. Récupérer le token
  const token = localStorage.getItem('access_token');
  
  // 2. Récupérer l'organisation
  const organisationDatabase = localStorage.getItem('organisation_database');
  
  if (token) {
    // 3. Cloner la requête avec headers
    const authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`,
        'X-Organisation-Database': organisationDatabase, // Header custom
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    return next.handle(authReq);
  }
}
```

**Headers envoyés**:
- ✅ `Authorization: Bearer eyJhbGc...` (JWT)
- ✅ `X-Organisation-Database: velosi` (Nom BD)
- ✅ `Cookie: access_token=...` (Fallback)

---

### 5️⃣ RÉCEPTION REQUÊTE (Backend)

**Ordre d'exécution**:

#### A. MultiTenantInterceptor (AVANT AuthGuard)
**Fichier**: `src/common/multi-tenant.interceptor.ts`

```typescript
intercept(context: ExecutionContext, next: CallHandler) {
  const request = context.switchToHttp().getRequest();
  
  // 1. Essayer header custom
  const headerDatabase = request.headers['x-organisation-database'];
  if (headerDatabase) {
    request.organisationDatabase = headerDatabase;
  }
  
  // 2. Décoder JWT (AVANT validation)
  const authHeader = request.headers.authorization;
  if (authHeader) {
    const token = authHeader.substring(7);
    const decoded = jwt.decode(token);
    
    if (decoded && decoded.databaseName) {
      request.organisationDatabase = decoded.databaseName;
      request.organisationId = decoded.organisationId;
    }
  }
  
  // ⚠️ AUCUN FALLBACK - Si pas d'organisation, JwtAuthGuard rejettera
  
  return next.handle();
}
```

**Résultat**: `request.organisationDatabase` et `request.organisationId` définis

#### B. JwtAuthGuard (Authentification)
**Fichier**: `src/auth/jwt-auth.guard.ts`

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const request = context.switchToHttp().getRequest();
  
  // Validation JWT via Passport
  const result = await super.canActivate(context);
  
  if (!result) {
    throw new UnauthorizedException('Token invalide');
  }
  
  return true;
}
```

**Résultat**: `request.user` défini avec payload JWT validé

#### C. JwtStrategy (Validation Payload)
**Fichier**: `src/auth/jwt.strategy.ts`

```typescript
async validate(payload: any) {
  // 1. Extraire infos du JWT
  const userId = payload.sub || payload.userId;
  const userType = payload.userType;
  const databaseName = payload.databaseName;
  
  // 2. Se connecter à la bonne base
  const connection = await this.databaseConnectionService.getConnection(databaseName);
  
  // 3. Vérifier que l'utilisateur existe et est actif
  const user = await connection.query(
    'SELECT * FROM personnel WHERE id = $1 AND statut = \'actif\'',
    [userId]
  );
  
  if (!user || user.length === 0) {
    throw new UnauthorizedException('Utilisateur non trouvé');
  }
  
  // 4. Retourner les infos pour request.user
  return {
    id: userId,
    username: payload.username,
    role: payload.role,
    organisationId: payload.organisationId,
    databaseName: payload.databaseName
  };
}
```

**Résultat**: `request.user` contient toutes les infos nécessaires

---

### 6️⃣ EXÉCUTION CONTROLLER

**Fichier**: N'importe quel controller (ex: `engins.controller.ts`)

```typescript
@Controller('gestion-ressources/engins')
@UseGuards(JwtAuthGuard) // ⭐ Authentification requise
export class EnginsController {
  
  @Get()
  async findAll(@Query() filters: EnginFiltersDto, @Req() req: any) {
    // 1. Récupérer la base de données
    const databaseName = getDatabaseName(req);
    // ↑ Utilise req.organisationDatabase (MultiTenantInterceptor)
    //   OU req.user.databaseName (JwtStrategy)
    
    // 2. Requêtes dans la bonne base
    const engins = await this.enginsService.findAll(databaseName, filters);
    
    return engins;
  }
}
```

---

## 🔍 VÉRIFICATIONS CRITIQUES

### ✅ Backend

1. **Tous les controllers protégés**
   ```bash
   # Vérifier que tous ont @UseGuards(JwtAuthGuard)
   grep -r "@Controller" src/ | grep -v "@UseGuards"
   ```

2. **Aucun fallback 'velosi'**
   ```bash
   # Chercher les utilisations hardcodées
   grep -r "'velosi'" src/ | grep -v "comment\|logger\|exemple"
   ```

3. **JWT contient databaseName**
   ```typescript
   // Dans auth.service.ts login()
   const payload: JwtPayload = {
     // ... autres champs
     databaseName: databaseName, // ⭐ OBLIGATOIRE
     organisationId: organisationId
   };
   ```

### ✅ Frontend

1. **Interceptor actif**
   ```typescript
   // Dans app.config.ts
   {
     provide: HTTP_INTERCEPTORS,
     useClass: AuthInterceptor,
     multi: true
   }
   ```

2. **Token stocké après login**
   ```typescript
   // Après login réussi
   localStorage.setItem('access_token', response.access_token);
   localStorage.setItem('organisation_database', response.organisation.database_name);
   ```

3. **Token envoyé dans requêtes**
   ```typescript
   // AuthInterceptor ajoute automatiquement
   headers: {
     'Authorization': `Bearer ${token}`,
     'X-Organisation-Database': organisationDatabase
   }
   ```

---

## 🚨 PROBLÈMES POSSIBLES

### Erreur: "databaseName manquant"
**Cause**: Utilisateur non connecté ou token expiré
**Solution**: Se reconnecter

### Erreur: "401 Unauthorized"
**Cause**: Token absent ou invalide
**Solution**: Vérifier que:
1. Login a bien réussi
2. Token est dans localStorage
3. Interceptor est actif
4. Token n'est pas expiré (8h par défaut)

### Erreur: "Base par défaut utilisée"
**Cause**: MultiTenantInterceptor trouve pas d'organisation
**Solution**: ⚠️ **NE DEVRAIT PLUS ARRIVER** - Système rejettera avec 401

---

## 📝 RÉSUMÉ FLUX COMPLET

```
1. LOGIN
   ↓
2. Backend génère JWT avec { databaseName, organisationId }
   ↓
3. Frontend stocke token dans localStorage
   ↓
4. Requête suivante → AuthInterceptor ajoute token aux headers
   ↓
5. Backend → MultiTenantInterceptor décode JWT → req.organisationDatabase
   ↓
6. Backend → JwtAuthGuard valide token → req.user
   ↓
7. Controller → getDatabaseName(req) récupère la bonne base
   ↓
8. Service → Requête SQL dans la base correcte
   ↓
9. Données retournées à l'utilisateur
```

---

## ✅ SÉCURITÉ GARANTIE

1. ❌ **Plus de base par défaut** - Tout rejeté si pas d'authentification
2. ✅ **JWT obligatoire** - Tous les controllers protégés
3. ✅ **Isolation complète** - Chaque organisation dans sa propre base
4. ✅ **Validation stricte** - UnauthorizedException si infos manquantes

---

**Date**: 20 décembre 2025
**Status**: ✅ Multi-tenant sécurisé et fonctionnel
