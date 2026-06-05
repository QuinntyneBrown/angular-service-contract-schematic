# Angular Service Contract Schematic

Generates an Angular service using the normal Angular CLI service schematic, then adds a matching contract file beside it.

For:

```bash
ng generate angular-service-contract-schematic:service foo
```

The schematic creates:

```text
foo.service.ts
foo.service.contract.ts
```

The contract file contains:

```ts
import { InjectionToken } from '@angular/core';

export interface IFooService {
  // Define the public API for FooService here.
}

export const FOO_SERVICE = new InjectionToken<IFooService>('FOO_SERVICE');
```

The service is also patched to implement the generated interface:

```ts
import { Injectable } from '@angular/core';
import { IFooService } from './foo.service.contract';

@Injectable({
  providedIn: 'root',
})
export class FooService implements IFooService {
}
```

## Naming Rules

When no explicit `--type` is given and the name ends with one of the recognized
suffixes — `store`, `controller`, or `manager` — the suffix is used as the file
type instead of the default `service`, and it is dropped from the base name so it
is not repeated in the class name.

```bash
ng generate angular-service-contract-schematic:service FooStore
```

produces, instead of Angular's default `foo-store.service.ts` / `class FooStoreService`:

```text
foo.store.ts
foo.store.contract.ts
```

```ts
// foo.store.ts
export class FooStore implements IFooStore {
}

// foo.store.contract.ts
export interface IFooStore {
}

export const FOO_STORE = new InjectionToken<IFooStore>('FOO_STORE');
```

The same applies to `controller` (`BarController` -> `bar.controller.ts`, `class BarController`)
and `manager` (`BazManager` -> `baz.manager.ts`, `class BazManager`).

The suffix is only inferred when it sits on a word boundary, so a name like
`restore` is still generated as an ordinary `restore.service.ts`. Passing an
explicit `--type` always takes precedence and disables this inference.

## Build Locally

```bash
cd C:\projects\angular-service-contract-schematic
npm install
npm run build
```

## Use In An Angular Workspace

During local development:

```bash
cd C:\projects\angular-service-contract-schematic
npm link

cd C:\path\to\your-angular-workspace
npm link angular-service-contract-schematic
ng generate angular-service-contract-schematic:service foo
```

To make `ng generate service foo` use this schematic, add this to the target workspace `angular.json`:

```json
{
  "cli": {
    "schematicCollections": [
      "angular-service-contract-schematic",
      "@schematics/angular"
    ]
  }
}
```

After that:

```bash
ng generate service foo
```

will resolve `service` from this collection first.

## Options

The schematic forwards the usual service options to Angular's built-in service schematic:

```bash
ng g angular-service-contract-schematic:service admin/foo --project my-app --flat false --skip-tests
```

It also supports:

```bash
--contract-suffix contract
```

The default contract file suffix is `contract`, producing `foo.service.contract.ts`.
