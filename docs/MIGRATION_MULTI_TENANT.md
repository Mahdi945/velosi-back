# Guide de Migration Multi-Tenant

## Solution Mise en Place

✅ **`TenantRepositoryService`** : Service REQUEST-SCOPED qui fournit automatiquement les bons repositories

## Comment Migrer un Service vers Multi-Tenant

### AVANT (connexion par défaut 'velosi')
```typescript
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Personnel)
    private personnelRepository: Repository<Personnel>,
    @InjectRepository(Client)
    private clientRepository: Repository<Client>,
  ) {}

  async getStats() {
    const personnel = await this.personnelRepository.find();
    const clients = await this.clientRepository.find();
    // ...
  }
}
```

### APRÈS (connexion dynamique selon l'organisation)
```typescript
@Injectable({ scope: Scope.REQUEST })  // ⚠️ IMPORTANT: REQUEST scope
export class DashboardService {
  constructor(
    private tenantRepos: TenantRepositoryService,
  ) {}

  async getStats() {
    const personnelRepo = await this.tenantRepos.getPersonnelRepository();
    const clientRepo = await this.tenantRepos.getClientRepository();
    
    const personnel = await personnelRepo.find();
    const clients = await clientRepo.find();
    // ...
  }
}
```

## Services Prioritaires à Migrer

1. ✅ **AuthService** - Déjà migré (utilise DatabaseConnectionService)
2. ⚠️ **DashboardService** - À migrer
3. ⚠️ **LeadService, OpportunityService, QuoteService** - À migrer
4. ⚠️ **EnginService, NavireService** - À migrer
5. ⚠️ **PersonnelService, ClientService** - À migrer

## Services qui N'ONT PAS besoin de migration

- Services globaux (EmailService, KeycloakService, etc.)
- Services de la base 'shipnology' (OrganisationService, etc.)
- Services utilitaires sans accès DB

## Vérification

Après migration, les logs doivent afficher:
```
🔌 [TENANT-REPOS] Initialisé pour la base: "danino"
🔌 [DB CONNECTION] Connexion existante réutilisée: "danino"
```

Et les requêtes SQL doivent s'exécuter sur la bonne base.
