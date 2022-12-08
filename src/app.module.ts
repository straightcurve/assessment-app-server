import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProctorGateway } from './proctor/proctor.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ProctorGateway],
})
export class AppModule {}
