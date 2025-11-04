# ============================================
# Script de Nettoyage - Keycloak Local Docker
# ============================================
# Ce script arrête et supprime les conteneurs Keycloak de test local

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧹 Nettoyage Keycloak Docker Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$cleaned = $false

# Nettoyer Docker Compose
Write-Host "🔍 Recherche de services Docker Compose..." -ForegroundColor White
if (Test-Path "docker-compose.keycloak.yml") {
    $composeServices = docker-compose -f docker-compose.keycloak.yml ps -q 2>$null
    if ($composeServices) {
        Write-Host "📦 Services Docker Compose trouvés" -ForegroundColor Yellow
        $stopCompose = Read-Host "Voulez-vous arrêter et supprimer les services Docker Compose ? (O/N)"
        if ($stopCompose -eq "O" -or $stopCompose -eq "o") {
            Write-Host "🛑 Arrêt des services..." -ForegroundColor White
            docker-compose -f docker-compose.keycloak.yml down -v
            Write-Host "✅ Services Docker Compose arrêtés et supprimés" -ForegroundColor Green
            $cleaned = $true
        }
    } else {
        Write-Host "✅ Aucun service Docker Compose actif" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ Fichier docker-compose.keycloak.yml introuvable" -ForegroundColor Yellow
}

Write-Host ""

# Nettoyer le conteneur Docker seul
Write-Host "🔍 Recherche du conteneur keycloak-test..." -ForegroundColor White
$keycloakTest = docker ps -a --filter "name=keycloak-test" --format "{{.Names}}" 2>$null
if ($keycloakTest) {
    Write-Host "📦 Conteneur keycloak-test trouvé" -ForegroundColor Yellow
    $stopContainer = Read-Host "Voulez-vous arrêter et supprimer le conteneur keycloak-test ? (O/N)"
    if ($stopContainer -eq "O" -or $stopContainer -eq "o") {
        Write-Host "🛑 Arrêt et suppression..." -ForegroundColor White
        docker rm -f keycloak-test
        Write-Host "✅ Conteneur keycloak-test supprimé" -ForegroundColor Green
        $cleaned = $true
    }
} else {
    Write-Host "✅ Aucun conteneur keycloak-test trouvé" -ForegroundColor Green
}

Write-Host ""

# Nettoyer les volumes orphelins
Write-Host "🔍 Recherche de volumes Docker orphelins..." -ForegroundColor White
$volumes = docker volume ls --filter "name=keycloak" --format "{{.Name}}" 2>$null
if ($volumes) {
    Write-Host "📦 Volumes trouvés :" -ForegroundColor Yellow
    $volumes | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
    $removeVolumes = Read-Host "Voulez-vous supprimer ces volumes ? (O/N)"
    if ($removeVolumes -eq "O" -or $removeVolumes -eq "o") {
        Write-Host "🗑️ Suppression des volumes..." -ForegroundColor White
        $volumes | ForEach-Object { docker volume rm $_ 2>$null }
        Write-Host "✅ Volumes supprimés" -ForegroundColor Green
        $cleaned = $true
    }
} else {
    Write-Host "✅ Aucun volume Keycloak trouvé" -ForegroundColor Green
}

Write-Host ""

# Nettoyer les images Docker (optionnel)
Write-Host "🔍 Recherche d'images Docker Keycloak..." -ForegroundColor White
$images = docker images --filter "reference=*keycloak*" --format "{{.Repository}}:{{.Tag}}" 2>$null
if ($images) {
    Write-Host "📦 Images trouvées :" -ForegroundColor Yellow
    $images | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
    $removeImages = Read-Host "Voulez-vous supprimer ces images ? (O/N)"
    if ($removeImages -eq "O" -or $removeImages -eq "o") {
        Write-Host "🗑️ Suppression des images..." -ForegroundColor White
        $images | ForEach-Object { docker rmi $_ 2>$null }
        Write-Host "✅ Images supprimées" -ForegroundColor Green
        $cleaned = $true
    }
} else {
    Write-Host "✅ Aucune image Keycloak trouvée" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($cleaned) {
    Write-Host "✅ NETTOYAGE TERMINÉ" -ForegroundColor Green
} else {
    Write-Host "ℹ️ RIEN À NETTOYER" -ForegroundColor Cyan
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Afficher l'espace libéré (optionnel)
$showSpace = Read-Host "Voulez-vous voir l'espace disque Docker ? (O/N)"
if ($showSpace -eq "O" -or $showSpace -eq "o") {
    Write-Host ""
    Write-Host "💾 Espace disque Docker :" -ForegroundColor White
    docker system df
}

Write-Host ""
Write-Host "💡 Pour nettoyer complètement Docker :" -ForegroundColor Yellow
Write-Host "   docker system prune -a --volumes" -ForegroundColor Cyan
Write-Host ""
