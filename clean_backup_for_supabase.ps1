# Script pour nettoyer le backup SQL pour Supabase
# Ce script supprime les commandes backslash et réorganise le fichier

$inputFile = "backup_velosi.sql"
$outputFile = "backup_velosi_supabase_final.sql"

Write-Host "🔄 Nettoyage du fichier SQL pour Supabase..." -ForegroundColor Cyan

# Lire le fichier et filtrer les lignes
$content = Get-Content $inputFile -Encoding UTF8

$cleanedContent = @()
$skipNextLine = $false

foreach ($line in $content) {
    # Ignorer les lignes commençant par \restrict ou \unrestrict
    if ($line -match '^\s*\\restrict' -or $line -match '^\s*\\unrestrict') {
        Write-Host "❌ Suppression: $line" -ForegroundColor Yellow
        continue
    }
    
    # Ajouter la ligne nettoyée
    $cleanedContent += $line
}

# Sauvegarder le fichier nettoyé
$cleanedContent | Set-Content $outputFile -Encoding UTF8

Write-Host "✅ Fichier nettoyé créé: $outputFile" -ForegroundColor Green
Write-Host "📊 Lignes originales: $($content.Count)" -ForegroundColor Cyan
Write-Host "📊 Lignes nettoyées: $($cleanedContent.Count)" -ForegroundColor Cyan
Write-Host "📊 Lignes supprimées: $($content.Count - $cleanedContent.Count)" -ForegroundColor Yellow

Write-Host "`n🎯 Fichier prêt pour import!" -ForegroundColor Magenta
Write-Host "Executez la commande psql maintenant." -ForegroundColor White
