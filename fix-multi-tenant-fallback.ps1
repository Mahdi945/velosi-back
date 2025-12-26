# Script PowerShell pour remplacer le fallback 'velosi' par la fonction getDatabaseName
# Ce script corrige le problème multi-tenant où les données de 'velosi' étaient affichées
# pour toutes les organisations

$rootPath = "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\src\controllers"

Write-Host "🔍 Recherche de tous les fichiers contenant le fallback 'velosi'..." -ForegroundColor Cyan

# Trouver tous les fichiers TypeScript dans controllers
$files = Get-ChildItem -Path $rootPath -Filter "*.ts" -Recurse

$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Pattern 1: const databaseName = req.user?.databaseName || 'velosi';
    # Remplacer par: const databaseName = getDatabaseName(req);
    $pattern1 = "const databaseName = req\.user\?\.databaseName \|\| 'velosi';"
    $replacement1 = "const databaseName = getDatabaseName(req);"
    
    # Pattern 2: const databaseName = req?.user?.databaseName || 'velosi';
    $pattern2 = "const databaseName = req\?\.user\?\.databaseName \|\| 'velosi';"
    $replacement2 = "const databaseName = getDatabaseName(req);"
    
    $content = $content -replace $pattern1, $replacement1
    $content = $content -replace $pattern2, $replacement2
    
    # Vérifier si des modifications ont été faites
    if ($content -ne $originalContent) {
        # Ajouter l'import si nécessaire
        if ($content -notmatch "import \{ getDatabaseName \}") {
            # Trouver la dernière ligne d'import
            $lines = $content -split "`n"
            $lastImportIndex = -1
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import ") {
                    $lastImportIndex = $i
                }
            }
            
            if ($lastImportIndex -ge 0) {
                # Insérer le nouvel import après la dernière ligne d'import
                $lines = @(
                    $lines[0..$lastImportIndex]
                    "import { getDatabaseName } from '../common/helpers/multi-tenant.helper';"
                    $lines[($lastImportIndex + 1)..($lines.Count - 1)]
                )
                $content = $lines -join "`n"
            }
        }
        
        # Sauvegarder le fichier modifié
        Set-Content -Path $file.FullName -Value $content -NoNewline
        
        $replacements = ([regex]::Matches($originalContent, $pattern1)).Count + ([regex]::Matches($originalContent, $pattern2)).Count
        $totalReplacements += $replacements
        
        Write-Host "✅ Modifié: $($file.Name) ($replacements remplacement(s))" -ForegroundColor Green
    }
}

Write-Host "`n✅ Terminé! Total: $totalReplacements remplacement(s) dans $($files.Count) fichier(s)" -ForegroundColor Green
Write-Host "🏢 Les controllers utilisent maintenant getDatabaseName() qui lève une erreur si databaseName est manquant" -ForegroundColor Cyan
