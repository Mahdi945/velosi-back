# ==========================================
# SCRIPT DE VÉRIFICATION POST-MIGRATION
# Type Frais Annexes
# ==========================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " VÉRIFICATION TYPE FRAIS ANNEXES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# 1. Vérifier les fichiers Backend
Write-Host "📂 BACKEND - Vérification des fichiers..." -ForegroundColor Yellow

$backendFiles = @(
    "src\crm\entities\type-frais-annexe.entity.ts",
    "src\crm\dto\type-frais-annexe.dto.ts",
    "src\crm\services\type-frais-annexe.service.ts",
    "src\crm\controllers\type-frais-annexe.controller.ts",
    "MIGRATION_TYPE_FRAIS_ANNEXES.sql",
    "GUIDE_TYPE_FRAIS_ANNEXES.md"
)

foreach ($file in $backendFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file - MANQUANT" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""

# 2. Vérifier la configuration database
Write-Host "🗄️  BACKEND - Vérification database.config.ts..." -ForegroundColor Yellow

$dbConfig = Get-Content "src\config\database.config.ts" -Raw
if ($dbConfig -match "TypeFraisAnnexe") {
    Write-Host "   ✅ TypeFraisAnnexe ajouté à la configuration" -ForegroundColor Green
} else {
    Write-Host "   ❌ TypeFraisAnnexe MANQUANT dans database.config.ts" -ForegroundColor Red
    $errors++
}

Write-Host ""

# 3. Vérifier le module Quote
Write-Host "📦 BACKEND - Vérification quote.module.ts..." -ForegroundColor Yellow

$quoteModule = Get-Content "src\modules\crm\quote.module.ts" -Raw
if ($quoteModule -match "TypeFraisAnnexe" -and $quoteModule -match "TypeFraisAnnexeService" -and $quoteModule -match "TypeFraisAnnexeController") {
    Write-Host "   ✅ Module Quote correctement configuré" -ForegroundColor Green
} else {
    Write-Host "   ❌ Module Quote INCOMPLET" -ForegroundColor Red
    if ($quoteModule -notmatch "TypeFraisAnnexe") { Write-Host "      - Entity TypeFraisAnnexe manquante" -ForegroundColor Red }
    if ($quoteModule -notmatch "TypeFraisAnnexeService") { Write-Host "      - Service TypeFraisAnnexeService manquant" -ForegroundColor Red }
    if ($quoteModule -notmatch "TypeFraisAnnexeController") { Write-Host "      - Controller TypeFraisAnnexeController manquant" -ForegroundColor Red }
    $errors++
}

Write-Host ""

# 4. Vérifier les fichiers Frontend
Write-Host "📂 FRONTEND - Vérification des fichiers..." -ForegroundColor Yellow

$frontendPath = "..\velosi-front"
if (Test-Path $frontendPath) {
    $frontendFiles = @(
        "src\app\interfaces\type-frais-annexe.interface.ts",
        "src\app\services\crm\type-frais-annexe.service.ts"
    )
    
    foreach ($file in $frontendFiles) {
        $fullPath = Join-Path $frontendPath $file
        if (Test-Path $fullPath) {
            Write-Host "   ✅ $file" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $file - MANQUANT" -ForegroundColor Red
            $errors++
        }
    }
} else {
    Write-Host "   ⚠️  Dossier velosi-front introuvable (à vérifier manuellement)" -ForegroundColor Yellow
    $warnings++
}

Write-Host ""

# 5. Vérifier le composant Quotes (frontend)
Write-Host "🎨 FRONTEND - Vérification quotes.component..." -ForegroundColor Yellow

$quotesComponentPath = Join-Path $frontendPath "src\app\components\crm\quotes\quotes\quotes.component.ts"
if (Test-Path $quotesComponentPath) {
    $quotesComponent = Get-Content $quotesComponentPath -Raw
    
    $checks = @{
        "TypeFraisAnnexeService importé" = $quotesComponent -match "import.*TypeFraisAnnexeService"
        "typeFraisAnnexesList déclaré" = $quotesComponent -match "typeFraisAnnexesList.*TypeFraisAnnexe"
        "loadTypeFraisAnnexes() présente" = $quotesComponent -match "loadTypeFraisAnnexes\(\)"
        "addTypeFrais() présente" = $quotesComponent -match "addTypeFrais\(\)"
    }
    
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Write-Host "   ✅ $($check.Key)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($check.Key) - MANQUANT" -ForegroundColor Red
            $errors++
        }
    }
} else {
    Write-Host "   ⚠️  quotes.component.ts introuvable (à vérifier manuellement)" -ForegroundColor Yellow
    $warnings++
}

Write-Host ""

# 6. Vérifier le template Quotes (frontend)
Write-Host "📄 FRONTEND - Vérification quotes.component.html..." -ForegroundColor Yellow

$quotesTemplatePath = Join-Path $frontendPath "src\app\components\crm\quotes\quotes\quotes.component.html"
if (Test-Path $quotesTemplatePath) {
    $quotesTemplate = Get-Content $quotesTemplatePath -Raw
    
    if ($quotesTemplate -match "typeFraisAnnexesList" -and $quotesTemplate -match "openAddTypeFraisModal") {
        Write-Host "   ✅ Template correctement modifié" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Template INCOMPLET" -ForegroundColor Red
        if ($quotesTemplate -notmatch "typeFraisAnnexesList") { Write-Host "      - typeFraisAnnexesList non utilisé" -ForegroundColor Red }
        if ($quotesTemplate -notmatch "openAddTypeFraisModal") { Write-Host "      - Bouton d'ajout manquant" -ForegroundColor Red }
        $errors++
    }
} else {
    Write-Host "   ⚠️  quotes.component.html introuvable (à vérifier manuellement)" -ForegroundColor Yellow
    $warnings++
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " RÉSUMÉ" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ TOUT EST PRÊT !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "1. Exécuter la migration SQL:" -ForegroundColor White
    Write-Host "   .\run-migration-type-frais.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Compiler et tester le backend:" -ForegroundColor White
    Write-Host "   npm run build" -ForegroundColor Cyan
    Write-Host "   npm run start:dev" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Compiler et tester le frontend:" -ForegroundColor White
    Write-Host "   cd ..\velosi-front" -ForegroundColor Cyan
    Write-Host "   npm run build" -ForegroundColor Cyan
    Write-Host "   npm start" -ForegroundColor Cyan
} elseif ($errors -eq 0) {
    Write-Host "⚠️  VÉRIFICATION PARTIELLE" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Avertissements: $warnings" -ForegroundColor Yellow
    Write-Host "Erreurs: 0" -ForegroundColor Green
    Write-Host ""
    Write-Host "Certains fichiers n'ont pas pu être vérifiés automatiquement." -ForegroundColor Yellow
    Write-Host "Consultez le guide: GUIDE_TYPE_FRAIS_ANNEXES.md" -ForegroundColor Cyan
} else {
    Write-Host "❌ ERREURS DÉTECTÉES" -ForegroundColor Red
    Write-Host ""
    Write-Host "Avertissements: $warnings" -ForegroundColor Yellow
    Write-Host "Erreurs: $errors" -ForegroundColor Red
    Write-Host ""
    Write-Host "Corrigez les erreurs ci-dessus avant de continuer." -ForegroundColor Red
    Write-Host "Consultez le guide: GUIDE_TYPE_FRAIS_ANNEXES.md" -ForegroundColor Cyan
}

Write-Host ""
Read-Host "Appuyez sur Entrée pour quitter"
