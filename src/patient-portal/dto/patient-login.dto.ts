import { IsString, IsNotEmpty } from 'class-validator';

export class PatientLoginDto {
  @IsString()
  @IsNotEmpty()
  identification: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  clinic_id: string;
}
