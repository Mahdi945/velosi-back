import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quote } from './quote.entity';

export enum QuoteItemCategory {
  GROUPAGE = 'groupage',
  AERIEN = 'aerien',
  ROUTIER = 'routier',
  COMPLET = 'complet',
}

export enum VehicleType {
  VAN = 'van',
  TRUCK_3_5T = 'truck_3_5t',
  TRUCK_7_5T = 'truck_7_5t',
  TRUCK_12T = 'truck_12t',
  TRUCK_19T = 'truck_19t',
  TRUCK_26T = 'truck_26t',
  SEMI_TRAILER = 'semi_trailer',
  CONTAINER = 'container',
}

export enum ServiceType {
  PICKUP_DELIVERY = 'pickup_delivery',
  DOOR_TO_DOOR = 'door_to_door',
  EXPRESS_DELIVERY = 'express_delivery',
  SCHEDULED_DELIVERY = 'scheduled_delivery',
  SAME_DAY = 'same_day',
  NEXT_DAY = 'next_day',
  WAREHOUSING = 'warehousing',
  PACKAGING = 'packaging',
  INSURANCE = 'insurance',
}

@Entity('crm_quote_items')
export class QuoteItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'quote_id' })
  quoteId: number;

  @ManyToOne(() => Quote, (quote) => quote.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  // Description du service
  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: QuoteItemCategory,
    nullable: true,
  })
  category: QuoteItemCategory;

  // Champs spécifiques depuis l'image (section Cargo)
  @Column({ name: 'vehicle_description', length: 200, nullable: true })
  vehicleDescription: string; // Engin

  @Column({ name: 'cargo_designation', type: 'text', nullable: true })
  cargoDesignation: string; // DESIGNATION MARCH

  @Column({ name: 'packages_count', type: 'integer', nullable: true })
  packagesCount: number; // COLIS

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  weightKg: number; // POIDS

  // Origine
  @Column({ name: 'origin_street', length: 300, nullable: true })
  originStreet: string;

  @Column({ name: 'origin_city', length: 100, nullable: true })
  originCity: string;

  @Column({ name: 'origin_postal_code', length: 20, nullable: true })
  originPostalCode: string;

  @Column({ name: 'origin_country', length: 3, default: 'TUN', nullable: true })
  originCountry: string;

  // Destination
  @Column({ name: 'destination_street', length: 300, nullable: true })
  destinationStreet: string;

  @Column({ name: 'destination_city', length: 100, nullable: true })
  destinationCity: string;

  @Column({ name: 'destination_postal_code', length: 20, nullable: true })
  destinationPostalCode: string;

  @Column({ name: 'destination_country', length: 3, default: 'TUN', nullable: true })
  destinationCountry: string;

  // Détails transport
  @Column({ name: 'distance_km', type: 'decimal', precision: 8, scale: 2, nullable: true })
  distanceKm: number;

  @Column({ name: 'volume_m3', type: 'decimal', precision: 10, scale: 2, nullable: true })
  volumeM3: number;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: VehicleType,
    nullable: true,
  })
  vehicleType: VehicleType;

  @Column({
    name: 'service_type',
    type: 'enum',
    enum: ServiceType,
    nullable: true,
  })
  serviceType: ServiceType;

  // Prix et quantités
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2 })
  totalPrice: number;

  // Prix d'achat et de vente (pour calcul de marge)
  @Column({ name: 'purchase_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  purchasePrice: number; // Prix d'achat

  @Column({ name: 'selling_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  sellingPrice: number; // Prix de vente

  @Column({ name: 'margin', type: 'decimal', precision: 10, scale: 2, default: 0 })
  margin: number; // Marge

  // Type de ligne (pour différencier Fret et Frais Annexes)
  @Column({ name: 'item_type', length: 50, default: 'freight' })
  itemType: string; // 'freight' ou 'additional_cost'

  // Métadonnées
  @Column({ name: 'line_order', type: 'integer', default: 1 })
  lineOrder: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
