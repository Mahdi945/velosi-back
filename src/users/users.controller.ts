import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  UsersService,
  CreateClientDto,
  CreatePersonnelDto,
} from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('clients')
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin')
  async createPersonnel(@Body() createPersonnelDto: CreatePersonnelDto) {
    const personnel =
      await this.usersService.createPersonnel(createPersonnelDto);
    return {
      message: 'Personnel créé avec succès',
      personnel: {
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
  }

  @Get('clients')
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async getAllClients() {
    const clients = await this.usersService.getAllClients();
    return {
      message: 'Liste des clients récupérée avec succès',
      clients,
    };
  }

  @Get('personnel')
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin')
  async getAllPersonnel() {
    const personnel = await this.usersService.getAllPersonnel();
    return {
      message: 'Liste du personnel récupérée avec succès',
      personnel,
    };
  }

  @Get('clients/:id')
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin', 'commercial')
  async getClientById(@Param('id', ParseIntPipe) id: number) {
    const client = await this.usersService.getClientById(id);
    return {
      message: 'Client récupéré avec succès',
      client,
    };
  }

  @Get('personnel/:id')
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin')
  async getPersonnelById(@Param('id', ParseIntPipe) id: number) {
    const personnel = await this.usersService.getPersonnelById(id);
    return {
      message: 'Personnel récupéré avec succès',
      personnel,
    };
  }

  @Post('clients/:id/block')
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async blockClient(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.blockClient(id);
    return {
      message: 'Client bloqué avec succès',
    };
  }

  @Post('clients/:id/unblock')
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async unblockClient(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.unblockClient(id);
    return {
      message: 'Client débloqué avec succès',
    };
  }

  @Post('personnel/:id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async deactivatePersonnel(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.deactivatePersonnel(id);
    return {
      message: 'Personnel désactivé avec succès',
    };
  }

  @Post('personnel/:id/activate')
  @UseGuards(RolesGuard)
  @Roles('administratif', 'admin')
  @HttpCode(HttpStatus.OK)
  async activatePersonnel(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.activatePersonnel(id);
    return {
      message: 'Personnel activé avec succès',
    };
  }
}
