import { IsString, IsNotEmpty, IsOptional, IsUUID, Matches } from 'class-validator';

export class BookingQueryDto {
  @IsOptional()
  @IsUUID('4')
  clinic_id?: string;

  @IsOptional()
  @IsString()
  clinic_slug?: string;

  @IsOptional()
  @IsString()
  service_id?: string;

  @IsOptional()
  @IsString()
  doctor_id?: string;
}

export class AvailableSlotsQueryDto {
  @IsOptional()
  @IsUUID('4')
  clinic_id?: string;

  @IsOptional()
  @IsString()
  clinic_slug?: string;

  @IsOptional()
  @IsString()
  doctor_id?: string;

  @IsOptional()
  @IsString()
  service_id?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string; // YYYY-MM-DD
}

export class CreateBookingDto {
  @IsOptional()
  @IsUUID('4')
  clinic_id?: string;

  @IsOptional()
  @IsString()
  clinic_slug?: string;

  @IsString()
  @IsNotEmpty()
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
  @Matches(/^\d{8}$/, {
    message: 'whatsapp_phone must contain exactly 8 digits',
  })
  whatsapp_phone?: string;
}
