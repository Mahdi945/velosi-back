# Script de correction automatique - Création client lors acceptation cotation
# Date: 21 octobre 2025

$filePath = "src\crm\services\quotes.service.ts"

Write-Host "🔧 Application des corrections dans quotes.service.ts..." -ForegroundColor Cyan

# Lire le contenu du fichier
$content = Get-Content $filePath -Raw

# Correction 1: Remplacer 'client' as any par LeadStatus.CLIENT (2 occurrences)
Write-Host "📝 Correction 1: Remplacement de 'client' as any par LeadStatus.CLIENT..." -ForegroundColor Yellow
$content = $content -replace "lead\.status = 'client' as any;", "lead.status = LeadStatus.CLIENT;"
$content = $content -replace "opportunity\.lead\.status = 'client' as any;", "opportunity.lead.status = LeadStatus.CLIENT;"

# Correction 2: Remplacer clientData = { par clientData: any = { (3 occurrences)
Write-Host "Correction 2: Ajout du typage explicite pour clientData..." -ForegroundColor Yellow
$content = $content -replace 'const clientData = \{', 'const clientData: any = {'

# Correction 3: Supprimer les casts as any inutiles (3 occurrences)
Write-Host "Correction 3: Suppression des casts as any inutiles..." -ForegroundColor Yellow
$content = $content -replace 'this\.clientService\.create\(clientData as any\)', 'this.clientService.create(clientData)'

# Sauvegarder le fichier modifié
Set-Content $filePath -Value $content

Write-Host "✅ Corrections appliquées avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Résumé des corrections:" -ForegroundColor Cyan
Write-Host "  - Utilisation de LeadStatus.CLIENT au lieu de 'client' as any" -ForegroundColor White
Write-Host "  - Typage explicite const clientData: any = { ... }" -ForegroundColor White
Write-Host "  - Suppression des casts as any inutiles" -ForegroundColor White
Write-Host ""
Write-Host "Prochaines etapes:" -ForegroundColor Yellow
Write-Host "  1. Verifier les changements avec: git diff src/crm/services/quotes.service.ts" -ForegroundColor White
Write-Host "  2. Redemarrer le backend: npm run start:dev" -ForegroundColor White
Write-Host "  3. Tester acceptation d une cotation" -ForegroundColor White
