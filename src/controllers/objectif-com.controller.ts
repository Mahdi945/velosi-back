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
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ObjectifComService } from '../services/objectif-com.service';
import {
  CreateObjectifComDto,
  UpdateObjectifComDto,
} from '../dto/objectif-com.dto';

@Controller('objectifs-commerciaux')
@UseGuards(JwtAuthGuard)
export class ObjectifComController {
  constructor(private readonly objectifComService: ObjectifComService) {}

  @Post()
  async create(@Body() createObjectifComDto: CreateObjectifComDto) {
    return this.objectifComService.create(createObjectifComDto);
  }

  @Get()
  async findAll(@Query('personnelId') personnelId?: number) {
    if (personnelId) {
      return this.objectifComService.findByPersonnel(personnelId);
    }
    return this.objectifComService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.objectifComService.findOne(id);
  }

  @Get('personnel/:personnelId')
  async findByPersonnel(
    @Param('personnelId', ParseIntPipe) personnelId: number,
  ) {
    return this.objectifComService.findByPersonnel(personnelId);
  }

  @Get('commercial/actifs')
  async findActiveCommercialObjectives() {
    return this.objectifComService.findActiveCommercialObjectives();
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateObjectifComDto: UpdateObjectifComDto,
  ) {
    return this.objectifComService.update(id, updateObjectifComDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.objectifComService.remove(id);
  }
}
