import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  ValidateNested,
  IsArray,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGynoRecordDto {
  @IsOptional()
  @IsDateString()
  last_menstrual_period?: string;

  @IsOptional()
  @IsDateString()
  estimated_due_date?: string;

  @IsOptional()
  @IsInt()
  gestational_weeks?: number;

  @IsOptional()
  @IsString()
  ultrasound_notes?: string;

  @IsOptional()
  @IsString()
  image_url?: string;
}

export class CreateDentalRecordDto {
  @IsInt()
  tooth_number: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  surface?: string;

  @IsOptional()
  @IsNumber()
  estimated_budget?: number;
}

export class CreateMedicalRecordDto {
  @IsUUID('4')
  patient_id: string;

  @IsUUID('4')
  doctor_id: string;

  @IsOptional()
  @IsUUID('4')
  appointment_id?: string;

  @IsOptional()
  @IsObject()
  vitals?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  treatment_plan?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateGynoRecordDto)
  gynoRecord?: CreateGynoRecordDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDentalRecordDto)
  dentalRecords?: CreateDentalRecordDto[];
}
