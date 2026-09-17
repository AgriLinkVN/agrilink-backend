import { Logger } from '@nestjs/common';

const logger = new Logger('NotificationRealtimeDelivery');

export function publishRealtimeBestEffort(
  event: string,
  publish: () => void,
): void {
  try {
    publish();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    logger.warn(
      `Realtime event ${event} failed after persistence; error=${errorName}`,
    );
  }
}
