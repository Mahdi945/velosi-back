import { Controller, Post, Get, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImportDataService } from '../services/import-data.service';

@ApiTags('Administration - Import de données')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/import')
export class ImportDataController {
  constructor(private readonly importDataService: ImportDataService) {}

  @Post('aeroports/openflights')
  @ApiOperation({ summary: 'Importer les aéroports depuis OpenFlights' })
  @ApiResponse({ status: 200, description: 'Import réussi' })
  async importAeroportsFromOpenFlights() {
    return await this.importDataService.importAeroportsFromOpenFlights();
  }

  @Post('aeroports')
  @ApiOperation({ summary: 'Importer les aéroports depuis OurAirports (plus complet avec noms complets)' })
  @ApiResponse({ status: 200, description: 'Import réussi' })
  async importAeroportsFromOurAirports() {
    return await this.importDataService.importAeroportsFromOurAirports();
  }

  @Post('aeroports/ourairports')
  @ApiOperation({ summary: 'Importer les aéroports depuis OurAirports (alias)' })
  @ApiResponse({ status: 200, description: 'Import réussi' })
  async importAeroportsFromOurAirportsAlias() {
    return await this.importDataService.importAeroportsFromOurAirports();
  }

  @Post('ports')
  @ApiOperation({ summary: 'Importer tous les ports maritimes depuis World Port Index API' })
  @ApiResponse({ status: 200, description: 'Import réussi' })
  async importPorts() {
    return await this.importDataService.importPortsFromWorldPortIndex();
  }

  @Delete('ports')
  @ApiOperation({ summary: 'Supprimer tous les ports' })
  @ApiResponse({ status: 200, description: 'Suppression réussie' })
  async deleteAllPorts() {
    return await this.importDataService.deleteAllPorts();
  }

  @Delete('aeroports')
  @ApiOperation({ summary: 'Supprimer tous les aéroports' })
  @ApiResponse({ status: 200, description: 'Suppression réussie' })
  async deleteAllAeroports() {
    return await this.importDataService.deleteAllAeroports();
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Nettoyer les doublons dans les tables' })
  @ApiResponse({ status: 200, description: 'Nettoyage réussi' })
  async cleanupDuplicates() {
    return await this.importDataService.cleanupDuplicates();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtenir les statistiques des données importées' })
  @ApiResponse({ status: 200, description: 'Statistiques retournées' })
  async getStats() {
    return await this.importDataService.getStats();
  }
}