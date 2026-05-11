import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { TimeBlocksService } from './time-blocks.service.js';
import { CreateTimeBlockDto, TimeBlockQueryDto } from './dto/time-block.dto.js';

@Controller('time-blocks')
@UseGuards(JwtAuthGuard)
export class TimeBlocksController {
  constructor(private readonly timeBlocksService: TimeBlocksService) {}

  @Get()
  findAll(
    @TenantClinicId() clinicId: string,
    @Query() query: TimeBlockQueryDto,
  ) {
    return this.timeBlocksService.findAll(clinicId, query);
  }

  @Post()
  create(
    @TenantClinicId() clinicId: string,
    @Body() dto: CreateTimeBlockDto,
  ) {
    return this.timeBlocksService.create(clinicId, dto);
  }

  @Delete(':id')
  remove(
    @TenantClinicId() clinicId: string,
    @Param('id') id: string,
  ) {
    return this.timeBlocksService.remove(clinicId, id);
  }
}
