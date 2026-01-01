# Script de migration automatique vers Multi-Tenant
# Migre tous les services pour utiliser TenantRepositoryService

Write-Host "[START] Migration Multi-Tenant Automatique" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Mapping des entités vers les méthodes du TenantRepositoryService
$repositoryMapping = @{
    'Client' = 'getClientRepository'
    'Personnel' = 'getPersonnelRepository'
    'Lead' = 'getLeadRepository'
    'Opportunity' = 'getOpportunityRepository'
    'Quote' = 'getQuoteRepository'
    'ObjectifCom' = 'getObjectifComRepository'
    'Engin' = 'getEnginRepository'
    'Navire' = 'getNavireRepository'
    'ContactClient' = 'getContactClientRepository'
    'AutorisationTVA' = 'getAutorisationTVARepository'
    'BCsusTVA' = 'getBCsusTVARepository'
    'Armateur' = 'getArmateurRepository'
    'Fournisseur' = 'getFournisseurRepository'
    'Correspondant' = 'getCorrespondantRepository'
    'Port' = 'getPortRepository'
    'Aeroport' = 'getAeroportRepository'
    'Activity' = 'getActivityRepository'
    'ActivityParticipant' = 'getActivityParticipantRepository'
    'QuoteItem' = 'getQuoteItemRepository'
    'TypeFraisAnnexe' = 'getTypeFraisAnnexeRepository'
    'Industry' = 'getIndustryRepository'
    'VechatMessage' = 'getVechatMessageRepository'
    'VechatConversation' = 'getVechatConversationRepository'
    'VechatPresence' = 'getVechatPresenceRepository'
    'VechatUserSettings' = 'getVechatUserSettingsRepository'
}

# Services à exclure de la migration (singleton, globaux, ou déjà migrés)
$excludedServices = @(
    'auth.service.ts',          # Déjà migré manuellement
    'database-connection.service.ts',
    'tenant-aware.service.ts',
    'tenant-context.service.ts',
    'tenant-repository.service.ts',
    'email.service.ts',         # Service global
    'keycloak.service.ts',      # Service global
    'otp.service.ts',           # Service global
    'scheduler.service.ts'      # Service global
)

# Compteurs
$totalFiles = 0
$migratedFiles = 0
$skippedFiles = 0
$errors = 0

# Trouver tous les fichiers service.ts
$serviceFiles = Get-ChildItem -Path "src" -Filter "*.service.ts" -Recurse

