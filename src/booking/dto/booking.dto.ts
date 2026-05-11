import { IsString, IsNotEmpty, IsOptional, IsUUID, Matches } from 'class-validator';

export class BookingQueryDto {
  @IsUUID('4')
  clinic_id: string;

  @IsOptional()
  @IsUUID('4')
  service_id?: string;
}

export class AvailableSlotsQueryDto {
  @IsUUID('4')
  clinic_id: string;

  @IsOptional()
  @IsString()
  doctor_id?: string;

  @IsOptional()
  @IsUUID('4')
  service_id?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string; // YYYY-MM-DD
}

export class CreateBookingDto {
  @IsUUID('4')
  clinic_id: string;

  @IsUUID('4')
  service_id: string;

  @IsString()
  @IsNotEmpty()
  doctor_id: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string; // YYYY-MM-DD

  @Matches(/^\d{2}:\d{2}$/)
  time: string; // HH:mm

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  identification: string;

  @IsOptional()
  @IsString()
  whatsapp_phone?: string;
}
