#!/bin/bash
# Script pour arrêter Exim avec les droits sudo (à exécuter en tant qu'almalinux)

echo "=========================================="
echo "ARRÊT D'EXIM - Mode Administrateur"
echo "=========================================="
echo ""

# Arrêter Exim4
echo "1. Arrêt d'Exim4..."
sudo systemctl stop exim4 2>/dev/null
sudo systemctl disable exim4 2>/dev/null
echo "✓ Exim4 arrêté"

# Arrêter Exim
echo "2. Arrêt d'Exim..."
sudo systemctl stop exim 2>/dev/null
sudo systemctl disable exim 2>/dev/null
echo "✓ Exim arrêté"

# Forcer l'arrêt des processus
echo "3. Forçage arrêt processus Exim..."
sudo pkill -9 exim 2>/dev/null
echo "✓ Processus Exim arrêtés"

# Vérifier les ports
echo ""
echo "4. Vérification des ports..."
sleep 2
PORTS_USED=$(ss -tuln | grep -E ":(25|587|465) ")

if [ -z "$PORTS_USED" ]; then
    echo "✅ TOUS LES PORTS SMTP SONT LIBRES !"
else
    echo "⚠️  Certains ports encore utilisés:"
    echo "$PORTS_USED"
    echo ""
    echo "Libération forcée..."
    
    # Identifier et tuer les processus
    for PORT in 25 587 465; do
        PID=$(sudo lsof -ti:$PORT 2>/dev/null)
        if [ -n "$PID" ]; then
            echo "  Port $PORT utilisé par PID $PID - arrêt..."
            sudo kill -9 $PID
        fi
    done
    
    sleep 2
    echo ""
    echo "Nouvelle vérification:"
    PORTS_USED=$(ss -tuln | grep -E ":(25|587|465) ")
    if [ -z "$PORTS_USED" ]; then
        echo "✅ TOUS LES PORTS SONT MAINTENANT LIBRES !"
    else
        echo "❌ Ports encore utilisés:"
        echo "$PORTS_USED"
    fi
fi

echo ""
echo "=========================================="
echo "✅ Terminé !"
echo "=========================================="
