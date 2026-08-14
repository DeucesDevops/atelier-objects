import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { User } from './user.entity';

type Credentials = { email: string; password: string; name?: string };

@Injectable()
export class AuthService {
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });

  constructor(@InjectRepository(User) private readonly users: Repository<User>, private readonly jwt: JwtService) {}

  async register(input: Credentials) {
    const email = input.email.toLowerCase().trim();
    if (await this.users.findOneBy({ email })) throw new ConflictException('Email is already registered');
    const user = await this.users.save(this.users.create({ email, name: input.name?.trim() || 'Shopper', passwordHash: await bcrypt.hash(input.password, 12) }));
    return this.issueToken(user);
  }

  async login(input: Credentials) {
    const user = await this.users.findOneBy({ email: input.email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new UnauthorizedException('Invalid email or password');
    return this.issueToken(user);
  }

  async profile(token: string) {
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; email: string; name: string }>(token);
      return { id: claims.sub, email: claims.email, name: claims.name };
    } catch { throw new UnauthorizedException('Invalid or expired token'); }
  }

  private async issueToken(user: User) {
    const accessToken = await this.jwt.signAsync({ email: user.email, name: user.name }, { subject: user.id });
    try {
      if (this.redis.status === 'wait') await this.redis.connect();
      await this.redis.set(`session:${user.id}`, 'active', 'EX', 3600);
    } catch { /* Redis sessions are an optimization; JWT remains authoritative locally. */ }
    return { accessToken, tokenType: 'Bearer', expiresIn: 3600, user: { id: user.id, email: user.email, name: user.name } };
  }
}
