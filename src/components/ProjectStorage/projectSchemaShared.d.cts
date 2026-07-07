declare const sharedSchema: {
  boolType(dialect: string): string
  jsonType(dialect: string): string
  documentContentType(dialect: string): string
  createProjectCoreSchemaSql(options: { json: string; includeDeviceBindings?: boolean }): string[]
  createProjectLifecycleSchemaSql(options: { json: string }): string[]
  createProjectAssetSchemaSql(options: { boolean: string; json: string }): string[]
  createProjectAssetSchemaIndexes(): string[]
  createProjectDocumentSchemaSql(options: { documentContent: string; json: string }): string[]
  createProjectDocumentSchemaIndexes(options?: { extended?: boolean }): string[]
  createProjectSchemaSql(
    dialect: string,
    options?: { includeDeviceBindings?: boolean; extendedDocumentIndexes?: boolean },
  ): string[]
}

export = sharedSchema
