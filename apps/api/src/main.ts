import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )

  app.useWebSocketAdapter(new IoAdapter(app))

  app.setGlobalPrefix('api/v1', {
    // Health endpoints live at root without prefix
    exclude: ['healthz', 'readyz'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const port = process.env['PORT'] ?? 6201
  await app.listen(port, '0.0.0.0')
  console.log(`API running on port ${port}`)
}

bootstrap()
