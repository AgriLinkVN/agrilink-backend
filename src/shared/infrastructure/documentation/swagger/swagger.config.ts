import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Edura API')
  .setDescription('API documentation')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Auth', 'Authentication endpoints')
  .addTag('Users', 'User management endpoints')
  .addTag('Health', 'Health check endpoints')
  .addTag('Course', 'Course management endpoints')
  .addTag('Grades', 'Grade management endpoints')
  .addTag('Subjects', 'Subject management endpoints')
  .addTag('Lesson', 'Lesson management endpoints')
  .addTag('Resource', 'Resource management endpoints')
  .addTag('Enrollment', 'Enrollment management endpoints')
  .build();
