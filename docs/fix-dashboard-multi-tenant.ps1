# Script de correction Multi-Tenant Dashboard Service
# Supprime organisation_id des tables CRM qui ne l'ont pas

$filePath = "src\services\dashboard.service.ts"
$content = Get-Content $filePath -Raw

# 1. Supprimer organisation_id des requêtes crm_leads
$content = $content -replace 'SELECT COUNT\(\*\) as count FROM crm_leads WHERE organisation_id = \$1', 'SELECT COUNT(*) as count FROM crm_leads'
$content = $content -replace 'FROM crm_leads WHERE organisation_id = \$1 AND', 'FROM crm_leads WHERE'
$content = $content -replace 'FROM crm_leads\s+WHERE organisation_id = \$1', 'FROM crm_leads'
$content = $content -replace 'crm_leads l[\s\n]+WHERE l\.organisation_id = \$1', 'crm_leads l'

# 2. Supprimer organisation_id des requêtes crm_opportunities
$content = $content -replace 'FROM crm_opportunities WHERE organisation_id = \$1 AND', 'FROM crm_opportunities WHERE'
$content = $content -replace 'FROM crm_opportunities\s+WHERE organisation_id = \$1', 'FROM crm_opportunities'
$content = $content -replace 'FROM opportunities WHERE organisation_id = \$1', 'FROM opportunities'
$content = $content -replace 'FROM opportunities[\s\n]+WHERE organisation_id = \$1', 'FROM opportunities'

# 3. Supprimer organisation_id des requêtes crm_quotes
$content = $content -replace 'FROM crm_quotes WHERE organisation_id = \$1 AND', 'FROM crm_quotes WHERE'
$content = $content -replace 'FROM crm_quotes\s+WHERE organisation_id = \$1', 'FROM crm_quotes'
$content = $content -replace 'WHERE deleted_at IS NULL[\s\n]+AND organisation_id = \$1', 'WHERE deleted_at IS NULL'

# 4. Supprimer les JOIN avec organisation_id pour les tables CRM
$content = $content -replace 'AND p\.organisation_id = l\.organisation_id', ''
$content = $content -replace 'AND p\.organisation_id = o\.organisation_id', ''

# 5. Ajuster les paramètres des requêtes (remplacer $1, $2 par index correct)
# Ceci nécessitera une vérification manuelle

Set-Content $filePath $content -NoNewline

Write-Host "✅ Corrections appliquées à dashboard.service.ts" -ForegroundColor Green
Write-Host "⚠️ ATTENTION: Vérifiez manuellement les index de paramètres (\$1, \$2, etc.)" -ForegroundColor Yellow
