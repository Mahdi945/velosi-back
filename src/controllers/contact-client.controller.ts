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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContactClientService } from '../services/contact-client.service';
import {
  CreateContactClientDto,
  UpdateContactClientDto,
} from '../dto/contact-client.dto';

@Controller('contact-clients')
@UseGuards(JwtAuthGuard)
export class ContactClientController {
  constructor(private readonly contactClientService: ContactClientService) {}

  @Post()
  async create(@Body() createContactClientDto: CreateContactClientDto) {
    return this.contactClientService.create(createContactClientDto);
  }

  @Get()
  async findAll() {
    return this.contactClientService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contactClientService.findOne(id);
  }

  @Get('client/:clientId')
  async findByClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.contactClientService.findByClient(clientId);
  }

  @Get('client/:clientId/principal')
  async findPrincipalByClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.contactClientService.findPrincipalByClient(clientId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateContactClientDto: UpdateContactClientDto,
  ) {
    return this.contactClientService.update(id, updateContactClientDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.contactClientService.remove(id);
  }
}
