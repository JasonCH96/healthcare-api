import { IsString, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class CreateClinicDto {
  @IsString()
  name: string;

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
  hacienda_api_key?: string;
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
  hacienda_api_key?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
