import { Controller, Get, Post, Body, HttpStatus } from '@nestjs/common';
import { IndustryService } from '../services/industry.service';

@Controller('crm/industries')
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  /**
   * GET /crm/industries - Récupérer tous les secteurs
   */
  @Get()
  async getAllIndustries() {
    try {
      const industries = await this.industryService.findAll();
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
   */
  @Post()
  async createIndustry(@Body('libelle') libelle: string) {
    try {
      if (!libelle || libelle.trim() === '') {
        return {
          success: false,
          message: 'Le libellé du secteur est requis',
        };
      }

      const industry = await this.industryService.create(libelle);
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
