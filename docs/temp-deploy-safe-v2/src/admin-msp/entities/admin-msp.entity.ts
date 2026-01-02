import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_msp')
export class AdminMsp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 100 })
  prenom: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 100, unique: true })
  nom_utilisateur: string;

  @Column({ length: 255 })
  mot_de_passe: string;

  @Column({ 
    length: 50, 
    default: 'admin',
    type: 'varchar'
  })
  role: 'super_admin' | 'admin' | 'viewer';

  @Column({ 
    length: 20, 
    default: 'actif',
    type: 'varchar'
  })
  statut: 'actif' | 'inactif' | 'suspendu';

  @CreateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'NOW()' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  derniere_connexion: Date;

  @Column({ type: 'integer', nullable: true })
  created_by: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
