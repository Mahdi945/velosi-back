import { Controller, Get, Post, Body, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { IndustryService } from '../services/industry.service';
import { getDatabaseName } from '../../common/helpers/multi-tenant.helper';

@Controller('crm/industries')
@UseGuards(JwtAuthGuard)
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  /**
   * GET /crm/industries - Récupérer tous les secteurs
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @Get()
  async getAllIndustries(@Request() req) {
    try {
      const databaseName = getDatabaseName(req);
      const industries = await this.industryService.findAll(databaseName);
      return {
        success: true,
        data: industries,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la récupération des secteurs',
        error: error.message,
      };
    }
  }

  /**
   * POST /crm/industries - Créer un nouveau secteur
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @Post()
  async createIndustry(@Request() req, @Body('libelle') libelle: string) {
    try {
      if (!libelle || libelle.trim() === '') {
        return {
          success: false,
          message: 'Le libellé du secteur est requis',
        };
      }

      const databaseName = getDatabaseName(req);
      const industry = await this.industryService.create(databaseName, libelle);
      return {
        success: true,
        message: 'Secteur d\'activité créé avec succès',
        data: industry,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erreur lors de la création du secteur',
        error: error.message,
      };
    }
  }
}
