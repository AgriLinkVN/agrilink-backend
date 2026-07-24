import { readFileSync } from 'fs';
import { join } from 'path';

describe('storage architecture boundaries', () => {
  const source = readFileSync(join(__dirname, 'storage.service.ts'), 'utf8');

  it('does not depend on presentation or infrastructure modules', () => {
    expect(source).not.toMatch(/from ['"]\.\.\/(presentation|infrastructure)/);
  });

  it('depends on application storage ports', () => {
    expect(source).toContain("./ports/outbound/file-storage.port");
    expect(source).toContain("./ports/outbound/image-storage.port");
  });
});
