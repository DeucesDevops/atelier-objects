import 'reflect-metadata';
import { Body, Controller, Get, Headers, Module, Param, Patch, Post, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNumber, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Order } from './order.entity';
import { OrderService } from './order.service';

const operation = (summary: string) => ({ summary, responses: { '200': { description: 'Successful response' } } });

class OrderItemDto {
  @IsString() sku!: string;
  @IsInt() @IsPositive() quantity!: number;
  @IsNumber() @IsPositive() unitPrice!: number;
}
class CreateOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
  @IsString() paymentMethod!: string;
}
class StatusDto { @IsIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED']) status!: Order['status']; }

@Controller()
class OrderController {
  constructor(private readonly orders: OrderService, private readonly jwt: JwtService) {}
  @Get('health') health() { return { status: 'ok', service: 'order-service' }; }
  @Get('openapi.json') openapi() { return { openapi: '3.1.0', info: { title: 'Order Service', version: '1.0.0' }, paths: { '/': { get: operation('List current shopper orders'), post: operation('Create and complete an order') }, '/{id}': { get: operation('Get an order') }, '/{id}/status': { patch: operation('Update order status') }, '/{id}/cancel': { post: operation('Cancel and compensate an order') } } }; }
  @Get() list(@Headers('authorization') auth?: string) { return this.orders.list(this.identity(auth).sub); }
  @Get(':id') get(@Param('id') id: string, @Headers('authorization') auth?: string) { return this.orders.get(id, this.identity(auth).sub); }
  @Post() create(@Headers('authorization') auth: string | undefined, @Body() input: CreateOrderDto) { const identity = this.identity(auth); return this.orders.create({ ...input, userId: identity.sub, customerEmail: identity.email }); }
  @Patch(':id/status') update(@Param('id') id: string, @Headers('authorization') auth: string | undefined, @Body() input: StatusDto) { return this.orders.updateStatus(id, this.identity(auth).sub, input.status); }
  @Post(':id/cancel') cancel(@Param('id') id: string, @Headers('authorization') auth?: string) { return this.orders.cancel(id, this.identity(auth).sub); }
  private identity(auth?: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Bearer token required');
    try { return this.jwt.verify<{ sub: string; email: string }>(auth.slice(7)); } catch { throw new UnauthorizedException('Invalid or expired token'); }
  }
}

@Module({ imports: [HttpModule, JwtModule.register({ secret: process.env.JWT_SECRET ?? 'local-development-secret-change-me' }), TypeOrmModule.forRoot({ type: 'postgres', url: process.env.DATABASE_URL ?? 'postgres://commerce:commerce@localhost:5436/orders', entities: [Order], synchronize: true }), TypeOrmModule.forFeature([Order])], controllers: [OrderController], providers: [OrderService] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? 3003));
}
void bootstrap();
