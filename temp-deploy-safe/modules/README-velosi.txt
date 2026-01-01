# Velosi ERP - Modules

Ce dossier contient les modules principaux de l'application. 

- engin.module.ts : Ancien module pour la gestion des engins (à déprécier si nouvelle structure utilisée)

# Nouvelle structure recommandée

Utiliser le module `GestionRessourcesModule` dans `src/gestion-ressources/gestion-ressources.module.ts` pour toute la gestion des ressources (engins, etc).