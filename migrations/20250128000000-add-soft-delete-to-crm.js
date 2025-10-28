'use strict';

/**
 * Migration pour ajouter le soft delete aux entités CRM critiques
 * 
 * Cette migration ajoute les colonnes nécessaires pour :
 * - Soft delete (deleted_at)
 * - Archivage manuel (is_archived, archived_reason, archived_by)
 * 
 * Tables concernées : crm_leads, crm_opportunities, crm_quotes
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // ====================================
      // 1. Table crm_leads (Prospects)
      // ====================================
      console.log('Adding soft delete columns to crm_leads...');
      await queryInterface.sequelize.query(`
        ALTER TABLE crm_leads 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL,
        ADD COLUMN IF NOT EXISTS archived_by INTEGER NULL;
      `, { transaction });

      // Index pour optimiser les requêtes avec deletedAt
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_leads_deleted_at 
        ON crm_leads(deleted_at) 
        WHERE deleted_at IS NULL;
      `, { transaction });

      // ====================================
      // 2. Table crm_opportunities
      // ====================================
      console.log('Adding soft delete columns to crm_opportunities...');
      await queryInterface.sequelize.query(`
        ALTER TABLE crm_opportunities 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL,
        ADD COLUMN IF NOT EXISTS archived_by INTEGER NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_opportunities_deleted_at 
        ON crm_opportunities(deleted_at) 
        WHERE deleted_at IS NULL;
      `, { transaction });

      // ====================================
      // 3. Table crm_quotes (Cotations)
      // ====================================
      console.log('Adding soft delete columns to crm_quotes...');
      await queryInterface.sequelize.query(`
        ALTER TABLE crm_quotes 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL,
        ADD COLUMN IF NOT EXISTS archived_by INTEGER NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at 
        ON crm_quotes(deleted_at) 
        WHERE deleted_at IS NULL;
      `, { transaction });

      // ====================================
      // 4. Ajouter foreign key pour archived_by
      // ====================================
      console.log('Adding foreign key constraints for archived_by...');
      
      await queryInterface.sequelize.query(`
        ALTER TABLE crm_leads 
        ADD CONSTRAINT fk_leads_archived_by 
        FOREIGN KEY (archived_by) 
        REFERENCES personnel(id) 
        ON DELETE SET NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE crm_opportunities 
        ADD CONSTRAINT fk_opportunities_archived_by 
        FOREIGN KEY (archived_by) 
        REFERENCES personnel(id) 
        ON DELETE SET NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE crm_quotes 
        ADD CONSTRAINT fk_quotes_archived_by 
        FOREIGN KEY (archived_by) 
        REFERENCES personnel(id) 
        ON DELETE SET NULL;
      `, { transaction });

      await transaction.commit();
      console.log('✅ Soft delete migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error during soft delete migration:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Retirer les contraintes FK
      await queryInterface.sequelize.query(`
        ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS fk_leads_archived_by;
        ALTER TABLE crm_opportunities DROP CONSTRAINT IF EXISTS fk_opportunities_archived_by;
        ALTER TABLE crm_quotes DROP CONSTRAINT IF EXISTS fk_quotes_archived_by;
      `, { transaction });

      // Retirer les index
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_leads_deleted_at;
        DROP INDEX IF EXISTS idx_opportunities_deleted_at;
        DROP INDEX IF EXISTS idx_quotes_deleted_at;
      `, { transaction });

      // Retirer les colonnes
      await queryInterface.sequelize.query(`
        ALTER TABLE crm_leads 
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS is_archived,
        DROP COLUMN IF EXISTS archived_reason,
        DROP COLUMN IF EXISTS archived_by;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE crm_opportunities 
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS is_archived,
        DROP COLUMN IF EXISTS archived_reason,
        DROP COLUMN IF EXISTS archived_by;
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE crm_quotes 
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS is_archived,
        DROP COLUMN IF EXISTS archived_reason,
        DROP COLUMN IF EXISTS archived_by;
      `, { transaction });

      await transaction.commit();
      console.log('✅ Soft delete rollback completed');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error during rollback:', error);
      throw error;
    }
  }
};
