import { join } from 'node:path';
import { Tree } from '@angular-devkit/schematics';
import {
  SchematicTestRunner,
  UnitTestTree,
} from '@angular-devkit/schematics/testing';

describe('service schematic', () => {
  const runner = new SchematicTestRunner(
    'angular-service-contract-schematic',
    join(__dirname, '../../collection.json'),
  );

  let tree: UnitTestTree;

  beforeEach(() => {
    tree = new UnitTestTree(Tree.empty());
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          version: 1,
          projects: {
            demo: {
              projectType: 'application',
              root: '',
              sourceRoot: 'src',
              prefix: 'app',
              architect: {},
            },
          },
        },
        null,
        2,
      ),
    );
    tree.create('/package.json', JSON.stringify({ dependencies: {} }, null, 2));
  });

  it('creates a service contract beside the generated service', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'foo',
        project: 'demo',
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/foo.service.ts');
    expect(result.files).toContain('/src/app/foo.service.contract.ts');

    const contract = result.readContent('/src/app/foo.service.contract.ts');

    expect(contract).toContain('export interface FooServiceContract');
    expect(contract).toContain('export const FOO_SERVICE');
    expect(contract).toContain(
      "new InjectionToken<FooServiceContract>('FOO_SERVICE')",
    );
  });

  it('creates the contract in the generated folder when flat is false', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'admin/foo',
        project: 'demo',
        flat: false,
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/admin/foo/foo.service.ts');
    expect(result.files).toContain('/src/app/admin/foo/foo.service.contract.ts');
  });
});

