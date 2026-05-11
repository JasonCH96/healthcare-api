import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateTimeBlockDto {
  @IsUUID('4')
  doctor_id: string;

  @IsDateString()
  start_time: string; // ISO UTC datetime

  @IsDateString()
  end_time: string; // ISO UTC datetime

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TimeBlockQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  endDate?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  doctor_id?: string;
}
