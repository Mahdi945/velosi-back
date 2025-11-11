# Schéma des Champs Affichés par Catégorie de Transport

## 📊 Tableau Récapitulatif

| Catégorie | Poids Total (kg) | Dimensions (L×l×h) | Volume (m³) | Poids Volumétrique | Utilisation pour Calculs |
|-----------|:----------------:|:------------------:|:-----------:|:------------------:|-------------------------|
| **Groupage (LCL)** | ✅ Affiché | ✅ Requis | ✅ Auto-calculé | ❌ Masqué | Poids Total |
| **Complet (FCL)** | ✅ Affiché | ❌ Non requis | ✅ Manuel | ❌ Masqué | Poids Total |
| **Routier** | ✅ Affiché | ❌ Non requis | ✅ Manuel | ❌ Masqué | Poids Total |
| **Aérien Normale** | ❌ **MASQUÉ** | ✅ Requis | ✅ Auto-calculé | ✅ **Auto-calculé** | **Poids Volumétrique** |
| **Aérien Expresse** | ❌ **MASQUÉ** | ✅ Requis | ✅ Auto-calculé | ✅ **Auto-calculé** | **Poids Volumétrique** |

---

## 🔍 Détails par Catégorie

### 1️⃣ Groupage (LCL)

**Champs visibles:**
- ✅ Nombre de colis
- ✅ **Poids Total (kg)** ← Saisi manuellement
- ✅ Volume (m³) ← Calculé automatiquement
- ✅ Longueur (cm)
- ✅ Largeur (cm)
- ✅ Hauteur (cm)

**Calculs:**
```
Volume = (L × l × h × nombre_colis) / 1,000,000
```

**Utilisé pour tarification:** Poids Total (kg)

---

### 2️⃣ Complet (FCL)

**Champs visibles:**
- ✅ Nombre de colis
- ✅ **Poids Total (kg)** ← Saisi manuellement
- ✅ Volume (m³) ← Saisi manuellement

**Dimensions:** Non requises (transport de conteneur complet)

**Utilisé pour tarification:** Poids Total (kg)

---

### 3️⃣ Routier

**Champs visibles:**
- ✅ Nombre de colis
- ✅ **Poids Total (kg)** ← Saisi manuellement
- ✅ Volume (m³) ← Saisi manuellement

**Dimensions:** Non requises

**Utilisé pour tarification:** Poids Total (kg)

---

### 4️⃣ Aérien Normale

**Champs visibles:**
- ✅ Nombre de colis
- ❌ ~~Poids Total (kg)~~ ← **MASQUÉ**
- ✅ Volume (m³) ← Calculé automatiquement
- ✅ Longueur (cm)
- ✅ Largeur (cm)
- ✅ Hauteur (cm)
- ✅ **Poids Volumétrique (kg)** ← Calculé automatiquement

**Calculs:**
```
Volume = (L × l × h × nombre_colis) / 1,000,000
Poids Volumétrique = (L × l × h × nombre_colis) / 6000
```

**Utilisé pour tarification:** **Poids Volumétrique (kg)**

⚠️ **Important:** Le champ "Poids Total" est masqué car le poids volumétrique le remplace dans tous les calculs de tarification aérienne.

---

### 5️⃣ Aérien Expresse

**Champs visibles:**
- ✅ Nombre de colis
- ❌ ~~Poids Total (kg)~~ ← **MASQUÉ**
- ✅ Volume (m³) ← Calculé automatiquement
- ✅ Longueur (cm)
- ✅ Largeur (cm)
- ✅ Hauteur (cm)
- ✅ **Poids Volumétrique (kg)** ← Calculé automatiquement

**Calculs:**
```
Volume = (L × l × h × nombre_colis) / 1,000,000
Poids Volumétrique = (L × l × h × nombre_colis) / 5000
```

**Utilisé pour tarification:** **Poids Volumétrique (kg)**

⚠️ **Important:** Le champ "Poids Total" est masqué car le poids volumétrique le remplace dans tous les calculs de tarification aérienne express.

---

## 💡 Logique de Masquage

### Code Frontend (TypeScript)

```typescript
// Vérifier si c'est une catégorie aérienne
isAerien(index: number): boolean {
  const category = this.items.at(index).get('category')?.value;
  return category === QuoteItemCategory.AERIEN_NORMALE ||
         category === QuoteItemCategory.AERIEN_EXPRESSE;
}
```

### Code Frontend (HTML)

```html
<!-- Poids Total masqué pour aérien -->
<div class="col-md-3" *ngIf="!isAerien(i)">
  <label class="form-label">Poids Total (kg)</label>
  <input type="number" class="form-control" formControlName="weightKg">
</div>
```

---

## 📋 Message Informatif Affiché

Quand l'utilisateur sélectionne **Aérien Normale** ou **Aérien Expresse**, un message s'affiche:

```
ℹ️ Dimensions requises pour le calcul du volume et du poids volumétrique

Pour le transport aérien, le poids volumétrique remplace le poids brut dans les calculs
```

---

## 🎯 Raison du Masquage

### Pourquoi masquer le "Poids Total" pour l'aérien?

1. **Éviter la confusion:** En transport aérien, seul le poids volumétrique compte pour la tarification
2. **Simplifier l'interface:** L'utilisateur n'a pas à se demander quel poids utiliser
3. **Prévenir les erreurs:** Impossible de saisir un poids brut qui serait de toute façon ignoré
4. **Clarté des calculs:** Le système utilise automatiquement le bon poids selon la catégorie

### Standards de l'industrie

- **Transport aérien:** Toujours facturé au poids volumétrique (ou poids réel si supérieur)
- **Transport maritime (Groupage/LCL):** Généralement facturé au poids réel
- **Transport complet (FCL):** Tarif fixe par conteneur
- **Transport routier:** Variable selon le transporteur

---

## ✅ Checklist de Validation

- [ ] Groupage (LCL): Poids Total visible ✅
- [ ] Complet (FCL): Poids Total visible ✅
- [ ] Routier: Poids Total visible ✅
- [ ] Aérien Normale: Poids Total masqué ❌, Poids Volumétrique visible ✅
- [ ] Aérien Expresse: Poids Total masqué ❌, Poids Volumétrique visible ✅
- [ ] Message informatif affiché pour catégories aériennes ✅
- [ ] Calculs automatiques fonctionnels ✅

---

**Dernière mise à jour:** 26 octobre 2025  
**Version:** 2.1.0
