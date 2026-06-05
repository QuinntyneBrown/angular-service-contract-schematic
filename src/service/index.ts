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
  interfaceName: string;
  tokenName: string;
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
  const symbolBase = buildSymbolBase(parsedName.name, options.type);

  return {
    path: join(directory, `${fileName}${typeSegment}.${contractSuffix}.ts`),
    interfaceName: `${symbolBase}Contract`,
    tokenName: constantName(symbolBase),
  };
}

function buildSymbolBase(name: string, type: string): string {
  const classifiedName = strings.classify(name);
  const classifiedType = strings.classify(type);

  if (!classifiedType || classifiedName.toLowerCase().endsWith(classifiedType.toLowerCase())) {
    return classifiedName;
  }

  return `${classifiedName}${classifiedType}`;
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
  // Define the public API for ${location.interfaceName.replace(/Contract$/, '')} here.
}

export const ${location.tokenName} = new InjectionToken<${location.interfaceName}>('${location.tokenName}');
`;
}

function withoutUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as T;
}
