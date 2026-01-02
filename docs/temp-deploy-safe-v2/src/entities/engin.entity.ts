import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('engin')
export class Engin {
  @PrimaryGeneratedColumn()
  id: number;

  // Libellé (d'après l'image)
  @Column({ length: 200 })
  libelle: string;

  // Conteneur/Remorque (d'après l'image)
  @Column({ name: 'conteneur_remorque', length: 100, nullable: true })
  conteneurRemorque: string;

  // Poids Vide (d'après l'image)
  @Column({ name: 'poids_vide', type: 'decimal', precision: 10, scale: 2, nullable: true })
  poidsVide: number;

  // Champ supplémentaire Pied (non présent dans l'image mais demandé)
  @Column({ length: 50, nullable: true })
  pied: string;

  // Métadonnées
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}