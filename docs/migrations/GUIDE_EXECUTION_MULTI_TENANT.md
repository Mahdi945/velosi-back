# Guide d'Exécution des Migrations Multi-Tenant

## 📋 Ordre d'Exécution

### 1. Migration de la base principale (`shipnology`)

Exécuter les migrations **dans l'ordre** sur la base `shipnology` :

```powershell
# Se connecter à PostgreSQL
psql -U msp -h localhost -d shipnology

# Migration 003: Ajouter configuration SMTP aux organisations
\i 003_add_smtp_config_to_organisations.sql

# Vérifier le résultat
SELECT id, nom, slug, smtp_enabled, database_name FROM organisations;
```

**Résultat attendu :**
```
 id |      nom       |    slug     | smtp_enabled |      database_name
----+----------------+-------------+--------------+-------------------------
  1 | Velosi         | velosi      | f            | shipnology_velosi
  2 | Transport SARL | transport   | f            | shipnology_transport
```

---

### 2. Migration des bases d'organisations

La migration `004_enforce_unique_email_per_organisation.sql` doit être exécutée **dans chaque base d'organisation**.

#### Option A: Exécution manuelle par base

```powershell
# Pour shipnology_velosi
psql -U msp -h localhost -d shipnology_velosi
\i 004_enforce_unique_email_per_organisation.sql

# Pour shipnology_transport_rapide (si existe)
psql -U msp -h localhost -d shipnology_transport_rapide
\i 004_enforce_unique_email_per_organisation.sql
```

#### Option B: Script PowerShell automatisé

Créer un fichier `execute-multi-tenant-migration.ps1` :

```powershell
# Script: Exécuter une migration sur toutes les bases d'organisations
param(
    [Parameter(Mandatory=$true)]
    [string]$MigrationFile
)

$ErrorActionPreference = "Stop"

# Configuration PostgreSQL
$PG_USER = "msp"
$PG_HOST = "localhost"
$MAIN_DB = "shipnology"

Write-Host "🚀 Exécution de la migration: $MigrationFile" -ForegroundColor Cyan
Write-Host ""

# 1. Récupérer la liste des bases d'organisations actives
Write-Host "📊 Récupération des organisations actives..." -ForegroundColor Yellow

$query = "SELECT database_name FROM organisations WHERE statut = 'actif' ORDER BY id;"
$organisations = psql -U $PG_USER -h $PG_HOST -d $MAIN_DB -t -A -c $query

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la récupération des organisations" -ForegroundColor Red
    exit 1
}

$orgList = $organisations -split "`n" | Where-Object { $_ -ne "" }

Write-Host "✅ $($orgList.Count) organisation(s) trouvée(s)" -ForegroundColor Green
Write-Host ""

# 2. Exécuter la migration sur chaque base
$successCount = 0
$failureCount = 0

foreach ($dbName in $orgList) {
    Write-Host "🔧 Migration de: $dbName" -ForegroundColor Cyan
    
    try {
        # Exécuter la migration
        psql -U $PG_USER -h $PG_HOST -d $dbName -f $MigrationFile
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Migration réussie pour: $dbName" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "   ❌ Échec de la migration pour: $dbName" -ForegroundColor Red
            $failureCount++
        }
    } catch {
        Write-Host "   ❌ Erreur: $_" -ForegroundColor Red
        $failureCount++
    }
    
    Write-Host ""
}

# 3. Résumé
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 RÉSUMÉ DE LA MIGRATION" -ForegroundColor Cyan
Write-Host "════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Fichier        : $MigrationFile" -ForegroundColor White
Write-Host "Total bases    : $($orgList.Count)" -ForegroundColor White
Write-Host "Succès         : $successCount" -ForegroundColor Green
Write-Host "Échecs         : $failureCount" -ForegroundColor $(if($failureCount -gt 0){"Red"}else{"Green"})
Write-Host "════════════════════════════════════" -ForegroundColor Cyan

if ($failureCount -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Des erreurs sont survenues. Vérifiez les logs ci-dessus." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host ""
    Write-Host "🎉 Migration terminée avec succès !" -ForegroundColor Green
    exit 0
}
```

**Utilisation :**

```powershell
# Exécuter la migration 004 sur toutes les organisations
.\execute-multi-tenant-migration.ps1 -MigrationFile "004_enforce_unique_email_per_organisation.sql"
```

---

### 3. Vérification Post-Migration

#### Vérifier la base `shipnology`

```sql
-- Vérifier les champs SMTP
SELECT 
  id,
  nom,
  slug,
  smtp_enabled,
  smtp_host,
  smtp_from_email
FROM organisations;

-- Résultat attendu : Colonnes SMTP présentes, slug généré
```

#### Vérifier une base d'organisation

```sql
-- Connexion à shipnology_velosi
\c shipnology_velosi

-- Vérifier que l'email est obligatoire
\d personnel

-- Résultat attendu : Column "email" avec constraint NOT NULL

-- Vérifier l'unicité des emails
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'personnel'
  AND constraint_type = 'UNIQUE';

-- Résultat attendu : unique_email_per_personnel

-- Tester une recherche insensible à la casse
EXPLAIN SELECT * FROM personnel WHERE LOWER(email) = LOWER('admin@velosi.com');

