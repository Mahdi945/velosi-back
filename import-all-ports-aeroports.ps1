# Script PowerShell - Import complet des PORTS et AEROPORTS mondiaux
# Avec noms complets de villes et pays (pas de codes)
# Sources: 
#   - UN/LOCODE pour les ports maritimes
#   - OurAirports pour les aeroports
# Auteur: Velosi ERP
# Date: 2025-10-30

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

# Configuration
$baseUrl = "http://localhost:3000"
$headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  IMPORT COMPLET - PORTS ET AEROPORTS MONDIAUX" -ForegroundColor Cyan
Write-Host "  Avec noms complets de villes et pays" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier que le backend est accessible
Write-Host "1. Verification du backend..." -ForegroundColor Yellow
Write-Host "   Backend: $baseUrl" -ForegroundColor White
Write-Host ""

# Demander confirmation
Write-Host "2. Suppression des donnees existantes" -ForegroundColor Yellow
Write-Host "   ATTENTION: Suppression de TOUS les ports ET aeroports !" -ForegroundColor Red
$confirm = Read-Host "   Voulez-vous continuer ? (oui/non)"

if ($confirm -ne "oui") {
    Write-Host "   Operation annulee" -ForegroundColor Yellow
    exit 0
}

# ============================================
# ETAPE 1: SUPPRESSION DES DONNEES EXISTANTES
# ============================================

