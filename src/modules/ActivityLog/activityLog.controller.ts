import { Controller, Get, Param } from '@nestjs/common';
import { ActivityLogService } from './activityLog.service';

@Controller('activity-logs')
export class ActivityLogController {
  constructor(private readonly service: ActivityLogService) {}

  @Get()
  getAllLogs() {
    return this.service.getAllLogs();
  }

  @Get(':id')
  getLogDetail(@Param('id') id: string) {
    return this.service.getLogDetail(id);
  }
}
