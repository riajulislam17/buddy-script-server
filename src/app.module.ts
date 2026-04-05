import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

import { DATABASE_MODELS } from './model';

// modules
import { AuthModule } from './modules/auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { PostsModule } from './modules/posts/posts.module';
import { ReactionsModule } from './modules/reactions/reactions.module';
import { UploadsModule } from './modules/uploads/uploads.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),

    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        database: configService.get<string>('database.name'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),

        models: DATABASE_MODELS,

        autoLoadModels: false,
        synchronize: true,

        logging: false,
        define: {
          underscored: false,
        },
      }),
    }),

    AuthModule,
    CommentsModule,
    PostsModule,
    ReactionsModule,
    UploadsModule,
  ],
})
export class AppModule {}
