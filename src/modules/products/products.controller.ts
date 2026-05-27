import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new product listing' })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(
    @CurrentUser('sub') sellerId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(sellerId, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List and filter products (public)' })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  findAll(@Query() filter: ProductFilterDto) {
    return this.productsService.findAll(filter);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single product by ID (public)' })
  @ApiResponse({ status: 200, description: 'Product detail' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a product (owner only)' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') sellerId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, sellerId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete / archive a product (owner only)' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  remove(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') sellerId: string,
  ) {
    return this.productsService.remove(id, sellerId);
  }

  @Post(':id/images')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload an image for a product' })
  addImage(
    @Param('id', ParseUuidPipe) productId: string,
    @Body('imageUrl') imageUrl: string,
    @Body('isPrimary') isPrimary: boolean,
  ) {
    return this.productsService.addImage(productId, imageUrl, isPrimary);
  }

  @Post(':id/certifications')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a certification to a product' })
  addCertification(
    @Param('id', ParseUuidPipe) productId: string,
    @Body() data: any,
  ) {
    return this.productsService.addCertification(productId, data);
  }
}
