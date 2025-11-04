# Script pour vérifier les utilisateurs dans Keycloak
# Date: 4 novembre 2025

$KEYCLOAK_URL = "http://localhost:8080"
$ADMIN_USER = "admin"
$ADMIN_PASSWORD = "87Eq8384"
$REALM = "ERP_Velosi"

Write-Host "🔐 Connexion à Keycloak..." -ForegroundColor Cyan

try {
    # Obtenir le token admin
    $tokenResponse = Invoke-RestMethod -Uri "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" `
        -Method Post `
        -ContentType "application/x-www-form-urlencoded" `
        -Body @{
            grant_type = "password"
            client_id = "admin-cli"
            username = $ADMIN_USER
            password = $ADMIN_PASSWORD
        }

    $TOKEN = $tokenResponse.access_token
    Write-Host "✅ Connecté avec succès`n" -ForegroundColor Green

    # Headers
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }

    # Récupérer tous les utilisateurs du realm ERP_Velosi
    Write-Host "📋 Récupération des utilisateurs du realm $REALM..." -ForegroundColor Cyan
    $users = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users?max=1000" `
        -Method Get `
        -Headers $headers

    Write-Host "✅ $($users.Count) utilisateurs trouvés`n" -ForegroundColor Green

    if ($users.Count -eq 0) {
        Write-Host "⚠️  AUCUN UTILISATEUR DANS KEYCLOAK!" -ForegroundColor Yellow
        Write-Host "   Cela explique pourquoi la synchronisation est nécessaire.`n" -ForegroundColor Yellow
    } else {
        Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "                 UTILISATEURS DANS KEYCLOAK" -ForegroundColor Cyan
        Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

        foreach ($user in $users) {
            Write-Host "👤 $($user.username)" -ForegroundColor Yellow
            Write-Host "   ID: $($user.id)" -ForegroundColor Gray
            Write-Host "   Email: $($user.email)" -ForegroundColor Gray
            Write-Host "   Enabled: $($user.enabled)" -ForegroundColor $(if ($user.enabled) { "Green" } else { "Red" })
            Write-Host "   Créé le: $($user.createdTimestamp)" -ForegroundColor Gray

            # Récupérer les rôles de l'utilisateur
            try {
                $realmRoles = Invoke-RestMethod -Uri "$KEYCLOAK_URL/admin/realms/$REALM/users/$($user.id)/role-mappings/realm" `
                    -Method Get `
                    -Headers $headers

                if ($realmRoles.Count -gt 0) {
                    Write-Host "   Rôles: $($realmRoles.name -join ', ')" -ForegroundColor Cyan
                } else {
                    Write-Host "   Rôles: Aucun" -ForegroundColor Red
                }
            } catch {
                Write-Host "   Rôles: Erreur lors de la récupération" -ForegroundColor Red
            }

            Write-Host ""
        }

        Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    }

    # Compter par statut
    $enabledCount = ($users | Where-Object { $_.enabled }).Count
    $disabledCount = ($users | Where-Object { -not $_.enabled }).Count

    Write-Host "📊 STATISTIQUES:" -ForegroundColor Green
    Write-Host "   Total: $($users.Count)" -ForegroundColor White
    Write-Host "   Actifs: $enabledCount" -ForegroundColor Green
    Write-Host "   Désactivés: $disabledCount" -ForegroundColor Red

} catch {
    Write-Host "`n❌ ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Détails: $($_.ErrorDetails.Message)" -ForegroundColor Red
}
