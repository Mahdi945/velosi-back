# Script de rollback complet via Git
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ROLLBACK COMPLET VIA GIT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verifier si on est dans un repo git
if (-not (Test-Path ".git")) {
    Write-Host "[ERREUR] Ce n'est pas un depot Git!" -ForegroundColor Red
    Write-Host "Utilisez 'rollback-inverse-migration.ps1' pour un rollback partiel" -ForegroundColor Yellow
    exit 1
}

# Afficher les fichiers modifies
Write-Host "Fichiers qui seront restaures:" -ForegroundColor Yellow
git status --short | Where-Object { $_ -match "^\s*M\s+" }

Write-Host "`nATTENTION: Cette operation va SUPPRIMER toutes les modifications non commitees!" -ForegroundColor Red
$confirmation = Read-Host "Voulez-vous continuer? (oui/non)"

if ($confirmation -ne "oui") {
    Write-Host "`nRollback annule." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nRestauration en cours..." -ForegroundColor Yellow

# Restaurer tous les fichiers sources modifies
git checkout HEAD -- src/

# Supprimer les nouveaux fichiers crees par la migration
$newFiles = @(
    "src/common/tenant-aware.service.ts",
    "src/common/tenant-context.service.ts",
    "src/common/tenant-repository.provider.ts",
    "src/common/tenant-repository.service.ts"
)

foreach ($file in $newFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "  [OK] Supprime: $file" -ForegroundColor Green
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ROLLBACK TERMINE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tous les services ont ete restaures a leur etat original" -ForegroundColor Green
Write-Host "`nVerifiez avec: git status" -ForegroundColor Yellow
Write-Host "Recompilez avec: npm run build" -ForegroundColor Yellow
