import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION')?.trim() || 'us-east-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY')?.trim();
    const bucket = this.configService.get<string>('AWS_S3_BUCKET')?.trim();
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT')?.trim();

    this.enabled = Boolean(accessKeyId && secretAccessKey && bucket);

    this.s3 = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: false } : {}),
      ...(this.enabled
        ? {
            credentials: {
              accessKeyId: accessKeyId!,
              secretAccessKey: secretAccessKey!,
            },
          }
        : {}),
    });
    this.bucket = bucket || '';
  }

  async uploadFile(
    clinicId: string,
    filename: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    this.assertConfigured();
    const key = `${clinicId}/${filename}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    return key;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    this.assertConfigured();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, { expiresIn });
  }

  private assertConfigured() {
    if (!this.enabled) {
      throw new Error(
        'File storage is not configured. Define AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET and optionally AWS_S3_ENDPOINT before using uploads.',
      );
    }
  }
}
