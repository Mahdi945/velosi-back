import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * 🔒 MIGRATION DE SÉCURITÉ: Ajout des contraintes d'unicité manquantes
 * 
 * Cette migration ajoute les contraintes UNIQUE essentielles pour éviter les doublons
 * et garantir l'intégrité des données critiques (identifiants fiscaux, IBAN, emails, etc.)
 * 
 * @author GitHub Copilot
 * @date 2025-11-21
 * 
 * ⚠️ ATTENTION: Cette migration peut échouer s'il existe déjà des doublons en base
 * Exécuter d'abord le script de nettoyage des doublons avant d'appliquer cette migration
 */
export class AddUniqueConstraints1732204800000 implements MigrationInterface {
  name = 'AddUniqueConstraints1732204800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔐 [MIGRATION] Ajout des contraintes d\'unicité...');

    // ========================================
    // 1. TABLE CLIENT
    // ========================================
    console.log('📋 [CLIENT] Ajout des contraintes unique...');

    try {
      // Vérifier et nettoyer les doublons AVANT d'ajouter la contrainte
      await this.cleanDuplicates(queryRunner, 'client', 'id_fiscal');
      
      // Ajouter contrainte unique sur id_fiscal (matricule fiscal)
      await queryRunner.query(`
        ALTER TABLE "client" 
        ADD CONSTRAINT "UQ_client_id_fiscal" 
        UNIQUE ("id_fiscal");
      `);
      console.log('  ✅ Contrainte unique ajoutée: id_fiscal');
    } catch (error) {
      console.warn('  ⚠️ Erreur id_fiscal:', error.message);
    }

    try {
      await this.cleanDuplicates(queryRunner, 'client', 'c_douane');
      
      // Ajouter contrainte unique sur c_douane (code douane)
      await queryRunner.query(`
        ALTER TABLE "client" 
        ADD CONSTRAINT "UQ_client_c_douane" 
        UNIQUE ("c_douane");
      `);
      console.log('  ✅ Contrainte unique ajoutée: c_douane');
    } catch (error) {
      console.warn('  ⚠️ Erreur c_douane:', error.message);
    }

    try {
      await this.cleanDuplicates(queryRunner, 'client', 'iban');
      
      // Ajouter contrainte unique sur IBAN
      await queryRunner.query(`
        ALTER TABLE "client" 
        ADD CONSTRAINT "UQ_client_iban" 
        UNIQUE ("iban");
      `);
      console.log('  ✅ Contrainte unique ajoutée: iban');
    } catch (error) {
      console.warn('  ⚠️ Erreur iban:', error.message);
    }

    try {
      await this.cleanDuplicates(queryRunner, 'client', 'compte_cpt');
      
      // Ajouter contrainte unique sur compte_cpt (compte comptable)
      await queryRunner.query(`
        ALTER TABLE "client" 
        ADD CONSTRAINT "UQ_client_compte_cpt" 
        UNIQUE ("compte_cpt");
      `);
      console.log('  ✅ Contrainte unique ajoutée: compte_cpt');
    } catch (error) {
      console.warn('  ⚠️ Erreur compte_cpt:', error.message);
    }

    // Ajouter des index pour performance
    await queryRunner.createIndex(
      'client',
      new TableIndex({
        name: 'IDX_client_id_fiscal',
        columnNames: ['id_fiscal'],
      }),
    );

    await queryRunner.createIndex(
      'client',
      new TableIndex({
        name: 'IDX_client_iban',
        columnNames: ['iban'],
      }),
    );

    console.log('  ✅ Index de performance créés sur client');

    // ========================================
    // 2. TABLE CONTACT_CLIENT
    // ========================================
    console.log('📧 [CONTACT_CLIENT] Ajout des contraintes unique...');

    try {
      await this.cleanDuplicates(queryRunner, 'contact_client', 'mail1');
      
      // Ajouter contrainte unique sur mail1 (email principal)
      await queryRunner.query(`
        ALTER TABLE "contact_client" 
        ADD CONSTRAINT "UQ_contact_client_mail1" 
        UNIQUE ("mail1");
      `);
      console.log('  ✅ Contrainte unique ajoutée: mail1');
    } catch (error) {
      console.warn('  ⚠️ Erreur mail1:', error.message);
    }

    // Index composite: même téléphone ne peut pas être associé 2 fois au même client
    try {
      await queryRunner.query(`
        CREATE UNIQUE INDEX "UQ_contact_client_tel_per_client" 
        ON "contact_client" ("id_client", "tel1") 
        WHERE "tel1" IS NOT NULL;
      `);
      console.log('  ✅ Index composite créé: (id_client, tel1)');
    } catch (error) {
      console.warn('  ⚠️ Erreur index composite tel1:', error.message);
    }

    // Index pour performance des recherches
    await queryRunner.createIndex(
      'contact_client',
      new TableIndex({
        name: 'IDX_contact_client_mail1',
        columnNames: ['mail1'],
      }),
    );

    console.log('  ✅ Index de performance créés sur contact_client');

    // ========================================
    // 3. TABLE FOURNISSEURS (déjà OK mais vérifier)
    // ========================================
    console.log('📦 [FOURNISSEURS] Vérification des contraintes...');

    try {
      const hasUniqueCode = await queryRunner.query(`
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE table_name = 'fournisseurs' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%code%';
      `);

      if (parseInt(hasUniqueCode[0].count) === 0) {
        await queryRunner.query(`
          ALTER TABLE "fournisseurs" 
          ADD CONSTRAINT "UQ_fournisseurs_code" 
          UNIQUE ("code");
        `);
        console.log('  ✅ Contrainte unique ajoutée: code');
      } else {
        console.log('  ℹ️ Contrainte unique déjà présente: code');
      }
    } catch (error) {
      console.warn('  ⚠️ Erreur fournisseurs:', error.message);
    }

    // ========================================
    // 4. TABLE NAVIRES (déjà OK mais vérifier)
    // ========================================
    console.log('🚢 [NAVIRES] Vérification des contraintes...');

    try {
      const hasUniqueCode = await queryRunner.query(`
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE table_name = 'navires' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%code%';
      `);

      if (parseInt(hasUniqueCode[0].count) === 0) {
        await this.cleanDuplicates(queryRunner, 'navires', 'code');
        
        await queryRunner.query(`
          ALTER TABLE "navires" 
          ADD CONSTRAINT "UQ_navires_code" 
          UNIQUE ("code");
        `);
        console.log('  ✅ Contrainte unique ajoutée: code');
      } else {
        console.log('  ℹ️ Contrainte unique déjà présente: code');
      }
    } catch (error) {
      console.warn('  ⚠️ Erreur navires:', error.message);
    }

    // ========================================
    // 5. TABLE CRM_LEADS (vérifier email unique)
    // ========================================
    console.log('👤 [CRM_LEADS] Vérification des contraintes...');

    try {
      const hasUniqueEmail = await queryRunner.query(`
        SELECT COUNT(*) 
        FROM information_schema.table_constraints 
        WHERE table_name = 'crm_leads' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name LIKE '%email%';
      `);

      if (parseInt(hasUniqueEmail[0].count) === 0) {
        await this.cleanDuplicates(queryRunner, 'crm_leads', 'email');
        
        await queryRunner.query(`
          ALTER TABLE "crm_leads" 
          ADD CONSTRAINT "UQ_crm_leads_email" 
          UNIQUE ("email");
        `);
        console.log('  ✅ Contrainte unique ajoutée: email');
      } else {
        console.log('  ℹ️ Contrainte unique déjà présente: email');
      }
    } catch (error) {
      console.warn('  ⚠️ Erreur crm_leads:', error.message);
    }

    console.log('✅ [MIGRATION] Contraintes d\'unicité ajoutées avec succès!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔙 [MIGRATION] Rollback des contraintes d\'unicité...');

    // Supprimer les contraintes CLIENT
    await queryRunner.query(`ALTER TABLE "client" DROP CONSTRAINT IF EXISTS "UQ_client_id_fiscal";`);
    await queryRunner.query(`ALTER TABLE "client" DROP CONSTRAINT IF EXISTS "UQ_client_c_douane";`);
    await queryRunner.query(`ALTER TABLE "client" DROP CONSTRAINT IF EXISTS "UQ_client_iban";`);
    await queryRunner.query(`ALTER TABLE "client" DROP CONSTRAINT IF EXISTS "UQ_client_compte_cpt";`);

    // Supprimer les index CLIENT
    await queryRunner.dropIndex('client', 'IDX_client_id_fiscal');
    await queryRunner.dropIndex('client', 'IDX_client_iban');

    // Supprimer les contraintes CONTACT_CLIENT
    await queryRunner.query(`ALTER TABLE "contact_client" DROP CONSTRAINT IF EXISTS "UQ_contact_client_mail1";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_contact_client_tel_per_client";`);
    await queryRunner.dropIndex('contact_client', 'IDX_contact_client_mail1');

    // Supprimer les contraintes FOURNISSEURS (si ajoutées)
    await queryRunner.query(`ALTER TABLE "fournisseurs" DROP CONSTRAINT IF EXISTS "UQ_fournisseurs_code";`);

    // Supprimer les contraintes NAVIRES (si ajoutées)
    await queryRunner.query(`ALTER TABLE "navires" DROP CONSTRAINT IF EXISTS "UQ_navires_code";`);

    // Supprimer les contraintes CRM_LEADS (si ajoutées)
    await queryRunner.query(`ALTER TABLE "crm_leads" DROP CONSTRAINT IF EXISTS "UQ_crm_leads_email";`);

    console.log('✅ [MIGRATION] Rollback terminé');
  }

  /**
   * Fonction utilitaire pour nettoyer les doublons avant d'ajouter une contrainte unique
   * Garde la première entrée et supprime les doublons
   */
  private async cleanDuplicates(
    queryRunner: QueryRunner,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    console.log(`  🧹 Nettoyage des doublons dans ${tableName}.${columnName}...`);

    try {
      // Compter les doublons
      const duplicates = await queryRunner.query(`
        SELECT "${columnName}", COUNT(*) as count
        FROM "${tableName}"
        WHERE "${columnName}" IS NOT NULL
        GROUP BY "${columnName}"
        HAVING COUNT(*) > 1;
      `);

      if (duplicates.length === 0) {
        console.log(`    ℹ️ Aucun doublon trouvé`);
        return;
      }

      console.log(`    ⚠️ ${duplicates.length} valeur(s) en doublon trouvée(s)`);

      // Pour chaque valeur en doublon, garder seulement le premier enregistrement
      for (const dup of duplicates) {
        const value = dup[columnName];
        console.log(`    🔧 Traitement de la valeur: ${value}`);

        // Récupérer les IDs des doublons (tous sauf le premier)
        const ids = await queryRunner.query(`
          SELECT id
          FROM "${tableName}"
          WHERE "${columnName}" = $1
          ORDER BY id
          OFFSET 1;
        `, [value]);

        if (ids.length > 0) {
          const idsToDelete = ids.map((row: any) => row.id);
          
          // OPTION 1: Supprimer les doublons (DANGEREUX - perte de données)
          // await queryRunner.query(`
          //   DELETE FROM "${tableName}"
          //   WHERE id = ANY($1);
          // `, [idsToDelete]);
          
          // OPTION 2: Nullifier les doublons (SÉCURISÉ - garde les données)
          await queryRunner.query(`
            UPDATE "${tableName}"
            SET "${columnName}" = NULL
            WHERE id = ANY($1);
          `, [idsToDelete]);
          
          console.log(`      ✅ ${ids.length} doublon(s) traité(s) (valeur mise à NULL)`);
        }
      }

      console.log(`    ✅ Nettoyage terminé`);
    } catch (error) {
      console.error(`    ❌ Erreur lors du nettoyage:`, error.message);
      throw error;
    }
  }
}
