#!/bin/bash

# ===============================================
# 🔒 SCRIPT DE NETTOYAGE DE L'HISTORIQUE GIT
# ===============================================
# 
# Ce script supprime les credentials SMTP de l'historique Git
# ⚠️ ATTENTION: Cette opération réécrit l'historique Git!
# 
# Instructions:
# 1. Faire un backup complet du dépôt
# 2. Exécuter ce script
# 3. Force push vers le remote (coordonner avec l'équipe!)
# 
# ===============================================

echo "🔒 NETTOYAGE DE L'HISTORIQUE GIT"
echo "================================"
echo ""
echo "⚠️  ATTENTION: Ce script va réécrire l'historique Git!"
echo "⚠️  Assurez-vous d'avoir un backup complet avant de continuer."
echo ""
read -p "Voulez-vous continuer? (oui/non): " confirm

if [ "$confirm" != "oui" ]; then
  echo "❌ Annulé par l'utilisateur"
  exit 1
fi

echo ""
echo "📦 Installation de git-filter-repo si nécessaire..."
pip3 install git-filter-repo

echo ""
echo "🧹 Suppression des credentials de l'historique..."

# Créer un fichier de patterns à supprimer
cat > /tmp/credentials-patterns.txt << 'EOF'
qaas amak tyqq rzet
velosierp@gmail.com
SMTP_PASSWORD.*qaas
EOF

# Utiliser git-filter-repo pour nettoyer l'historique
git filter-repo --replace-text /tmp/credentials-patterns.txt --force

echo ""
echo "✅ Nettoyage terminé!"
echo ""
echo "📝 PROCHAINES ÉTAPES:"
echo "1. Vérifier que le code fonctionne toujours"
echo "2. Créer un fichier .env avec les vraies credentials"
echo "3. Coordonner avec l'équipe pour le force push"
echo "4. Exécuter: git push origin --force --all"
echo "5. Révoquer l'ancien mot de passe SMTP sur Gmail"
echo "6. Générer un nouveau mot de passe d'application Gmail"
echo ""
echo "⚠️  N'oubliez pas de prévenir toute l'équipe avant le force push!"

# Nettoyer
rm /tmp/credentials-patterns.txt
