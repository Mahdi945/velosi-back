'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      -- Créer la table industries
      CREATE TABLE IF NOT EXISTS industries (
        id SERIAL PRIMARY KEY,
        libelle VARCHAR(100) NOT NULL UNIQUE
      );

      -- Ajouter un commentaire pour documenter la table
      COMMENT ON TABLE industries IS 'Secteurs d''activité pour la classification des prospects/clients';
      COMMENT ON COLUMN industries.libelle IS 'Libellé du secteur d''activité';

      -- Insérer les secteurs par défaut
      INSERT INTO industries (libelle) VALUES
        ('Transport'),
        ('Logistique'),
        ('Industrie'),
        ('Commerce'),
        ('Construction'),
        ('Agriculture'),
        ('Technologie'),
        ('Santé'),
        ('Finance'),
        ('Éducation'),
        ('Services'),
        ('Autre')
      ON CONFLICT (libelle) DO NOTHING;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      -- Supprimer la table industries
      DROP TABLE IF EXISTS industries;
    `);
  },
};
