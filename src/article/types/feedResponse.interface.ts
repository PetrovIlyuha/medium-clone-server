import { ArticleType } from './article.type';

export interface FeedResponseInterface {
  articles: ArticleType[];
  articlesCount: number;
}
