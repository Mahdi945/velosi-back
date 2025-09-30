import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ObjectifCom } from './objectif-com.entity';

@Entity('personnel')
export class Personnel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  nom: string;

  @Column({ type: 'varchar', nullable: false })
  prenom: string;

  @Column({ type: 'varchar', nullable: false, unique: true })
  nom_utilisateur: string;

  @Column({ type: 'varchar', nullable: false })
  role: string;

  @Column({ type: 'varchar', nullable: true })
  telephone: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: false, default: 'Homme' })
  genre: string;

  @Column({ type: 'varchar', nullable: true, default: 'actif' })
  statut: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Exclude()
  @Column({ type: 'varchar', nullable: false })
  mot_de_passe: string;

  @Column({ type: 'uuid', nullable: true })
  keycloak_id: string;

  @Column({ type: 'text', nullable: true, default: 'uploads/profiles/default-avatar.png' })
  photo: string; // URL ou chemin vers la photo de profil

  @Column({ type: 'boolean', nullable: false, default: true })
  first_login: boolean; // Flag pour indiquer si c'est le premier login (mot de passe à changer)

  @Column({ type: 'boolean', nullable: false, default: false })
  auto_delete: boolean; // Flag pour indiquer si le compte doit être supprimé automatiquement après 7 jours de désactivation

  // Relations
  @OneToMany(() => ObjectifCom, (objectif) => objectif.personnel)
  objectifs: ObjectifCom[];

  // Méthode virtuelle pour obtenir le nom complet
  get fullName(): string {
    return `${this.prenom} ${this.nom}`;
  }

  // Méthode virtuelle pour obtenir l'username (utilise nom_utilisateur)
  get username(): string {
    return this.nom_utilisateur;
  }

  // Méthode pour vérifier si l'utilisateur est actif
  get isActive(): boolean {
    return this.statut === 'actif';
  }
}
