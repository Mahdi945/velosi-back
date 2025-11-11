# Guide de Test - Module Armateurs avec Upload de Logo

## ✅ Modifications Effectuées

### Backend

1. **Base de données**
   - ✅ Script SQL créé : `migrations/create_armateurs_table.sql`
   - ✅ Table `armateurs` avec colonne `logo` (TEXT)
   - ✅ 5 armateurs de test inclus dans le script

2. **Entité TypeORM**
   - ✅ `src/entities/armateur.entity.ts` créé
   - ✅ Ajouté dans `database.config.ts`

3. **DTOs**
   - ✅ `src/dto/create-armateur.dto.ts`
   - ✅ `src/dto/update-armateur.dto.ts`

4. **Service**
   - ✅ `src/services/armateurs.service.ts`
   - ✅ Méthode `updateLogo()` ajoutée

5. **Controller**
   - ✅ `src/controllers/armateurs.controller.ts`
   - ✅ Endpoint POST `/armateurs/upload-logo/:id` avec Multer

6. **Module**
   - ✅ `src/modules/armateurs.module.ts`
   - ✅ MulterModule configuré
   - ✅ Importé dans `app.module.ts`

7. **Configuration**
   - ✅ Dossier `uploads/logos_armateurs` créé
   - ✅ Configuration dans `main.ts` pour servir les fichiers statiques
   - ✅ Placeholder SVG créé (navire avec conteneurs)

### Frontend

1. **Modèle**
   - ✅ `src/app/models/armateur.interface.ts`

2. **Service**
   - ✅ `src/app/services/armateurs.service.ts`
   - ✅ Méthode `uploadLogo()` ajoutée

3. **Component**
   - ✅ `src/app/components/gestion-ressources/armateurs/armateurs.component.ts`
   - ✅ Gestion de l'upload de fichier
   - ✅ Preview du logo
   - ✅ Méthode `onImageError()` pour gérer les erreurs d'image

4. **Template**
   - ✅ Colonne Logo dans le tableau (première colonne)
   - ✅ Section Upload dans le modal
   - ✅ Preview avec possibilité de suppression
   - ✅ Styles CSS pour l'affichage des logos

## 🚀 Instructions de Test

### Étape 1 : Créer la table dans la base de données

```powershell
# Dans le terminal PowerShell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
$env:PGPASSWORD='87Eq8384'
psql -U msp -d velosi -f "migrations/create_armateurs_table.sql"
```

### Étape 2 : Démarrer le backend

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
npm run start:dev
```

**Vérifications dans les logs :**
- ✅ `📁 Chemin logos_armateurs: C:\Users\MSP\...\uploads\logos_armateurs`
- ✅ Aucune erreur TypeORM concernant l'entité Armateur

### Étape 3 : Démarrer le frontend

```powershell
cd "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-front"
npm start
```

### Étape 4 : Tests Fonctionnels

#### Test 1 : Affichage de la liste
1. Naviguer vers la page Armateurs
2. ✅ Vérifier que les 5 armateurs de test s'affichent
3. ✅ La première colonne doit montrer le placeholder SVG (navire)
4. ✅ Vérifier les filtres (recherche, ville, pays, statut)

#### Test 2 : Créer un armateur avec logo
1. Cliquer sur "Nouvel Armateur"
2. Remplir les champs obligatoires :
   - Code : `TEST1`
   - Nom : `Armateur Test`
3. Dans la section Logo :
   - Cliquer sur "Choisir un fichier"
   - Sélectionner une image (JPG, PNG, etc.)
   - ✅ La preview doit s'afficher immédiatement
4. Cliquer sur "Créer"
5. ✅ Le logo doit apparaître dans la première colonne du tableau

#### Test 3 : Modifier un armateur et changer son logo
1. Cliquer sur un armateur existant
2. Modifier le logo :
   - Sélectionner un nouveau fichier
   - ✅ La preview se met à jour
3. Cliquer sur "Enregistrer"
4. ✅ Le nouveau logo s'affiche dans le tableau

#### Test 4 : Supprimer un logo
1. Ouvrir un armateur en modification
2. Cliquer sur le bouton "Supprimer le logo" (ou le X sur la preview)
3. ✅ La preview disparaît
4. Enregistrer
5. ✅ Le placeholder s'affiche dans le tableau

#### Test 5 : Validation des fichiers
1. Essayer d'uploader un fichier non-image (PDF, Word, etc.)
2. ✅ Message d'erreur : "Seules les images sont autorisées"
3. Essayer d'uploader une image > 5MB
4. ✅ Message d'erreur : "La taille du fichier ne doit pas dépasser 5 MB"

## 📋 Checklist de Vérification

### Backend
- [ ] Table `armateurs` créée avec succès
- [ ] Dossier `uploads/logos_armateurs` existe
- [ ] Backend démarre sans erreur
- [ ] Endpoint GET `/api/armateurs` fonctionne
- [ ] Endpoint POST `/api/armateurs` fonctionne
- [ ] Endpoint POST `/api/armateurs/upload-logo/:id` fonctionne
- [ ] Les logos sont accessibles via `/uploads/logos_armateurs/`

### Frontend
- [ ] Page Armateurs s'affiche correctement
- [ ] Liste des armateurs se charge
- [ ] Modal de création s'ouvre
- [ ] Input file fonctionne
- [ ] Preview du logo s'affiche
- [ ] Upload du logo réussit
- [ ] Logos s'affichent dans le tableau
- [ ] Placeholder s'affiche si pas de logo

## 🔧 Débogage

### Si les logos ne s'affichent pas dans le tableau

1. **Vérifier l'URL générée** :
   - Ouvrir la console du navigateur (F12)
   - Inspecter l'élément `<img>` du logo
   - L'URL doit être : `http://localhost:3000/uploads/logos_armateurs/armateur-X-XXXXX.jpg`

