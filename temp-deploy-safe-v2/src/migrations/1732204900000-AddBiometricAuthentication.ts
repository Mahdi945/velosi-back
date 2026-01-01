import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBiometricAuthentication1732204900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔐 Migration: Ajout des colonnes d\'authentification biométrique');

    // Ajouter les colonnes pour la table personnel
    const personnelTableExists = await queryRunner.hasTable('personnel');
    if (personnelTableExists) {
      const hasPersonnelBiometricHash = await queryRunner.hasColumn('personnel', 'biometric_hash');
      
      if (!hasPersonnelBiometricHash) {
        await queryRunner.addColumn(
          'personnel',
          new TableColumn({
            name: 'biometric_hash',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Hash sécurisé de l\'empreinte biométrique',
          }),
        );
        console.log('✅ Colonne biometric_hash ajoutée à personnel');
      }

      const hasPersonnelBiometricEnabled = await queryRunner.hasColumn('personnel', 'biometric_enabled');
      if (!hasPersonnelBiometricEnabled) {
        await queryRunner.addColumn(
          'personnel',
          new TableColumn({
            name: 'biometric_enabled',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: 'Indique si l\'authentification biométrique est activée',
          }),
        );
        console.log('✅ Colonne biometric_enabled ajoutée à personnel');
      }

      const hasPersonnelBiometricRegisteredAt = await queryRunner.hasColumn('personnel', 'biometric_registered_at');
      if (!hasPersonnelBiometricRegisteredAt) {
        await queryRunner.addColumn(
          'personnel',
          new TableColumn({
            name: 'biometric_registered_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Date d\'enregistrement de l\'empreinte biométrique',
          }),
        );
        console.log('✅ Colonne biometric_registered_at ajoutée à personnel');
      }
    }

    // Ajouter les colonnes pour la table client
    const clientTableExists = await queryRunner.hasTable('client');
    if (clientTableExists) {
      const hasClientBiometricHash = await queryRunner.hasColumn('client', 'biometric_hash');
      
      if (!hasClientBiometricHash) {
        await queryRunner.addColumn(
          'client',
          new TableColumn({
            name: 'biometric_hash',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Hash sécurisé de l\'empreinte biométrique',
          }),
        );
        console.log('✅ Colonne biometric_hash ajoutée à client');
      }

      const hasClientBiometricEnabled = await queryRunner.hasColumn('client', 'biometric_enabled');
      if (!hasClientBiometricEnabled) {
        await queryRunner.addColumn(
          'client',
          new TableColumn({
            name: 'biometric_enabled',
            type: 'boolean',
            default: false,
            isNullable: false,
            comment: 'Indique si l\'authentification biométrique est activée',
          }),
        );
        console.log('✅ Colonne biometric_enabled ajoutée à client');
      }

      const hasClientBiometricRegisteredAt = await queryRunner.hasColumn('client', 'biometric_registered_at');
      if (!hasClientBiometricRegisteredAt) {
        await queryRunner.addColumn(
          'client',
          new TableColumn({
            name: 'biometric_registered_at',
            type: 'timestamp',
            isNullable: true,
            comment: 'Date d\'enregistrement de l\'empreinte biométrique',
          }),
        );
        console.log('✅ Colonne biometric_registered_at ajoutée à client');
      }
    }

    console.log('✅ Migration d\'authentification biométrique terminée');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Rollback: Suppression des colonnes d\'authentification biométrique');

    // Supprimer les colonnes de la table personnel
    const personnelTableExists = await queryRunner.hasTable('personnel');
    if (personnelTableExists) {
      const hasPersonnelBiometricHash = await queryRunner.hasColumn('personnel', 'biometric_hash');
      if (hasPersonnelBiometricHash) {
        await queryRunner.dropColumn('personnel', 'biometric_hash');
      }

      const hasPersonnelBiometricEnabled = await queryRunner.hasColumn('personnel', 'biometric_enabled');
      if (hasPersonnelBiometricEnabled) {
        await queryRunner.dropColumn('personnel', 'biometric_enabled');
      }

      const hasPersonnelBiometricRegisteredAt = await queryRunner.hasColumn('personnel', 'biometric_registered_at');
      if (hasPersonnelBiometricRegisteredAt) {
        await queryRunner.dropColumn('personnel', 'biometric_registered_at');
      }
    }

    // Supprimer les colonnes de la table client
    const clientTableExists = await queryRunner.hasTable('client');
    if (clientTableExists) {
      const hasClientBiometricHash = await queryRunner.hasColumn('client', 'biometric_hash');
      if (hasClientBiometricHash) {
        await queryRunner.dropColumn('client', 'biometric_hash');
      }

      const hasClientBiometricEnabled = await queryRunner.hasColumn('client', 'biometric_enabled');
      if (hasClientBiometricEnabled) {
        await queryRunner.dropColumn('client', 'biometric_enabled');
      }

      const hasClientBiometricRegisteredAt = await queryRunner.hasColumn('client', 'biometric_registered_at');
      if (hasClientBiometricRegisteredAt) {
        await queryRunner.dropColumn('client', 'biometric_registered_at');
      }
    }

    console.log('✅ Rollback terminé');
  }
}