foreach ($file in $serviceFiles) {
    $totalFiles++
    $fileName = $file.Name
    
    # Vérifier si le service doit être exclu
    if ($excludedServices -contains $fileName) {
        Write-Host "[SKIP] Exclu: $($file.FullName)" -ForegroundColor Yellow
        $skippedFiles++
        continue
    }
    
    Write-Host "[ANALYZE] $($file.FullName)" -ForegroundColor Gray
    
    # Lire le contenu du fichier
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Vérifier si le fichier contient @InjectRepository
    if ($content -notmatch '@InjectRepository') {
        Write-Host "   [SKIP] Pas de repository injecte - Ignore" -ForegroundColor Gray
        $skippedFiles++
        continue
    }
    
    # Vérifier si déjà migré
    if ($content -match 'TenantRepositoryService') {
        Write-Host "   [OK] Deja migre - Ignore" -ForegroundColor Green
        $skippedFiles++
        continue
    }
    
    try {
        $modified = $false
        
        # 1. Ajouter l'import de Scope si nécessaire
        if ($content -notmatch "import.*\{[^}]*Scope[^}]*\}.*from '@nestjs/common'") {
            $content = $content -replace "(import\s*\{[^}]*)(Injectable)([^}]*\}\s*from\s*'@nestjs/common')", "`$1Injectable, Scope`$3"
            $modified = $true
        }
        
        # 2. Ajouter l'import de TenantRepositoryService
        if ($content -notmatch "TenantRepositoryService") {
            # Trouver la dernière ligne d'import
            $lastImportIndex = [regex]::Matches($content, "^import .*from.*;$", [System.Text.RegularExpressions.RegexOptions]::Multiline) | 
                Select-Object -Last 1 | 
                ForEach-Object { $_.Index + $_.Length }
            
            if ($lastImportIndex) {
                $importStatement = "`nimport { TenantRepositoryService } from '../common/tenant-repository.service';"
                $content = $content.Insert($lastImportIndex, $importStatement)
                $modified = $true
            }
        }
        
        # 3. Modifier @Injectable() pour ajouter scope: Scope.REQUEST
        if ($content -match '@Injectable\(\s*\)') {
            $content = $content -replace '@Injectable\(\s*\)', '@Injectable({ scope: Scope.REQUEST })'
            $modified = $true
        } elseif ($content -match '@Injectable\(\{[^}]*\}\)' -and $content -notmatch 'scope:\s*Scope\.REQUEST') {
            $content = $content -replace '@Injectable\(\{', '@Injectable({ scope: Scope.REQUEST, '
            $modified = $true
        }
        
        # 4. Collecter toutes les injections de repository
        $repositoryInjections = [regex]::Matches($content, '@InjectRepository\((\w+)\)[^)]*private\s+(\w+):\s*Repository<\1>')
        
        if ($repositoryInjections.Count -eq 0) {
            Write-Host "   [SKIP] Pattern d'injection non standard - Migration manuelle requise" -ForegroundColor Yellow
            $skippedFiles++
            continue
        }
        
        # Créer la liste des repositories et leurs propriétés
        $repoProps = @()
        foreach ($match in $repositoryInjections) {
            $entityName = $match.Groups[1].Value
            $propertyName = $match.Groups[2].Value
            $repoProps += @{
                Entity = $entityName
                Property = $propertyName
                Method = $repositoryMapping[$entityName]
            }
        }
        
        # 5. Remplacer le constructeur
        $constructorPattern = 'constructor\s*\([^)]*\)\s*\{'
        if ($content -match $constructorPattern) {
            # Supprimer toutes les injections @InjectRepository
            $content = $content -replace '@InjectRepository\([^)]+\)\s+', ''
            $content = $content -replace 'private\s+\w+Repository:\s*Repository<\w+>,?\s*', ''
            
            # Ajouter l'injection de TenantRepositoryService
            $content = $content -replace '(constructor\s*\()', "`$1`n    private tenantRepos: TenantRepositoryService,"
            $modified = $true
        }
        
        # 6. Remplacer les usages des repositories dans le code
        foreach ($repo in $repoProps) {
            if ($repo.Method) {
                $oldPattern = "this\.$($repo.Property)\."
                $newReplacement = "(await this.tenantRepos.$($repo.Method)())."
                
                # Compter les occurrences pour info
                $occurrences = ([regex]::Matches($content, [regex]::Escape($oldPattern))).Count
                
                if ($occurrences -gt 0) {
                    $content = $content -replace [regex]::Escape($oldPattern), $newReplacement
                    Write-Host "   [REPLACE] Remplace $occurrences occurrence(s) de $($repo.Property)" -ForegroundColor Cyan
                }
            }
        }
        
        # 7. Transformer les méthodes en async si nécessaire
        # Détecter les méthodes qui utilisent maintenant await
        $content = $content -replace '(\s+)(\w+)\s*\(([^)]*)\)\s*:\s*(\w+(?:<[^>]+>)?)\s*\{([^}]*await[^}]*)\}', '$1async $2($3): Promise<$4> {$5}'
        
        # Sauvegarder si modifié
        if ($modified -or $content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "   [OK] MIGRE avec succes!" -ForegroundColor Green
            $migratedFiles++
        } else {
            Write-Host "   [SKIP] Aucune modification necessaire" -ForegroundColor Gray
            $skippedFiles++
        }
        
    } catch {
        Write-Host "   [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }
    
    Write-Host ""
}

# Résumé
Write-Host ""
Write-Host "[RESUME DE LA MIGRATION]" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host "Total de fichiers analyses: $totalFiles" -ForegroundColor White
Write-Host "[OK] Fichiers migres: $migratedFiles" -ForegroundColor Green
Write-Host "[SKIP] Fichiers ignores: $skippedFiles" -ForegroundColor Yellow
Write-Host "[ERROR] Erreurs: $errors" -ForegroundColor Red
Write-Host ""

if ($migratedFiles -gt 0) {
    Write-Host "[IMPORTANT] Veuillez verifier manuellement les fichiers migres!" -ForegroundColor Yellow
    Write-Host "   - Verifiez que les methodes async sont correctement declarees" -ForegroundColor Yellow
    Write-Host "   - Compilez le projet pour detecter les erreurs TypeScript" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "[OK] Migration terminee!" -ForegroundColor Green
