import { AuthMiddleware } from './user/middlewares/auth.middleware';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { TagModule } from '@app/tag/tag.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { ArticleModule } from './article/article.module';
import { ProfileModule } from './profile/profile.module';
import { CommentModule } from './comment/comment.module';
import ormconfig from '@app/ormconfig';

@Module({
  imports: [
    TagModule,
    TypeOrmModule.forRoot(ormconfig),
    UserModule,
    ArticleModule,
    ProfileModule,
    CommentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
