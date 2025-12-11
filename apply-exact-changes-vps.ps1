# Script pour appliquer les memes modifications exactes qu'en local sur le VPS

$VPS_HOST = "Webdesk@vps-3b4fd3be.vps.ovh.ca"

Write-Host "Application des memes modifications qu'en local sur le VPS..." -ForegroundColor Cyan

# Commandes SSH pour modifier le fichier
$sshCommands = @"
cd ~/velosi-back/src/services

# Creer une sauvegarde
cp email.service.ts email.service.ts.backup.final.`$(date +%Y%m%d_%H%M%S)

echo 'Application des modifications exactes...'

# Utiliser Python pour appliquer les memes modifications qu'en local
python3 << 'PYTHON_END'
import re

# Lire le fichier
with open('email.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# MODIFICATION 1: Supprimer la section contact-section avec Support client
# Rechercher et supprimer le bloc complet
pattern1 = r'\n\s*<div class="contact-section">\s*\n\s*<h3>💬 Support client</h3>\s*\n\s*<p><strong>Service Client Velosi</strong></p>\s*\n\s*<p>📧 Email: support\.client@velosi\.com</p>\s*\n\s*<p>📞 Téléphone: \+33 \(0\)1 23 45 67 89</p>\s*\n\s*<p>🕒 Disponible du lundi au vendredi, 8h30 - 18h00</p>\s*\n\s*</div>'

content = re.sub(pattern1, '', content, flags=re.MULTILINE)

# MODIFICATION 2: Supprimer la section contact-info avec Support Client  
pattern2 = r'\n\s*<div class="contact-info">\s*\n\s*<h3>📞 Support Client</h3>\s*\n\s*<p>Notre équipe reste à votre disposition pour tout accompagnement :</p>\s*\n\s*<p><strong>📧 Email :</strong> service\.client@velosi\.com</p>\s*\n\s*<p><strong>📞 Téléphone :</strong> \+33 \(0\)1 23 45 67 89</p>\s*\n\s*<p><strong>🕒 Horaires :</strong> Lundi - Vendredi, 8h30 - 18h00</p>\s*\n\s*</div>'

content = re.sub(pattern2, '', content, flags=re.MULTILINE)

# MODIFICATION 3: Remplacer Support client par Demande d'assistance dans enquiryTypeMap
old_text = "'support': 'Support client',"
new_text = "'support': 'Demande d'assistance',"
content = content.replace(old_text, new_text)

# Ecrire le fichier modifie
with open('email.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Modifications appliquees avec succes!')
PYTHON_END

# Verification finale
echo ''
echo 'Verification finale:'
MATCHES=`$(grep -c -i 'support client' email.service.ts 2>/dev/null || echo 0)
echo \"Nombre de mentions 'support client' restantes: \`$MATCHES\"

if test `$MATCHES -eq 0; then
    echo '✅ SUCCESS: Toutes les sections Support Client ont ete supprimees!'
else
    echo '⚠️ Il reste encore des mentions:'
    grep -n -i 'support client' email.service.ts
fi

# Redemarrer PM2
if command -v pm2 > /dev/null 2>&1; then
    echo ''
    echo 'Redemarrage du backend...'
    pm2 restart velosi-back --update-env
fi

echo ''
echo '✅ Modifications terminees!'
"@

Write-Host "Connexion au VPS..." -ForegroundColor Yellow

# Nettoyer les retours chariot Windows
$sshCommands = $sshCommands -replace "`r", ""

# Executer les commandes sur le VPS
echo 'Offline25$$' | ssh $VPS_HOST $sshCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Modifications appliquees avec succes sur le VPS!" -ForegroundColor Green
    Write-Host "Les memes modifications qu'en local ont ete appliquees" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Erreur lors de l'application" -ForegroundColor Red
}
