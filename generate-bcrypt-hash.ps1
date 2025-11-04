# ==========================================
# Script PowerShell: Générateur de Hash Bcrypt
# Usage: .\generate-bcrypt-hash.ps1
# ==========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Générateur de Hash Bcrypt pour Velosi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js détecté: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé!" -ForegroundColor Red
    Write-Host "Téléchargez-le sur: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Demander le mot de passe
Write-Host ""
Write-Host "Entrez le mot de passe à hasher:" -ForegroundColor Yellow
$password = Read-Host -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    Write-Host "❌ Mot de passe vide!" -ForegroundColor Red
    exit 1
}

# Créer un script Node.js temporaire
$tempScript = @"
const bcrypt = require('bcrypt');
const password = process.argv[2];
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Erreur:', err);
        process.exit(1);
    }
    console.log(hash);
});
"@

$tempFile = "temp_bcrypt_hash.js"
$tempScript | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host ""
Write-Host "🔐 Génération du hash bcrypt..." -ForegroundColor Cyan

# Installer bcrypt si nécessaire
$bcryptInstalled = npm list bcrypt --depth=0 2>&1 | Select-String "bcrypt@"
if (-not $bcryptInstalled) {
    Write-Host "📦 Installation de bcrypt..." -ForegroundColor Yellow
    npm install bcrypt --no-save 2>&1 | Out-Null
}

# Générer le hash
$hash = node $tempFile $passwordPlain

# Nettoyer
Remove-Item $tempFile -Force

if ([string]::IsNullOrWhiteSpace($hash)) {
    Write-Host "❌ Erreur lors de la génération du hash" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Hash Bcrypt généré avec succès!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mot de passe: $passwordPlain" -ForegroundColor Yellow
Write-Host ""
Write-Host "Hash Bcrypt:" -ForegroundColor Cyan
Write-Host $hash -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Copiez le hash ci-dessus dans votre SQL" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Copier dans le presse-papiers (si possible)
try {
    Set-Clipboard -Value $hash
    Write-Host "📋 Hash copié dans le presse-papiers!" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ Copiez manuellement le hash ci-dessus" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Exemple d'utilisation dans SQL:" -ForegroundColor Cyan
Write-Host "UPDATE crm_personnel SET password = '$hash' WHERE email = 'votre@email.com';" -ForegroundColor White
Write-Host ""
