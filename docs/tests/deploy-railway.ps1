# ============================================
# Script : Déployer Backend sur Railway
# ============================================
# Ce script configure automatiquement les variables Railway

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 DÉPLOIEMENT BACKEND SUR RAILWAY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Railway CLI est installé
try {
    railway --version | Out-Null
    Write-Host "✅ Railway CLI installé" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI non installé" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Installation :" -ForegroundColor Yellow
    Write-Host "   npm install -g @railway/cli" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""

# Vérifier que .env.production existe
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ ERREUR : Fichier .env.production introuvable !" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host "✅ Fichier .env.production trouvé" -ForegroundColor Green
Write-Host ""

# Demander confirmation
Write-Host "⚠️ ATTENTION :" -ForegroundColor Yellow
Write-Host "   Ce script va :" -ForegroundColor White
Write-Host "   1. Lire .env.production" -ForegroundColor White
Write-Host "   2. Configurer TOUTES les variables dans Railway" -ForegroundColor White
Write-Host "   3. Déployer le backend" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continuer ? (O/N)"
if ($confirm -ne "O" -and $confirm -ne "o") {
    Write-Host "Abandon" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 ÉTAPE 1 : Connexion Railway" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Connexion Railway
railway login

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔗 ÉTAPE 2 : Lier le projet" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Lier le projet (si pas déjà fait)
railway link

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚙️ ÉTAPE 3 : Configuration Variables" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️ MÉTHODE RECOMMANDÉE : Configuration manuelle" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Ouvrez Railway Dashboard : https://railway.app" -ForegroundColor White
Write-Host "2. Sélectionnez votre service 'velosi-back'" -ForegroundColor White
Write-Host "3. Allez dans l'onglet 'Variables'" -ForegroundColor White
Write-Host "4. Copiez-collez les variables depuis .env.production" -ForegroundColor White
Write-Host ""

Write-Host "📋 Variables à configurer :" -ForegroundColor Cyan
Write-Host ""

# Lire et afficher les variables (sans les valeurs sensibles)
$envContent = Get-Content ".env.production" | Where-Object { $_ -notmatch '^#' -and $_ -notmatch '^\s*$' }

foreach ($line in $envContent) {
    if ($line -match '=') {
        $key = $line.Split('=')[0]
        Write-Host "   - $key" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "💡 Alternative : Utiliser Railway CLI" -ForegroundColor Yellow
Write-Host "   Commandes individuelles :" -ForegroundColor White
Write-Host '   railway variables set DB_ADDR="aws-1-eu-north-1.pooler.supabase.com"' -ForegroundColor Gray
Write-Host '   railway variables set DB_PORT="5432"' -ForegroundColor Gray
Write-Host "   ..." -ForegroundColor Gray
Write-Host ""

$useManual = Read-Host "Variables configurées manuellement dans Railway ? (O/N)"
if ($useManual -ne "O" -and $useManual -ne "o") {
    Write-Host "Veuillez configurer les variables d'abord" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 ÉTAPE 4 : Déploiement" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Option 1 : Via Git push (Railway détecte automatiquement)
Write-Host "Option 1 : Git Push (Recommandé)" -ForegroundColor Yellow
Write-Host "   git add ." -ForegroundColor Cyan
Write-Host "   git commit -m 'Deploy backend to Railway'" -ForegroundColor Cyan
Write-Host "   git push origin main" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option 2 : Railway CLI" -ForegroundColor Yellow
Write-Host "   railway up" -ForegroundColor Cyan
Write-Host ""

$deployMethod = Read-Host "Méthode de déploiement (1=Git, 2=CLI)"

if ($deployMethod -eq "1") {
    Write-Host ""
    Write-Host "📦 Commit et push..." -ForegroundColor White
    
    git add .
    git commit -m "Deploy backend to Railway with production config"
    git push origin main
    
    Write-Host ""
    Write-Host "✅ Push effectué !" -ForegroundColor Green
    Write-Host "   Railway va détecter le push et déployer automatiquement" -ForegroundColor White
    Write-Host ""
    Write-Host "🔗 Voir les logs : https://railway.app" -ForegroundColor Cyan
    
} elseif ($deployMethod -eq "2") {
    Write-Host ""
    Write-Host "🚀 Déploiement via Railway CLI..." -ForegroundColor White
    
    railway up
    
    Write-Host ""
    Write-Host "✅ Déploiement terminé !" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DÉPLOIEMENT TERMINÉ" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📝 Prochaines étapes :" -ForegroundColor White
Write-Host ""
Write-Host "1. Vérifier les logs dans Railway Dashboard" -ForegroundColor Yellow
Write-Host "2. Copier l'URL générée : https://velosi-back-xxx.up.railway.app" -ForegroundColor Yellow
Write-Host "3. Mettre à jour le frontend avec la nouvelle URL backend" -ForegroundColor Yellow
Write-Host "4. Tester les endpoints : https://velosi-back-xxx.up.railway.app/api" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔗 Railway Dashboard : https://railway.app" -ForegroundColor Cyan
Write-Host ""

$openDashboard = Read-Host "Ouvrir Railway Dashboard ? (O/N)"
if ($openDashboard -eq "O" -or $openDashboard -eq "o") {
    Start-Process "https://railway.app"
}

Write-Host ""
Write-Host "✅ Script terminé !" -ForegroundColor Green
Write-Host ""