-- Résultat attendu : Index Scan using idx_personnel_email
```

---

## 🛠️ Résolution des Problèmes Courants

### Problème 1: Utilisateurs sans email

**Symptôme :**
```
ERROR: column "email" of relation "personnel" contains null values
```

**Solution :**
```sql
-- Identifier les utilisateurs sans email
SELECT id, nom, prenom, nom_utilisateur 
FROM personnel 
WHERE email IS NULL OR email = '';

-- Assigner un email temporaire basé sur le username
UPDATE personnel 
SET email = nom_utilisateur || '@temp.local'
WHERE email IS NULL OR email = '';

-- Puis réexécuter la migration
```

### Problème 2: Emails en doublon

**Symptôme :**
```
ERROR: duplicate key value violates unique constraint "unique_email_per_personnel"
```

**Solution :**
```sql
-- Trouver les doublons
SELECT email, COUNT(*) as count
FROM personnel
GROUP BY email
HAVING COUNT(*) > 1;

-- Corriger manuellement en ajoutant un suffixe
UPDATE personnel 
SET email = email || '.2'
WHERE id = 123; -- ID du doublon

-- Puis réexécuter la migration
```

### Problème 3: Slug déjà existant

**Symptôme :**
```
ERROR: duplicate key value violates unique constraint "organisations_slug_key"
```

**Solution :**
```sql
-- Afficher les slugs en conflit
SELECT slug, COUNT(*) 
FROM organisations 
GROUP BY slug 
HAVING COUNT(*) > 1;

-- Corriger manuellement
UPDATE organisations 
SET slug = 'velosi-2' 
WHERE id = 2 AND slug = 'velosi';
```

---

## 📊 Checklist de Migration

### Avant la migration

- [ ] **Backup complet** de toutes les bases de données
  ```powershell
  pg_dumpall -U msp > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
  ```

- [ ] Vérifier que tous les utilisateurs ont un email valide
  ```sql
  SELECT COUNT(*) FROM personnel WHERE email IS NULL;
  ```

- [ ] Vérifier l'absence de doublons d'email
  ```sql
  SELECT email, COUNT(*) FROM personnel GROUP BY email HAVING COUNT(*) > 1;
  ```

### Pendant la migration

- [ ] Exécuter `003_add_smtp_config_to_organisations.sql` sur `shipnology`
- [ ] Vérifier que les colonnes SMTP sont ajoutées
- [ ] Vérifier que les slugs sont générés
- [ ] Exécuter `004_enforce_unique_email_per_organisation.sql` sur chaque organisation
- [ ] Vérifier les contraintes d'unicité

### Après la migration

- [ ] Tester l'authentification par email
  ```bash
  curl -X POST http://localhost:3000/auth/multi-tenant/login \
    -H "Content-Type: application/json" \
    -d '{"identifier": "admin@velosi.com", "password": "password123"}'
  ```

- [ ] Tester l'authentification par username avec détection de conflit
  ```bash
  curl -X POST http://localhost:3000/auth/multi-tenant/login \
    -H "Content-Type: application/json" \
    -d '{"identifier": "admin", "password": "password123"}'
  ```

- [ ] Tester l'envoi d'email avec config globale
- [ ] Tester l'envoi d'email avec config organisation (si configurée)

---

## 🚀 Prochaines Étapes

### 1. Mettre à jour les services

```typescript
// app.module.ts
import { EnhancedMultiTenantAuthService } from './auth/enhanced-multi-tenant-auth.service';
import { MultiTenantEmailService } from './services/multi-tenant-email.service';

@Module({
  providers: [
    EnhancedMultiTenantAuthService,
    MultiTenantEmailService,
    // ...
  ],
})
```

### 2. Mettre à jour le frontend

```typescript
// login.component.ts
loginForm = this.fb.group({
  identifier: ['', [Validators.required, Validators.email]], // Accepter email OU username
  password: ['', Validators.required]
});

// Gérer l'erreur de conflit
this.authService.login(this.loginForm.value).subscribe({
  error: (error) => {
    if (error.error.code === 'MULTIPLE_ORGANISATIONS_FOUND') {
      // Afficher une modal pour choisir l'organisation
      this.showOrganisationSelector(error.error.organisations);
    }
  }
});
```

### 3. Configurer le SMTP par organisation (optionnel)

Dans l'interface admin :

```typescript
// admin/organisations/edit-smtp.component.ts
smtpForm = this.fb.group({
  smtp_enabled: [false],
  smtp_host: [''],
  smtp_port: [587],
  smtp_user: [''],
  smtp_password: [''],
  smtp_from_email: [''],
  smtp_from_name: [''],
  smtp_use_tls: [true]
});
```

---

## 📝 Notes Importantes

1. **Ordre d'exécution** : Toujours exécuter la migration sur `shipnology` avant les bases d'organisations

2. **Emails uniques** : Chaque email doit être unique DANS une organisation, pas globalement

3. **Slug** : Le slug est utilisé pour les URLs type `https://app.velosi-erp.com/login?org=velosi`

4. **SMTP Passwords** : En production, chiffrer avec AES-256 avant stockage

5. **Backward compatibility** : L'authentification par username continue de fonctionner, mais avec détection de conflits

6. **Performance** : Les index LOWER() permettent des recherches case-insensitive rapides
