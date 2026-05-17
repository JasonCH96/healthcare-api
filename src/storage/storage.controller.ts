import {
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TenantClinicId } from '../common/decorators/tenant-clinic-id.decorator.js';
import { StorageService } from './storage.service.js';

@Controller('storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @TenantClinicId() clinicId: string,
    @UploadedFiles() files: Array<{
      originalname: string;
      buffer: Buffer;
      mimetype: string;
    }>,
  ) {
    const uploaded = await Promise.all(
      (files ?? []).map(async (file) => {
        const key = await this.storageService.uploadFile(
          clinicId,
          `${Date.now()}-${file.originalname}`,
          file.buffer,
          file.mimetype,
        );

        return {
          key,
          filename: file.originalname,
          contentType: file.mimetype,
        };
      }),
    );

    return { files: uploaded };
  }
}
