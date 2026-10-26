import { Module } from '@nestjs/common';
import { RouteRecipientController } from './route-recipient.controller';
import { RouteRecipientService } from './route-recipient.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [RouteRecipientController],
  providers: [RouteRecipientService],
})
export class RouteSheetModule {}
