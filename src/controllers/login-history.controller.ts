import { Controller, Get, Param, Query, ParseIntPipe, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { LoginHistoryService, PaginatedLoginHistory } from '../services/login-history.service';
import { UserType, LoginStatus, LoginMethod } from '../entities/login-history.entity';

@ApiTags('Login History')
@Controller('login-history')
export class LoginHistoryController {
  constructor(private readonly loginHistoryService: LoginHistoryService) {}

  /**
   * Récupérer l'historique de connexion d'un personnel
   */
  @Get('personnel/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Récupérer l\'historique de connexion d\'un personnel' })
  @ApiResponse({ status: 200, description: 'Historique récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Personnel non trouvé' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: LoginStatus })
  @ApiQuery({ name: 'loginMethod', required: false, enum: LoginMethod })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Date de fin (ISO 8601)' })
  async getPersonnelLoginHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: LoginStatus,
    @Query('loginMethod') loginMethod?: LoginMethod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PaginatedLoginHistory> {
    return await this.loginHistoryService.getUserLoginHistory(
      id,
      UserType.PERSONNEL,
      { 
        page, 
        limit, 
        status, 
        loginMethod,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    );
  }

  /**
   * Récupérer l'historique de connexion d'un client
   */
  @Get('client/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Récupérer l\'historique de connexion d\'un client' })
  @ApiResponse({ status: 200, description: 'Historique récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: LoginStatus })
  @ApiQuery({ name: 'loginMethod', required: false, enum: LoginMethod })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Date de début (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Date de fin (ISO 8601)' })
  async getClientLoginHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: LoginStatus,
    @Query('loginMethod') loginMethod?: LoginMethod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PaginatedLoginHistory> {
    return await this.loginHistoryService.getUserLoginHistory(
      id,
      UserType.CLIENT,
      { 
        page, 
        limit, 
        status, 
        loginMethod,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
    );
  }

  /**
   * Récupérer la dernière connexion d'un personnel
   */
  @Get('personnel/:id/last')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Récupérer la dernière connexion d\'un personnel' })
  @ApiResponse({ status: 200, description: 'Dernière connexion récupérée' })
  async getPersonnelLastLogin(@Param('id', ParseIntPipe) id: number) {
    const lastLogin = await this.loginHistoryService.getLastLogin(id, UserType.PERSONNEL);
    return lastLogin || { message: 'Aucune connexion trouvée' };
  }

  /**
   * Récupérer la dernière connexion d'un client
   */
  @Get('client/:id/last')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Récupérer la dernière connexion d\'un client' })
  @ApiResponse({ status: 200, description: 'Dernière connexion récupérée' })
  async getClientLastLogin(@Param('id', ParseIntPipe) id: number) {
    const lastLogin = await this.loginHistoryService.getLastLogin(id, UserType.CLIENT);
    return lastLogin || { message: 'Aucune connexion trouvée' };
  }

  /**
   * Récupérer les sessions actives d'un personnel
   */
  @Get('personnel/:id/active-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Récupérer les sessions actives d\'un personnel' })
  @ApiResponse({ status: 200, description: 'Sessions actives récupérées' })
  async getPersonnelActiveSessions(@Param('id', ParseIntPipe) id: number) {
    return await this.loginHistoryService.getActiveSessions(id, UserType.PERSONNEL);
  }

  /**
   * Récupérer les sessions actives d'un client
   */
  @Get('client/:id/active-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Récupérer les sessions actives d\'un client' })
  @ApiResponse({ status: 200, description: 'Sessions actives récupérées' })
  async getClientActiveSessions(@Param('id', ParseIntPipe) id: number) {
    return await this.loginHistoryService.getActiveSessions(id, UserType.CLIENT);
  }

  /**
   * Récupérer les statistiques de connexion d'un personnel
   */
  @Get('personnel/:id/statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Récupérer les statistiques de connexion d\'un personnel' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  async getPersonnelStatistics(@Param('id', ParseIntPipe) id: number) {
    return await this.loginHistoryService.getLoginStatistics(id, UserType.PERSONNEL);
  }

  /**
   * Récupérer les statistiques de connexion d'un client
   */
  @Get('client/:id/statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Récupérer les statistiques de connexion d\'un client' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  async getClientStatistics(@Param('id', ParseIntPipe) id: number) {
    return await this.loginHistoryService.getLoginStatistics(id, UserType.CLIENT);
  }
}
