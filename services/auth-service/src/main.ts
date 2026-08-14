import 'reflect-metadata';
import { Body, Controller, Get, Headers, Module, Post, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { User } from './user.entity';

const operation = (summary: string) => ({ summary, responses: { '200': { description: 'Successful response' } } });

class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @MinLength(2) name!: string;
}
class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
  @IsOptional() name?: string;
}

@Controller()
class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('health') health() { return { status: 'ok', service: 'auth-service' }; }
  @Post('register') register(@Body() input: RegisterDto) { return this.auth.register(input); }
  @Post('login') login(@Body() input: LoginDto) { return this.auth.login(input); }
  @Get('me') me(@Headers('authorization') authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    return this.auth.profile(authorization.slice(7));
  }
  @Get('openapi.json') openapi() { return { openapi: '3.1.0', info: { title: 'Auth Service', version: '1.0.0' }, paths: { '/register': { post: operation('Register a shopper') }, '/login': { post: operation('Issue an access token') }, '/me': { get: operation('Read the current profile') } } }; }
}

@Module({
  imports: [
    TypeOrmModule.forRoot({ type: 'postgres', url: process.env.DATABASE_URL ?? 'postgres://commerce:commerce@localhost:5433/auth', entities: [User], synchronize: true }),
    TypeOrmModule.forFeature([User]),
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'local-development-secret-change-me', signOptions: { expiresIn: '1h' } })
  ],
  controllers: [AuthController], providers: [AuthService]
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? 3001));
}
void bootstrap();
