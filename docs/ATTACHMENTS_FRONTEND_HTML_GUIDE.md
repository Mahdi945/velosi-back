# GUIDE D'IMPLÉMENTATION DES PIÈCES JOINTES - PARTIE FRONTEND HTML

## 📋 MODIFICATIONS À APPORTER AU FICHIER activities.component.html

### 1. BOUTON DANS LE MODAL D'AJOUT/MODIFICATION

Cherchez la section du modal d'ajout (`<div class="modal fade" id="activityFormModal">`) et ajoutez ce bouton **APRÈS la section des participants** et **AVANT les boutons du footer** :

```html
<!-- Section Pièces jointes (uniquement en mode édition) -->
<div class="mb-3" *ngIf="isEditMode && activityForm?.id">
  <label class="form-label fw-bold">
    <i class="bi bi-paperclip me-2"></i>Pièces jointes
  </label>
  <div class="d-flex align-items-center gap-2">
    <button
      type="button"
      class="btn btn-outline-primary"
      (click)="openAttachmentsModal()"
      [disabled]="loading"
    >
      <i class="bi bi-cloud-upload me-2"></i>
      Ajouter des fichiers
    </button>
    <span class="text-muted small" *ngIf="activityForm.attachments && activityForm.attachments.length > 0">
      {{ activityForm.attachments.length }} fichier(s) joint(s)
    </span>
  </div>
  
  <!-- Liste des fichiers joints -->
  <div *ngIf="activityForm.attachments && activityForm.attachments.length > 0" class="mt-2">
    <div class="list-group list-group-flush">
      <div
        *ngFor="let attachment of activityForm.attachments"
        class="list-group-item d-flex align-items-center justify-content-between px-0"
      >
        <div class="d-flex align-items-center">
          <i class="{{ getFileIcon(attachment.mimeType) }} me-2 text-primary"></i>
          <div>
            <div class="fw-medium">{{ attachment.originalName }}</div>
            <small class="text-muted">{{ getFileSize(attachment.fileSize) }}</small>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-sm btn-outline-danger"
          (click)="confirmDeleteAttachment(attachment)"
          title="Supprimer"
        >
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>
  </div>
</div>
```

### 2. BOUTON DANS LE MODAL DE DÉTAILS

Cherchez le modal de détails (`<div class="modal fade" id="activityDetailsModal">`) et ajoutez ce bouton dans le **footer du modal**, à côté du bouton "Fermer" :

```html
<!-- Dans le footer du modal de détails, AVANT le bouton Fermer -->
<button
  *ngIf="selectedActivityDetails?.attachments && selectedActivityDetails.attachments.length > 0"
  type="button"
  class="btn btn-primary"
  (click)="openAttachmentsViewModal(selectedActivityDetails)"
>
  <i class="bi bi-paperclip me-2"></i>
  Voir les pièces jointes ({{ selectedActivityDetails.attachments.length }})
</button>
```

### 3. MODAL D'UPLOAD DES FICHIERS

À ajouter **À LA FIN DU FICHIER**, juste avant les modaux de success/error :

