import { createZodDto } from 'nestjs-zod';
import { z } from '../../../../shared/infrastructure/documentation/zod/zod';

export const PresignSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .meta({
        example: 'documents/cccd-front.jpg',
        description: 'Đường dẫn file upload lên Supabase',
      }),
  })
  .meta({ id: 'PresignDto' });

export class PresignDto extends createZodDto(PresignSchema) {}