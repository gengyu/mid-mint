import "reflect-metadata";
import path from "path";
import { fileURLToPath } from "url";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadProjectEnv } from "@/lib/config/env";
import { resolveApiPort } from "@/lib/config/ports";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

loadProjectEnv(rootDir);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = resolveApiPort(process.env);
  await app.listen(port);
}

bootstrap();
