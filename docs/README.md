# 📚 Documentation CRM - Velosi ERP

Bienvenue dans la documentation du module CRM de Velosi ERP !

## 🚀 Démarrage Rapide

### Nouvelle fonctionnalité : Timeline Enrichi & Synchronisation

**Vous cherchez des informations sur les dernières améliorations ?**

👉 **[INDEX DE LA DOCUMENTATION](INDEX_DOCUMENTATION_SYNCHRONISATION.md)**

Cet index vous guidera vers le bon document selon votre besoin.

---

## 📂 Structure de la Documentation

### 🔄 Synchronisation & Timeline (Nouveau !)

**Commencez ici :** [INDEX DOCUMENTATION](INDEX_DOCUMENTATION_SYNCHRONISATION.md)

#### Documents disponibles :

1. **📋 Résumé Rapide** - `RESUME_RAPIDE_SYNCHRONISATION.md`
   - Réponses courtes aux questions fréquentes
   - Tableaux récapitulatifs
   - ⏱️ 5 minutes de lecture

2. **❓ FAQ Complète** - `FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md`
   - 7 questions détaillées avec réponses
   - Diagrammes des états
   - Recommandations développement
   - ⏱️ 15 minutes de lecture

3. **🛠️ Amélioration Timelines** - `AMELIORATION_TIMELINES_ACTIVITES_COTATIONS.md`
   - Modifications frontend détaillées
   - Exemples visuels avant/après
   - Avantages et tests
   - ⏱️ 20 minutes de lecture

4. **📝 Liste Modifications** - `LISTE_MODIFICATIONS_TIMELINE.md`
   - Référence technique exhaustive
   - Fichiers modifiés
   - Checklist de vérification
   - ⏱️ 10 minutes (référence)

5. **🔄 Synchronisation Auto** - `SYNCHRONISATION_OPPORTUNITES_COTATIONS.md`
   - Implémentation technique
   - Règles de synchronisation
   - Gestion des erreurs
   - ⏱️ 10 minutes de lecture

---

### 🏗️ Autres Documents CRM

*(À venir - Cette section sera enrichie au fur et à mesure)*

- Architecture du module CRM
- Guide d'utilisation
- API Reference
- Base de données

---

## 🎯 Navigation Par Profil

### 👤 Vous êtes Utilisateur Final ?

1. [RÉSUMÉ RAPIDE](RESUME_RAPIDE_SYNCHRONISATION.md)
2. [FAQ COMPLÈTE](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md) - Questions 1, 3, 4, 5

---

### 💼 Vous êtes Product Owner / Chef de Projet ?

1. [RÉSUMÉ RAPIDE](RESUME_RAPIDE_SYNCHRONISATION.md)
2. [FAQ COMPLÈTE](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md)
3. [AMÉLIORATION TIMELINES](AMELIORATION_TIMELINES_ACTIVITES_COTATIONS.md) - Section "Avantages"

---

### 👨‍💻 Vous êtes Développeur Frontend ?

1. [LISTE MODIFICATIONS](LISTE_MODIFICATIONS_TIMELINE.md) - Frontend
2. [AMÉLIORATION TIMELINES](AMELIORATION_TIMELINES_ACTIVITES_COTATIONS.md) - Code
3. [RÉSUMÉ RAPIDE](RESUME_RAPIDE_SYNCHRONISATION.md) - Référence

---

### 👨‍💻 Vous êtes Développeur Backend ?

1. [SYNCHRONISATION](SYNCHRONISATION_OPPORTUNITES_COTATIONS.md)
2. [FAQ COMPLÈTE](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md) - Validations
3. [LISTE MODIFICATIONS](LISTE_MODIFICATIONS_TIMELINE.md) - Backend

---

### 🧪 Vous êtes Testeur QA ?

1. [RÉSUMÉ RAPIDE](RESUME_RAPIDE_SYNCHRONISATION.md)
2. [AMÉLIORATION TIMELINES](AMELIORATION_TIMELINES_ACTIVITES_COTATIONS.md) - Tests
3. [LISTE MODIFICATIONS](LISTE_MODIFICATIONS_TIMELINE.md) - Checklist

---

## ❓ Questions Fréquentes

### Une opportunité gagnée rend-elle automatiquement la cotation gagnée ?

**Non.** La synchronisation est unidirectionnelle : Cotation → Opportunité uniquement.

