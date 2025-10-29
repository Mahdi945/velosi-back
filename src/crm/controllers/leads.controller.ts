import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeadsService } from '../services/leads.service';
import { Lead } from '../../entities/crm/lead.entity';

@Controller('crm/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * 📋 Récupérer tous les leads actifs
   * Si l'utilisateur est commercial, filtre par assignedToId automatiquement
   */
  @Get()
  async findAll(@Req() req: any): Promise<Lead[]> {
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || [];
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses leads
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId) {
      console.log(`🔐 [Leads] Filtrage par commercial assigné: ${userId}`);
      return this.leadsService.findByAssignedTo(userId);
    }
    
    // Sinon, retourner tous les leads (admin/manager)
    return this.leadsService.findAll();
  }

  /**
   * 📊 Statistiques des leads
   * Si l'utilisateur est commercial, filtre par assignedToId automatiquement
   */
  @Get('statistics')
  async getStatistics(@Req() req: any) {
    const userId = req.user?.userId || req.user?.id;
    const userRoles = req.user?.roles || [];
    
    // Si l'utilisateur est SEULEMENT commercial (pas admin), filtrer par ses leads
    const isCommercialOnly = userRoles.includes('commercial') && !userRoles.includes('administratif') && !userRoles.includes('admin');
    
    if (isCommercialOnly && userId) {
      console.log(`🔐 [Leads Statistics] Filtrage par commercial assigné: ${userId}`);
      return this.leadsService.getStatisticsByCommercial(userId);
    }
    
    return this.leadsService.getStatistics();
  }

  /**
   * 📋 Récupérer les leads archivés
   */
  @Get('archived/all')
  async findAllArchived(): Promise<Lead[]> {
    return this.leadsService.findAllArchived();
  }

  /**
   * 🔍 Récupérer un lead par ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Lead> {
    return this.leadsService.findOne(id);
  }

  /**
   * ✏️ Créer un nouveau lead
   */
  @Post()
  async create(@Body() leadData: Partial<Lead>, @Req() req: any): Promise<Lead> {
    const userId = req.user?.userId || req.user?.id || 1;
    leadData.createdById = userId;
    return this.leadsService.create(leadData);
  }

  /**
   * 🔄 Mettre à jour un lead
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() leadData: Partial<Lead>,
    @Req() req: any,
  ): Promise<Lead> {
    const userId = req.user?.userId || req.user?.id || 1;
    leadData.updatedById = userId;
    return this.leadsService.update(id, leadData);
  }

  /**
   * 🗑️ Archiver un lead (soft delete)
   */
  @Patch(':id/archive')
  async archiveLead(
    @Param('id', ParseIntPipe) id: number,
    @Body() archiveData: { reason: string },
    @Req() req: any,
  ): Promise<Lead> {
    const userId = req.user?.userId || req.user?.id || 1;
    return this.leadsService.archiveLead(id, archiveData.reason, userId);
  }

  /**
   * ♻️ Restaurer un lead archivé
   */
  @Patch(':id/restore')
  async restoreLead(@Param('id', ParseIntPipe) id: number): Promise<Lead> {
    return this.leadsService.restoreLead(id);
  }

  /**
   * ❌ Suppression physique désactivée - utiliser archiveLead à la place
   * Cette route renvoie une erreur pour forcer l'utilisation du soft delete
   */
  @Delete(':id')
  @HttpCode(HttpStatus.BAD_REQUEST)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'La suppression physique des leads est désactivée. Utilisez PATCH /crm/leads/:id/archive à la place.',
      error: 'Bad Request',
    };
  }
}
