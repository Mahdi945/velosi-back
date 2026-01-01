import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, ValidationPipe } from '@nestjs/common';
import { SetupService } from '../services/setup.service';
import { 
  CreateOrganisationDto, 
  GenerateSetupTokenDto, 
  VerifyTokenDto 
} from '../dto/organisation.dto';

/**
 * Contrôleur pour la configuration initiale des organisations (Setup/Onboarding)
 */
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  /**
   * Vérifie la validité d'un token de setup
   * POST /setup/verify-token
   */
  @Post('verify-token')
  async verifyToken(@Body(ValidationPipe) verifyDto: VerifyTokenDto) {
    return await this.setupService.verifyToken(verifyDto.token);
  }

  /**
   * Crée une nouvelle organisation et sa base de données
   * POST /setup/create-organisation
   */
  @Post('create-organisation')
  async createOrganisation(@Body(ValidationPipe) createDto: CreateOrganisationDto) {
    return await this.setupService.createOrganisation(createDto);
  }
}
