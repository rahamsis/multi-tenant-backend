import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DatabaseService } from 'src/database/database.service';
import { CloudinaryUtil } from 'src/util/cloudinary-util';
import { Util } from 'src/util/util';

@Module({
    controllers: [AdminController],
    providers: [
        AdminService, 
        DatabaseService, 
        CloudinaryUtil, 
        Util
    ],
    exports: [AdminService],
})
export class AdminModule { }
