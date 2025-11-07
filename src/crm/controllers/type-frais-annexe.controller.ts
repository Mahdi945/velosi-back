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
  Req,
} from '@nestjs/common';
import { TypeFraisAnnexeService } from '../services/type-frais-annexe.service';
import { CreateTypeFraisAnnexeDto, UpdateTypeFraisAnnexeDto } from '../dto/type-frais-annexe.dto';

@Controller('crm/type-frais-annexes')
export class TypeFraisAnnexeController {
  constructor(private readonly typeFraisAnnexeService: TypeFraisAnnexeService) {}

  /**
   * GET /crm/type-frais-annexes/active
   * Récupérer tous les types actifs (accessible à tous)
   */
  @Get('active')
  async findAllActive() {
    const types = await this.typeFraisAnnexeService.findAllActive();
    return {
      success: true,
      data: types,
    };
  }

  /**
   * GET /crm/type-frais-annexes
   * Récupérer tous les types (actifs et inactifs)
   */
  @Get()
  async findAll() {
    const types = await this.typeFraisAnnexeService.findAll();
    return {
      success: true,
      data: types,
    };
  }

  /**
   * GET /crm/type-frais-annexes/:id
   * Récupérer un type par ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const type = await this.typeFraisAnnexeService.findOne(id);
    return {
      success: true,
      data: type,
    };
  }

  /**
   * POST /crm/type-frais-annexes
   * Créer un nouveau type (accessible à tous les utilisateurs connectés)
   */
  @Post()
  async create(@Body() createDto: CreateTypeFraisAnnexeDto, @Req() req?: any) {
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Création d'un nouveau type par l'utilisateur ${userId}`);
    
    const type = await this.typeFraisAnnexeService.create(createDto);
    return {
      success: true,
      message: 'Type de frais annexe créé avec succès',
      data: type,
    };
  }

  /**
   * PUT /crm/type-frais-annexes/:id
   * Mettre à jour un type
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTypeFraisAnnexeDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Mise à jour du type ${id} par l'utilisateur ${userId}`);
    
    const type = await this.typeFraisAnnexeService.update(id, updateDto);
    return {
      success: true,
      message: 'Type de frais annexe mis à jour avec succès',
      data: type,
    };
  }

  /**
   * PATCH /crm/type-frais-annexes/:id/deactivate
   * Désactiver un type
   */
  @Patch(':id/deactivate')
  async deactivate(@Param('id', ParseIntPipe) id: number, @Req() req?: any) {
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Désactivation du type ${id} par l'utilisateur ${userId}`);
    
    const type = await this.typeFraisAnnexeService.deactivate(id);
    return {
      success: true,
      message: 'Type de frais annexe désactivé avec succès',
      data: type,
    };
  }

  /**
   * PATCH /crm/type-frais-annexes/:id/activate
   * Activer un type
   */
  @Patch(':id/activate')
  async activate(@Param('id', ParseIntPipe) id: number, @Req() req?: any) {
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Activation du type ${id} par l'utilisateur ${userId}`);
    
    const type = await this.typeFraisAnnexeService.activate(id);
    return {
      success: true,
      message: 'Type de frais annexe activé avec succès',
      data: type,
    };
  }

  /**
   * DELETE /crm/type-frais-annexes/:id
   * Supprimer définitivement un type
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req?: any) {
    const userId = req?.user?.userId || req?.user?.id || 1;
    console.log(`✅ [TypeFraisAnnexe] Suppression du type ${id} par l'utilisateur ${userId}`);
    
    await this.typeFraisAnnexeService.remove(id);
    return {
      success: true,
      message: 'Type de frais annexe supprimé définitivement',
    };
  }
}
