# Script pour corriger les duplications "async async" et "Promise<Promise<"
Write-Host "Correction des erreurs de migration..." -ForegroundColor Cyan

$files = @(
    "src\services\dashboard.service.ts",
    "src\gestion-ressources\engins.service.ts",
    "src\users\users.service.ts",
    "src\crm\services\reports.service.ts",
    "src\auth\enhanced-multi-tenant-auth.service.ts",
    "src\correspondants\correspondants.service.ts",
    "src\services\crm\lead.service.ts",
    "src\services\crm\opportunity.service.ts",
    "src\services\keycloak-sync.service.ts",
    "src\services\location.service.ts",
    "src\services\login-history.service.ts",
    "src\services\objectif-com.service.ts",
    "src\services\setup.service.ts",
    "src\vechat\vechat.service.ts"
)

$fixedCount = 0

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "`nTraitement: $file" -ForegroundColor Yellow
        
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        $originalContent = $content
        
        # Corriger "async async" -> "async"
        $content = $content -replace '\basync\s+async\s+', 'async '
        
        # Corriger "Promise<Promise<" -> "Promise<"
        $content = $content -replace 'Promise<Promise<([^>]+)>>', 'Promise<$1>'
        
        if ($content -ne $originalContent) {
            Set-Content $fullPath -Value $content -Encoding UTF8 -NoNewline
            Write-Host "  [OK] Fichier corrige" -ForegroundColor Green
            $fixedCount++
        } else {
            Write-Host "  [SKIP] Aucune correction necessaire" -ForegroundColor Gray
        }
    } else {
        Write-Host "  [ERROR] Fichier non trouve: $fullPath" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "$fixedCount fichier(s) corrige(s)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
