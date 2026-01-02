# Script pour tester si Google bloque l'IP du VPS OVH
# Ce test verifie l'authentification Gmail directement depuis le VPS

$VPS_HOST = "Webdesk@vps-3b4fd3be.vps.ovh.ca"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "TEST: Google bloque-t-il le VPS OVH ?" -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ce test va:" -ForegroundColor White
Write-Host "  1. Se connecter au VPS" -ForegroundColor Gray
Write-Host "  2. Tester la connexion Gmail SMTP" -ForegroundColor Gray
Write-Host "  3. Essayer de s'authentifier avec vos credentials Gmail" -ForegroundColor Gray
Write-Host "  4. Determiner si Google bloque votre VPS" -ForegroundColor Gray
Write-Host ""

Write-Host "IMPORTANT: Entrez les credentials qui FONCTIONNENT en localhost" -ForegroundColor Yellow
Write-Host ""

# Demander les credentials localement pour eviter de les taper sur SSH
Write-Host "Credentials Gmail de test (ceux qui marchent en localhost):" -ForegroundColor Cyan
$gmailUser = Read-Host "Email Gmail"
$gmailPassSecure = Read-Host "Mot de passe" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($gmailPassSecure)
$gmailPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Connexion au VPS et execution du test..." -ForegroundColor Yellow
Write-Host ""

# Creer un script de test qui sera execute sur le VPS
$remoteScript = @"
#!/bin/bash
PUBLIC_IP=`$(curl -s ifconfig.me)
echo ""
echo "IP du VPS: `$PUBLIC_IP"
echo ""
echo "Test de connexion Gmail..."
echo ""

# Test d'authentification
GMAIL_USER_B64=`$(echo -n "$gmailUser" | base64)
GMAIL_PASS_B64=`$(echo -n "$gmailPass" | base64)

AUTH_TEST=`$(timeout 15 openssl s_client -connect smtp.gmail.com:587 -starttls smtp -quiet 2>/dev/null << EOF
EHLO localhost
AUTH LOGIN
`$GMAIL_USER_B64
`$GMAIL_PASS_B64
QUIT
EOF
)

echo "`$AUTH_TEST"
echo ""

if echo "`$AUTH_TEST" | grep -q "235"; then
    echo "=========================================="
    echo "SUCCES: Google N'EST PAS bloquant !"
    echo "=========================================="
    echo ""
    echo "L'authentification Gmail fonctionne depuis le VPS."
    echo "Le probleme vient de votre code backend."
    echo ""
    echo "Verifications a faire:"
    echo "  1. Les credentials sont-ils bien charges depuis la BDD ?"
    echo "  2. Verifiez les logs: pm2 logs velosi-backend --lines 50"
    echo "  3. Activez le mode debug dans email.service.ts"
    
elif echo "`$AUTH_TEST" | grep -q "535"; then
    echo "=========================================="
    echo "ERREUR 535: Google BLOQUE probablement"
    echo "=========================================="
    echo ""
    echo "Google refuse l'authentification depuis cette IP."
    echo ""
    echo "Solutions:"
    echo ""
    echo "1. Activer 'Acces moins securise' sur Gmail"
    echo "   https://myaccount.google.com/lesssecureapps"
    echo ""
    echo "2. Autoriser cette IP dans Gmail"
    echo "   Allez sur: https://myaccount.google.com/notifications"
    echo "   Verifiez les alertes de connexion suspecte"
    echo "   Autorisez l'acces depuis: `$PUBLIC_IP"
    echo ""
    echo "3. Utiliser un App Password (recommande)"
    echo "   https://myaccount.google.com/apppasswords"
    echo "   - Activez la 2FA d'abord"
    echo "   - Generez un App Password"
    echo "   - Utilisez ce mot de passe dans la BDD"
    
elif echo "`$AUTH_TEST" | grep -q "534"; then
    echo "=========================================="
    echo "ERREUR 534: Acces refuse par Google"
    echo "=========================================="
    echo ""
    echo "Google BLOQUE votre VPS."
    echo "IP bloquee: `$PUBLIC_IP"
    echo ""
    echo "Solution: Utilisez un App Password"
    echo "https://myaccount.google.com/apppasswords"
    
else
    echo "=========================================="
    echo "Impossible de determiner"
    echo "=========================================="
    echo ""
    echo "Reponse recue:"
    echo "`$AUTH_TEST"
fi

echo ""
echo "=========================================="
"@

# Sauvegarder le script temporairement
$tempScriptPath = "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\temp-test-gmail.sh"
$remoteScript | Out-File -FilePath $tempScriptPath -Encoding UTF8 -NoNewline

# Transferer et executer
scp $tempScriptPath "${VPS_HOST}:~/temp-test-gmail.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Script transfere, execution..." -ForegroundColor Green
    Write-Host ""
    
    ssh $VPS_HOST "chmod +x ~/temp-test-gmail.sh && bash ~/temp-test-gmail.sh && rm ~/temp-test-gmail.sh"
    
    # Nettoyer localement
    Remove-Item $tempScriptPath -Force
    
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Recommandations" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Si Google BLOQUE:" -ForegroundColor Red
    Write-Host "  → Utilisez un App Password pour chaque organisation" -ForegroundColor White
    Write-Host "  → https://myaccount.google.com/apppasswords" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Si Google N'EST PAS bloquant:" -ForegroundColor Green
    Write-Host "  → Le probleme vient du code backend" -ForegroundColor White
    Write-Host "  → Verifiez que les credentials sont bien charges" -ForegroundColor White
    Write-Host "  → Activez le debug: pm2 logs velosi-backend" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Erreur lors du transfert du script" -ForegroundColor Red
    Remove-Item $tempScriptPath -Force -ErrorAction SilentlyContinue
}
