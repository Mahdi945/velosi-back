# 📎 SYSTÈME DE PIÈCES JOINTES - GUIDE COMPLET

## 🎯 Vue d'ensemble

Le système de gestion des pièces jointes pour les activités CRM permet d'uploader, visualiser, télécharger et supprimer des fichiers (images, PDF, documents Office, archives) liés à chaque activité.

---

## 📊 ARCHITECTURE

### Backend (NestJS)
```
velosi-back/
├── src/
│   ├── crm/
│   │   ├── entities/
│   │   │   └── activity.entity.ts           # Colonne attachments (JSONB)
│   │   ├── services/
│   │   │   └── activity-attachments.service.ts  # Gestion des fichiers
│   │   ├── config/
│   │   │   └── multer.config.ts             # Configuration upload
│   │   ├── activities.controller.ts         # Endpoints API
│   │   └── dto/
│   │       └── create-activity.dto.ts       # Validation
│   └── main.ts                              # Configuration serveur statique
├── migrations/
│   └── 1729084800000-AddAttachmentsToActivities.ts
└── uploads/
    └── activites/
        ├── temp/                            # Fichiers temporaires
        └── {activityId}/                    # Dossier par activité
            ├── fichier1.pdf
            ├── image1.jpg
            └── ...
```

### Frontend (Angular)
```
velosi-front/
└── src/app/
    ├── models/
    │   └── activity.model.ts               # Interface AttachmentMetadata
    ├── services/
    │   └── activities.service.ts           # Méthodes upload/download/delete
    └── components/crm/activities/
        ├── activities.component.ts         # Logique gestion fichiers
        └── activities.component.html       # 3 modaux (ajout, gestion, visualisation)
```

---

## 🔧 CONFIGURATION

### 1. Base de données (PostgreSQL)

**Colonne `attachments` dans `crm_activities`** :
```sql
ALTER TABLE crm_activities 
ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
```

**Structure JSON** :
```json
[
  {
    "fileName": "rapport-2024-123456789.pdf",
    "originalName": "rapport-2024.pdf",
    "filePath": "activites/42/rapport-2024-123456789.pdf",
    "fileSize": 2048576,
    "mimeType": "application/pdf",
    "uploadedAt": "2025-10-16T10:30:00.000Z"
  }
]
```

### 2. Backend Configuration

**main.ts** - Servir les fichiers statiques :
```typescript
app.useStaticAssets(join(process.cwd(), 'uploads', 'activites'), {
  prefix: '/uploads/activites/',
});

app.setGlobalPrefix('api', {
  exclude: [..., '/uploads/activites/(.*)']
});
```

**multer.config.ts** - Validation :
- ✅ **Formats autorisés** : images (jpg, png, gif, webp, svg), PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP, RAR, 7Z
- ✅ **Taille max par fichier** : 10MB
- ✅ **Nombre max** : 10 fichiers par activité
- ✅ **Taille totale max** : 100MB

### 3. Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/crm/activities/:id/attachments` | Upload fichiers |
| GET | `/api/crm/activities/:id/attachments/:fileName` | Télécharger un fichier |
| DELETE | `/api/crm/activities/:id/attachments/:fileName` | Supprimer un fichier |

---

## 🎨 INTERFACE UTILISATEUR

### 1. Modal d'ajout/modification d'activité

**Section "Pièces jointes"** :
- **Bouton "Gérer les pièces jointes"** : Toujours visible
- **Badge** : Affiche le nombre de fichiers (si > 0)
- **Aperçu** : Liste des 3 premiers fichiers + compteur si plus

**Comportement** :
- ✅ En **mode ajout** : Le bouton est cliquable mais les fichiers ne peuvent être uploadés qu'après création
- ✅ En **mode édition** : Le bouton ouvre le modal de gestion complet

### 2. Modal de gestion des pièces jointes

**Layout adaptatif** :
- **Mode AJOUT** : 1 colonne (sélection de fichiers uniquement)
  - Message d'info : "Enregistrez d'abord l'activité..."
  - Sélection des fichiers (préparation)
  - Upload désactivé tant que pas d'ID
  
- **Mode ÉDITION** : 2 colonnes
  - **Colonne gauche** : Fichiers existants
    - Preview image ou icône selon type
    - Nom, taille, date d'upload
    - Actions : Télécharger, Supprimer
  - **Colonne droite** : Ajouter nouveaux fichiers
    - Zone de sélection
    - Preview des fichiers sélectionnés
    - Bouton upload

### 3. Modal de détails d'activité

**Section "Pièces jointes"** (dans la colonne gauche, après les participants) :
- Titre avec icône
- Phrase descriptive + nombre de fichiers
- Bouton "Voir les X fichier(s)" → Ouvre le modal de visualisation

### 4. Modal de visualisation (lecture seule)

- **Galerie responsive** : 3 colonnes (lg), 2 colonnes (md)
- **Carte par fichier** :
  - Preview image ou icône (200px de hauteur)
  - Nom du fichier
  - Taille + date
  - Actions : Télécharger, Supprimer

---

## 💻 LOGIQUE MÉTIER

### Upload de fichiers

**Processus** :
1. Utilisateur sélectionne des fichiers
2. **Validation côté client** :
   - Nombre max (10)
   - Taille max (10MB/fichier)
   - Types autorisés
   - Pas de doublons
3. **Si activité sans ID** : Fichiers stockés localement, message d'info
4. **Si activité avec ID** : Upload vers backend
5. **Backend** :
   - Validation Multer
   - Stockage dans `uploads/activites/temp/`
   - Déplacement vers `uploads/activites/{activityId}/`
   - Mise à jour colonne `attachments` (JSON)
