import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnginsService } from './engins.service';
import { CreateEnginDto, UpdateEnginDto, EnginFiltersDto } from './dto/engin.dto';

@Controller('gestion-ressources/engins')
export class EnginsController {
  constructor(private readonly enginsService: EnginsService) {}

  /**
   * Récupérer tous les engins avec filtres optionnels
   * GET /gestion-ressources/engins
   */
  @Get()
  async findAll(@Query() filters: EnginFiltersDto) {
    console.log('📋 [ENGINS] Récupération de tous les engins avec filtres:', filters);
    const engins = await this.enginsService.findAll(filters);
    console.log(`✅ [ENGINS] ${engins.length} engins récupérés`);
    return engins;
  }

  /**
   * Récupérer les statistiques
   * GET /gestion-ressources/engins/stats
   */
  @Get('stats')
  async getStats() {
    console.log('📊 [ENGINS] Récupération des statistiques');
    const stats = await this.enginsService.getStats();
    console.log('✅ [ENGINS] Statistiques récupérées:', stats);
    return stats;
  }

  /**
   * Récupérer uniquement les engins actifs
   * GET /gestion-ressources/engins/actifs
   */
  @Get('actifs')
  async findAllActive() {
    console.log('📋 [ENGINS] Récupération des engins actifs');
    const engins = await this.enginsService.findAllActive();
    console.log(`✅ [ENGINS] ${engins.length} engins actifs récupérés`);
    return {
      success: true,
      message: 'Engins actifs récupérés avec succès',
      data: engins
    };
  }

  /**
   * Récupérer un engin par ID
   * GET /gestion-ressources/engins/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    console.log(`🔍 [ENGINS] Récupération engin ID: ${id}`);
    const engin = await this.enginsService.findOne(id);
    console.log('✅ [ENGINS] Engin récupéré:', engin);
    return engin;
  }

  /**
   * Créer un nouvel engin
   * POST /gestion-ressources/engins
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEnginDto: CreateEnginDto) {
    console.log('➕ [ENGINS] Création nouvel engin:', createEnginDto);
    const engin = await this.enginsService.create(createEnginDto);
    console.log('✅ [ENGINS] Engin créé avec succès:', engin);
    return engin;
  }

  /**
   * Mettre à jour un engin
   * PUT /gestion-ressources/engins/:id
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnginDto: UpdateEnginDto,
  ) {
    console.log(`✏️ [ENGINS] Mise à jour engin ID: ${id}`, updateEnginDto);
    const engin = await this.enginsService.update(id, updateEnginDto);
    console.log('✅ [ENGINS] Engin mis à jour:', engin);
    return engin;
  }

  /**
   * Mettre à jour partiellement un engin (PATCH)
   * PATCH /gestion-ressources/engins/:id
   */
  @Patch(':id')
  async partialUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnginDto: UpdateEnginDto,
  ) {
    console.log(`✏️ [ENGINS] Mise à jour partielle engin ID: ${id}`, updateEnginDto);
    const engin = await this.enginsService.update(id, updateEnginDto);
    console.log('✅ [ENGINS] Engin mis à jour:', engin);
    return engin;
  }

  /**
   * Activer/Désactiver un engin
   * PATCH /gestion-ressources/engins/:id/toggle-active
   */
  @Patch(':id/toggle-active')
  async toggleActive(@Param('id', ParseIntPipe) id: number) {
    console.log(`🔄 [ENGINS] Toggle active pour engin ID: ${id}`);
    const engin = await this.enginsService.toggleActive(id);
    console.log(`✅ [ENGINS] Engin ${engin.isActive ? 'activé' : 'désactivé'}:`, engin);
    return engin;
  }

  /**
   * Supprimer un engin
   * DELETE /gestion-ressources/engins/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    console.log(`🗑️ [ENGINS] Suppression engin ID: ${id}`);
    await this.enginsService.remove(id);
    console.log('✅ [ENGINS] Engin supprimé avec succès');
  }
}
