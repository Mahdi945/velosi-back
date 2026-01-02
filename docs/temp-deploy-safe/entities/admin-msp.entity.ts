import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Entité AdminMsp
 * Stockée dans la base principale 'shipnology'
 * Représente un administrateur MSP qui gère les organisations
 */
@Entity('admin_msp')
export class AdminMsp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  nom: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  prenom: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  nom_utilisateur: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  mot_de_passe: string; // Hash bcrypt

  @Column({
    type: 'varchar',
    length: 50,
    default: 'admin',
    nullable: false
  })
  role: 'super_admin' | 'admin' | 'viewer';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'actif',
    nullable: false
  })
  statut: 'actif' | 'inactif' | 'suspendu';

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  derniere_connexion: Date;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
