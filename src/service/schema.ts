export interface Schema {
  name: string;
  project?: string;
  path?: string;
  flat?: boolean;
  skipTests?: boolean;
  type?: string;
  contractSuffix?: string;
}
