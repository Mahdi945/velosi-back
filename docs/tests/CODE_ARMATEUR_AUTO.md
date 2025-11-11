# Guide Rapide - Code Armateur Auto-généré

## 🎯 Modifications Effectuées

### Backend
- ✅ Service modifié pour générer automatiquement le code au format `ARM001`, `ARM002`, etc.
- ✅ DTO mis à jour : le champ `code` est maintenant optionnel
- ✅ Algorithme de génération :
  - Cherche le dernier code ARM existant
  - Incrémente le numéro
  - Formate sur 3 chiffres avec padding de zéros

### Frontend
- ✅ Champ code masqué lors de la création
- ✅ Champ code affiché en lecture seule lors de la modification
- ✅ Badge "Auto-généré" pour indiquer que c'est automatique
- ✅ Message d'information dans le modal de création
- ✅ Validation mise à jour : seul le nom est obligatoire

### Base de données
- ✅ Script SQL mis à jour avec les nouveaux codes (ARM001 à ARM005)

## 🚀 Test Rapide

### 1. Recréer la table
```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
$env:PGPASSWORD='87Eq8384'
psql -U msp -d velosi -f "migrations/reset_armateurs_table.sql"
```

### 2. Démarrer le backend
```powershell
npm run start:dev
```

### 3. Tester la création d'un armateur

**Via Frontend :**
1. Ouvrir le modal "Nouvel Armateur"
2. ✅ Vérifier que le champ "Code" n'est pas visible
3. ✅ Voir le message bleu expliquant la génération automatique
4. Remplir uniquement le nom : "Test Armateur"
5. Cliquer sur "Créer"
6. ✅ L'armateur doit être créé avec le code `ARM006`

**Via API (Postman/cURL) :**
```bash
curl -X POST http://localhost:3000/api/armateurs \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Evergreen Marine"
  }'
```

**Réponse attendue :**
```json
{
  "id": 6,
  "code": "ARM006",
  "nom": "Evergreen Marine",
  ...
}
```

## 📋 Format du Code

- **Préfixe** : `ARM` (pour Armateur)
- **Numéro** : 3 chiffres avec padding de zéros
- **Exemples** : 
  - ARM001
  - ARM002
  - ...
  - ARM099
  - ARM100

## 🔍 Vérification

### Dans le tableau
- La colonne "Code" affiche les badges avec les codes générés
- Codes des données de test : ARM001, ARM002, ARM003, ARM004, ARM005

### Dans le modal de modification
- Le champ "Code" est affiché en lecture seule
- Badge bleu "Auto-généré" visible
- Message d'info : "Généré automatiquement par le système"

## ⚙️ Logique de Génération

1. **Premier armateur** : Si aucun armateur n'existe → `ARM001`
2. **Armateurs suivants** : 
   - Recherche le dernier code commençant par "ARM"
   - Extrait le numéro (ex: ARM005 → 5)
   - Incrémente (5 + 1 = 6)
   - Formate avec padding (6 → 006)
   - Retourne ARM006

3. **Gestion des erreurs** :
   - Si le format ne correspond pas, utilise le COUNT + 1
   - Garantit l'unicité du code

## 🎨 Interface Utilisateur

### Modal de Création
```
┌─────────────────────────────────────────┐
│ ℹ️  Code armateur automatique           │
│ Le code de l'armateur (ex: ARM001...)   │
│ sera généré automatiquement.            │
└─────────────────────────────────────────┘

Nom * : [Mediterranean Shipping Company  ]
Abréviation : [MSC                       ]
```

### Modal de Modification
```
Code [Auto-généré] : [ARM001] (désactivé)
ℹ️ Généré automatiquement par le système

Nom * : [Mediterranean Shipping Company  ]
Abréviation : [MSC                       ]
```

## ✅ Checklist de Test

- [ ] Table armateurs recréée avec les codes ARM001-ARM005
- [ ] Backend démarre sans erreur
- [ ] GET /api/armateurs retourne les armateurs avec codes ARM001-ARM005
- [ ] Modal de création n'affiche pas le champ code
- [ ] Message d'information visible en mode création
- [ ] Création d'un nouvel armateur génère ARM006
- [ ] Modal de modification affiche le code en lecture seule
- [ ] Badge "Auto-généré" visible en mode modification
- [ ] Code non modifiable dans le formulaire
- [ ] Codes affichés correctement dans le tableau

## 🔧 Personnalisation

### Changer le préfixe du code
Éditer `armateurs.service.ts`, méthode `generateArmateurCode()` :
```typescript
// Remplacer 'ARM' par votre préfixe
.where("armateur.code LIKE 'ARM%'")  // ← Changer ici
return 'ARM001';  // ← Et ici
return `ARM${newNumber.toString().padStart(3, '0')}`;  // ← Et ici
```

### Changer le nombre de chiffres
```typescript
// Pour 4 chiffres (ARM0001) au lieu de 3 (ARM001)
.padStart(4, '0')  // Changer 3 en 4
```

## 📝 Notes Importantes

1. ⚠️ Le code ne peut pas être modifié après création
2. ✅ Le système garantit l'unicité du code
3. 🔒 Le code est généré côté serveur (sécurisé)
4. 📊 La séquence continue même après suppression
5. 🎯 Format cohérent pour tous les armateurs
