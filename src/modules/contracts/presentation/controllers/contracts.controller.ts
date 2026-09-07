import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@common/enums';
import { ParseUuidPipe } from '@common/pipes/parse-uuid.pipe';
import { CommerceInputError } from '../../../commerce/application/errors/commerce-application.error';
import { mapCommerceApplicationError } from '../../../commerce/presentation/mappers/commerce-error.mapper';
import {
  CreateContractFromPurchaseRequestUseCase,
  CreatePurchaseRequestUseCase,
  GetContractUseCase,
  GetPurchaseRequestUseCase,
  ListMyContractsUseCase,
  ListPurchaseRequestsUseCase,
  SignContractUseCase,
  TransitionContractStatusUseCase,
  TransitionPurchaseRequestUseCase,
} from '../../application/use-cases/contract.use-cases';
import {
  CreateContractDto,
  CreatePurchaseRequestDto,
  TransitionContractDto,
  VersionedContractDto,
} from '../dto/contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth('access-token')
@Controller()
export class ContractsController {
  constructor(
    private readonly createRequest: CreatePurchaseRequestUseCase,
    private readonly getRequest: GetPurchaseRequestUseCase,
    private readonly listRequests: ListPurchaseRequestsUseCase,
    private readonly transitionRequest: TransitionPurchaseRequestUseCase,
    private readonly createContract: CreateContractFromPurchaseRequestUseCase,
    private readonly getContract: GetContractUseCase,
    private readonly listContracts: ListMyContractsUseCase,
    private readonly signContract: SignContractUseCase,
    private readonly transitionContract: TransitionContractStatusUseCase,
  ) {}

  @Post('purchase-requests')
  @Roles(UserRole.ENTERPRISE)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createPurchaseRequest(
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CreatePurchaseRequestDto,
  ) {
    return this.execute(() =>
      this.createRequest.execute(
        { id, role },
        {
          ...dto,
          productCategoryId: dto.productCategoryId ?? null,
          provinceId: dto.provinceId ?? null,
        },
        requireKey(key),
      ),
    );
  }

  @Get('purchase-requests/mine')
  @Roles(UserRole.ENTERPRISE)
  listPurchaseRequests(
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.execute(() => this.listRequests.execute({ id, role }));
  }

  @Get('purchase-requests/:id')
  getPurchaseRequest(
    @Param('id', ParseUuidPipe) requestId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.execute(() => this.getRequest.execute({ id, role }, requestId));
  }

  @Patch('purchase-requests/:id/close')
  @Roles(UserRole.ENTERPRISE)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  closePurchaseRequest(
    @Param('id', ParseUuidPipe) requestId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: VersionedContractDto,
  ) {
    return this.changeRequest(
      { id, role },
      requestId,
      'close',
      dto,
      key,
    );
  }

  @Patch('purchase-requests/:id/cancel')
  @Roles(UserRole.ENTERPRISE)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  cancelPurchaseRequest(
    @Param('id', ParseUuidPipe) requestId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: VersionedContractDto,
  ) {
    return this.changeRequest(
      { id, role },
      requestId,
      'cancel',
      dto,
      key,
    );
  }

  @Post('contracts/from-request')
  @Roles(UserRole.ENTERPRISE)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createFromRequest(
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: CreateContractDto,
  ) {
    return this.execute(() =>
      this.createContract.execute({ id, role }, dto, requireKey(key)),
    );
  }

  @Get('contracts/mine')
  listMyContracts(
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.execute(() => this.listContracts.execute({ id, role }));
  }

  @Get('contracts/:id')
  getOneContract(
    @Param('id', ParseUuidPipe) contractId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.execute(() => this.getContract.execute({ id, role }, contractId));
  }

  @Patch('contracts/:id/sign')
  @Roles(
    UserRole.ENTERPRISE,
    UserRole.FARMER,
    UserRole.COOPERATIVE,
    UserRole.SUPPLIER,
  )
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  sign(
    @Param('id', ParseUuidPipe) contractId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: VersionedContractDto,
  ) {
    return this.execute(() =>
      this.signContract.execute(
        { id, role },
        contractId,
        dto.expectedVersion,
        requireKey(key),
      ),
    );
  }

  @Patch('contracts/:id/status')
  @Roles(
    UserRole.ENTERPRISE,
    UserRole.FARMER,
    UserRole.COOPERATIVE,
    UserRole.SUPPLIER,
  )
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  transition(
    @Param('id', ParseUuidPipe) contractId: string,
    @CurrentUser('sub') id: string,
    @CurrentUser('role') role: UserRole,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: TransitionContractDto,
  ) {
    return this.execute(() =>
      this.transitionContract.execute(
        { id, role },
        {
          id: contractId,
          toStatus: dto.toStatus,
          expectedVersion: dto.expectedVersion,
        },
        requireKey(key),
      ),
    );
  }

  private changeRequest(
    actor: { id: string; role: UserRole },
    id: string,
    action: 'close' | 'cancel',
    dto: VersionedContractDto,
    key: string | undefined,
  ) {
    return this.execute(() =>
      this.transitionRequest.execute(
        { id: actor.id, role: actor.role },
        { id, action, expectedVersion: dto.expectedVersion },
        requireKey(key),
      ),
    );
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      return mapCommerceApplicationError(error);
    }
  }
}

function requireKey(value: string | undefined): string {
  const key = value?.trim();
  if (!key || key.length > 128) {
    throw new CommerceInputError('Idempotency-Key is required and at most 128 characters');
  }
  return key;
}
