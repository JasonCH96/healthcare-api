import { Module } from '@nestjs/common';
import { TimeBlocksController } from './time-blocks.controller.js';
import { TimeBlocksService } from './time-blocks.service.js';

@Module({
  controllers: [TimeBlocksController],
  providers: [TimeBlocksService],
})
export class TimeBlocksModule {}
