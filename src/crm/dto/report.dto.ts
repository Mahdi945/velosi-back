import { IsOptional, IsDateString, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO pour les filtres de rapports CRM
 */
export class ReportFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  commercialId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  commercialIds?: number[];

  @IsOptional()
  status?: string; // 'new', 'qualified', 'converted', 'lost', etc.

  @IsOptional()
  opportunityStage?: string; // 'prospecting', 'negotiation', 'closed_won', etc.

  @IsOptional()
  quoteStatus?: string; // 'draft', 'sent', 'accepted', 'rejected', etc.
}

/**
 * Interface pour les statistiques par commercial
 */
export interface CommercialReport {
  commercialId: number;
  commercialName: string;
  commercialEmail: string;
  
  // Prospects
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  lostLeads: number;
  
  // Opportunités
  totalOpportunities: number;
  openOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;
  totalOpportunityValue: number;
  wonOpportunityValue: number;
  
  // Cotations
  totalQuotes: number;
  draftQuotes: number;
  sentQuotes: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  
  // Financier
  totalQuotesValue: number;
  acceptedQuotesValue: number;
  totalMargin: number;
  acceptedMargin: number;
  averageQuoteValue: number;
  
  // Taux de conversion
  leadToOpportunityRate: number;
  opportunityToQuoteRate: number;
  quoteAcceptanceRate: number;
  overallConversionRate: number;
  
  // Performance
  averageResponseTime: number; // en jours
  activitiesCount: number;
}

/**
 * Interface pour les rapports par prospect
 */
export interface ProspectReport {
  leadId: number;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  company: string;
  source: string;
  status: string;
  createdAt: Date;
  assignedTo: string;
  
  // Opportunités liées
  opportunitiesCount: number;
  totalOpportunityValue: number;
  
  // Cotations liées
  quotesCount: number;
  totalQuotesValue: number;
  acceptedQuotesValue: number;
  
  // Dernière activité
  lastActivityDate: Date;
  lastActivityType: string;
}

/**
 * Interface pour les détails d'une opportunité
 */
export interface OpportunityReport {
  opportunityId: number;
  title: string;
  stage: string;
  value: number;
  probability: number;
  expectedCloseDate: Date;
  assignedTo: string;
  
  // Cotations
  quotesCount: number;
  totalQuotesValue: number;
  acceptedQuotesValue: number;
  
  // Lead associé
  leadName: string;
  leadCompany: string;
  
  createdAt: Date;
}

/**
 * Interface pour les détails d'une cotation
 */
export interface QuoteReport {
  quoteId: number;
  quoteNumber: string;
  status: string;
  title: string;
  
  // Client
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  
  // Financier
  subtotal: number;
  taxAmount: number;
  total: number;
  freightPurchased: number;
  freightOffered: number;
  freightMargin: number;
  additionalCostsPurchased: number;
  additionalCostsOffered: number;
  totalMargin: number;
  marginPercentage: number;
  
  // Relations
  leadId: number;
  opportunityId: number;
  assignedCommercial: string;
  
  // Dates
  createdAt: Date;
  sentAt: Date;
  acceptedAt: Date;
  rejectedAt: Date;
  validUntil: Date;
}

/**
 * Interface pour le rapport global
 */
export interface GlobalReport {
  // Période
  periodStart: Date;
  periodEnd: Date;
  
  // Statistiques globales
  totalLeads: number;
  totalOpportunities: number;
  totalQuotes: number;
  
  totalOpportunityValue: number;
  totalQuotesValue: number;
  totalAcceptedQuotesValue: number;
  totalMargin: number;
  
  // Taux de conversion globaux
  globalLeadToOpportunityRate: number;
  globalOpportunityToQuoteRate: number;
  globalQuoteAcceptanceRate: number;
  
  // Par commercial
  commercialReports: CommercialReport[];
  
  // Top performers
  topCommercialByQuotes: CommercialReport;
  topCommercialByRevenue: CommercialReport;
  topCommercialByConversion: CommercialReport;
}

/**
 * Interface pour le rapport détaillé
 */
export interface DetailedReport {
  globalStats: GlobalReport;
  prospectReports: ProspectReport[];
  opportunityReports: OpportunityReport[];
  quoteReports: QuoteReport[];
}

/**
 * Interface pour le rapport d'activités par commercial
 */
export interface ActivityReport {
  commercialId: number;
  commercialName: string;
  commercialEmail: string;
  
  totalActivities: number;
  callsCount: number;
  emailsCount: number;
  meetingsCount: number;
  tasksCount: number;
  otherActivitiesCount: number;
  
  lastActivityDate?: Date;
  lastActivityType?: string;
  lastActivityDescription?: string;
  
  averageActivitiesPerWeek: number;
  activityRate: 'high' | 'medium' | 'low' | 'inactive';
  
  // Activités par statut
  completedActivities: number;
  pendingActivities: number;
  cancelledActivities: number;
}

/**
 * Interface pour le rapport par client
 */
export interface ClientReport {
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  company: string;
  clientType: string;
  category?: string; // Catégorie: local ou etranger
  createdAt: Date;
  
  assignedCommercial: string;
  commercialId: number;
  
  quotesCount: number;
  totalQuotesValue: number;
  acceptedQuotesValue: number;
  acceptedQuotesCount: number;
  rejectedQuotesCount: number;
  pendingQuotesCount: number;
  
  totalMargin: number;
  averageQuoteValue: number;
  acceptanceRate: number;
  
  lastQuoteDate?: Date;
  lastQuoteNumber?: string;
  lastQuoteStatus?: string;
}
