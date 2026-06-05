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
