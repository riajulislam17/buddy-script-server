import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { User } from '../../model/user.model';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(User) private readonly userModel: typeof User,
  ) {}

  generateAccessToken(payload: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
  }): string {
    return this.jwtService.sign({
      sub: payload.id,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      avatarUrl: payload.avatarUrl,
    });
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userModel.findOne({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User already exists with this email');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    const user = await this.userModel.create({
      firstName: registerDto.firstName.trim(),
      lastName: registerDto.lastName.trim(),
      email: registerDto.email.toLowerCase().trim(),
      passwordHash,
      avatarUrl: null,
    } as unknown as User);

    return this.serializeUser(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.userModel.findOne({
      where: { email: loginDto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatched = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const serializedUser = this.serializeUser(user);
    const accessToken = this.generateAccessToken(serializedUser);

    return {
      user: serializedUser,
      accessToken,
    };
  }

  async updateProfile(userId: number, payload: UpdateProfileDto) {
    const user = await this.userModel.findByPk(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (typeof payload.firstName === 'string') {
      user.firstName = payload.firstName.trim();
    }

    if (typeof payload.lastName === 'string') {
      user.lastName = payload.lastName.trim();
    }

    if (typeof payload.avatarUrl === 'string') {
      user.avatarUrl = payload.avatarUrl.trim() || null;
    }

    await user.save();

    return this.serializeUser(user);
  }

  serializeUser(user: User) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
    };
  }
}
