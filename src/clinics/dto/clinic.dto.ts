import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNotEmpty,
  MinLength,
  ValidateNested,
  Matches,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CLINIC_TYPES, SPECIALTY_MODULES } from '../clinic-types.js';

export class InitialAdminDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class CreateClinicDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @IsIn(CLINIC_TYPES)
  clinic_type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(SPECIALTY_MODULES, { each: true })
  specialty_modules?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsString()
  tax_id: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  logo_path?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  public_phone?: string;

  @IsOptional()
  @IsEmail()
  public_email?: string;

  @IsOptional()
  @IsString()
  theme_color?: string;

  @IsOptional()
  @IsBoolean()
  booking_enabled?: boolean;

  @IsOptional()
  @IsString()
  hacienda_api_key?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InitialAdminDto)
  initial_admin?: InitialAdminDto;
}

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(CLINIC_TYPES)
  clinic_type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(SPECIALTY_MODULES, { each: true })
  specialty_modules?: string[];

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  logo_path?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  public_phone?: string;

  @IsOptional()
  @IsEmail()
  public_email?: string;

  @IsOptional()
  @IsString()
  theme_color?: string;

  @IsOptional()
  @IsBoolean()
  booking_enabled?: boolean;

  @IsOptional()
  @IsString()
  hacienda_api_key?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
