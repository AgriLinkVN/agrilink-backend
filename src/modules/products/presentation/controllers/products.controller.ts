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
  UseGuards, // TODO(P1): xóa khi JwtAuthGuard được đăng ký global trong AppModule
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '@common/decorators/public.decorator';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ProductsService } from '@modules/products/application/products.service';
import { CreateProductDto } from '../schemas/create-product.dto';
import { ProductFilterDto } from '../schemas/product-filter.dto';
import { UpdateProductDto } from '../schemas/update-product.dto';
import { SellerType, UserRole } from '@common/enums';
// TODO(P1): Xóa 3 dòng import dưới đây khi P1 đăng ký JwtAuthGuard + RolesGuard làm Global Guard
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';


@ApiTags('Products')
@ApiBearerAuth('access-token')
// TODO(P1): Xóa @UseGuards bên dưới khi guard đã được đăng ký toàn cục
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // ─── CRUD ─────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier) // TODO(P1): giữ lại @Roles, chỉ xóa @UseGuards ở class
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo sản phẩm mới (seller)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
  @CurrentUser('sub') sellerId: string,
  @CurrentUser('sellerType') sellerType: SellerType, // ← lấy từ JWT
  @Body() dto: CreateProductDto,
) {
  return this.productsService.create(sellerId, sellerType, dto);
}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm + filter (public)' })
  findAll( @Query() filter: ProductFilterDto,
    @CurrentUser('sub') currentUserId?: string, // optional — guest không có
  ) {
    return this.productsService.findAll(filter);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết sản phẩm (public)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier) // TODO(P1): giữ lại @Roles, chỉ xóa @UseGuards ở class
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật sản phẩm (chủ sở hữu)' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') sellerId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, sellerId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier) // TODO(P1): giữ lại @Roles, chỉ xóa @UseGuards ở class
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa sản phẩm (chủ sở hữu)' })
  remove(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') sellerId: string,
  ) {
    return this.productsService.remove(id, sellerId);
  }

  // ─── Images ───────────────────────────────────────────────────

  @Post(':id/images')
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier) // TODO(P1): giữ lại @Roles, chỉ xóa @UseGuards ở class
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thêm ảnh cho sản phẩm' })
  addImage(
    @Param('id', ParseUuidPipe) productId: string,
    @Body('imageUrl') imageUrl: string,
    @Body('isPrimary') isPrimary: boolean,
  ) {
    return this.productsService.addImage(productId, imageUrl, isPrimary);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier) // TODO(P1): giữ lại @Roles, chỉ xóa @UseGuards ở class
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa ảnh sản phẩm' })
  removeImage(
    @Param('id', ParseUuidPipe) productId: string,
    @Param('imageId', ParseUuidPipe) imageId: string,
  ) {
    return this.productsService.removeImage(productId, imageId);
  }

  // ─── Certifications ───────────────────────────────────────────

  @Post(':id/certifications')
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier) // TODO(P1): giữ lại @Roles, chỉ xóa @UseGuards ở class
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thêm chứng nhận cho sản phẩm' })
  addCertification(
    @Param('id', ParseUuidPipe) productId: string,
    @Body() data: any,
  ) {
    return this.productsService.addCertification(productId, data);
  }

  @Delete(':id/certifications/:certId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.farmer, UserRole.cooperative, UserRole.supplier) // TODO(P1): giữ lại @Roles, chỉ xóa @UseGuards ở class
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa chứng nhận sản phẩm' })
  removeCertification(
    @Param('id', ParseUuidPipe) productId: string,
    @Param('certId', ParseUuidPipe) certId: string,
  ) {
    return this.productsService.removeCertification(productId, certId);
  }
}