import { Controller, Get } from '@nestjs/common';
import { TEMPLATE_CATALOG } from '@/infra/rendering/templates/catalog';

@Controller('api/templates')
export class TemplatesController {
  @Get()
  async getTemplates() {
    return TEMPLATE_CATALOG;
  }
}
