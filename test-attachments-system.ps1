# Script de test du système de pièces jointes
# Date: 16 Octobre 2025

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "TEST DU SYSTÈME DE PIÈCES JOINTES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Vérifier la structure des dossiers
Write-Host "1. Vérification de la structure des dossiers..." -ForegroundColor Yellow
$uploadsPath = "uploads\activites"
$tempPath = "uploads\activites\temp"

if (Test-Path $uploadsPath) {
    Write-Host "   ✅ Dossier uploads/activites existe" -ForegroundColor Green
} else {
    Write-Host "   ❌ Dossier uploads/activites n'existe pas. Création..." -ForegroundColor Red
    New-Item -ItemType Directory -Path $uploadsPath -Force | Out-Null
    Write-Host "   ✅ Dossier créé" -ForegroundColor Green
}

if (Test-Path $tempPath) {
    Write-Host "   ✅ Dossier uploads/activites/temp existe" -ForegroundColor Green
} else {
    Write-Host "   ❌ Dossier uploads/activites/temp n'existe pas. Création..." -ForegroundColor Red
    New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
    Write-Host "   ✅ Dossier créé" -ForegroundColor Green
}

Write-Host ""

# 2. Vérifier les migrations
Write-Host "2. Vérification de la migration..." -ForegroundColor Yellow
$migrationFile = "migrations\1729084800000-AddAttachmentsToActivities.ts"

if (Test-Path $migrationFile) {
    Write-Host "   ✅ Fichier de migration existe" -ForegroundColor Green
} else {
    Write-Host "   ❌ Fichier de migration introuvable" -ForegroundColor Red
}

Write-Host ""

# 3. Vérifier les packages npm
Write-Host "3. Vérification des packages npm..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" | ConvertFrom-Json

$requiredPackages = @(
    "@nestjs/platform-express",
    "multer"
)

foreach ($package in $requiredPackages) {
    if ($packageJson.dependencies.PSObject.Properties.Name -contains $package) {
        $version = $packageJson.dependencies.$package
        Write-Host "   ✅ $package ($version)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $package manquant" -ForegroundColor Red
    }
}

Write-Host ""

# 4. Vérifier la base de données
Write-Host "4. Vérification de la colonne attachments..." -ForegroundColor Yellow
Write-Host "   ⚠️  Exécutez cette requête SQL pour vérifier:" -ForegroundColor Yellow
Write-Host "   SELECT column_name, data_type" -ForegroundColor Cyan
Write-Host "   FROM information_schema.columns" -ForegroundColor Cyan
Write-Host "   WHERE table_name = 'crm_activities'" -ForegroundColor Cyan
Write-Host "   AND column_name = 'attachments';" -ForegroundColor Cyan

Write-Host ""

# 5. Statistiques des fichiers uploadés
Write-Host "5. Statistiques des fichiers..." -ForegroundColor Yellow
$totalFiles = 0
$totalSize = 0

if (Test-Path $uploadsPath) {
    Get-ChildItem -Path $uploadsPath -Recurse -File | ForEach-Object {
        $totalFiles++
        $totalSize += $_.Length
    }
    
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    Write-Host "   📊 Nombre total de fichiers: $totalFiles" -ForegroundColor Cyan
    Write-Host "   📊 Taille totale: $totalSizeMB MB" -ForegroundColor Cyan
    
    # Liste des activités avec fichiers
    $activityFolders = Get-ChildItem -Path $uploadsPath -Directory | Where-Object { $_.Name -ne "temp" }
    Write-Host "   📊 Activités avec fichiers: $($activityFolders.Count)" -ForegroundColor Cyan
    
    if ($activityFolders.Count -gt 0) {
        Write-Host ""
        Write-Host "   Détails par activité:" -ForegroundColor White
        foreach ($folder in $activityFolders) {
            $fileCount = (Get-ChildItem -Path $folder.FullName -File).Count
            $folderSize = (Get-ChildItem -Path $folder.FullName -File | Measure-Object -Property Length -Sum).Sum
            $folderSizeMB = [math]::Round($folderSize / 1MB, 2)
            Write-Host "      - Activité $($folder.Name): $fileCount fichier(s), $folderSizeMB MB" -ForegroundColor Gray
        }
    }
}

Write-Host ""

# 6. Test de connectivité backend
Write-Host "6. Test de connectivité backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend accessible (http://localhost:3000)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Backend non accessible. Démarrez-le avec: npm run start:dev" -ForegroundColor Yellow
}

Write-Host ""

# 7. Checklist des tests à effectuer
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "CHECKLIST DES TESTS À EFFECTUER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$tests = @(
    "[ ] 1. MODE AJOUT: Créer une activité → Ajouter 2 fichiers → Enregistrer",
    "[ ] 2. MODE AJOUT: Vérifier que les fichiers sont uploadés avec l'activité",
    "[ ] 3. MODE AJOUT: Supprimer un fichier temporaire avant enregistrement",
    "[ ] 4. MODE MODIFICATION: Ouvrir une activité → Ajouter 1 fichier → Uploader",
    "[ ] 5. MODE MODIFICATION: Vérifier le message de succès immédiat",
    "[ ] 6. MODE MODIFICATION: Modal reste ouvert après upload",
    "[ ] 7. VISUALISATION: Ouvrir détails → Voir les pièces jointes",
    "[ ] 8. TÉLÉCHARGEMENT: Télécharger une image",
    "[ ] 9. TÉLÉCHARGEMENT: Télécharger un PDF",
    "[ ] 10. SUPPRESSION: Supprimer un fichier avec confirmation",
    "[ ] 11. VALIDATION: Essayer d'uploader un fichier > 10MB",
    "[ ] 12. VALIDATION: Essayer d'uploader plus de 10 fichiers",
    "[ ] 13. VALIDATION: Essayer d'uploader un type non autorisé (.exe)",
    "[ ] 14. ERREUR: Tester avec backend arrêté",
    "[ ] 15. UI: Vérifier la responsiveness sur mobile"
)

foreach ($test in $tests) {
    Write-Host $test -ForegroundColor White
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "COMMANDES UTILES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Démarrer le backend:" -ForegroundColor Yellow
Write-Host "   cd velosi-back && npm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Démarrer le frontend:" -ForegroundColor Yellow
Write-Host "   cd velosi-front && npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appliquer la migration:" -ForegroundColor Yellow
Write-Host "   cd velosi-back && npm run migration:run" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nettoyer les fichiers de test:" -ForegroundColor Yellow
Write-Host "   Remove-Item -Path 'uploads\activites\*' -Recurse -Force -Exclude temp" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Vérification terminée!" -ForegroundColor Green
Write-Host ""
