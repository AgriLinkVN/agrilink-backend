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

import { Public } from '@common/decorators/public.decorator';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ProductsService } from '@modules/products/application/products.service';
import { CreateProductDto } from '../schemas/create-product.dto';
import { ProductFilterDto } from '../schemas/product-filter.dto';
import { UpdateProductDto } from '../schemas/update-product.dto';
import { UpdateProductStatusDto } from '../schemas/update-product-status.dto';
import {
  CreateProductCertificationDto,
  VerifyProductCertificationDto,
} from '../schemas/product-certification.dto';
import { SellerType, UserRole } from '@common/enums';
import { Roles } from '@common/decorators/roles.decorator';
import { mapProductApplicationError } from '../mappers/product-error.mapper';
import {
  CreateProductCertificationInput,
  CreateProductInput,
  ProductFilterInput,
  UpdateProductInput,
  VerifyProductCertificationInput,
} from '../../application/models/product-input.model';

@ApiTags('Products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  private async execute<T>(operation: () => Promise<T> | T): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return mapProductApplicationError(error);
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo sản phẩm mới (seller)' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  create(
    @CurrentUser('sub') sellerId: string,
    @CurrentUser('sellerType') sellerType: SellerType | undefined,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateProductDto,
  ) {
    const input: CreateProductInput = dto;
    return this.execute(() =>
      this.productsService.create(sellerId, sellerType, role, input),
    );
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm + filter (public)' })
  findAll(
    @Query() filter: ProductFilterDto,
    @CurrentUser('sub') currentUserId?: string, // optional — guest không có
  ) {
    const input: ProductFilterInput = filter;
    return this.productsService.findAll(input, currentUserId);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Danh mục sản phẩm — root categories (public)' })
  findCategories() {
    return this.productsService.findCategories();
  }

  @Public()
  @Get('categories/tree')
  @ApiOperation({ summary: 'Cây danh mục sản phẩm 2 cấp (public)' })
  getCategoryTree() {
    return this.productsService.getCategoryTree();
  }

  @Get('me')
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Danh sách sản phẩm của seller đang đăng nhập' })
  findMine(
    @CurrentUser('sub') sellerId: string,
    @Query() filter: ProductFilterDto,
  ) {
    const input: ProductFilterInput = filter;
    return this.productsService.findMine(sellerId, input);
  }

  @Get('certifications/pending')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Danh sách chứng nhận sản phẩm đang chờ duyệt' })
  findPendingCertifications() {
    return this.productsService.findPendingCertifications();
  }

  @Patch('certifications/:certId/verify')
  @Roles(UserRole.ADMIN, UserRole.STATE_AGENCY)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Duyệt hoặc từ chối chứng nhận sản phẩm' })
  verifyCertification(
    @Param('certId', ParseUuidPipe) certId: string,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('role') reviewerRole: UserRole,
    @Body() dto: VerifyProductCertificationDto,
  ) {
    const input: VerifyProductCertificationInput = dto;
    return this.execute(() =>
      this.productsService.verifyCertification(
        certId,
        adminId,
        reviewerRole,
        input,
      ),
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết sản phẩm (public)' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy' })
  findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.execute(() => this.productsService.findOne(id));
  }

  @Patch(':id')
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật sản phẩm (chủ sở hữu)' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') sellerId: string,
    @Body() dto: UpdateProductDto,
  ) {
    const input: UpdateProductInput = dto;
    return this.execute(() => this.productsService.update(id, sellerId, input));
  }

  @Patch(':id/status')
  @Roles(
    UserRole.FARMER,
    UserRole.COOPERATIVE,
    UserRole.SUPPLIER,
    UserRole.ADMIN,
    UserRole.STATE_AGENCY,
  )
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Đổi trạng thái sản phẩm theo flow draft → pending → active → out_of_stock',
  })
  updateStatus(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @CurrentUser('role') actorRole: UserRole,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.execute(() =>
      this.productsService.updateStatus(id, actorId, actorRole, dto.status),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa sản phẩm (chủ sở hữu)' })
  remove(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('sub') sellerId: string,
  ) {
    return this.execute(() => this.productsService.remove(id, sellerId));
  }

  // ─── Images ───────────────────────────────────────────────────

  @Post(':id/images')
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thêm ảnh cho sản phẩm' })
  addImage(
    @Param('id', ParseUuidPipe) productId: string,
    @CurrentUser('sub') sellerId: string,
    @Body('imageUrl') imageUrl: string,
    @Body('isPrimary') isPrimary: boolean,
  ) {
    return this.execute(() =>
      this.productsService.addImage(productId, sellerId, imageUrl, isPrimary),
    );
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa ảnh sản phẩm' })
  removeImage(
    @Param('id', ParseUuidPipe) productId: string,
    @Param('imageId', ParseUuidPipe) imageId: string,
    @CurrentUser('sub') sellerId: string,
  ) {
    return this.execute(() =>
      this.productsService.removeImage(productId, imageId, sellerId),
    );
  }

  // ─── Certifications ───────────────────────────────────────────

  @Post(':id/certifications')
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thêm chứng nhận cho sản phẩm' })
  addCertification(
    @Param('id', ParseUuidPipe) productId: string,
    @CurrentUser('sub') sellerId: string,
    @Body() data: CreateProductCertificationDto,
  ) {
    const input: CreateProductCertificationInput = data;
    return this.execute(() =>
      this.productsService.addCertification(productId, sellerId, input),
    );
  }

  @Delete(':id/certifications/:certId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.FARMER, UserRole.COOPERATIVE, UserRole.SUPPLIER)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa chứng nhận sản phẩm' })
  removeCertification(
    @Param('id', ParseUuidPipe) productId: string,
    @Param('certId', ParseUuidPipe) certId: string,
    @CurrentUser('sub') sellerId: string,
  ) {
    return this.execute(() =>
      this.productsService.removeCertification(productId, certId, sellerId),
    );
  }
}