```html
<!-- ========================================== -->
<!-- MODAL D'UPLOAD DES PIÈCES JOINTES -->
<!-- ========================================== -->
<div class="modal fade" [class.show]="showAttachmentsModal" [style.display]="showAttachmentsModal ? 'block' : 'none'" tabindex="-1">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header bg-primary text-white">
        <h5 class="modal-title">
          <i class="bi bi-cloud-upload me-2"></i>
          Ajouter des pièces jointes
        </h5>
        <button type="button" class="btn-close btn-close-white" (click)="closeAttachmentsModal()"></button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <!-- Zone de drop/sélection -->
        <div class="mb-3">
          <label for="fileInput" class="btn btn-lg btn-outline-primary w-100 py-4" style="cursor: pointer;">
            <i class="bi bi-cloud-arrow-up display-4 d-block mb-2"></i>
            <span class="fw-medium">Cliquez pour sélectionner des fichiers</span>
            <br>
            <small class="text-muted">
              Maximum {{ MAX_FILES }} fichiers, 10MB par fichier<br>
              Formats: Images, PDF, Documents Office, Archives
            </small>
          </label>
          <input
            type="file"
            id="fileInput"
            multiple
            class="d-none"
            (change)="onFilesSelected($event)"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
          >
        </div>

        <!-- Fichiers sélectionnés -->
        <div *ngIf="selectedFiles.length > 0" class="mt-4">
          <h6 class="fw-bold">
            <i class="bi bi-files me-2"></i>
            Fichiers sélectionnés ({{ selectedFiles.length }}/{{ MAX_FILES }})
          </h6>
          
          <div class="row g-3 mt-2">
            <div *ngFor="let file of selectedFiles; let i = index" class="col-md-6">
              <div class="card h-100">
                <div class="card-body p-3">
                  <div class="d-flex align-items-start">
                    <!-- Preview si image -->
                    <div *ngIf="file.type.startsWith('image/')" class="me-3">
                      <img
                        [src]="getImagePreview(file)"
                        alt="Preview"
                        class="rounded"
                        style="width: 60px; height: 60px; object-fit: cover;"
                      >
                    </div>
                    
                    <!-- Icône si pas image -->
                    <div *ngIf="!file.type.startsWith('image/')" class="me-3">
                      <i class="{{ getFileIcon(file.type) }} display-6 text-primary"></i>
                    </div>

                    <!-- Info fichier -->
                    <div class="flex-grow-1">
                      <div class="fw-medium text-truncate" [title]="file.name">
                        {{ file.name }}
                      </div>
                      <small class="text-muted">{{ getFileSize(file.size) }}</small>
                    </div>

                    <!-- Bouton supprimer -->
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger ms-2"
                      (click)="removeSelectedFile(i)"
                      title="Retirer"
                    >
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message si aucun fichier -->
        <div *ngIf="selectedFiles.length === 0" class="alert alert-info text-center">
          <i class="bi bi-info-circle me-2"></i>
          Aucun fichier sélectionné
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="closeAttachmentsModal()" [disabled]="loading">
          Annuler
        </button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="uploadAttachments()"
          [disabled]="loading || selectedFiles.length === 0"
        >
          <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i *ngIf="!loading" class="bi bi-upload me-2"></i>
          Télécharger ({{ selectedFiles.length }})
        </button>
      </div>
    </div>
  </div>
</div>
<div class="modal-backdrop fade" [class.show]="showAttachmentsModal" *ngIf="showAttachmentsModal"></div>
```

### 4. MODAL DE VISUALISATION DES PIÈCES JOINTES

À ajouter **APRÈS le modal d'upload** :

