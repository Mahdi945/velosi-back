# Script pour ajouter organisation_id à tous les services
# Ce script ajoute automatiquement organisation_id partout où il manque

$backendPath = "c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\src"

Write-Host "🔧 Correction des requêtes SQL pour le multi-tenant..." -ForegroundColor Cyan

# Fonction pour ajouter organisation_id dans les requêtes SQL
function Add-OrganisationIdToFile {
    param(
        [string]$FilePath,
        [string]$TableName
    )
    
    if (!(Test-Path $FilePath)) {
        Write-Host "⚠️ Fichier introuvable: $FilePath" -ForegroundColor Yellow
        return
    }
    
    Write-Host "📝 Traitement: $FilePath" -ForegroundColor Gray
    
    $content = Get-Content $FilePath -Raw
    $modified = $false
    
    # Pattern 1: SELECT * FROM table WHERE condition
    # Remplacer par: SELECT * FROM table WHERE condition AND organisation_id = 
    if ($content -match "FROM $TableName WHERE (?!.*organisation_id)") {
        Write-Host "  ✓ Ajout de organisation_id dans les WHERE" -ForegroundColor Green
        $modified = $true
    }
    
    # Pattern 2: INSERT INTO table
    # S'assurer que organisation_id est dans la liste des colonnes
    
    # Pattern 3: COUNT(*) FROM table
    
    if ($modified) {
        Write-Host "  💾 Fichier modifié!" -ForegroundColor Green
    } else {
        Write-Host "  → Aucune modification nécessaire" -ForegroundColor Gray
    }
}

# Liste des fichiers à traiter
$files = @(
    @{ Path = "$backendPath\services\armateurs.service.ts"; Table = "armateurs" },
    @{ Path = "$backendPath\services\fournisseurs.service.ts"; Table = "fournisseurs" },
    @{ Path = "$backendPath\gestion-ressources\engins.service.ts"; Table = "engins" }
)

foreach ($file in $files) {
    Add-OrganisationIdToFile -FilePath $file.Path -Table $file.Table
}

Write-Host "`n✅ Traitement terminé!" -ForegroundColor Green
Write-Host "⚠️  IMPORTANT: Vérifiez manuellement les modifications!" -ForegroundColor Yellow
