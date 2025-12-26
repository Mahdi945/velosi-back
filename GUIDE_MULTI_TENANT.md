# 🏢 Guide Multi-Tenant - Architecture Centralisée

## 📋 Vue d'ensemble

Votre application utilise maintenant une **architecture multi-tenant centralisée** où chaque organisation a sa propre base de données. Tous les services bénéficient automatiquement du multi-tenant **sans modification manuelle**.

---

## ✅ Solution Centralisée Implémentée

### 1️⃣ **Intercepteur Global** (`MultiTenantInterceptor`)
- ✅ **Activé globalement** dans `main.ts`
- ✅ S'exécute **AVANT** tous les controllers
- ✅ Extrait automatiquement `databaseName`, `organisationId`, `organisationName` depuis le JWT
- ✅ Injecte ces infos dans `request.organisationDatabase`, `request.organisationId`, `request.organisationName`

### 2️⃣ **Service de Base** (`BaseTenantService`)
- ✅ **Classe mère** pour tous vos services
- ✅ Gère automatiquement la connexion à la bonne base de données
- ✅ Fournit des méthodes utilitaires : `getRepository()`, `query()`, `getTenantInfo()`

### 3️⃣ **Service de Repositories** (`TenantRepositoryService`)
- ✅ **REQUEST-SCOPED** - une instance par requête
- ✅ Fournit des repositories déjà configurés pour la bonne base
- ✅ Alternative à `BaseTenantService` si vous préférez l'injection de dépendances

---

## 🚀 Comment Utiliser

### Méthode 1: Étendre `BaseTenantService` (Recommandé)

```typescript
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { BaseTenantService } from '../common/base-tenant.service';
import { DatabaseConnectionService } from '../common/database-connection.service';
import { Client } from '../entities/client.entity';
import { Personnel } from '../entities/personnel.entity';

@Injectable({ scope: Scope.REQUEST })
export class MonService extends BaseTenantService {
  constructor(
    @Inject(REQUEST) request: Request,
    dbConnectionService: DatabaseConnectionService,
  ) {
    super(request, dbConnectionService);
  }

  // ✅ Utilise automatiquement la bonne base de données
  async getAllClients(): Promise<Client[]> {
    const clientRepo = await this.getRepository(Client);
    return clientRepo.find();
  }

  async getPersonnelById(id: number): Promise<Personnel> {
    const personnelRepo = await this.getRepository(Personnel);
    return personnelRepo.findOne({ where: { id } });
  }

  // ✅ Pour des requêtes SQL complexes
  async getCustomData(): Promise<any[]> {
    return this.query(
      'SELECT * FROM client WHERE organisation_id = $1',
      [this.organisationId]
    );
  }

  // ✅ Obtenir les infos de l'organisation courante
  logTenantInfo() {
    const { databaseName, organisationId, organisationName } = this.getTenantInfo();
    console.log(`Organisation: ${organisationName} (${databaseName})`);
  }
}
```

### Méthode 2: Utiliser `TenantRepositoryService`

```typescript
import { Injectable, Scope } from '@nestjs/common';
import { TenantRepositoryService } from '../common/tenant-repository.service';

@Injectable({ scope: Scope.REQUEST })
export class MonService {
  constructor(private tenantRepos: TenantRepositoryService) {}

  async getAllClients() {
    const clientRepo = await this.tenantRepos.getClientRepository();
    return clientRepo.find();
  }

  async getAllPersonnel() {
    const personnelRepo = await this.tenantRepos.getPersonnelRepository();
    return personnelRepo.find();
  }
}
```

---

## 🔄 Migration des Services Existants

### Avant (Problème)
```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Client)
    private clientRepository: Repository<Client>, // ❌ Pointe toujours vers 'velosi'
  ) {}

  async getAllClients() {
    return this.clientRepository.find(); // ❌ Base 'velosi' uniquement
  }
}
```

### Après (Solution)
```typescript
@Injectable({ scope: Scope.REQUEST }) // ✅ REQUEST-SCOPED
export class UsersService extends BaseTenantService {
  constructor(
    @Inject(REQUEST) request: Request,
    dbConnectionService: DatabaseConnectionService,
  ) {
    super(request, dbConnectionService);
  }

  async getAllClients() {
    const clientRepo = await this.getRepository(Client);
    return clientRepo.find(); // ✅ Base correcte selon l'organisation
  }
}
```

---

## 📦 Entités Supportées

Toutes les entités sont automatiquement supportées via `getRepository<T>()`:
- ✅ Client
- ✅ Personnel
- ✅ ContactClient
- ✅ Lead
- ✅ Opportunity
- ✅ Quote
- ✅ Activity
- ✅ Navire
- ✅ Engin
- ✅ Armateur
- ✅ Fournisseur
- ✅ Correspondant
- ✅ Port, Aeroport
- ✅ AutorisationTVA, BCsusTVA
- ✅ BiometricCredential
- ✅ LoginHistory
- ✅ VechatMessage, VechatConversation
- ✅ Et toutes vos autres entités...

---

## ⚠️ Points Importants

### 1. **Scope REQUEST obligatoire**
```typescript
@Injectable({ scope: Scope.REQUEST }) // ✅ Obligatoire
export class MonService extends BaseTenantService { ... }
```

### 2. **Injection du REQUEST**
```typescript
constructor(
  @Inject(REQUEST) request: Request, // ✅ Nécessaire
  dbConnectionService: DatabaseConnectionService,
) {
  super(request, dbConnectionService);
}
```

### 3. **Async/Await pour getRepository()**
```typescript
// ❌ Incorrect
const repo = this.getRepository(Client);

// ✅ Correct
const repo = await this.getRepository(Client);
```

---

## 🎯 Avantages

1. ✅ **Aucune modification manuelle** des services existants (juste étendre `BaseTenantService`)
2. ✅ **Multi-tenant automatique** - fonctionne pour toutes les organisations
3. ✅ **Type-safe** - TypeScript garantit les types
4. ✅ **Logs automatiques** - debug facilité
5. ✅ **Performance** - connexions mises en cache
6. ✅ **Sécurité** - isolation garantie entre organisations

---

## 🔍 Debugging

Les logs vous montrent automatiquement quelle base est utilisée :

```
🏢 [TENANT-INFO] Depuis JWT: Danino (DB: danino)
📦 [REPOSITORY] Client → danino
📦 [REPOSITORY] Personnel → danino
🔍 [SQL] Organisation danino: SELECT * FROM client WHERE...
```

---

## 📚 Fichiers Clés

- `src/common/base-tenant.service.ts` - Service de base
- `src/common/tenant-repository.service.ts` - Service de repositories
- `src/common/multi-tenant.interceptor.ts` - Intercepteur global
- `src/common/database-connection.service.ts` - Gestion des connexions
- `src/common/database.module.ts` - Module global
- `src/main.ts` - Activation de l'intercepteur

---

## 🎉 Résultat

Désormais, **TOUS vos services** utilisent automatiquement la bonne base de données selon l'organisation de l'utilisateur connecté. Plus besoin de modifier chaque service manuellement !