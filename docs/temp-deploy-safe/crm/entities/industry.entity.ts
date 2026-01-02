import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('industries')
export class Industry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    nullable: false,
  })
  libelle: string;
}
