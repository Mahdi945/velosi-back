# Script pour tester la synchronisation Keycloak
# Usage: .\test-keycloak-sync.ps1

Write-Host "🔄 TEST SYNCHRONISATION KEYCLOAK" -ForegroundColor Yellow

# 1. Nettoyer les sessions existantes
Write-Host "1. Nettoyage des sessions..." -ForegroundColor Cyan
try {
    $clearResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/sync/keycloak/clear-sessions" -Method POST -Headers @{
        "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
        "Content-Type" = "application/json"
    }
    Write-Host "✅ Sessions nettoyées: $($clearResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Erreur nettoyage sessions: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2. Lancer la synchronisation complète
Write-Host "2. Synchronisation complète..." -ForegroundColor Cyan
try {
    $syncResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/sync/keycloak/full-sync" -Method POST -Headers @{
        "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
        "Content-Type" = "application/json"
    }
    Write-Host "✅ Synchronisation réussie: $($syncResponse.message)" -ForegroundColor Green
    Write-Host "📊 Statistiques:" -ForegroundColor Cyan
    $syncResponse.data | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erreur synchronisation: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Obtenir les statistiques
Write-Host "3. Statistiques de synchronisation..." -ForegroundColor Cyan
try {
    $statsResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/sync/keycloak/stats" -Method GET -Headers @{
        "Authorization" = "Bearer YOUR_ADMIN_TOKEN"
        "Content-Type" = "application/json"
    }
    Write-Host "✅ Statistiques obtenues:" -ForegroundColor Green
    $statsResponse.data | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Erreur statistiques: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 PROCHAINES ÉTAPES:" -ForegroundColor Yellow
Write-Host "1. Se connecter avec mahdi45 dans un nouvel onglet" -ForegroundColor White
Write-Host "2. Vérifier que le rôle est correctement assigné" -ForegroundColor White
Write-Host "3. Tester les permissions administratives" -ForegroundColor White