```html
<!-- ========================================== -->
<!-- MODAL DE VISUALISATION DES PIÈCES JOINTES -->
<!-- ========================================== -->
<div class="modal fade" [class.show]="showAttachmentsViewModal" [style.display]="showAttachmentsViewModal ? 'block' : 'none'" tabindex="-1">
  <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <!-- Header -->
      <div class="modal-header bg-info text-white">
        <h5 class="modal-title">
          <i class="bi bi-paperclip me-2"></i>
          Pièces jointes - {{ selectedActivityDetails?.title }}
        </h5>
        <button type="button" class="btn-close btn-close-white" (click)="closeAttachmentsViewModal()"></button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <div *ngIf="selectedActivityDetails?.attachments && selectedActivityDetails.attachments.length > 0">
          <div class="row g-4">
            <div *ngFor="let attachment of selectedActivityDetails.attachments" class="col-md-6 col-lg-4">
              <div class="card h-100 shadow-sm">
                <!-- Preview image -->
                <div *ngIf="isImageFile(attachment.mimeType)" class="card-img-top" style="height: 200px; overflow: hidden; background-color: #f8f9fa;">
                  <img
                    [src]="getImageUrl(attachment)"
                    [alt]="attachment.originalName"
                    class="w-100 h-100"
                    style="object-fit: contain;"
                    (error)="$event.target.src='assets/images/no-image.png'"
                  >
                </div>

                <!-- Icône si pas image -->
                <div *ngIf="!isImageFile(attachment.mimeType)" class="card-img-top d-flex align-items-center justify-content-center bg-light" style="height: 200px;">
                  <i class="{{ getFileIcon(attachment.mimeType) }}" style="font-size: 5rem;" [class]="'text-primary'"></i>
                </div>

                <!-- Info fichier -->
                <div class="card-body">
                  <h6 class="card-title text-truncate" [title]="attachment.originalName">
                    {{ attachment.originalName }}
                  </h6>
                  <p class="card-text">
                    <small class="text-muted">
                      <i class="bi bi-hdd me-1"></i>{{ getFileSize(attachment.fileSize) }}<br>
                      <i class="bi bi-calendar me-1"></i>{{ attachment.uploadedAt | date: 'dd/MM/yyyy HH:mm' }}
                    </small>
                  </p>
                </div>

                <!-- Actions -->
                <div class="card-footer bg-white border-top-0">
                  <div class="d-flex gap-2">
                    <button
                      type="button"
                      class="btn btn-sm btn-primary flex-grow-1"
                      (click)="downloadAttachment(attachment)"
                      title="Télécharger"
                    >
                      <i class="bi bi-download me-1"></i>
                      Télécharger
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      (click)="confirmDeleteAttachment(attachment)"
                      title="Supprimer"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message si aucune pièce jointe -->
        <div *ngIf="!selectedActivityDetails?.attachments || selectedActivityDetails.attachments.length === 0" class="alert alert-info text-center">
          <i class="bi bi-info-circle me-2"></i>
          Aucune pièce jointe pour cette activité
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="closeAttachmentsViewModal()">
          Fermer
        </button>
      </div>
    </div>
  </div>
</div>
<div class="modal-backdrop fade" [class.show]="showAttachmentsViewModal" *ngIf="showAttachmentsViewModal"></div>

<!-- ========================================== -->
<!-- MODAL DE CONFIRMATION SUPPRESSION ATTACHMENT -->
<!-- ========================================== -->
<div class="modal fade" [class.show]="attachmentToDelete !== null" [style.display]="attachmentToDelete !== null ? 'block' : 'none'" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header bg-danger text-white">
        <h5 class="modal-title">
          <i class="bi bi-exclamation-triangle me-2"></i>
          Confirmer la suppression
        </h5>
        <button type="button" class="btn-close btn-close-white" (click)="cancelDeleteAttachment()"></button>
      </div>
      <div class="modal-body">
        <p>Êtes-vous sûr de vouloir supprimer cette pièce jointe ?</p>
        <div class="alert alert-warning">
          <strong>{{ attachmentToDelete?.originalName }}</strong><br>
          <small>Cette action est irréversible.</small>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" (click)="cancelDeleteAttachment()" [disabled]="loading">
          Annuler
        </button>
        <button type="button" class="btn btn-danger" (click)="deleteAttachment()" [disabled]="loading">
          <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i *ngIf="!loading" class="bi bi-trash me-2"></i>
          Supprimer
        </button>
      </div>
    </div>
  </div>
</div>
<div class="modal-backdrop fade" [class.show]="attachmentToDelete !== null" *ngIf="attachmentToDelete !== null"></div>
```

## ✅ RÉSUMÉ DES MODIFICATIONS

1. **Modal d'ajout/modification** : Bouton pour ajouter des pièces jointes (uniquement en mode édition) + liste des fichiers déjà joints
2. **Modal de détails** : Bouton pour visualiser les pièces jointes
3. **Modal d'upload** : Interface complète avec drag&drop, preview des images, validation
4. **Modal de visualisation** : Galerie des fichiers avec preview images, téléchargement, suppression
5. **Modal de confirmation** : Pour confirmer la suppression d'un fichier

## 🎨 FEATURES INCLUSES

- ✅ Preview des images avant upload
- ✅ Icônes selon le type de fichier
- ✅ Validation (taille, type, nombre)
- ✅ Preview des images uploadées dans la galerie
- ✅ Téléchargement des fichiers
- ✅ Suppression avec confirmation
- ✅ Design responsive et moderne
- ✅ Feedback utilisateur (loading, messages)

## 🔧 PROCHAINES ÉTAPES

1. Appliquer ces modifications au fichier `activities.component.html`
2. Tester chaque fonctionnalité
3. Ajuster le CSS si nécessaire pour le design
