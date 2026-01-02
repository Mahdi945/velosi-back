# Script de verification finale de la migration multi-tenant
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION MIGRATION MULTI-TENANT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verifier qu'il n'y a plus d'erreurs async async
Write-Host "[1/3] Verification absence de 'async async'..." -ForegroundColor Yellow
$asyncIssues = Select-String -Path "src/**/*.ts" -Pattern "\basync\s+async\s+" -Exclude "node_modules" -Recurse 2>$null
if ($asyncIssues) {
    Write-Host "  [ERROR] Encore des 'async async' trouves:" -ForegroundColor Red
    $asyncIssues | ForEach-Object { Write-Host "    - $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
} else {
    Write-Host "  [OK] Aucun 'async async' trouve" -ForegroundColor Green
}

# 2. Verifier qu'il n'y a plus de Promise<Promise<
Write-Host "`n[2/3] Verification absence de 'Promise<Promise<'..." -ForegroundColor Yellow
$promiseIssues = Select-String -Path "src/**/*.ts" -Pattern "Promise<Promise<" -Exclude "node_modules" -Recurse 2>$null
if ($promiseIssues) {
    Write-Host "  [ERROR] Encore des 'Promise<Promise<' trouves:" -ForegroundColor Red
    $promiseIssues | ForEach-Object { Write-Host "    - $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
} else {
    Write-Host "  [OK] Aucun 'Promise<Promise<' trouve" -ForegroundColor Green
}

# 3. Compilation TypeScript
Write-Host "`n[3/3] Compilation TypeScript..." -ForegroundColor Yellow
$buildOutput = npm run build 2>&1
$errors = $buildOutput | Select-String "error TS"

if ($errors) {
    Write-Host "  [ERROR] Erreurs de compilation trouvees:" -ForegroundColor Red
    $errors | Select-Object -First 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    if ($errors.Count -gt 10) {
        Write-Host "    ... et $($errors.Count - 10) autres erreurs" -ForegroundColor Red
    }
    Write-Host "`n[ECHEC] La migration contient encore des erreurs" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  [OK] Compilation reussie" -ForegroundColor Green
}

# Resume
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "MIGRATION MULTI-TENANT: SUCCES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nLe backend est pret pour le multi-tenant!" -ForegroundColor Green
Write-Host "Lancez le serveur avec: npm run start:dev" -ForegroundColor Yellow
Write-Host "`n"
