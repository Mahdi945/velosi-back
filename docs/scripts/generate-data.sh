#!/bin/bash

# Script de lancement pour générer les données de test Velosi Transport
# Usage: ./generate-data.sh [options]

echo "🚀 Générateur de données de test Velosi Transport"
echo "================================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "scripts/generate-test-data.ts" ]; then
    echo "❌ Erreur: Le script doit être exécuté depuis le répertoire velosi-back"
    echo "Usage: cd velosi-back && ./scripts/generate-data.sh"
    exit 1
fi

# Vérifier que Node.js et npm sont installés
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

# Vérifier la configuration
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env manquant"
    echo "Copiez le fichier .env.example et configurez vos paramètres"
    exit 1
fi

echo "📦 Vérification des dépendances..."
npm list ts-node &> /dev/null
if [ $? -ne 0 ]; then
    echo "📥 Installation de ts-node..."
    npm install -g ts-node
fi

echo "🎯 Configuration:"
echo "   - Base de données: PostgreSQL"
echo "   - Keycloak: http://localhost:8080"
echo "   - Realm: ERP_Velosi"
echo ""

# Options de lancement
case "$1" in
    "--clean"|"-c")
        echo "🧹 Mode: Nettoyage et génération complète"
        npx ts-node scripts/generate-test-data.ts --clean
        ;;
    "--no-keycloak"|"-nk")
        echo "🔒 Mode: Sans synchronisation Keycloak"
        npx ts-node scripts/generate-test-data.ts --no-keycloak
        ;;
    "--help"|"-h")
        echo "Usage: ./generate-data.sh [options]"
        echo ""
        echo "Options:"
        echo "  --clean, -c        Nettoyer les données existantes avant génération"
        echo "  --no-keycloak, -nk Générer sans synchroniser avec Keycloak"
        echo "  --help, -h         Afficher cette aide"
        echo ""
        echo "Exemples:"
        echo "  ./generate-data.sh              # Génération normale"
        echo "  ./generate-data.sh --clean      # Nettoyage puis génération"
        echo "  ./generate-data.sh --no-keycloak # Sans Keycloak"
        ;;
    *)
        echo "📊 Mode: Génération standard"
        npx ts-node scripts/generate-test-data.ts
        ;;
esac

echo ""
echo "✨ Script terminé !"
echo "🔗 Accédez à votre application sur http://localhost:4200"