import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsUUID('4')
  appointment_id?: string;

  @IsOptional()
  @IsString()
  service_description?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  total_amount?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsOptional()
  @IsString()
  payment_reference?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  paid_amount?: number;

  @IsOptional()
  @IsString()
  paid_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
