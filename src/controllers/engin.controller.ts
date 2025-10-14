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
} from '@nestjs/common';
import { EnginService, CreateEnginDto, UpdateEnginDto, EnginQuery } from '../services/engin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('engins')
// @UseGuards(JwtAuthGuard, RolesGuard) // Temporairement désactivé pour debug
export class EnginController {
  constructor(private readonly enginService: EnginService) {}

  /**
   * Récupérer tous les engins avec filtres et pagination
   */
  @Get()
  // // @Roles('administratif', 'commercial') // Temporairement désactivé pour debug
  async findAll(@Query() query: EnginQuery) {
    try {
      const result = await this.enginService.findAll(query);
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
   */
  @Get('active')
  // // @Roles('administratif', 'commercial') // Temporairement désactivé pour debug
  async findActive() {
    try {
      const engins = await this.enginService.findActive();
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
   */
  @Get('stats')
  // @Roles('administratif')
  async getStats() {
    try {
      const stats = await this.enginService.getStats();
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
   */
  @Get(':id')
  // @Roles('administratif', 'commercial')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const engin = await this.enginService.findOne(id);
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
   */
  @Post()
  // @Roles('administratif')
  async create(@Body() createEnginDto: CreateEnginDto) {
    try {
      const engin = await this.enginService.create(createEnginDto);
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
   */
  @Patch(':id')
  // @Roles('administratif')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnginDto: UpdateEnginDto,
  ) {
    try {
      const engin = await this.enginService.update(id, updateEnginDto);
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
   */
  @Delete(':id')
  // @Roles('administratif')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      const engin = await this.enginService.remove(id);
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
   */
  @Delete(':id/permanent')
  // @Roles('administratif')
  async delete(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.enginService.delete(id);
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
