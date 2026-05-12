import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { SkipTenant } from '../common/decorators/skip-tenant.decorator.js';
import { BookingService } from './booking.service.js';
import {
  BookingQueryDto,
  AvailableSlotsQueryDto,
  CreateBookingDto,
} from './dto/booking.dto.js';

@Controller('booking')
@SkipTenant()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('services')
  getServices(@Query() query: BookingQueryDto) {
    return this.bookingService.getServices(query.clinic_id, query.clinic_slug);
  }

  @Get('doctors')
  getDoctors(@Query() query: BookingQueryDto) {
    return this.bookingService.getDoctors(
      query.clinic_id,
      query.clinic_slug,
      query.service_id,
    );
  }

  @Get('available-slots')
  getAvailableSlots(@Query() query: AvailableSlotsQueryDto) {
    return this.bookingService.getAvailableSlots(
      query.clinic_id,
      query.clinic_slug,
      query.date,
      query.doctor_id,
      query.service_id,
    );
  }

  @Post('appointments')
  createAppointment(@Body() dto: CreateBookingDto) {
    return this.bookingService.createAppointment(dto);
  }
}
