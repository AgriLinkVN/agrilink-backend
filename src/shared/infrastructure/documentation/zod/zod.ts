import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z as baseZod } from 'zod';

extendZodWithOpenApi(baseZod);

export const z: typeof baseZod = baseZod;
