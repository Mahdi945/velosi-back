import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from '../services/reports.service';
import { ReportFilterDto } from '../dto/report.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('crm/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/crm/reports/global
   * Récupérer le rapport global avec statistiques par commercial
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('global')
  async getGlobalReport(@Req() req: any, @Query() filters: ReportFilterDto) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateGlobalReport(databaseName, organisationId, filters);
  }

  /**
   * GET /api/crm/reports/commercial/:id
   * Récupérer le rapport d'un commercial spécifique
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('commercial')
  async getCommercialReport(@Req() req: any, @Query() filters: ReportFilterDto) {
    if (!filters.commercialId) {
      throw new Error('commercialId est requis');
    }
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateCommercialReport(databaseName, organisationId, filters.commercialId, filters);
  }

  /**
   * GET /api/crm/reports/detailed
   * Récupérer le rapport détaillé avec tous les prospects, opportunités et cotations
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('detailed')
  async getDetailedReport(@Req() req: any, @Query() filters: ReportFilterDto) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateDetailedReport(databaseName, organisationId, filters);
  }

  /**
   * GET /api/crm/reports/prospects
   * Récupérer les rapports par prospect
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('prospects')
  async getProspectReports(@Req() req: any, @Query() filters: ReportFilterDto) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateProspectReports(databaseName, organisationId, filters);
  }

  /**
   * GET /api/crm/reports/opportunities
   * Récupérer les rapports par opportunité
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('opportunities')
  async getOpportunityReports(@Req() req: any, @Query() filters: ReportFilterDto) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateOpportunityReports(databaseName, organisationId, filters);
  }

  /**
   * GET /api/crm/reports/quotes
   * Récupérer les rapports par cotation
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('quotes')
  async getQuoteReports(@Req() req: any, @Query() filters: ReportFilterDto) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateQuoteReports(databaseName, organisationId, filters);
  }

  /**
   * GET /api/crm/reports/financial-stats
   * Récupérer les statistiques financières
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('financial-stats')
  async getFinancialStats(@Req() req: any, @Query() filters: ReportFilterDto) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.getFinancialStats(databaseName, organisationId, filters);
  }

  /**
   * GET /api/crm/reports/commercial/:commercialId/prospects
   * Récupérer les prospects d'un commercial
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('commercial/:commercialId/prospects')
  async getCommercialProspects(
    @Req() req: any,
    @Query('commercialId') commercialId: number,
    @Query() filters: ReportFilterDto
  ) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateProspectReports(databaseName, organisationId, { ...filters, commercialId });
  }

  /**
   * GET /api/crm/reports/commercial/:commercialId/opportunities
   * Récupérer les opportunités d'un commercial
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('commercial/:commercialId/opportunities')
  async getCommercialOpportunities(
    @Req() req: any,
    @Query('commercialId') commercialId: number,
    @Query() filters: ReportFilterDto
  ) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateOpportunityReports(databaseName, organisationId, { ...filters, commercialId });
  }

  /**
   * GET /api/crm/reports/commercial/:commercialId/quotes
   * Récupérer les cotations d'un commercial
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('commercial/:commercialId/quotes')
  async getCommercialQuotes(
    @Req() req: any,
    @Query('commercialId') commercialId: number,
    @Query() filters: ReportFilterDto
  ) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateQuoteReports(databaseName, organisationId, { ...filters, commercialId });
  }

  /**
   * GET /api/crm/reports/activities
   * Récupérer les rapports d'activités par commercial
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('activities')
  async getActivityReports(@Req() req: any, @Query() filters: ReportFilterDto) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateActivityReports(databaseName, organisationId, filters);
  }

  /**
   * GET /api/crm/reports/clients
   * Récupérer les rapports par client
   * ✅ MULTI-TENANT: Utilise databaseName et organisationId
   */
  @Get('clients')
  async getClientReports(@Req() req: any, @Query() filters: ReportFilterDto) {
    const databaseName = req.user?.databaseName || 'postgres';
    const organisationId = req.user?.organisationId || 1;
    return this.reportsService.generateClientReports(databaseName, organisationId, filters);
  }
}