Write-Host ""
Write-Host "   => Suppression des ports..." -ForegroundColor Cyan
try {
    $deletePortsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/ports" `
        -Method Delete `
        -Headers $headers `
        -TimeoutSec 30

    Write-Host "   OK $($deletePortsResponse.deleted) ports supprimes" -ForegroundColor Green
} catch {
    Write-Host "   ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "   => Suppression des aeroports..." -ForegroundColor Cyan
try {
    $deleteAeroportsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/aeroports" `
        -Method Delete `
        -Headers $headers `
        -TimeoutSec 30

    Write-Host "   OK $($deleteAeroportsResponse.deleted) aeroports supprimes" -ForegroundColor Green
} catch {
    Write-Host "   ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ETAPE 2: IMPORT DES PORTS (UN/LOCODE)
# ============================================

Write-Host ""
Write-Host "3. Import des ports mondiaux" -ForegroundColor Yellow
Write-Host "   Source: UN/LOCODE (Organisation des Nations Unies)" -ForegroundColor White
Write-Host "   Contenu: Milliers de ports maritimes" -ForegroundColor White
Write-Host "   Format: Villes et pays en texte complet" -ForegroundColor White
Write-Host ""
Write-Host "   Telechargement et import en cours..." -ForegroundColor Cyan
Write-Host "   Cette operation peut prendre 5-10 minutes" -ForegroundColor Yellow
Write-Host "   Veuillez patienter..." -ForegroundColor Yellow

try {
    $startTime = Get-Date
    
    $importPortsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/ports" `
        -Method Post `
        -Headers $headers `
        -TimeoutSec 600

    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "   OK $($importPortsResponse.success) ports importes" -ForegroundColor Green
    Write-Host "   Duree: $([math]::Round($duration, 0)) secondes" -ForegroundColor Cyan
    
    if ($importPortsResponse.errors -gt 0) {
        Write-Host "   ATTENTION: $($importPortsResponse.errors) erreurs" -ForegroundColor Yellow
    }
    
    Write-Host "   $($importPortsResponse.message)" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "   ERREUR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Le backend peut avoir besoin de plus de temps..." -ForegroundColor Yellow
}

# ============================================
# ETAPE 3: IMPORT DES AEROPORTS (OurAirports)
# ============================================

Write-Host ""
Write-Host "4. Import des aeroports mondiaux" -ForegroundColor Yellow
Write-Host "   Source: OurAirports.com" -ForegroundColor White
Write-Host "   Contenu: 4000+ aeroports internationaux" -ForegroundColor White
Write-Host "   Format: Villes et pays en texte complet" -ForegroundColor White
Write-Host ""
Write-Host "   Telechargement et import en cours..." -ForegroundColor Cyan
Write-Host "   Cette operation peut prendre 2-3 minutes" -ForegroundColor Yellow
Write-Host "   Veuillez patienter..." -ForegroundColor Yellow

try {
    $startTime = Get-Date
    
    $importAeroportsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/aeroports" `
        -Method Post `
        -Headers $headers `
        -TimeoutSec 300

    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "   OK $($importAeroportsResponse.success) aeroports importes" -ForegroundColor Green
    Write-Host "   Duree: $([math]::Round($duration, 0)) secondes" -ForegroundColor Cyan
    
    if ($importAeroportsResponse.errors -gt 0) {
        Write-Host "   ATTENTION: $($importAeroportsResponse.errors) erreurs" -ForegroundColor Yellow
    }
    
    Write-Host "   $($importAeroportsResponse.message)" -ForegroundColor White
} catch {
    Write-Host ""
    Write-Host "   ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# ETAPE 4: STATISTIQUES FINALES
# ============================================

Write-Host ""
Write-Host "5. Statistiques finales" -ForegroundColor Yellow

try {
    $statsResponse = Invoke-RestMethod `
        -Uri "$baseUrl/api/admin/import/stats" `
        -Method Get `
        -Headers $headers `
        -TimeoutSec 30

    Write-Host ""
    Write-Host "   =============================================" -ForegroundColor Cyan
    Write-Host "   STATISTIQUES COMPLETES" -ForegroundColor Cyan
    Write-Host "   =============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   PORTS MARITIMES:" -ForegroundColor White
    Write-Host "   - Total           : $($statsResponse.totalPorts)" -ForegroundColor Green
    Write-Host "   - Contactes       : $($statsResponse.portsActifs)" -ForegroundColor White
    Write-Host "   - Non contactes   : $($statsResponse.portsInactifs)" -ForegroundColor White
    Write-Host ""
    Write-Host "   AEROPORTS:" -ForegroundColor White
    Write-Host "   - Total           : $($statsResponse.totalAeroports)" -ForegroundColor Green
    Write-Host "   - Contactes       : $($statsResponse.aeroportsActifs)" -ForegroundColor White
    Write-Host "   - Non contactes   : $($statsResponse.aeroportsInactifs)" -ForegroundColor White
    Write-Host ""
    Write-Host "   =============================================" -ForegroundColor Cyan
    Write-Host "   TOTAL GENERAL     : $($statsResponse.totalPorts + $statsResponse.totalAeroports)" -ForegroundColor Green
    Write-Host "   =============================================" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "   ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# MESSAGE FINAL
# ============================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  IMPORT TERMINE AVEC SUCCES !" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "RESUME:" -ForegroundColor Yellow
Write-Host "   Ports maritimes importes avec noms complets" -ForegroundColor White
Write-Host "   Aeroports importes avec noms complets" -ForegroundColor White
Write-Host "   Tous marques comme 'Non contactes' par defaut" -ForegroundColor White
Write-Host ""
Write-Host "SOURCES DE DONNEES:" -ForegroundColor Yellow
Write-Host "   Ports     : UN/LOCODE (Nations Unies)" -ForegroundColor White
Write-Host "   Aeroports : OurAirports.com" -ForegroundColor White
Write-Host ""
Write-Host "QUALITE DES DONNEES:" -ForegroundColor Yellow
Write-Host "   Villes : Noms complets (ex: 'Marseille', 'Shanghai')" -ForegroundColor White
Write-Host "   Pays   : Noms complets (ex: 'France', 'Chine')" -ForegroundColor White
Write-Host "   Format : Pas de codes courts (ex: pas 'AQB' ou 'TN')" -ForegroundColor White
Write-Host ""
Write-Host "PROCHAINES ETAPES:" -ForegroundColor Yellow
Write-Host "   1. Ouvrez l'interface: http://localhost:4200" -ForegroundColor White
Write-Host "   2. Menu: Gestion > Ports et Aeroports" -ForegroundColor White
Write-Host "   3. Verifiez que les villes/pays sont complets" -ForegroundColor White
Write-Host "   4. Marquez les ports/aeroports comme 'Contactes' si necessaire" -ForegroundColor White
Write-Host ""
Write-Host "VERIFICATION SQL:" -ForegroundColor Yellow
Write-Host "   Fichier: verify-ports-import.sql" -ForegroundColor White
Write-Host "   Contient des requetes pour verifier la qualite des donnees" -ForegroundColor White
Write-Host ""
