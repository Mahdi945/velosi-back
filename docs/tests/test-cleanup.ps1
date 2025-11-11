# Script de test des fonctionnalités de nettoyage automatique
# Pour tester la suppression automatique après 7 jours

Write-Host "🧹 Test des fonctionnalités de nettoyage automatique" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Configuration
$baseUrl = "http://localhost:3000"
$adminEndpoint = "$baseUrl/admin/cleanup"

# Fonction pour faire un appel API
function Invoke-ApiCall {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [string]$Description
    )
    
    Write-Host "🔄 $Description..." -ForegroundColor Yellow
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $Url -Method $Method
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -ContentType "application/json"
        }
        
        Write-Host "✅ Succès: $($response.message)" -ForegroundColor Green
        
        if ($response.deleted) {
            Write-Host "   📊 Comptes supprimés: $($response.deleted)" -ForegroundColor Cyan
        }
        
        if ($response.errors -and $response.errors.Count -gt 0) {
            Write-Host "   ⚠️ Erreurs:" -ForegroundColor Red
            foreach ($error in $response.errors) {
                Write-Host "     - $error" -ForegroundColor Red
            }
        }
        
        return $response
    }
    catch {
        Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host ""
Write-Host "1. Vérification du statut du service de nettoyage" -ForegroundColor Blue
Write-Host "------------------------------------------------" -ForegroundColor Blue

$status = Invoke-ApiCall -Url "$adminEndpoint/status" -Description "Vérification du statut"

if ($status) {
    Write-Host "   📅 Planning personnel:" -ForegroundColor Cyan
    Write-Host "     - Nettoyage: $($status.personnel.schedule)" -ForegroundColor White
    Write-Host "     - Avertissements: $($status.personnel.warningSchedule)" -ForegroundColor White
    Write-Host "   📅 Planning clients:" -ForegroundColor Cyan
    Write-Host "     - Nettoyage: $($status.clients.schedule)" -ForegroundColor White
    Write-Host "     - Avertissements: $($status.clients.warningSchedule)" -ForegroundColor White
}

Write-Host ""
Write-Host "2. Test du nettoyage manuel des comptes personnel" -ForegroundColor Blue
Write-Host "------------------------------------------------" -ForegroundColor Blue

$personnelCleanup = Invoke-ApiCall -Url "$adminEndpoint/manual" -Method "POST" -Description "Nettoyage manuel du personnel"

Write-Host ""
Write-Host "3. Test du nettoyage manuel des comptes clients" -ForegroundColor Blue
Write-Host "---------------------------------------------" -ForegroundColor Blue

$clientCleanup = Invoke-ApiCall -Url "$adminEndpoint/manual-clients" -Method "POST" -Description "Nettoyage manuel des clients"

Write-Host ""
Write-Host "📋 Résumé des tests" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green

$totalPersonnelDeleted = if ($personnelCleanup -and $personnelCleanup.deleted) { $personnelCleanup.deleted } else { 0 }
$totalClientsDeleted = if ($clientCleanup -and $clientCleanup.deleted) { $clientCleanup.deleted } else { 0 }

Write-Host "👥 Personnel supprimé: $totalPersonnelDeleted comptes" -ForegroundColor Cyan
Write-Host "🏢 Clients supprimés: $totalClientsDeleted comptes" -ForegroundColor Cyan
Write-Host "📊 Total supprimé: $($totalPersonnelDeleted + $totalClientsDeleted) comptes" -ForegroundColor Yellow

if ($totalPersonnelDeleted -eq 0 -and $totalClientsDeleted -eq 0) {
    Write-Host ""
    Write-Host "ℹ️ Aucun compte à supprimer trouvé." -ForegroundColor Blue
    Write-Host "   Cela signifie qu'il n'y a pas de comptes désactivés depuis plus de 7 jours." -ForegroundColor White
    Write-Host "   Pour tester, vous pouvez:" -ForegroundColor White
    Write-Host "   1. Désactiver un compte test" -ForegroundColor White
    Write-Host "   2. Modifier manuellement la date en base de données" -ForegroundColor White
    Write-Host "   3. Relancer ce script" -ForegroundColor White
}

Write-Host ""
Write-Host "✅ Tests terminés avec succès!" -ForegroundColor Green

# Instructions pour l'utilisation en production
Write-Host ""
Write-Host "📝 Pour activer les cron jobs automatiques:" -ForegroundColor Yellow
Write-Host "   1. Installer @nestjs/schedule: npm install @nestjs/schedule" -ForegroundColor White
Write-Host "   2. Importer ScheduleModule dans app.module.ts" -ForegroundColor White
Write-Host "   3. Décommenter les décorateurs @Cron dans scheduler.service.ts" -ForegroundColor White
Write-Host "   4. Redémarrer le serveur backend" -ForegroundColor White