import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class UpdateInvoiceDto {
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
}
