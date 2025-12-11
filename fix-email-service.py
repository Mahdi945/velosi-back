#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

print("Lecture du fichier email.service.ts...")

# Lire le fichier
with open('email.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

modifications = 0

# MODIFICATION 1: Supprimer la section contact-section avec Support client
pattern1 = r'\n\s*<div class="contact-section">\s*\n\s*<h3>💬 Support client</h3>\s*\n\s*<p><strong>Service Client Velosi</strong></p>\s*\n\s*<p>📧 Email: support\.client@velosi\.com</p>\s*\n\s*<p>📞 Téléphone: \+33 \(0\)1 23 45 67 89</p>\s*\n\s*<p>🕒 Disponible du lundi au vendredi, 8h30 - 18h00</p>\s*\n\s*</div>'

new_content = re.sub(pattern1, '', content, flags=re.MULTILINE)
if new_content != content:
    modifications += 1
    print("✓ Section 'contact-section' supprimee")
content = new_content

# MODIFICATION 2: Supprimer la section contact-info avec Support Client  
pattern2 = r'\n\s*<div class="contact-info">\s*\n\s*<h3>📞 Support Client</h3>\s*\n\s*<p>Notre équipe reste à votre disposition pour tout accompagnement :</p>\s*\n\s*<p><strong>📧 Email :</strong> service\.client@velosi\.com</p>\s*\n\s*<p><strong>📞 Téléphone :</strong> \+33 \(0\)1 23 45 67 89</p>\s*\n\s*<p><strong>🕒 Horaires :</strong> Lundi - Vendredi, 8h30 - 18h00</p>\s*\n\s*</div>'

new_content = re.sub(pattern2, '', content, flags=re.MULTILINE)
if new_content != content:
    modifications += 1
    print("✓ Section 'contact-info' supprimee")
content = new_content

# MODIFICATION 3: Remplacer Support client par Demande d'assistance
old_text = "'support': 'Support client',"
new_text = "'support': 'Demande d\\'assistance',"
if old_text in content:
    content = content.replace(old_text, new_text)
    modifications += 1
    print("✓ 'Support client' remplace par 'Demande d\\'assistance'")

# Ecrire le fichier modifie
with open('email.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ {modifications} modification(s) appliquee(s) avec succes!")
