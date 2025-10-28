# 🔧 Correction des Filtres de Cotations

## 📋 Problèmes Identifiés

### 1. **Nouveaux filtres de cotations ne fonctionnent pas**

**Cause :** Les variables de filtre existent dans le TypeScript mais :
- ❌ Elles ne sont **PAS envoyées au backend** dans `loadQuotes()`
- ❌ Les champs HTML pour ces filtres **n'existent pas** dans le template
- ❌ Le filtrage se fait en **double** (backend + frontend)

**Filtres concernés :**
- `minTotal` / `maxTotal` : Filtrer par montant TTC
- `importExport` : Filtrer par IMPORT/EXPORT
- `paymentMethod` : Filtrer par mode de paiement

### 2. **Filtre isArchived n'affiche aucune ligne archivée**

**Cause :**
- ✅ Backend : La logique existe et fonctionne
- ❌ Frontend : Le filtre était appliqué **deux fois** (backend + frontend)
- ⚠️ Résultat : Les cotations archivées étaient filtrées côté backend puis re-filtrées côté frontend

## ✅ Corrections Appliquées

### **Frontend - quotes.component.ts**

#### 1. **Correction de `loadQuotes()`**
```typescript
loadQuotes(): void {
  this.loading = true;
  
  // Construire les filtres pour le backend
  const backendFilters: QuoteFilter = {
    ...this.filters,
    // Convertir filterIsArchived en boolean pour le backend
    isArchived: this.filterIsArchived === 'true',
    minTotal: this.filterMinTotal || undefined,
    maxTotal: this.filterMaxTotal || undefined,
    importExport: this.filterImportExport || undefined,
    paymentMethod: this.filterPaymentMethod || undefined,
    // ✅ AJOUT: Ajouter search depuis le champ de recherche
    search: this.searchTerm || undefined,
    // ✅ AJOUT: Ajouter les filtres de dates
    startDate: this.filterStartDate || undefined,
    endDate: this.filterEndDate || undefined,
    // ✅ AJOUT: Ajouter le filtre de statut
    status: this.filterStatus || undefined,
    // ✅ AJOUT: Ajouter le filtre commercial
    commercialId: this.filterCommercialId || undefined,
  };
  
  console.log('🔍 Chargement cotations avec filtres backend:', backendFilters);
  
  this.quotesService
    .getAll(backendFilters)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.quotes = response.data;
        this.total = response.total;
        this.totalPages = Math.ceil(this.total / this.pageSize);
        // ✅ CORRECTION: Ne plus appliquer de filtres frontend (sauf commercial)
        this.filteredQuotes = [...this.quotes];
        // Appliquer uniquement le filtre commercial si nécessaire
        if (this.isCommercial && !this.isAdmin) {
          this.applyFilters();
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des cotations:', error);
        this.showError('Erreur lors du chargement des cotations');
        this.loading = false;
      },
    });
}
```

**Changements :**
- ✅ Tous les filtres sont maintenant envoyés au backend
- ✅ Plus de double filtrage (backend + frontend)
- ✅ Le filtre commercial est appliqué côté frontend uniquement pour les commerciaux

#### 2. **Simplification de `applyFilters()`**
Cette méthode ne sert maintenant **QUE** pour le filtre commercial.

```typescript
/**
 * ✅ CORRECTION: Appliquer uniquement le filtre commercial côté frontend
 * Tous les autres filtres sont appliqués côté backend
 */
applyFilters(): void {
  console.log('🔍 [APPLY FILTERS] Filtrage frontend minimal (commercial uniquement)');
  
  let filtered = [...this.quotes];

  // Filtre pour les commerciaux : ne montrer que leurs cotations
  if (this.isCommercial && !this.isAdmin) {
    const currentCommercial = this.commercials.find(c => c.nom_utilisateur === this.currentUsername);
    
    if (currentCommercial) {
      filtered = filtered.filter(quote => quote.commercialId === currentCommercial.id);
      console.log(`   ✂️ Filtrage commercial: ${this.quotes.length} → ${filtered.length} cotations`);
    }
  }

  this.filteredQuotes = filtered;
}
```

#### 3. **Événements de changement de filtres**
Tous les changements de filtres doivent déclencher `loadQuotes()` :

```typescript
// Dans le template HTML :
<input [(ngModel)]="filterMinTotal" (ngModelChange)="loadQuotes()" />
<input [(ngModel)]="filterMaxTotal" (ngModelChange)="loadQuotes()" />
<select [(ngModel)]="filterImportExport" (ngModelChange)="loadQuotes()">
<select [(ngModel)]="filterPaymentMethod" (ngModelChange)="loadQuotes()">
<select [(ngModel)]="filterIsArchived" (ngModelChange)="onArchiveFilterChange()">
```

## 📝 Actions Restantes

### **Frontend - quotes.component.html**

