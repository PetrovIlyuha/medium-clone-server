import { UserService } from './../user.service';
import { JWT_SECRET } from '@app/config';
import { verify } from 'jsonwebtoken';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { ExpressRequestInterface } from '../../types/expressRequest.interface';

interface JwtPayload {
  id: number;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly userService: UserService) {}
  async use(req: ExpressRequestInterface, res: Response, next: NextFunction) {
    if (!req.headers.authorization) {
      req.user = null;
      next();
      return;
    } else {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const { id } = verify(token, JWT_SECRET) as JwtPayload;
        const user = await this.userService.findById(id);
        req.user = user;
        next();
      } catch (error) {
        req.user = null;
        next();
      }
    }
  }
}