👉 [Voir détails](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md#1️⃣-lorsquune-opportunité-est-gagnée-la-cotation-devient-elle-automatiquement-gagnée-)

---

### Peut-on créer une cotation pour une opportunité fermée ?

**Non.** Le système bloque cette action avec un message d'erreur.

👉 [Voir détails](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md#3️⃣-les-cotations-doivent-elles-safficher-dans-le-modal-dajout-de-cotation-si-lopportunité-est-fermée-)

---

### Quel est l'état initial d'une cotation créée ?

**DRAFT (Brouillon).** La cotation doit être envoyée manuellement.

👉 [Voir détails](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md#4️⃣-lorsquune-cotation-est-créée-passe-t-elle-automatiquement-à-létat-propositiondevis-)

---

### Quels sont tous les états possibles d'une cotation ?

**7 états** : DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CANCELLED

👉 [Voir diagramme complet](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md#5️⃣-quels-sont-tous-les-états-quune-cotation-peut-avoir-)

---

## 📊 Statistiques du Projet

**Version actuelle :** 2.0  
**Date de mise à jour :** 20 octobre 2025

**Dernières modifications :**
- ✅ Timeline enrichi (activités + cotations)
- ✅ 12 types d'activités supportés
- ✅ 7 états de cotations supportés
- ✅ Historique complet des changements d'état
- ✅ Validation création cotation (opportunité fermée)
- ✅ Documentation exhaustive (5 documents, ~2500 lignes)

---

## 🔗 Liens Utiles

### Documentation

- 📚 [INDEX COMPLET](INDEX_DOCUMENTATION_SYNCHRONISATION.md)
- 📋 [RÉSUMÉ RAPIDE](RESUME_RAPIDE_SYNCHRONISATION.md)
- ❓ [FAQ](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md)
- 🛠️ [AMÉLIORATION TIMELINES](AMELIORATION_TIMELINES_ACTIVITES_COTATIONS.md)
- 📝 [LISTE MODIFICATIONS](LISTE_MODIFICATIONS_TIMELINE.md)
- 🔄 [SYNCHRONISATION](SYNCHRONISATION_OPPORTUNITES_COTATIONS.md)

### Code Source

**Frontend :**
- `velosi-front/src/app/components/crm/opportunities/`
- `velosi-front/src/app/components/crm/prospects/`

**Backend :**
- `velosi-back/src/crm/services/quotes.service.ts`
- `velosi-back/src/crm/entities/quote.entity.ts`

---

## 📞 Support & Contribution

**Questions ?** Consultez d'abord la [FAQ](FAQ_SYNCHRONISATION_OPPORTUNITES_COTATIONS.md)

**Bug trouvé ?** Créez une issue sur le repository

**Amélioration ?** Soumettez une pull request

---

## 📅 Changelog

### Version 2.0 (20 octobre 2025)

**Nouveautés :**
- ✨ Timeline enrichi avec types et statuts détaillés
- ✨ Historique complet des états de cotations
- ✨ Affichage type de transport et raison de rejet
- ✨ Labels en français pour tous les états
- ✨ Validation création cotation (opportunité fermée)

**Documentation :**
- 📚 5 nouveaux documents
- 📊 Diagrammes des états
- 💻 Exemples de code
- ✅ Checklist de vérification
- 🎯 Guide de démarrage

**Fichiers modifiés :**
- 4 fichiers frontend (TypeScript + HTML)
- 0 fichiers backend (validations recommandées)

---

### Version 1.0 (Date précédente)

- ✅ Synchronisation automatique Cotation → Opportunité
- ✅ Documentation initiale

---

## 🎯 Prochaines Étapes

**Backend :**
- [ ] Validation création cotation (opportunité fermée)
- [ ] Validation double acceptation cotations
- [ ] Table historique des statuts
- [ ] Tests unitaires

**Frontend :**
- [ ] Notifications temps réel (WebSocket)
- [ ] Export PDF avec timeline
- [ ] Dashboard analytics

**Documentation :**
- [ ] Guide d'utilisation utilisateur final
- [ ] Architecture complète CRM
- [ ] API Reference

---

## 🏆 Contributeurs

- **Assistant IA** - Documentation technique
- **Équipe Développement Velosi** - Implémentation

---

**Merci d'utiliser Velosi ERP ! 🚀**

*Pour toute question, n'hésitez pas à consulter l'[INDEX](INDEX_DOCUMENTATION_SYNCHRONISATION.md) qui vous guidera vers le bon document.*
