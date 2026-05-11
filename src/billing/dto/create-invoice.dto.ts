import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  patient_id: string;

  @IsNumber()
  @IsPositive()
  total_amount: number;

  @IsOptional()
  @IsString()
  service_description?: string;
}
