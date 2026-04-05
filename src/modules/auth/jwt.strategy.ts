import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../../model/user.model';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request & { cookies?: Record<string, string> }) => {
          return request?.cookies?.accessToken || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userModel.findByPk(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      id: Number(user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    };
  }
}
