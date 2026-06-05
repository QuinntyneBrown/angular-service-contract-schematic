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

    expect(contract).toContain('export interface IFooService');
    expect(contract).toContain('export const FOO_SERVICE');
    expect(contract).toContain(
      "new InjectionToken<IFooService>('FOO_SERVICE')",
    );

    const service = result.readContent('/src/app/foo.service.ts');

    expect(service).toContain(
      "import { IFooService } from './foo.service.contract';",
    );
    expect(service).toContain('export class FooService implements IFooService');
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

    const service = result.readContent('/src/app/admin/foo/foo.service.ts');

    expect(service).toContain(
      "import { IFooService } from './foo.service.contract';",
    );
    expect(service).toContain('export class FooService implements IFooService');
  });

  it('infers the type from a name ending in store', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'FooStore',
        project: 'demo',
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/foo.store.ts');
    expect(result.files).toContain('/src/app/foo.store.contract.ts');
    expect(result.files).not.toContain('/src/app/foo-store.service.ts');

    const contract = result.readContent('/src/app/foo.store.contract.ts');

    expect(contract).toContain('export interface IFooStore');
    expect(contract).toContain('export const FOO_STORE');
    expect(contract).toContain("new InjectionToken<IFooStore>('FOO_STORE')");

    const service = result.readContent('/src/app/foo.store.ts');

    expect(service).toContain(
      "import { IFooStore } from './foo.store.contract';",
    );
    expect(service).toContain('export class FooStore implements IFooStore');
  });

  it('infers the type from a name ending in controller', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'BarController',
        project: 'demo',
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/bar.controller.ts');
    expect(result.files).toContain('/src/app/bar.controller.contract.ts');

    const service = result.readContent('/src/app/bar.controller.ts');

    expect(service).toContain(
      "import { IBarController } from './bar.controller.contract';",
    );
    expect(service).toContain(
      'export class BarController implements IBarController',
    );
  });

  it('infers the type from a name ending in manager', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'BazManager',
        project: 'demo',
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/baz.manager.ts');
    expect(result.files).toContain('/src/app/baz.manager.contract.ts');

    const service = result.readContent('/src/app/baz.manager.ts');

    expect(service).toContain(
      "import { IBazManager } from './baz.manager.contract';",
    );
    expect(service).toContain('export class BazManager implements IBazManager');
  });

  it('infers the type for a multi-word name within a folder', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'admin/userProfileStore',
        project: 'demo',
        flat: false,
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain(
      '/src/app/admin/user-profile/user-profile.store.ts',
    );
    expect(result.files).toContain(
      '/src/app/admin/user-profile/user-profile.store.contract.ts',
    );

    const service = result.readContent(
      '/src/app/admin/user-profile/user-profile.store.ts',
    );

    expect(service).toContain(
      'export class UserProfileStore implements IUserProfileStore',
    );
  });

  it('does not infer a type when the suffix is not on a word boundary', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'restore',
        project: 'demo',
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/restore.service.ts');
    expect(result.files).toContain('/src/app/restore.service.contract.ts');

    const service = result.readContent('/src/app/restore.service.ts');

    expect(service).toContain(
      'export class RestoreService implements IRestoreService',
    );
  });

  it('lets an explicit type take precedence over inference', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'widget',
        project: 'demo',
        type: 'store',
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/widget.store.ts');
    expect(result.files).toContain('/src/app/widget.store.contract.ts');

    const service = result.readContent('/src/app/widget.store.ts');

    expect(service).toContain(
      'export class WidgetStore implements IWidgetStore',
    );
  });

  it('does not infer a type when the name is only the suffix', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'store',
        project: 'demo',
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/store.service.ts');
    expect(result.files).toContain('/src/app/store.service.contract.ts');
    expect(result.files).not.toContain('/src/app/store.store.ts');

    const service = result.readContent('/src/app/store.service.ts');

    expect(service).toContain(
      'export class StoreService implements IStoreService',
    );
  });

  it('lets an explicit type disable inference on a name ending in store', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'FooStore',
        project: 'demo',
        type: 'controller',
        skipTests: true,
      },
      tree,
    );

    // An explicit type is used verbatim and the name is left intact, so the
    // suffix is NOT stripped: FooStore + controller -> foo-store.controller.
    expect(result.files).toContain('/src/app/foo-store.controller.ts');
    expect(result.files).toContain(
      '/src/app/foo-store.controller.contract.ts',
    );
    expect(result.files).not.toContain('/src/app/foo.store.ts');

    const service = result.readContent('/src/app/foo-store.controller.ts');

    expect(service).toContain(
      'export class FooStoreController implements IFooStoreController',
    );
  });

  it('uses a custom contractSuffix alongside an inferred type', async () => {
    const result = await runner.runSchematic(
      'service',
      {
        name: 'FooStore',
        project: 'demo',
        contractSuffix: 'types',
        skipTests: true,
      },
      tree,
    );

    expect(result.files).toContain('/src/app/foo.store.ts');
    expect(result.files).toContain('/src/app/foo.store.types.ts');
    expect(result.files).not.toContain('/src/app/foo.store.contract.ts');

    const contract = result.readContent('/src/app/foo.store.types.ts');

    expect(contract).toContain('export interface IFooStore');
    expect(contract).toContain('export const FOO_STORE');

    const service = result.readContent('/src/app/foo.store.ts');

    expect(service).toContain("import { IFooStore } from './foo.store.types';");
    expect(service).toContain('export class FooStore implements IFooStore');
  });
});
