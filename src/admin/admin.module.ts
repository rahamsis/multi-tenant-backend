import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DatabaseService } from 'src/database/database.service';

@Module({
    controllers: [AdminController],
    providers: [AdminService, DatabaseService],
})
export class AdminModule { }
