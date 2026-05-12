import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNotEmpty,
  MinLength,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

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
