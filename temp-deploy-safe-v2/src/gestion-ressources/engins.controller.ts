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
  Req,
} from '@nestjs/common';
import { EnginsService } from './engins.service';
import { CreateEnginDto, UpdateEnginDto, EnginFiltersDto } from './dto/engin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { getDatabaseName } from '../common/helpers/multi-tenant.helper';

@Controller('gestion-ressources/engins')
@UseGuards(JwtAuthGuard)
export class EnginsController {
  constructor(private readonly enginsService: EnginsService) {}

  /**
   * Récupérer tous les engins avec filtres optionnels
   * GET /gestion-ressources/engins
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Get()
  async findAll(@Query() filters: EnginFiltersDto, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    console.log('📋 [ENGINS] Récupération de tous les engins avec filtres:', filters, 'DB:', databaseName);
    const engins = await this.enginsService.findAll(databaseName, filters);
    console.log(`✅ [ENGINS] ${engins.length} engins récupérés`);
    return engins;
  }

  /**
   * Récupérer les statistiques
   * GET /gestion-ressources/engins/stats
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Get('stats')
  async getStats(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    console.log('📊 [ENGINS] Récupération des statistiques DB:', databaseName);
    const stats = await this.enginsService.getStats(databaseName);
    console.log('✅ [ENGINS] Statistiques récupérées:', stats);
    return stats;
  }

  /**
   * Récupérer uniquement les engins actifs
   * GET /gestion-ressources/engins/actifs
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Get('actifs')
  async findAllActive(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    console.log('📋 [ENGINS] Récupération des engins actifs DB:', databaseName);
    const engins = await this.enginsService.findAllActive(databaseName);
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
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    console.log(`🔍 [ENGINS] Récupération engin ID: ${id} DB: ${databaseName}`);
    const engin = await this.enginsService.findOne(databaseName, id);
    console.log('✅ [ENGINS] Engin récupéré:', engin);
    return engin;
  }

  /**
   * Créer un nouvel engin
   * POST /gestion-ressources/engins
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEnginDto: CreateEnginDto, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    console.log('➕ [ENGINS] Création nouvel engin:', createEnginDto, 'DB:', databaseName);
    const engin = await this.enginsService.create(databaseName, createEnginDto);
    console.log('✅ [ENGINS] Engin créé avec succès:', engin);
    return engin;
  }

  /**
   * Mettre à jour un engin
   * PUT /gestion-ressources/engins/:id
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnginDto: UpdateEnginDto,
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    console.log(`✏️ [ENGINS] Mise à jour engin ID: ${id}`, updateEnginDto, 'DB:', databaseName);
    const engin = await this.enginsService.update(databaseName, id, updateEnginDto);
    console.log('✅ [ENGINS] Engin mis à jour:', engin);
    return engin;
  }

  /**
   * Mettre à jour partiellement un engin (PATCH)
   * PATCH /gestion-ressources/engins/:id
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Patch(':id')
  async partialUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnginDto: UpdateEnginDto,
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    console.log(`✏️ [ENGINS] Mise à jour partielle engin ID: ${id}`, updateEnginDto, 'DB:', databaseName);
    const engin = await this.enginsService.update(databaseName, id, updateEnginDto);
    console.log('✅ [ENGINS] Engin mis à jour:', engin);
    return engin;
  }

  /**
   * Activer/Désactiver un engin
   * PATCH /gestion-ressources/engins/:id/toggle-active
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Patch(':id/toggle-active')
  async toggleActive(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    console.log(`🔄 [ENGINS] Toggle active pour engin ID: ${id} DB: ${databaseName}`);
    const engin = await this.enginsService.toggleActive(databaseName, id);
    console.log(`✅ [ENGINS] Engin ${engin.isActive ? 'activé' : 'désactivé'}:`, engin);
    return engin;
  }

  /**
   * Supprimer un engin
   * DELETE /gestion-ressources/engins/:id
   * ✅ MULTI-TENANT: Isolation par base de données
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    console.log(`🗑️ [ENGINS] Suppression engin ID: ${id} DB: ${databaseName}`);
    await this.enginsService.remove(databaseName, id);
    console.log('✅ [ENGINS] Engin supprimé avec succès');
  }
}
