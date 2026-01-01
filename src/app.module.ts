import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from './modules/users/user.module';
import { BrandModule } from './modules/brands/brand.module';
import { CategoryModule } from './modules/categories/category.module';
import { ProductModule } from './modules/products/product.module';
import { OrderModule } from './modules/orders/order.module';
import { UploadModule } from './modules/upload/upload.module';
import { AdviseModule } from './modules/advise/advise.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ActivityLogModule } from './modules/ActivityLog/activityLog.module';
import { CustomerModule } from './modules/customers/customer.module';
import { AuthModule } from './modules/auth/auth.module';
import emailConfig from './config/email.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [emailConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    UserModule,
    BrandModule,
    CategoryModule,
    ProductModule,
    OrderModule,
    UploadModule,
    AdviseModule,
    DashboardModule,
    ActivityLogModule,
    CustomerModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
