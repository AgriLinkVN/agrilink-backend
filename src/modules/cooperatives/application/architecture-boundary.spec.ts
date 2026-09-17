import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(path);
    return entry.isFile() && path.endsWith('.ts') && !path.endsWith('.spec.ts')
      ? [path]
      : [];
  });
}

describe('P3 application and domain architecture boundary', () => {
  it('does not import TypeORM, NestJS, HTTP, or infrastructure from application/domain', () => {
    const roots = [
      join(process.cwd(), 'src/modules/cooperatives/application'),
      join(process.cwd(), 'src/modules/cooperatives/domain'),
    ];
    const forbidden = ['typeorm', '@nestjs/', 'infrastructure/', 'http'];

    for (const file of roots.flatMap(collectTypeScriptFiles)) {
      const source = readFileSync(file, 'utf8').toLowerCase();
      for (const term of forbidden) {
        expect(source).not.toContain(term);
      }
    }
  });
});
