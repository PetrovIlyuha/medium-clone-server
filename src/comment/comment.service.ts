import { CommentsResponseInterface } from './types/commentResponse.interface';
import { UserEntity } from './../user/user.entity';
import { CreateCommentDto } from './dto/createComment.dto';
import { CommentEntity } from './comment.entity';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleEntity } from '../article/article.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,

    @InjectRepository(ArticleEntity)
    private readonly articlesRepository: Repository<ArticleEntity>,
  ) {}

  async createComment(
    currentUserId: number,
    articleSlug: string,
    createCommentDto: CreateCommentDto,
  ): Promise<any> {
    const user = await this.usersRepository.findOne(currentUserId, {
      relations: ['comments'],
    });
    const article = await this.articlesRepository.findOne(
      {
        slug: articleSlug,
      },
      { relations: ['comments'] },
    );
    const errorResponse = {
      errors: {},
    };
    if (!user) {
      errorResponse.errors['user'] = 'User was not found';
      throw new HttpException(errorResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (!article) {
      errorResponse.errors['article'] = 'Article was not found';
      throw new HttpException(errorResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    const newComment = new CommentEntity();
    Object.assign(newComment, createCommentDto);
    newComment.author = user;
    newComment.article = article;
    user.comments.push(newComment);
    article.comments.push(newComment);
    await this.articlesRepository.save(article);
    await this.usersRepository.save(user);
    return this.commentRepository.save(newComment);
  }

  async getArticleComments(slug: string): Promise<CommentEntity[]> {
    const article = await this.articlesRepository.findOne(
      { slug },
      { relations: ['comments'] },
    );
    const errorResponse = {
      errors: {},
    };
    if (!article) {
      errorResponse.errors['article'] = 'Article was not found.';
      throw new HttpException(errorResponse, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    return article.comments;
  }

  buildCommentsResponse(comments: CommentEntity[]): CommentsResponseInterface {
    return { comments };
  }
}
