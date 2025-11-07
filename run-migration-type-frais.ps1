# ==========================================
# SCRIPT D'EXÉCUTION DE LA MIGRATION
# Type Frais Annexes
# ==========================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " MIGRATION TYPE FRAIS ANNEXES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que le fichier SQL existe
if (-not (Test-Path "MIGRATION_TYPE_FRAIS_ANNEXES.sql")) {
    Write-Host "❌ ERREUR: Le fichier MIGRATION_TYPE_FRAIS_ANNEXES.sql est introuvable" -ForegroundColor Red
    Write-Host "   Assurez-vous d'exécuter ce script depuis le dossier velosi-back" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Fichier de migration trouvé" -ForegroundColor Green
Write-Host ""

# Menu de sélection
Write-Host "Sélectionnez l'environnement de base de données:" -ForegroundColor Yellow
Write-Host "1. Local (PostgreSQL local)" -ForegroundColor White
Write-Host "2. Railway (Production)" -ForegroundColor White
Write-Host "3. Supabase (Production)" -ForegroundColor White
Write-Host "4. Personnalisé (saisir la chaîne de connexion)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Votre choix (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔄 Connexion à PostgreSQL LOCAL..." -ForegroundColor Cyan
        
        # Paramètres par défaut pour local
        $env:PGHOST = "localhost"
        $env:PGPORT = "5432"
        $env:PGDATABASE = "velosi"
        $env:PGUSER = "msp"
        
        Write-Host "   Host: localhost" -ForegroundColor Gray
        Write-Host "   Port: 5432" -ForegroundColor Gray
        Write-Host "   Database: velosi" -ForegroundColor Gray
        Write-Host "   User: msp" -ForegroundColor Gray
        Write-Host ""
        
        $password = Read-Host "Mot de passe PostgreSQL" -AsSecureString
        $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
        
        psql -f MIGRATION_TYPE_FRAIS_ANNEXES.sql
    }
    
    "2" {
        Write-Host ""
        Write-Host "🔄 Connexion à RAILWAY (Production)..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  ATTENTION: Vous allez modifier la base de données de PRODUCTION" -ForegroundColor Yellow
        $confirm = Read-Host "Tapez 'OUI' pour confirmer"
        
        if ($confirm -ne "OUI") {
            Write-Host "❌ Migration annulée" -ForegroundColor Red
            exit 0
        }
        
        Write-Host ""
        $connectionString = Read-Host "Chaîne de connexion Railway (postgres://...)"
        
        psql $connectionString -f MIGRATION_TYPE_FRAIS_ANNEXES.sql
    }
    
    "3" {
        Write-Host ""
        Write-Host "🔄 Connexion à SUPABASE (Production)..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  ATTENTION: Vous allez modifier la base de données de PRODUCTION" -ForegroundColor Yellow
        $confirm = Read-Host "Tapez 'OUI' pour confirmer"
        
        if ($confirm -ne "OUI") {
            Write-Host "❌ Migration annulée" -ForegroundColor Red
            exit 0
        }
        
        Write-Host ""
        Write-Host "Format attendu:" -ForegroundColor Gray
        Write-Host "postgresql://postgres.xxxxx:password@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" -ForegroundColor Gray
        Write-Host ""
        $connectionString = Read-Host "Chaîne de connexion Supabase"
        
        psql $connectionString -f MIGRATION_TYPE_FRAIS_ANNEXES.sql
    }
    
    "4" {
        Write-Host ""
        Write-Host "🔄 Connexion PERSONNALISÉE..." -ForegroundColor Cyan
        Write-Host ""
        $connectionString = Read-Host "Chaîne de connexion complète (postgres://...)"
        
        psql $connectionString -f MIGRATION_TYPE_FRAIS_ANNEXES.sql
    }
    
    default {
        Write-Host "❌ Choix invalide" -ForegroundColor Red
        exit 1
    }
}

# Vérifier le code de sortie
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host " ✅ MIGRATION RÉUSSIE !" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "1. Redémarrer le backend (Railway redémarre automatiquement)" -ForegroundColor White
    Write-Host "2. Tester l'endpoint: GET /crm/type-frais-annexes/active" -ForegroundColor White
    Write-Host "3. Déployer le frontend sur Vercel" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Consultez GUIDE_TYPE_FRAIS_ANNEXES.md pour plus d'informations" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host " ❌ ERREUR LORS DE LA MIGRATION" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez:" -ForegroundColor Yellow
    Write-Host "1. Que PostgreSQL est installé et accessible" -ForegroundColor White
    Write-Host "2. Que les informations de connexion sont correctes" -ForegroundColor White
    Write-Host "3. Que vous avez les droits sur la base de données" -ForegroundColor White
    Write-Host "4. Les logs d'erreur ci-dessus" -ForegroundColor White
}

Write-Host ""
Read-Host "Appuyez sur Entrée pour quitter"
