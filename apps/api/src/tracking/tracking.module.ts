import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { PublicTrackingService } from './public-tracking.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [TrackingController],
  providers: [TrackingService, PublicTrackingService],
  exports: [TrackingService, PublicTrackingService],
})
export class TrackingModule {}
