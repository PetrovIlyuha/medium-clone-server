import { CommentsResponseInterface } from './types/commentResponse.interface';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/createComment.dto';
import { AuthGuard } from './../user/guards/auth.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { User } from '../user/decorators/user.decorator';

@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get(':slug')
  async getArticleComments(
    @Param('slug') articleSlug: string,
  ): Promise<CommentsResponseInterface> {
    const comments = await this.commentService.getArticleComments(articleSlug);
    return this.commentService.buildCommentsResponse(comments);
  }

  @Post(':slug')
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe())
  async createComment(
    @User('id') currentUserId: number,
    @Param('slug') articleSlug: string,
    @Body('comment') createCommentDto: CreateCommentDto,
  ): Promise<any> {
    await this.commentService.createComment(
      currentUserId,
      articleSlug,
      createCommentDto,
    );
  }
}
