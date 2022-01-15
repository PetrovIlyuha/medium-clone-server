import { ArticleEntity } from './../article.entity';
export interface ArticleWithFavoritedField extends ArticleEntity {
  isFavorited: boolean;
}
