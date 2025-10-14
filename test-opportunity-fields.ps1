# Test de création d'opportunité avec les nouveaux champs
# Vérifie que transport_type, traffic et engine_type sont bien sauvegardés

$API_BASE = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer test-token"
    "x-user-id" = "1"
}

Write-Host "🧪 TEST: Création d'opportunité avec nouveaux champs" -ForegroundColor Cyan

# Données de test avec les nouveaux champs
$opportunityData = @{
    title = "Test Opportunité - Nouveaux Champs"
    description = "Test pour vérifier la sauvegarde des champs transport_type, traffic et engine_type"
    value = 15000
    probability = 75
    stage = "qualification"
    expectedCloseDate = "2025-12-15"
    originAddress = "Port de Radès, Tunis"
    destinationAddress = "Port de Marseille, France"
    transportType = "complet"
    traffic = "export"
    serviceFrequency = "monthly"
    engineType = 1  # ID d'un engin (si existe dans la table engin)
    specialRequirements = "Conteneur réfrigéré requis"
    assignedToId = 3
    priority = "high"
    source = "manual_test"
    tags = @("test", "nouveaux-champs")
} | ConvertTo-Json

Write-Host "📝 Données à envoyer:" -ForegroundColor Yellow
Write-Host $opportunityData -ForegroundColor Gray

try {
    # Créer l'opportunité
    Write-Host "`n🔄 Envoi de la requête de création..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$API_BASE/crm/opportunities" -Method Post -Body $opportunityData -Headers $headers
    
    Write-Host "✅ Opportunité créée avec succès!" -ForegroundColor Green
    Write-Host "ID: $($response.id)" -ForegroundColor Green
    
    # Récupérer l'opportunité créée pour vérifier les champs
    Write-Host "`n🔍 Récupération de l'opportunité créée..." -ForegroundColor Yellow
    $getResponse = Invoke-RestMethod -Uri "$API_BASE/crm/opportunities/$($response.id)" -Method Get -Headers $headers
    
    Write-Host "📋 Opportunité récupérée:" -ForegroundColor Cyan
    Write-Host "- ID: $($getResponse.id)" -ForegroundColor White
    Write-Host "- Titre: $($getResponse.title)" -ForegroundColor White
    Write-Host "- Type de transport: $($getResponse.transportType)" -ForegroundColor $(if ($getResponse.transportType -eq "complet") {"Green"} else {"Red"})
    Write-Host "- Traffic: $($getResponse.traffic)" -ForegroundColor $(if ($getResponse.traffic -eq "export") {"Green"} else {"Red"})
    Write-Host "- Type d'engin: $($getResponse.engineType)" -ForegroundColor $(if ($getResponse.engineType -eq 1) {"Green"} else {"Red"})
    Write-Host "- Probabilité: $($getResponse.probability)%" -ForegroundColor White
    Write-Host "- Assigné à: $($getResponse.assignedToId)" -ForegroundColor White
    
    # Vérifications
    $success = $true
    
    if ($getResponse.transportType -ne "complet") {
        Write-Host "❌ ERREUR: transportType non sauvegardé correctement" -ForegroundColor Red
        Write-Host "   Attendu: 'complet', Reçu: '$($getResponse.transportType)'" -ForegroundColor Red
        $success = $false
    }
    
    if ($getResponse.traffic -ne "export") {
        Write-Host "❌ ERREUR: traffic non sauvegardé correctement" -ForegroundColor Red
        Write-Host "   Attendu: 'export', Reçu: '$($getResponse.traffic)'" -ForegroundColor Red
        $success = $false
    }
    
    if ($getResponse.engineType -ne 1) {
        Write-Host "❌ ERREUR: engineType non sauvegardé correctement" -ForegroundColor Red
        Write-Host "   Attendu: 1, Reçu: '$($getResponse.engineType)'" -ForegroundColor Red
        $success = $false
    }
    
    if ($success) {
        Write-Host "`n✅ SUCCÈS: Tous les champs ont été sauvegardés correctement!" -ForegroundColor Green
    } else {
        Write-Host "`n❌ ÉCHEC: Certains champs n'ont pas été sauvegardés correctement" -ForegroundColor Red
    }
    
    # Test de conversion de prospect vers opportunité
    Write-Host "`n🧪 TEST: Conversion prospect vers opportunité" -ForegroundColor Cyan
    
    # Récupérer un prospect pour le convertir
    $leadsResponse = Invoke-RestMethod -Uri "$API_BASE/crm/leads?limit=1" -Method Get -Headers $headers
    
    if ($leadsResponse.data.Count -gt 0) {
        $leadId = $leadsResponse.data[0].id
        Write-Host "📋 Conversion du prospect ID: $leadId" -ForegroundColor Yellow
        
        $conversionData = @{
            opportunityTitle = "Conversion Test - Nouveaux Champs"
            opportunityDescription = "Test de conversion avec les nouveaux champs"
            opportunityValue = 25000
            probability = 50
            expectedCloseDate = "2025-11-30"
            transportType = "groupage"
            traffic = "import"
            engineType = 2
            specialRequirements = "Transport urgent requis"
        } | ConvertTo-Json
        
        $conversionResponse = Invoke-RestMethod -Uri "$API_BASE/crm/opportunities/convert-from-lead/$leadId" -Method Post -Body $conversionData -Headers $headers
        
        Write-Host "✅ Conversion réussie! ID opportunité: $($conversionResponse.id)" -ForegroundColor Green
        
        # Vérifier l'opportunité convertie
        $convertedOpp = Invoke-RestMethod -Uri "$API_BASE/crm/opportunities/$($conversionResponse.id)" -Method Get -Headers $headers
        
        Write-Host "📋 Opportunité convertie:" -ForegroundColor Cyan
        Write-Host "- Type de transport: $($convertedOpp.transportType)" -ForegroundColor $(if ($convertedOpp.transportType -eq "groupage") {"Green"} else {"Red"})
        Write-Host "- Traffic: $($convertedOpp.traffic)" -ForegroundColor $(if ($convertedOpp.traffic -eq "import") {"Green"} else {"Red"})
        Write-Host "- Type d'engin: $($convertedOpp.engineType)" -ForegroundColor $(if ($convertedOpp.engineType -eq 2) {"Green"} else {"Red"})
        
    } else {
        Write-Host "⚠️  Aucun prospect trouvé pour tester la conversion" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ ERREUR lors du test:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Détails de l'erreur: $responseBody" -ForegroundColor Red
    }
}

Write-Host "`n🏁 Test terminé" -ForegroundColor Magenta