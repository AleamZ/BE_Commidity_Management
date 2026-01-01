import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from './activityLog.entity';
import { ActivityLogService } from './activityLog.service';
import { ActivityLogRepository } from './activityLog.repository';
import { ActivityLogController } from './activityLog.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  providers: [ActivityLogService, ActivityLogRepository],
  controllers: [ActivityLogController],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
