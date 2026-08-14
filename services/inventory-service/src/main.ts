import 'reflect-metadata';
import { Body, Controller, Get, Module, Param, Post, Put, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsPositive, IsString, ValidateNested } from 'class-validator';
import { InventoryItem, Reservation } from './inventory.entities';
import { InventoryService } from './inventory.service';

const operation = (summary: string) => ({ summary, responses: { '200': { description: 'Successful response' } } });

class QuantityDto { @IsInt() @IsPositive() quantity!: number; }
class ReserveItemDto {
  @IsString() sku!: string;
  @IsInt() @IsPositive() quantity!: number;
}
class ReserveDto {
  @IsString() orderId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ReserveItemDto) items!: ReserveItemDto[];
}

@Controller()
class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get('health') health() { return { status: 'ok', service: 'inventory-service' }; }
  @Get() list() { return this.inventory.list(); }
  @Put(':sku') set(@Param('sku') sku: string, @Body() input: QuantityDto) { return this.inventory.setStock(sku, input.quantity); }
  @Post('reservations') reserve(@Body() input: ReserveDto) { return this.inventory.reserve(input); }
  @Post('reservations/:orderId/release') release(@Param('orderId') orderId: string) { return this.inventory.release(orderId); }
  @Get('openapi.json') openapi() { return { openapi: '3.1.0', info: { title: 'Inventory Service', version: '1.0.0' }, paths: { '/': { get: operation('List stock') }, '/{sku}': { put: operation('Set available stock') }, '/reservations': { post: operation('Reserve stock for an order') }, '/reservations/{orderId}/release': { post: operation('Release an order reservation') } } }; }
}

@Module({ imports: [TypeOrmModule.forRoot({ type: 'postgres', url: process.env.DATABASE_URL ?? 'postgres://commerce:commerce@localhost:5435/inventory', entities: [InventoryItem, Reservation], synchronize: true }), TypeOrmModule.forFeature([InventoryItem, Reservation])], controllers: [InventoryController], providers: [InventoryService] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? 3004));
}
void bootstrap();
