import { FollowEntity } from './../profile/follow.entity';
import { FeedResponseInterface } from './types/feedResponse.interface';
import { UpdateArticleDto } from './dto/updateArtice.dto';
import { ArticleResponseInterface } from './types/articleResponse.interface';
import { CreateArticleDto } from './dto/createArticle.dto';
import { UserEntity } from './../user/user.entity';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ArticleEntity } from './article.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, getRepository, Repository } from 'typeorm';
import slugify from 'slugify';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly articleRepository: Repository<ArticleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FollowEntity)
    private readonly followRepository: Repository<FollowEntity>,
  ) {}

  async getAllPosts(
    currentUserId: number,
    query: any,
  ): Promise<FeedResponseInterface> {
    const queryBuilder = getRepository(ArticleEntity)
      .createQueryBuilder('articles')
      .leftJoinAndSelect('articles.author', 'author');

    queryBuilder.orderBy('articles.createdAt', 'DESC');
    let articlesCount = await queryBuilder.getCount();

    if (query.tag) {
      queryBuilder.andWhere('articles.tagList LIKE :tag', {
        tag: `%${query.tag}%`,
      });
    }

    if (query.favorited) {
      const author = await this.userRepository.findOne(
        { username: query.favorited },
        { relations: ['favorites'] },
      );
      const likesIds = author.favorites.map((el) => el.id);
      if (likesIds.length > 0) {
        queryBuilder.andWhere('articles.id IN (:...ids)', {
          ids: likesIds,
        });
      } else {
        queryBuilder.andWhere('1=0');
      }
    }

    if (query.author) {
      const author = await this.userRepository.findOne({
        username: query.author,
      });
      if (author) {
        queryBuilder.andWhere('articles.authorId = :id', { id: author.id });
      } else {
        throw new HttpException(
          'Provided Author username was not found.',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (query.limit) {
      queryBuilder.limit(query.limit);
    }
    if (query.offset) {
      queryBuilder.offset(query.offset);
    }

    let favoriteIds: number[] = [];
    if (currentUserId) {
      const currentUser = await this.userRepository.findOne(currentUserId, {
        relations: ['favorites'],
      });
      favoriteIds = currentUser.favorites.map((fav) => fav.id);
    }
    const articles = await queryBuilder.getMany();
    if (query.favorited || query.author || query.tag) {
      articlesCount = articles.length;
    }
    const articlesWithFavorites = articles.map((article) => {
      const isFavorited = favoriteIds.includes(article.id);
      return { ...article, favorited: isFavorited };
    });
    return { articles: articlesWithFavorites, articlesCount };
  }

  async getFeed(
    currentUserId: number,
    query: any,
  ): Promise<FeedResponseInterface> {
    const following = await this.followRepository.find({
      followerId: currentUserId,
    });
    if (!following.length) {
      return { articles: [], articlesCount: 0 };
    } else {
      const followingUserIds = following.map((follow) => follow.followingId);
      const queryBuilder = getRepository(ArticleEntity)
        .createQueryBuilder('articles')
        .leftJoinAndSelect('articles.author', 'author')
        .where('articles.authorId IN (:...ids)', { ids: followingUserIds });

      queryBuilder.orderBy('articles.createdAt', 'DESC');
      const articlesCount = await queryBuilder.getCount();

      if (query.limit) {
        queryBuilder.limit(query.limit);
      }
      if (query.offset) {
        queryBuilder.offset(query.offset);
      }
      const articles = await queryBuilder.getMany();
      return { articles, articlesCount };
    }
  }

  async getArticleBySlug(slug: string): Promise<ArticleEntity> {
    const article = await this.articleRepository.findOne({ slug });
    if (article) {
      return article;
    } else {
      throw new HttpException(
        'No article with given slug found.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  async getArticleFavoritedStatus(
    currentUserId: number,
    slug: string,
  ): Promise<boolean> {
    const article = await this.articleRepository.findOne({ slug });
    let favoriteIds: number[] = [];
    const currentUser = await this.userRepository.findOne(currentUserId, {
      relations: ['favorites'],
    });
    favoriteIds = currentUser.favorites.map((fav) => fav.id);
    const isFavorited = favoriteIds.includes(article.id);
    return isFavorited;
  }

  async createArticle(
    currentUser: UserEntity,
    createArticleDto: CreateArticleDto,
  ): Promise<ArticleEntity> {
    const article = new ArticleEntity();
    Object.assign(article, createArticleDto);
    if (!article.tagList) {
      article.tagList = [];
    }
    article.author = currentUser;
    article.slug = this.getSlug(createArticleDto.title);
    return await this.articleRepository.save(article);
  }

  async deleteArticleBySlug(
    slug: string,
    currenUserId: number,
  ): Promise<DeleteResult> {
    const articleToDelete = await this.articleRepository.findOne({ slug });
    if (!articleToDelete) {
      throw new HttpException(
        'Article was not found.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    } else if (articleToDelete.author.id !== currenUserId) {
      throw new HttpException(
        'You are not an author of an article!',
        HttpStatus.FORBIDDEN,
      );
    } else {
      return await this.articleRepository.delete({ slug });
    }
  }

  async updateArticle(
    currentUserId: number,
    slug: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleEntity> {
    const articleToUpdate = await this.articleRepository.findOne({ slug });
    if (!articleToUpdate) {
      throw new HttpException(
        'Article for update was not found.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    } else if (currentUserId !== articleToUpdate.author.id) {
      throw new HttpException(
        'You are not an author of this article',
        HttpStatus.FORBIDDEN,
      );
    } else {
      const updatedArticle = new ArticleEntity();
      Object.assign(updatedArticle, articleToUpdate, updateArticleDto);
      updatedArticle.slug = this.getSlug(updateArticleDto.title);
      return await this.articleRepository.save(updatedArticle);
    }
  }

  async addArticleToFavorites(
    slug: string,
    currentUserId: number,
  ): Promise<ArticleEntity> {
    const article = await this.articleRepository.findOne({ slug });
    const user = await this.userRepository.findOne(currentUserId, {
      relations: ['favorites'],
    });
    const isNotFavorited =
      user.favorites.findIndex((inFavs) => inFavs.id === article.id) === -1;
    if (isNotFavorited) {
      user.favorites.push(article);
      article.favoritesCount += 1;
      await this.userRepository.save(user);
      await this.articleRepository.save(article);
    }
    return article;
  }

  async removeArticleFromFavorites(
    slug: string,
    currentUserId: number,
  ): Promise<ArticleEntity> {
    const article = await this.articleRepository.findOne({ slug });
    const user = await this.userRepository.findOne(currentUserId, {
      relations: ['favorites'],
    });
    const articleIndex = user.favorites.findIndex(
      (inFavs) => inFavs.id === article.id,
    );
    if (articleIndex >= 0) {
      user.favorites.splice(articleIndex, 1);
      article.favoritesCount--;
      await this.userRepository.save(user);
      await this.articleRepository.save(article);
    }
    return article;
  }

  buildArticleResponse(article: ArticleEntity): ArticleResponseInterface {
    return { article };
  }

  private getSlug(title: string): string {
    return (
      slugify(title, { lower: true }) +
      '-' +
      ((Math.random() * Math.pow(36, 6)) | 0).toString(36)
    );
  }
}
