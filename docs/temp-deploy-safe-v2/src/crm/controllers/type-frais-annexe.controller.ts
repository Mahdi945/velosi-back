import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Public } from '../../auth/public.decorator';
import { TypeFraisAnnexeService } from '../services/type-frais-annexe.service';
import { CreateTypeFraisAnnexeDto, UpdateTypeFraisAnnexeDto } from '../dto/type-frais-annexe.dto';
import { getDatabaseName } from '../../common/helpers/multi-tenant.helper';

@Controller('crm/type-frais-annexes')
export class TypeFraisAnnexeController {
  constructor(private readonly typeFraisAnnexeService: TypeFraisAnnexeService) {}

  /**
   * GET /crm/type-frais-annexes/active
   * Récupérer tous les types actifs
   * ✅ MULTI-TENANT: Utilise databaseName du JWT (authentification requise)
   */
  @UseGuards(JwtAuthGuard)
  @Get('active')
  async findAllActive(@Request() req) {
    const databaseName = getDatabaseName(req);
    console.log(`✅ [TypeFraisAnnexe] Récupération des types actifs depuis la base: ${databaseName}`);
    
    const types = await this.typeFraisAnnexeService.findAllActive(databaseName);
    return {
      success: true,
      data: types,
    };
  }

  /**
   * GET /crm/type-frais-annexes
   * Récupérer tous les types (actifs et inactifs - authentification requise)
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req) {
    const databaseName = getDatabaseName(req);
    const types = await this.typeFraisAnnexeService.findAll(databaseName);
    return {
      success: true,
      data: types,
    };
  }

  /**
   * GET /crm/type-frais-annexes/:id
   * Récupérer un type par ID (authentification requise)
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const databaseName = getDatabaseName(req);
    const type = await this.typeFraisAnnexeService.findOne(databaseName, id);
    return {
      success: true,
      data: type,
    };
  }

  /**
   * POST /crm/type-frais-annexes
   * Créer un nouveau type
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() createDto: CreateTypeFraisAnnexeDto) {
    const databaseName = getDatabaseName(req);
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Création d'un nouveau type par l'utilisateur ${userId}`);
    
    const type = await this.typeFraisAnnexeService.create(databaseName, createDto);
    return {
      success: true,
      message: 'Type de frais annexe créé avec succès',
      data: type,
    };
  }

  /**
   * PUT /crm/type-frais-annexes/:id
   * Mettre à jour un type (authentification requise)
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTypeFraisAnnexeDto,
  ) {
    const databaseName = getDatabaseName(req);
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Mise à jour du type ${id} par l'utilisateur ${userId}`);
    
    const type = await this.typeFraisAnnexeService.update(databaseName, id, updateDto);
    return {
      success: true,
      message: 'Type de frais annexe mis à jour avec succès',
      data: type,
    };
  }

  /**
   * PATCH /crm/type-frais-annexes/:id/deactivate
   * Désactiver un type
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/deactivate')
  async deactivate(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const databaseName = getDatabaseName(req);
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Désactivation du type ${id} par l'utilisateur ${userId}`);
    
    const type = await this.typeFraisAnnexeService.deactivate(databaseName, id);
    return {
      success: true,
      message: 'Type de frais annexe désactivé avec succès',
      data: type,
    };
  }

  /**
   * PATCH /crm/type-frais-annexes/:id/activate
   * Activer un type
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/activate')
  async activate(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const databaseName = getDatabaseName(req);
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Activation du type ${id} par l'utilisateur ${userId}`);
    
    const type = await this.typeFraisAnnexeService.activate(databaseName, id);
    return {
      success: true,
      message: 'Type de frais annexe activé avec succès',
      data: type,
    };
  }

  /**
   * DELETE /crm/type-frais-annexes/:id
   * Supprimer définitivement un type
   * ✅ MULTI-TENANT: Utilise databaseName du JWT
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const databaseName = getDatabaseName(req);
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Suppression du type ${id} par l'utilisateur ${userId}`);
    
    await this.typeFraisAnnexeService.remove(databaseName, id);
    return {
      success: true,
      message: 'Type de frais annexe supprimé définitivement',
    };
  }
}
