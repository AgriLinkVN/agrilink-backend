import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

/** All fields from CreateProductDto become optional */
export class UpdateProductDto extends PartialType(CreateProductDto) {}