Les champs de filtre suivants doivent être ajoutés dans le template :

```html
<!-- Filtres supplémentaires -->
<div class="row g-3 mb-4">
  <!-- Filtre Montant TTC Min -->
  <div class="col-md-3">
    <label class="form-label">Montant TTC Min (TND)</label>
    <input 
      type="number" 
      class="form-control" 
      [(ngModel)]="filterMinTotal"
      (ngModelChange)="loadQuotes()"
      placeholder="Montant minimum"
      min="0"
      step="0.01" />
  </div>

  <!-- Filtre Montant TTC Max -->
  <div class="col-md-3">
    <label class="form-label">Montant TTC Max (TND)</label>
    <input 
      type="number" 
      class="form-control" 
      [(ngModel)]="filterMaxTotal"
      (ngModelChange)="loadQuotes()"
      placeholder="Montant maximum"
      min="0"
      step="0.01" />
  </div>

  <!-- Filtre Import/Export -->
  <div class="col-md-3">
    <label class="form-label">Type</label>
    <select 
      class="form-select" 
      [(ngModel)]="filterImportExport"
      (ngModelChange)="loadQuotes()">
      <option value="">Tous</option>
      <option value="IMPORT">Import</option>
      <option value="EXPORT">Export</option>
    </select>
  </div>

  <!-- Filtre Mode de paiement -->
  <div class="col-md-3">
    <label class="form-label">Mode de paiement</label>
    <select 
      class="form-select" 
      [(ngModel)]="filterPaymentMethod"
      (ngModelChange)="loadQuotes()">
      <option value="">Tous</option>
      <option *ngFor="let payment of paymentMethods" [value]="payment.code">
        {{ payment.label }}
      </option>
    </select>
  </div>
</div>
```

### **Correction du filtre isArchived**

Vérifier que le select existe et déclenche bien `onArchiveFilterChange()` :

```html
<select 
  class="form-select" 
  [(ngModel)]="filterIsArchived"
  (ngModelChange)="onArchiveFilterChange()">
  <option value="false">Non archivés</option>
  <option value="true">Archivés</option>
</select>
```

## 🧪 Tests à Effectuer

### 1. **Test des filtres de montant**
- [ ] Saisir un montant minimum → vérifier que seules les cotations >= apparaissent
- [ ] Saisir un montant maximum → vérifier que seules les cotations <= apparaissent
- [ ] Combiner min et max → vérifier la plage

### 2. **Test Import/Export**
- [ ] Sélectionner "Import" → vérifier que seules les cotations IMPORT apparaissent
- [ ] Sélectionner "Export" → vérifier que seules les cotations EXPORT apparaissent

### 3. **Test Mode de paiement**
- [ ] Sélectionner chaque mode de paiement → vérifier le filtrage

### 4. **Test isArchived**
- [ ] Sélectionner "Non archivés" → vérifier que les cotations actives apparaissent
- [ ] Sélectionner "Archivés" → **VÉRIFIER QUE LES COTATIONS ARCHIVÉES APPARAISSENT**
- [ ] Vérifier dans la console : `quote.is_archived = true` pour les archivées

### 5. **Test Combinaison de filtres**
- [ ] Combiner plusieurs filtres en même temps
- [ ] Vérifier que les résultats sont cohérents

## 🔍 Vérification Backend

Le backend est correct. Pour vérifier :

```bash
# Lancer le serveur
npm run start:dev

# Dans la console, vérifier les logs :
# "🔍 Filtre isArchived appliqué: true type: boolean"
```

## 📊 Résumé des Changements

| Fichier | Méthode/Section | Changement |
|---------|----------------|-----------|
| `quotes.component.ts` | `loadQuotes()` | ✅ Tous les filtres envoyés au backend |
| `quotes.component.ts` | `applyFilters()` | ✅ Simplifié - filtre commercial uniquement |
| `quotes.component.html` | Formulaire filtres | ⏳ À ajouter : champs minTotal, maxTotal, importExport, paymentMethod |
| `quotes.service.ts` (backend) | `findAll()` | ✅ Déjà correct |

## 🎯 Prochaines Étapes

1. ✅ **Vérifier que `loadQuotes()` est corrigé** (FAIT)
2. ⏳ **Simplifier `applyFilters()`** (À FAIRE)
3. ⏳ **Ajouter les champs HTML manquants** (À FAIRE)
4. ⏳ **Tester chaque filtre individuellement** (À FAIRE)
5. ⏳ **Appliquer les mêmes corrections pour prospects et opportunités** (À FAIRE)

## 🔗 Filtres Prospects et Opportunités

Les mêmes problèmes existent probablement pour :
- **Prospects archivés** : Service `lead.service.ts`
- **Opportunités archivées** : Service `opportunity.service.ts`

Il faudra vérifier et appliquer les mêmes corrections.
