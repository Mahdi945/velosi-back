# ===============================================
# 🔒 SCRIPT DE NETTOYAGE DE L'HISTORIQUE GIT (WINDOWS)
# ===============================================
# 
# Ce script supprime les credentials SMTP de l'historique Git
# ⚠️ ATTENTION: Cette opération réécrit l'historique Git!
# 
# Instructions:
# 1. Faire un backup complet du dépôt
# 2. Exécuter ce script: .\clean-git-history.ps1
# 3. Force push vers le remote (coordonner avec l'équipe!)
# 
# ===============================================

Write-Host "🔒 NETTOYAGE DE L'HISTORIQUE GIT" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  ATTENTION: Ce script va réécrire l'historique Git!" -ForegroundColor Yellow
Write-Host "⚠️  Assurez-vous d'avoir un backup complet avant de continuer." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Voulez-vous continuer? (oui/non)"

if ($confirm -ne "oui") {
    Write-Host "❌ Annulé par l'utilisateur" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Vérification de git-filter-repo..." -ForegroundColor Yellow

# Vérifier si Python est installé
$pythonInstalled = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonInstalled) {
    Write-Host "❌ Python n'est pas installé. Installez Python 3 puis réessayez." -ForegroundColor Red
    exit 1
}

# Installer git-filter-repo
Write-Host "Installation de git-filter-repo..."
pip install git-filter-repo

Write-Host ""
Write-Host "🧹 Suppression des credentials de l'historique..." -ForegroundColor Yellow

# Créer un fichier temporaire avec les patterns à supprimer
$tempFile = "$env:TEMP\credentials-patterns.txt"
@"
qaas amak tyqq rzet
velosierp@gmail.com
SMTP_PASSWORD.*qaas
"@ | Out-File -FilePath $tempFile -Encoding UTF8

# Utiliser git-filter-repo pour nettoyer l'historique
Write-Host "Exécution de git-filter-repo..."
git filter-repo --replace-text $tempFile --force

Write-Host ""
Write-Host "✅ Nettoyage terminé!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 PROCHAINES ÉTAPES:" -ForegroundColor Cyan
Write-Host "1. Vérifier que le code fonctionne toujours"
Write-Host "2. Créer un fichier .env avec les vraies credentials"
Write-Host "3. Coordonner avec l'équipe pour le force push"
Write-Host "4. Exécuter: git push origin --force --all"
Write-Host "5. Révoquer l'ancien mot de passe SMTP sur Gmail"
Write-Host "6. Générer un nouveau mot de passe d'application Gmail"
Write-Host ""
Write-Host "⚠️  N'oubliez pas de prévenir toute l'équipe avant le force push!" -ForegroundColor Yellow

# Nettoyer
Remove-Item $tempFile -ErrorAction SilentlyContinue
