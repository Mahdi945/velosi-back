import {
  Controller,
  Post,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchedulerService } from '../services/scheduler.service';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/cleanup')
@UseGuards(TokenAuthGuard, RolesGuard)
@Roles('admin')
export class CleanupController {
  constructor(private schedulerService: SchedulerService) {}

  @Post('manual')
  @HttpCode(HttpStatus.OK)
  async manualCleanup() {
    const result = await this.schedulerService.manualCleanup();
    return {
      success: true,
      message: `Nettoyage personnel terminé: ${result.deleted} comptes supprimés`,
      deleted: result.deleted,
      errors: result.errors,
    };
  }

  @Post('manual-clients')
  @HttpCode(HttpStatus.OK)
  async manualClientCleanup() {
    const result = await this.schedulerService.manualClientCleanup();
    return {
      success: true,
      message: `Nettoyage clients terminé: ${result.deleted} comptes supprimés`,
      deleted: result.deleted,
      errors: result.errors,
    };
  }

  @Get('status')
  async getCleanupStatus() {
    // Ici on pourrait ajouter des statistiques sur les comptes à nettoyer
    return {
      success: true,
      message: 'Service de nettoyage automatique actif',
      personnel: {
        schedule: 'Tous les jours à 02:00',
        warningSchedule: 'Tous les jours à 08:00',
      },
      clients: {
        schedule: 'Tous les jours à 03:00',
        warningSchedule: 'Tous les jours à 09:00',
      }
    };
  }
}