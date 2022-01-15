import { UserType } from './userType';

export interface IUserResponse {
  user: UserType & { token: string };
}
