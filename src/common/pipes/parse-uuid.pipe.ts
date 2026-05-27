import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Validates that a route parameter is a valid UUID v4.
 * Usage: @Param('id', ParseUuidPipe) id: string
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  private readonly uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  transform(value: string): string {
    if (!this.uuidRegex.test(value)) {
      throw new BadRequestException(
        `"${value}" is not a valid UUID`,
      );
    }
    return value;
  }
}
