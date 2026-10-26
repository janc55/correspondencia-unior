import { Module } from '@nestjs/common';
import { CorrespondenceController } from './correspondence.controller';
import { CorrespondenceService } from './correspondence.service';
import { TrackingModule } from '../tracking/tracking.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TrackingModule, NotificationsModule],
  controllers: [CorrespondenceController],
  providers: [CorrespondenceService],
  exports: [CorrespondenceService],
})
export class CorrespondenceModule {}
