import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpStatus,
  HttpException,
  Req,
} from '@nestjs/common';
import { EnginService, CreateEnginDto, UpdateEnginDto, EnginQuery } from '../services/engin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { getDatabaseName } from '../common/helpers/multi-tenant.helper';

@Controller('engins')
@UseGuards(JwtAuthGuard)
export class EnginController {
  constructor(private readonly enginService: EnginService) {}

  /**
   * Récupérer tous les engins avec filtres et pagination
   * ✅ MULTI-TENANT
   */
  @Get()
  async findAll(@Query() query: EnginQuery, @Req() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const result = await this.enginService.findAll(databaseName, query);
      return {
        success: true,
        message: 'Engins récupérés avec succès',
        ...result
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des engins',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Récupérer tous les engins actifs (pour les selects)
   * ✅ MULTI-TENANT
   */
  @Get('active')
  async findActive(@Req() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const engins = await this.enginService.findActive(databaseName);
      return {
        success: true,
        message: 'Engins actifs récupérés avec succès',
        data: engins
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des engins actifs',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Statistiques des engins
   * ✅ MULTI-TENANT
   */
  @Get('stats')
  async getStats(@Req() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const stats = await this.enginService.getStats(databaseName);
      return {
        success: true,
        message: 'Statistiques des engins récupérées avec succès',
        data: stats
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération des statistiques',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Récupérer un engin par ID
   * ✅ MULTI-TENANT
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const engin = await this.enginService.findOne(databaseName, id);
      return {
        success: true,
        message: 'Engin récupéré avec succès',
        data: engin
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la récupération de l\'engin',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Créer un nouvel engin
   * ✅ MULTI-TENANT
   */
  @Post()
  async create(@Body() createEnginDto: CreateEnginDto, @Req() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const engin = await this.enginService.create(databaseName, createEnginDto);
      return {
        success: true,
        message: 'Engin créé avec succès',
        data: engin
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la création de l\'engin',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Mettre à jour un engin
   * ✅ MULTI-TENANT
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnginDto: UpdateEnginDto,
    @Req() req: any,
  ) {
    try {
      const databaseName = getDatabaseName(req);
      const engin = await this.enginService.update(databaseName, id, updateEnginDto);
      return {
        success: true,
        message: 'Engin mis à jour avec succès',
        data: engin
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la mise à jour de l\'engin',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Désactiver un engin (soft delete)
   * ✅ MULTI-TENANT
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      const engin = await this.enginService.remove(databaseName, id);
      return {
        success: true,
        message: 'Engin désactivé avec succès',
        data: engin
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la désactivation de l\'engin',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Supprimer définitivement un engin
   * ✅ MULTI-TENANT
   */
  @Delete(':id/permanent')
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    try {
      const databaseName = getDatabaseName(req);
      await this.enginService.delete(databaseName, id);
      return {
        success: true,
        message: 'Engin supprimé définitivement avec succès'
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Erreur lors de la suppression définitive de l\'engin',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
