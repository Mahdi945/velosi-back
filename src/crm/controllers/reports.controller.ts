import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from '../services/reports.service';
import { ReportFilterDto } from '../dto/report.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('crm/reports')
// @UseGuards(JwtAuthGuard) // Temporairement désactivé - MÊME COMPORTEMENT QUE ACTIVITIES
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/crm/reports/global
   * Récupérer le rapport global avec statistiques par commercial
   */
  @Get('global')
  async getGlobalReport(@Query() filters: ReportFilterDto) {
    return this.reportsService.generateGlobalReport(filters);
  }

  /**
   * GET /api/crm/reports/commercial/:id
   * Récupérer le rapport d'un commercial spécifique
   */
  @Get('commercial')
  async getCommercialReport(@Query() filters: ReportFilterDto) {
    if (!filters.commercialId) {
      throw new Error('commercialId est requis');
    }
    return this.reportsService.generateCommercialReport(filters.commercialId, filters);
  }

  /**
   * GET /api/crm/reports/detailed
   * Récupérer le rapport détaillé avec tous les prospects, opportunités et cotations
   */
  @Get('detailed')
  async getDetailedReport(@Query() filters: ReportFilterDto) {
    return this.reportsService.generateDetailedReport(filters);
  }

  /**
   * GET /api/crm/reports/prospects
   * Récupérer les rapports par prospect
   */
  @Get('prospects')
  async getProspectReports(@Query() filters: ReportFilterDto) {
    return this.reportsService.generateProspectReports(filters);
  }

  /**
   * GET /api/crm/reports/opportunities
   * Récupérer les rapports par opportunité
   */
  @Get('opportunities')
  async getOpportunityReports(@Query() filters: ReportFilterDto) {
    return this.reportsService.generateOpportunityReports(filters);
  }

  /**
   * GET /api/crm/reports/quotes
   * Récupérer les rapports par cotation
   */
  @Get('quotes')
  async getQuoteReports(@Query() filters: ReportFilterDto) {
    return this.reportsService.generateQuoteReports(filters);
  }

  /**
   * GET /api/crm/reports/financial-stats
   * Récupérer les statistiques financières
   */
  @Get('financial-stats')
  async getFinancialStats(@Query() filters: ReportFilterDto) {
    return this.reportsService.getFinancialStats(filters);
  }

  /**
   * GET /api/crm/reports/commercial/:commercialId/prospects
   * Récupérer les prospects d'un commercial
   */
  @Get('commercial/:commercialId/prospects')
  async getCommercialProspects(
    @Query('commercialId') commercialId: number,
    @Query() filters: ReportFilterDto
  ) {
    return this.reportsService.generateProspectReports({ ...filters, commercialId });
  }

  /**
   * GET /api/crm/reports/commercial/:commercialId/opportunities
   * Récupérer les opportunités d'un commercial
   */
  @Get('commercial/:commercialId/opportunities')
  async getCommercialOpportunities(
    @Query('commercialId') commercialId: number,
    @Query() filters: ReportFilterDto
  ) {
    return this.reportsService.generateOpportunityReports({ ...filters, commercialId });
  }

  /**
   * GET /api/crm/reports/commercial/:commercialId/quotes
   * Récupérer les cotations d'un commercial
   */
  @Get('commercial/:commercialId/quotes')
  async getCommercialQuotes(
    @Query('commercialId') commercialId: number,
    @Query() filters: ReportFilterDto
  ) {
    return this.reportsService.generateQuoteReports({ ...filters, commercialId });
  }

  /**
   * GET /api/crm/reports/activities
   * Récupérer les rapports d'activités par commercial
   */
  @Get('activities')
  async getActivityReports(@Query() filters: ReportFilterDto) {
    return this.reportsService.generateActivityReports(filters);
  }

  /**
   * GET /api/crm/reports/clients
   * Récupérer les rapports par client
   */
  @Get('clients')
  async getClientReports(@Query() filters: ReportFilterDto) {
    return this.reportsService.generateClientReports(filters);
  }
}
