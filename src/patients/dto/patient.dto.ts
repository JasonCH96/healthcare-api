import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender } from '@prisma/client';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsString()
  @IsNotEmpty()
  identification: string;

  @IsDateString()
  birth_date: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsString()
  whatsapp_phone?: string;

  @IsOptional()
  @IsObject()
  emergency_contact?: Record<string, unknown>;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  whatsapp_phone?: string;

  @IsOptional()
  @IsObject()
  emergency_contact?: Record<string, unknown>;
}

export class PatientQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
