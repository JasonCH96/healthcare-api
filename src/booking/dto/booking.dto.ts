import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BookingQueryDto {
  @IsString()
  @IsNotEmpty()
  clinic_id: string;

  @IsOptional()
  @IsString()
  service_id?: string;
}

export class AvailableSlotsQueryDto {
  @IsString()
  @IsNotEmpty()
  clinic_id: string;

  @IsOptional()
  @IsString()
  doctor_id?: string;

  @IsOptional()
  @IsString()
  service_id?: string;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  clinic_id: string;

  @IsString()
  @IsNotEmpty()
  service_id: string;

  @IsString()
  @IsNotEmpty()
  doctor_id: string;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
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
