'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      -- Ajouter la colonne qr_code_data pour stocker le QR code en base64
      ALTER TABLE quotes 
      ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

      -- Ajouter un commentaire pour documenter la colonne
      COMMENT ON COLUMN quotes.qr_code_data IS 'QR code généré en base64 contenant les informations essentielles de la cotation';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      -- Supprimer la colonne qr_code_data
      ALTER TABLE quotes 
      DROP COLUMN IF EXISTS qr_code_data;
    `);
  }
};
