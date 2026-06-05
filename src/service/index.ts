import { join, normalize, strings, workspaces } from '@angular-devkit/core';
import {
  chain,
  externalSchematic,
  Rule,
  SchematicsException,
  Tree,
} from '@angular-devkit/schematics';
import {
  buildDefaultPath,
  getWorkspace,
} from '@schematics/angular/utility/workspace';
import { parseName } from '@schematics/angular/utility/parse-name';
import { Schema } from './schema';

interface NormalizedSchema extends Schema {
  flat: boolean;
  skipTests: boolean;
  type: string;
  contractSuffix: string;
}

interface ContractLocation {
  path: string;
  servicePath: string;
  serviceClassName: string;
  interfaceName: string;
  tokenName: string;
  importPath: string;
}

export function service(options: Schema): Rule {
  const normalizedOptions = normalizeOptions(options);

  return chain([
    externalSchematic(
      '@schematics/angular',
      'service',
      buildAngularServiceOptions(normalizedOptions),
    ),
    createContractFile(normalizedOptions),
    implementContractInService(normalizedOptions),
  ]);
}

function createContractFile(options: NormalizedSchema): Rule {
  return async (tree: Tree) => {
    const workspace = await getWorkspace(tree);
    const project = getProject(workspace, options.project);
    const location = getContractLocation(project, options);

    if (tree.exists(location.path)) {
      throw new SchematicsException(`Contract file already exists: ${location.path}`);
    }

    tree.create(location.path, buildContractSource(location));

    return tree;
  };
}

function implementContractInService(options: NormalizedSchema): Rule {
  return async (tree: Tree) => {
    const workspace = await getWorkspace(tree);
    const project = getProject(workspace, options.project);
    const location = getContractLocation(project, options);

    if (!tree.exists(location.servicePath)) {
      throw new SchematicsException(`Service file does not exist: ${location.servicePath}`);
    }

    tree.overwrite(
      location.servicePath,
      addContractImplementation(tree.readText(location.servicePath), location),
    );

    return tree;
  };
}

function normalizeOptions(options: Schema): NormalizedSchema {
  return {
    ...options,
    flat: options.flat ?? true,
    skipTests: options.skipTests ?? false,
    type: options.type ?? 'service',
    contractSuffix: options.contractSuffix ?? 'contract',
  };
}

function buildAngularServiceOptions(options: NormalizedSchema): Record<string, unknown> {
  return withoutUndefinedValues({
    name: options.name,
    project: options.project,
    path: options.path,
    flat: options.flat,
    skipTests: options.skipTests,
    type: options.type,
  });
}

function getProject(
  workspace: workspaces.WorkspaceDefinition,
  projectName?: string,
): workspaces.ProjectDefinition {
  if (projectName) {
    const project = workspace.projects.get(projectName);

    if (!project) {
      throw new SchematicsException(`Project "${projectName}" does not exist.`);
    }

    return project;
  }

  const defaultProjectName = workspace.extensions['defaultProject'];

  if (typeof defaultProjectName === 'string') {
    const defaultProject = workspace.projects.get(defaultProjectName);

    if (defaultProject) {
      return defaultProject;
    }
  }

  if (workspace.projects.size === 1) {
    return Array.from(workspace.projects.values())[0];
  }

  throw new SchematicsException(
    'Project name is required when the workspace contains multiple projects.',
  );
}

function getContractLocation(
  project: workspaces.ProjectDefinition,
  options: NormalizedSchema,
): ContractLocation {
  const basePath = options.path ? normalize(options.path) : buildDefaultPath(project);
  const parsedName = parseName(basePath, options.name);
  const fileName = strings.dasherize(parsedName.name);
  const directory = options.flat ? parsedName.path : join(parsedName.path, fileName);
  const typeSegment = options.type ? `.${strings.dasherize(options.type)}` : '';
  const contractSuffix = strings.dasherize(options.contractSuffix);
  const contractBaseName = `${fileName}${typeSegment}.${contractSuffix}`;
  const serviceClassName = buildServiceClassName(parsedName.name, options.type);

  return {
    path: join(directory, `${contractBaseName}.ts`),
    servicePath: join(directory, `${fileName}${typeSegment}.ts`),
    serviceClassName,
    interfaceName: `I${serviceClassName}`,
    tokenName: constantName(serviceClassName),
    importPath: `./${contractBaseName}`,
  };
}

function buildServiceClassName(name: string, type: string): string {
  return `${strings.classify(name)}${strings.classify(type)}`;
}

function constantName(value: string): string {
  return strings
    .dasherize(value)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function buildContractSource(location: ContractLocation): string {
  return `import { InjectionToken } from '@angular/core';

export interface ${location.interfaceName} {
  // Define the public API for ${location.interfaceName.replace(/^I/, '')} here.
}

export const ${location.tokenName} = new InjectionToken<${location.interfaceName}>('${location.tokenName}');
`;
}

function addContractImplementation(source: string, location: ContractLocation): string {
  const withImport = addContractImport(source, location);
  const classDeclaration = new RegExp(
    `export\\s+class\\s+${escapeRegExp(location.serviceClassName)}(?:\\s+implements\\s+([^\\{]+?))?\\s*\\{`,
  );
  const match = withImport.match(classDeclaration);

  if (!match) {
    throw new SchematicsException(
      `Could not find service class "${location.serviceClassName}" in ${location.servicePath}.`,
    );
  }

  const implementedTypes = match[1]
    ?.split(',')
    .map((implementedType) => implementedType.trim())
    .filter(Boolean) ?? [];

  if (implementedTypes.includes(location.interfaceName)) {
    return withImport;
  }

  const implementsClause =
    implementedTypes.length > 0
      ? `implements ${[...implementedTypes, location.interfaceName].join(', ')}`
      : `implements ${location.interfaceName}`;

  return withImport.replace(
    classDeclaration,
    `export class ${location.serviceClassName} ${implementsClause} {`,
  );
}

function addContractImport(source: string, location: ContractLocation): string {
  const importStatement = `import { ${location.interfaceName} } from '${location.importPath}';`;

  if (source.includes(importStatement)) {
    return source;
  }

  const endOfLine = source.includes('\r\n') ? '\r\n' : '\n';
  const importMatches = Array.from(source.matchAll(/^import .+;\r?\n/gm));

  if (importMatches.length === 0) {
    return `${importStatement}${endOfLine}${source}`;
  }

  const lastImport = importMatches[importMatches.length - 1];
  const insertionIndex = lastImport.index! + lastImport[0].length;

  return `${source.slice(0, insertionIndex)}${importStatement}${endOfLine}${source.slice(insertionIndex)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function withoutUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}
