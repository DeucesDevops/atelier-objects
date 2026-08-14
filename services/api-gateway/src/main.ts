import 'reflect-metadata';
import { All, Controller, Get, Module, Req, Res } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { NestFactory } from '@nestjs/core';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

const operation = (summary: string) => ({ summary, responses: { '200': { description: 'Successful response' } } });

const routes: Record<string, string> = {
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
  catalog: process.env.CATALOG_SERVICE_URL ?? 'http://localhost:3002',
  orders: process.env.ORDER_SERVICE_URL ?? 'http://localhost:3003',
  inventory: process.env.INVENTORY_SERVICE_URL ?? 'http://localhost:3004',
  payments: process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:8085',
  notifications: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:8001',
  analytics: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:8002'
};

@Controller()
class GatewayController {
  constructor(private readonly http: HttpService) {}

  @Get('health')
  health() { return { status: 'ok', service: 'api-gateway' }; }

  @Get('openapi.json')
  openapi() { return { openapi: '3.1.0', info: { title: 'Commerce API Gateway', version: '1.0.0' }, paths: { '/health': { get: operation('Gateway liveness check') }, '/api/{service}/{path}': { get: { ...operation('Proxy a request to a commerce service'), parameters: [{ name: 'service', in: 'path', required: true, schema: { type: 'string' } }, { name: 'path', in: 'path', required: true, schema: { type: 'string' } }] } } } }; }

  @All('api/:service/*path')
  async proxy(@Req() req: Request, @Res() res: Response): Promise<void> {
    const service = Array.isArray(req.params.service) ? req.params.service[0] : req.params.service;
    const baseUrl = routes[service];
    if (!baseUrl) { res.status(404).json({ message: `Unknown service: ${service}` }); return; }
    const suffix = Array.isArray(req.params.path) ? req.params.path.join('/') : (req.params.path ?? '');
    try {
      const upstream = await firstValueFrom(this.http.request({
        method: req.method,
        url: `${baseUrl}/${suffix}`,
        params: req.query,
        data: req.body,
        headers: { authorization: req.headers.authorization, 'content-type': req.headers['content-type'] },
        validateStatus: () => true
      }));
      res.status(upstream.status).send(upstream.data);
    } catch (error) {
      res.status(502).json({ message: 'Upstream service unavailable', service });
    }
  }
}

@Module({ imports: [HttpModule], controllers: [GatewayController] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(Number(process.env.PORT ?? 8080));
}
void bootstrap();
