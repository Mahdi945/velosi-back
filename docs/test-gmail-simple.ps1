# Test simplifie pour verifier si Google bloque l'IP du VPS OVH

$VPS_HOST = "Webdesk@vps-3b4fd3be.vps.ovh.ca"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TEST GMAIL depuis VPS OVH" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Credentials Gmail (ceux qui marchent en localhost):" -ForegroundColor Cyan
$gmailUser = Read-Host "Email Gmail"
$gmailPassSecure = Read-Host "Mot de passe" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($gmailPassSecure)
$gmailPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Test en cours sur le VPS..." -ForegroundColor Yellow
Write-Host ""

# Encoder en base64 localement
$gmailUserBytes = [System.Text.Encoding]::UTF8.GetBytes($gmailUser)
$gmailPassBytes = [System.Text.Encoding]::UTF8.GetBytes($gmailPass)
$gmailUserB64 = [Convert]::ToBase64String($gmailUserBytes)
$gmailPassB64 = [Convert]::ToBase64String($gmailPassBytes)

# Commandes SSH directes
$sshCommand = @"
echo 'IP du VPS:' && curl -s ifconfig.me && echo '' && echo 'Test authentification Gmail...' && echo '' && (echo 'EHLO localhost'; sleep 1; echo 'AUTH LOGIN'; sleep 1; echo '$gmailUserB64'; sleep 1; echo '$gmailPassB64'; sleep 1; echo 'QUIT') | openssl s_client -connect smtp.gmail.com:587 -starttls smtp -quiet 2>&1 | tail -20
"@

ssh $VPS_HOST $sshCommand

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Analyse du resultat" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si vous voyez '235 2.7.0 Accepted':" -ForegroundColor Green
Write-Host "  → Google N'EST PAS bloquant" -ForegroundColor White
Write-Host "  → Le probleme vient du code backend" -ForegroundColor White
Write-Host ""
Write-Host "Si vous voyez '535':" -ForegroundColor Red
Write-Host "  → Google BLOQUE l'authentification" -ForegroundColor White
Write-Host "  → Solutions:" -ForegroundColor White
Write-Host "     1. Activer 'Acces moins securise': https://myaccount.google.com/lesssecureapps" -ForegroundColor Gray
Write-Host "     2. Utiliser un App Password: https://myaccount.google.com/apppasswords" -ForegroundColor Gray
Write-Host "     3. Autoriser l'IP du VPS dans Gmail" -ForegroundColor Gray
Write-Host ""
