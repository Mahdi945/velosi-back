import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { QuotesService } from '../services/quotes.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  QuoteFilterDto,
  SendQuoteDto,
  AcceptQuoteDto,
  RejectQuoteDto,
} from '../dto/quote.dto';

// Décorateur pour rendre une route publique (sans authentification)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Controller('crm/quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  async create(@Body() createQuoteDto: CreateQuoteDto, @Req() req: any) {
    const userId = req.user?.userId || req.user?.id || 1;
    return this.quotesService.create(createQuoteDto, userId);
  }

  @Get()
  async findAll(@Query() filters: QuoteFilterDto) {
    return this.quotesService.findAll(filters);
  }

  @Get('statistics')
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('commercialId') commercialId?: number,
  ) {
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      commercialId,
    };
    return this.quotesService.getStatistics(filters);
  }

  @Get(':id')
  @Public() // Endpoint public pour permettre la visualisation sans authentification
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.quotesService.findOne(id);
  }

  @Get('number/:quoteNumber')
  async findByQuoteNumber(@Param('quoteNumber') quoteNumber: string) {
    return this.quotesService.findByQuoteNumber(quoteNumber);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateQuoteDto: UpdateQuoteDto,
  ) {
    return this.quotesService.update(id, updateQuoteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.quotesService.remove(id);
  }

  @Post(':id/send')
  async sendQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() sendQuoteDto: SendQuoteDto,
  ) {
    return this.quotesService.sendQuote(id, sendQuoteDto);
  }

  @Post(':id/view')
  @Public() // Endpoint public pour le tracking de visualisation
  @HttpCode(HttpStatus.OK)
  async markAsViewed(@Param('id', ParseIntPipe) id: number) {
    return this.quotesService.markAsViewed(id);
  }

  @Post(':id/accept')
  async acceptQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() acceptQuoteDto: AcceptQuoteDto,
  ) {
    return this.quotesService.acceptQuote(id, acceptQuoteDto);
  }

  @Post(':id/reject')
  async rejectQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() rejectQuoteDto: RejectQuoteDto,
  ) {
    return this.quotesService.rejectQuote(id, rejectQuoteDto);
  }

  @Post(':id/cancel')
  async cancelQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() cancelData: { reason?: string },
  ) {
    return this.quotesService.cancelQuote(id, cancelData.reason);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.userId || req.user?.id || 1;
    return this.quotesService.duplicate(id, userId);
  }

  /**
   * 🗑️ Archiver une cotation (soft delete)
   */
  @Patch(':id/archive')
  async archiveQuote(
    @Param('id', ParseIntPipe) id: number,
    @Body() archiveData: { reason: string },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id || 1;
    return this.quotesService.archiveQuote(id, archiveData.reason, userId);
  }

  /**
   * ♻️ Restaurer une cotation archivée
   */
  @Patch(':id/restore')
  async restoreQuote(@Param('id', ParseIntPipe) id: number) {
    return this.quotesService.restoreQuote(id);
  }

  /**
   * 📋 Récupérer les cotations archivées
   */
  @Get('archived/all')
  async findAllArchived(@Query() filters: QuoteFilterDto) {
    return this.quotesService.findAllArchived(filters);
  }
}
