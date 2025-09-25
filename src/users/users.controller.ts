import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  UsersService,
  CreateClientDto,
  CreatePersonnelDto,
} from './users.service';
import { TokenAuthGuard } from '../auth/token-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('clients')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async createClient(@Body() createClientDto: CreateClientDto) {
    const client = await this.usersService.createClient(createClientDto);
    return {
      message: 'Client créé avec succès',
      client: {
        id: client.id,
        nom: client.nom,
        interlocuteur: client.interlocuteur,
        adresse: client.adresse,
        ville: client.ville,
        pays: client.pays,
        created_at: client.created_at,
      },
    };
  }

  @Post('personnel')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  async createPersonnel(@Body() createPersonnelDto: CreatePersonnelDto) {
    try {
      const personnel = await this.usersService.createPersonnel(createPersonnelDto);
      return {
        success: true,
        message: 'Personnel créé avec succès',
        data: {
          id: personnel.id,
          nom: personnel.nom,
          prenom: personnel.prenom,
          nom_utilisateur: personnel.nom_utilisateur,
          role: personnel.role,
          email: personnel.email,
          telephone: personnel.telephone,
          created_at: personnel.created_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erreur lors de la création du personnel',
        error: error.message,
      };
    }
  }

  @Get('clients')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async getAllClients() {
    const clients = await this.usersService.getAllClients();
    return {
      message: 'Liste des clients récupérée avec succès',
      clients,
    };
  }

  @Get('personnel')
  async getAllPersonnel() {
    try {
      const personnel = await this.usersService.getAllPersonnel();
      return {
        success: true,
        message: 'Liste du personnel récupérée avec succès',
        data: personnel,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erreur lors de la récupération du personnel',
        error: error.message,
      };
    }
  }

  @Get('clients/:id')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async getClientById(@Param('id', ParseIntPipe) id: number) {
    const client = await this.usersService.getClientById(id);
    return {
      message: 'Client récupéré avec succès',
      client,
    };
  }

  @Get('personnel/:id')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  async getPersonnelById(@Param('id', ParseIntPipe) id: number) {
    const personnel = await this.usersService.getPersonnelById(id);
    return {
      message: 'Personnel récupéré avec succès',
      personnel,
    };
  }

  @Put('personnel/:id')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif') // Seuls les administratifs peuvent modifier
  async updatePersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePersonnelDto: Partial<CreatePersonnelDto>,
    @Request() req: any // Ajouter l'objet request pour accéder à l'utilisateur connecté
  ) {
    try {
      const currentUser = req.user;
      console.log('Utilisateur connecté:', currentUser);
      console.log('ID à modifier:', id);
      
      // Vérifier si l'utilisateur peut modifier ce personnel
      const canModify = 
        currentUser.role?.toLowerCase() === 'administratif' || 
        currentUser.role?.toLowerCase() === 'admin' ||
        currentUser.id === id; // Ou si c'est son propre profil
      
      if (!canModify) {
        return {
          success: false,
          message: 'Vous n\'êtes pas autorisé à modifier ce personnel',
          error: 'Accès refusé'
        };
      }
      
      const personnel = await this.usersService.updatePersonnel(id, updatePersonnelDto);
      return {
        success: true,
        message: 'Personnel modifié avec succès',
        data: personnel,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erreur lors de la modification du personnel',
        error: error.message,
      };
    }
  }

  @Post('clients/:id/block')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async blockClient(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.blockClient(id);
    return {
      message: 'Client bloqué avec succès',
    };
  }

  @Post('clients/:id/unblock')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async unblockClient(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.unblockClient(id);
    return {
      message: 'Client débloqué avec succès',
    };
  }

  @Post('personnel/:id/deactivate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async deactivatePersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string }
  ) {
    await this.usersService.deactivatePersonnel(id, body.reason);
    return {
      message: 'Personnel désactivé avec succès',
      success: true
    };
  }

  @Post('personnel/:id/suspend')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async suspendPersonnel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string }
  ) {
    await this.usersService.suspendPersonnel(id, body.reason);
    return {
      message: 'Personnel suspendu avec succès',
      success: true
    };
  }

  @Post('personnel/:id/activate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async activatePersonnel(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.activatePersonnel(id);
    return {
      message: 'Personnel activé avec succès',
      success: true
    };
  }

  @Post('personnel/:id/reactivate')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async reactivatePersonnel(
    @Param('id', ParseIntPipe) id: number
  ) {
    await this.usersService.reactivatePersonnel(id);
    return {
      message: 'Personnel réactivé avec succès',
      success: true
    };
  }

  @Put('personnel/:id/password')
  @UseGuards(TokenAuthGuard, RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async updatePersonnelPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { newPassword: string }
  ) {
    await this.usersService.updatePersonnelPassword(id, body.newPassword);
    return {
      message: 'Mot de passe mis à jour avec succès',
      success: true
    };
  }
}
