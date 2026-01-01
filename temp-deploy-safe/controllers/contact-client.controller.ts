import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactClientService } from '../services/contact-client.service';
import { getDatabaseName, getOrganisationId } from '../common/helpers/multi-tenant.helper';
import {
  CreateContactClientDto,
  UpdateContactClientDto,
} from '../dto/contact-client.dto';

@Controller('contact-clients')
@UseGuards(JwtAuthGuard)
export class ContactClientController {
  constructor(private readonly contactClientService: ContactClientService) {}

  @Post()
  async create(@Body() createContactClientDto: CreateContactClientDto, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.contactClientService.create(databaseName, createContactClientDto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.contactClientService.findAll(databaseName);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.contactClientService.findOne(databaseName, id);
  }

  @Get('client/:clientId')
  async findByClient(@Param('clientId', ParseIntPipe) clientId: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.contactClientService.findByClient(databaseName, clientId);
  }

  @Get('client/:clientId/principal')
  async findPrincipalByClient(@Param('clientId', ParseIntPipe) clientId: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.contactClientService.findPrincipalByClient(databaseName, clientId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContactClientDto: UpdateContactClientDto,
    @Req() req: any,
  ) {
    const databaseName = getDatabaseName(req);
    return this.contactClientService.update(databaseName, id, updateContactClientDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const databaseName = getDatabaseName(req);
    return this.contactClientService.remove(databaseName, id);
  }
}
