# Script pour appliquer la migration des pièces jointes pour les activités
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration: Ajout des pièces jointes aux activités" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Aller dans le dossier backend
Set-Location "c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"

Write-Host "1. Création des dossiers uploads..." -ForegroundColor Yellow
if (-Not (Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads" -Force | Out-Null
}
if (-Not (Test-Path "uploads\activites")) {
    New-Item -ItemType Directory -Path "uploads\activites" -Force | Out-Null
}
if (-Not (Test-Path "uploads\activites\temp")) {
    New-Item -ItemType Directory -Path "uploads\activites\temp" -Force | Out-Null
}
Write-Host "✓ Dossiers créés avec succès" -ForegroundColor Green
Write-Host ""

Write-Host "2. Application de la migration..." -ForegroundColor Yellow
npm run migration:run

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration terminée !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vérification de la colonne attachments dans crm_activities..." -ForegroundColor Yellow
Write-Host ""
