# Script de rollback - Inverse toutes les transformations de la migration multi-tenant
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ROLLBACK INVERSE - MIGRATION MULTI-TENANT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "ATTENTION: Ce script va annuler TOUTES les modifications de la migration!" -ForegroundColor Red
$confirmation = Read-Host "Voulez-vous continuer? (oui/non)"

if ($confirmation -ne "oui") {
    Write-Host "`nRollback annule." -ForegroundColor Yellow
    exit 0
}

$services = @(
    "src\services\dashboard.service.ts",
    "src\gestion-ressources\engins.service.ts",
    "src\gestion-ressources\navires.service.ts",
    "src\gestion-ressources\armateurs.service.ts",
    "src\gestion-ressources\fournisseurs.service.ts",
    "src\gestion-ressources\ports.service.ts",
    "src\gestion-ressources\aeroports.service.ts",
    "src\users\users.service.ts",
    "src\services\personnel.service.ts",
    "src\services\client-tva.service.ts",
    "src\crm\services\reports.service.ts",
    "src\correspondants\correspondants.service.ts",
    "src\services\crm\lead.service.ts",
    "src\services\crm\opportunity.service.ts",
    "src\services\keycloak-sync.service.ts",
    "src\services\location.service.ts",
    "src\services\login-history.service.ts",
    "src\services\objectif-com.service.ts",
    "src\services\setup.service.ts",
    "src\vechat\vechat.service.ts"
)

$rollbackCount = 0

Write-Host "`nInversion des transformations...`n" -ForegroundColor Yellow

foreach ($file in $services) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  [SKIP] Fichier non trouve: $file" -ForegroundColor Gray
        continue
    }
    
    Write-Host "Traitement: $file" -ForegroundColor Yellow
    $content = Get-Content $fullPath -Raw -Encoding UTF8
    $originalContent = $content
    $changed = $false
    
    # 1. Retirer l'import TenantRepositoryService
    if ($content -match "import \{ TenantRepositoryService \} from") {
        $content = $content -replace "import \{ TenantRepositoryService \} from '[^']+';?\r?\n", ""
        $changed = $true
    }
    
    # 2. Retirer les imports Scope, REQUEST, Inject ajoutes pour multi-tenant
    $content = $content -replace ", Scope(?=\s*\})", ""
    $content = $content -replace ", Inject(?=\s*\})", ""
    $content = $content -replace ", REQUEST(?=\s*\})", ""
    $content = $content -replace "import \{ Inject \} from '@nestjs/common';\r?\n", ""
    $content = $content -replace "import \{ REQUEST \} from '@nestjs/core';\r?\n", ""
    
    # 3. Retirer { scope: Scope.REQUEST } des @Injectable()
    if ($content -match "@Injectable\(\{ scope: Scope\.REQUEST \}\)") {
        $content = $content -replace "@Injectable\(\{ scope: Scope\.REQUEST \}\)", "@Injectable()"
        $changed = $true
    }
    
    # 4. Retirer l'injection de TenantRepositoryService du constructeur
    if ($content -match "private tenantRepos: TenantRepositoryService,?\s*") {
        $content = $content -replace ",?\s*private tenantRepos: TenantRepositoryService,?\s*", ""
        $changed = $true
    }
    
    # 5. Pattern complexe: restaurer les @InjectRepository
    # Cette partie est complexe car il faut retrouver les entites utilisees
    # Pour simplifier, on va marquer le fichier comme necessitant une revision manuelle
    if ($content -match "tenantRepos\.get\w+Repository\(\)") {
        Write-Host "  [ATTENTION] Ce fichier utilise tenantRepos et necessite une revision manuelle" -ForegroundColor Yellow
        $changed = $true
    }
    
    # Sauvegarder si modifie
    if ($changed -or $content -ne $originalContent) {
        Set-Content $fullPath -Value $content -Encoding UTF8 -NoNewline
        Write-Host "  [OK] Modifications inversees" -ForegroundColor Green
        $rollbackCount++
    } else {
        Write-Host "  [SKIP] Aucune modification multi-tenant detectee" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ROLLBACK PARTIEL TERMINE" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "$rollbackCount fichier(s) modifie(s)" -ForegroundColor Green

Write-Host "`n[IMPORTANT] Actions manuelles requises:" -ForegroundColor Red
Write-Host "1. Restaurer les @InjectRepository dans les constructeurs" -ForegroundColor Yellow
Write-Host "2. Remplacer 'await this.tenantRepos.getXxxRepository()' par 'this.xxxRepository'" -ForegroundColor Yellow
Write-Host "3. Verifier que tous les repositories sont correctement injectes" -ForegroundColor Yellow
Write-Host "`nPour une restauration complete, utilisez Git:" -ForegroundColor Cyan
Write-Host "  git checkout HEAD -- src/" -ForegroundColor White
