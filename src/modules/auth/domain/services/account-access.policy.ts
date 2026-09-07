import { UserStatus } from '../../../../common/enums';

export function canAuthenticate(status: UserStatus): boolean {
  return status !== UserStatus.LOCKED && status !== UserStatus.REJECTED;
}