6. **Frontend** : Mise à jour de la liste, vider la sélection

### Téléchargement

**Processus** :
1. Click sur "Télécharger"
2. Requête GET vers `/api/crm/activities/:id/attachments/:fileName`
3. Backend utilise `res.download(filePath, originalName)`
4. Navigateur télécharge le fichier

### Suppression

**Processus** :
1. Click sur "Supprimer" → Modal de confirmation
2. Confirmation → Requête DELETE
3. **Backend** :
   - Suppression du fichier physique
   - Mise à jour JSON (retrait de l'entrée)
4. **Frontend** : Mise à jour de la liste

### Suppression d'activité

Lorsqu'une activité est supprimée, **tous ses fichiers sont automatiquement supprimés** :
```typescript
async remove(id: number) {
  await this.attachmentsService.deleteAllActivityAttachments(id);
  return this.activitiesService.remove(id);
}
```

---

## 🔒 SÉCURITÉ

### Validations

**Backend** :
- ✅ Validation des types MIME
- ✅ Validation des extensions
- ✅ Limite de taille par fichier et totale
- ✅ Authentification JWT requise

**Frontend** :
- ✅ Pre-validation avant upload
- ✅ Messages d'erreur détaillés
- ✅ Désactivation des boutons pendant le chargement

### Gestion des erreurs

**Cas gérés** :
- Fichier introuvable (404)
- Type non autorisé
- Taille dépassée
- Erreur d'upload
- Erreur de suppression
- Activité non trouvée

---

## 📱 RESPONSIVE

- **Desktop (lg+)** : 3 colonnes dans galerie, 2 colonnes dans gestion
- **Tablet (md)** : 2 colonnes dans galerie, 2 colonnes dans gestion
- **Mobile (sm)** : 1 colonne partout

---

## 🎯 TYPES DE FICHIERS SUPPORTÉS

### Images
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)

### Documents
- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- PowerPoint (.ppt, .pptx)
- Texte (.txt, .csv)

### Archives
- ZIP (.zip)
- RAR (.rar)
- 7-Zip (.7z)

---

## 🚀 UTILISATION

### Scénario 1 : Créer une activité avec pièces jointes

1. **Créer l'activité** :
   - Remplir le formulaire
   - Click "Enregistrer"
   
2. **Ajouter les pièces jointes** :
   - Click "Modifier" sur l'activité créée
   - Click "Gérer les pièces jointes"
   - Sélectionner les fichiers
   - Click "Uploader X fichier(s)"
   - Confirmation et fermeture automatique

### Scénario 2 : Modifier les pièces jointes

1. **Ouvrir l'activité** :
   - Click "Voir" ou "Modifier"
   
2. **Gérer les fichiers** :
   - Click "Gérer les pièces jointes"
   - **Ajouter** : Sélectionner + uploader
   - **Télécharger** : Click icône download
   - **Supprimer** : Click icône trash → Confirmer

### Scénario 3 : Visualiser les pièces jointes

1. **Voir les détails** :
   - Click "Voir" sur une activité
   
2. **Section pièces jointes** :
   - Si fichiers présents : Bouton "Voir les X fichier(s)"
   - Click → Galerie en modal
   - Preview images, icônes pour autres types
   - Actions : Télécharger, Supprimer

---

## 🐛 DEBUGGING

### Vérifier les dossiers

```powershell
# Backend
cd "c:\Users\MSP\Documents\Projet Velosi\ERP\velosi-back"
ls uploads\activites        # Doit exister
ls uploads\activites\temp   # Doit exister
```

### Vérifier les logs

```typescript
// Backend logs au démarrage
📁 Chemin activites: C:\...\velosi-back\uploads\activites

// Logs d'upload
console.log('Upload fichiers:', files.length);
console.log('Activité ID:', activityId);
```

### Tester les endpoints

```bash
# Upload (avec authentification)
POST http://localhost:3000/api/crm/activities/42/attachments

# Download
GET http://localhost:3000/uploads/activites/42/fichier.pdf

# Delete
DELETE http://localhost:3000/api/crm/activities/42/attachments/fichier.pdf
```

---

## ✅ CHECKLIST DE DÉPLOIEMENT

- [ ] Migration appliquée (`attachments` column exists)
- [ ] Dossiers créés (`uploads/activites`, `uploads/activites/temp`)
- [ ] Packages installés (`@nestjs/platform-express`, `multer`, `@types/multer`)
- [ ] `main.ts` configuré (static assets + exclusions)
- [ ] Backend compilé sans erreur
- [ ] Frontend compilé sans erreur
- [ ] Test upload fichier
- [ ] Test téléchargement fichier
- [ ] Test suppression fichier
- [ ] Test responsive mobile/desktop

---

## 📝 NOTES IMPORTANTES

1. **Les fichiers sont stockés physiquement** dans `uploads/activites/{activityId}/`
2. **Les métadonnées sont en JSON** dans la colonne `attachments`
3. **Suppression d'activité = suppression des fichiers** (automatique)
4. **Les fichiers sont servis directement** par NestJS (pas de proxy)
5. **L'URL des images** : `http://localhost:3000/uploads/activites/{activityId}/{fileName}`

---

## 🎉 AMÉLIORATIONS FUTURES

- [ ] Drag & drop de fichiers
- [ ] Barre de progression upload
- [ ] Compression automatique des images
- [ ] Génération de thumbnails
- [ ] Signature électronique des documents
- [ ] Versioning des fichiers
- [ ] Partage par lien temporaire
- [ ] Scanner antivirus intégré