2. **Tester l'URL directement** :
   - Copier l'URL du logo
   - La coller dans une nouvelle fenêtre du navigateur
   - Le logo doit s'afficher

3. **Vérifier les fichiers** :
   ```powershell
   ls "C:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back\uploads\logos_armateurs\"
   ```
   - Les fichiers uploadés doivent être présents

### Si l'upload échoue

1. **Vérifier les logs backend** :
   - Chercher des erreurs lors de l'upload
   - Vérifier les permissions du dossier

2. **Vérifier le FormData** :
   - Console du navigateur > Network > Chercher la requête POST
   - Vérifier que le fichier est bien envoyé

3. **Vérifier Multer** :
   - Les logs doivent montrer le fichier reçu
   - Vérifier que le dossier de destination existe

## 📸 Captures d'écran Attendues

### 1. Liste avec logos
- Colonne 1 : Logo (60x60px, arrondi)
- Colonne 2 : Code (badge bleu)
- Colonne 3 : Nom avec icône navire
- etc.

### 2. Modal de création/modification
- Section Logo en haut avec :
  - Preview 120x120px à gauche
  - Input file à droite
  - Bouton "Supprimer le logo" si logo présent

### 3. Placeholder SVG
- Navire stylisé avec conteneurs colorés
- Vagues en bas
- Texte "Armateur"

## 🎨 Personnalisation

### Changer le placeholder
Éditer : `velosi-back/uploads/logos_armateurs/placeholder.svg`

### Changer la taille max des logos
Dans `armateurs.controller.ts`, ligne 32 :
```typescript
limits: {
  fileSize: 5 * 1024 * 1024, // Modifier ici (actuellement 5MB)
},
```

### Changer les formats acceptés
Dans `armateurs.controller.ts`, ligne 27 :
```typescript
if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
  // Ajouter d'autres formats ici
}
```

## 📝 Notes Importantes

1. **Sécurité** : Les fichiers sont validés côté serveur (type et taille)
2. **Performance** : Les logos sont servis comme fichiers statiques
3. **Nommage** : Format `armateur-{id}-{timestamp}.{ext}`
4. **Base de données** : Seul le chemin relatif est stocké (`/uploads/logos_armateurs/...`)
5. **Fallback** : Si une image ne charge pas, le placeholder s'affiche

## 🐛 Problèmes Connus

- ⚠️ Pas de suppression automatique des anciens logos lors du remplacement
- ⚠️ Pas de redimensionnement automatique des images
- ⚠️ Pas de compression des images

## 🔜 Améliorations Futures

- [ ] Cropping/redimensionnement des images
- [ ] Compression automatique
- [ ] Support du drag & drop
- [ ] Galerie de logos prédéfinis
- [ ] Nettoyage automatique des logos orphelins
