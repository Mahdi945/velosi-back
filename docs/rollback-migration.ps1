# Script de rollback - Restaure tous les fichiers depuis les backups
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ROLLBACK MIGRATION MULTI-TENANT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Rechercher tous les fichiers .backup
Write-Host "Recherche des fichiers backup..." -ForegroundColor Yellow
$backupFiles = Get-ChildItem -Path "src" -Filter "*.backup" -Recurse -File

if ($backupFiles.Count -eq 0) {
    Write-Host "`n[ERREUR] Aucun fichier backup trouve!" -ForegroundColor Red
    Write-Host "Les fichiers ont peut-etre deja ete restaures ou les backups ont ete supprimes." -ForegroundColor Yellow
    exit 1
}

Write-Host "Trouve $($backupFiles.Count) fichier(s) backup`n" -ForegroundColor Green

# Confirmer le rollback
Write-Host "ATTENTION: Cette operation va ECRASER les fichiers modifies!" -ForegroundColor Red
$confirmation = Read-Host "Voulez-vous continuer? (oui/non)"

if ($confirmation -ne "oui") {
    Write-Host "`nRollback annule." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nRestauration en cours..." -ForegroundColor Yellow
$restoredCount = 0
$errors = @()

foreach ($backupFile in $backupFiles) {
    $originalFile = $backupFile.FullName -replace '\.backup$', ''
    
    try {
        # Restaurer le fichier original
        Copy-Item -Path $backupFile.FullName -Destination $originalFile -Force
        Write-Host "  [OK] Restaure: $($backupFile.Name -replace '\.backup$', '')" -ForegroundColor Green
        $restoredCount++
        
        # Supprimer le backup
        Remove-Item -Path $backupFile.FullName -Force
    }
    catch {
        $errors += "Erreur sur $($backupFile.Name): $($_.Exception.Message)"
        Write-Host "  [ERREUR] $($backupFile.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Resume
Write-Host "`n========================================" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "ROLLBACK TERMINE AVEC SUCCES" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "$restoredCount fichier(s) restaure(s)" -ForegroundColor Green
    Write-Host "Tous les backups ont ete supprimes" -ForegroundColor Green
} else {
    Write-Host "ROLLBACK TERMINE AVEC ERREURS" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "$restoredCount fichier(s) restaure(s)" -ForegroundColor Green
    Write-Host "$($errors.Count) erreur(s) rencontree(s)" -ForegroundColor Red
    Write-Host "`nDetails des erreurs:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

Write-Host "`nRelancez 'npm run start:dev' pour verifier" -ForegroundColor Yellow
