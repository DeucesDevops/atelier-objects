import 'reflect-metadata';
import { Body, Controller, Delete, Get, HttpCode, Module, Param, Patch, Post, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PartialType } from '@nestjs/mapped-types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';
import { CatalogService } from './catalog.service';
import { Product } from './product.entity';

const operation = (summary: string) => ({ summary, responses: { '200': { description: 'Successful response' } } });

class CreateProductDto {
  @IsString() @MinLength(2) sku!: string;
  @IsString() @MinLength(2) name!: string;
  @IsString() description!: string;
  @IsNumber() @IsPositive() price!: number;
  @IsBoolean() active!: boolean;
}
class UpdateProductDto extends PartialType(CreateProductDto) {}

@Controller()
class CatalogController {
  constructor(private readonly catalog: CatalogService) {}
  @Get('health') health() { return { status: 'ok', service: 'catalog-service' }; }
  @Get('products') list() { return this.catalog.list(); }
  @Get('products/:id') get(@Param('id') id: string) { return this.catalog.get(id); }
  @Post('products') create(@Body() input: CreateProductDto) { return this.catalog.create(input); }
  @Patch('products/:id') update(@Param('id') id: string, @Body() input: UpdateProductDto) { return this.catalog.update(id, input); }
  @Delete('products/:id') @HttpCode(204) remove(@Param('id') id: string) { return this.catalog.remove(id); }
  @Get('openapi.json') openapi() { return { openapi: '3.1.0', info: { title: 'Catalog Service', version: '1.0.0' }, paths: { '/products': { get: operation('List products'), post: operation('Create a product') }, '/products/{id}': { get: operation('Get a product'), patch: operation('Update a product'), delete: operation('Delete a product') } } }; }
}

@Module({ imports: [TypeOrmModule.forRoot({ type: 'postgres', url: process.env.DATABASE_URL ?? 'postgres://commerce:commerce@localhost:5434/catalog', entities: [Product], synchronize: true }), TypeOrmModule.forFeature([Product])], controllers: [CatalogController], providers: [CatalogService] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule); app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(Number(process.env.PORT ?? 3002));
}
void bootstrap();
