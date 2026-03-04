import { CoolEps } from '@cool-midway/core';
import { Config, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * 构建文档
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class SwaggerBuilder {
  @Config('module.swagger.base')
  swaggerBase;

  @Inject()
  eps: CoolEps;

  json = {};

  @Config('cool.eps')
  epsConfig: boolean;

  private swaggerMetaCache?: {
    dtoSchemas: Record<string, any>;
    requestByRoute: Map<string, { schemaName: string; isArray: boolean }>;
    responseByRoute: Map<string, { schemaName: string; isArray: boolean }>;
  };

  /**
   * 初始化
   */
  async init() {
    if (this.epsConfig) {
      this.build();
    }
  }

  /**
   * 构建文档
   */
  async build() {
    const epsData = {
      app: this.eps.app || [],
      admin: this.eps.admin || [],
      module: this.eps.module || {},
    };
    this.json = this.convertToSwagger(epsData);
  }

  /**
   * Epss转换为Swagger
   * @param dataJson
   * @returns
   */
  convertToSwagger(dataJson) {
    const swagger = {
      ...this.swaggerBase,
      paths: {},
      tags: Object.keys(dataJson.module)
        .filter(item => item != 'swagger')
        .map(moduleKey => {
          return {
            key: moduleKey,
            name: dataJson.module[moduleKey].name || '',
            description: dataJson.module[moduleKey].description || '',
          };
        }),
    };
    const swaggerMeta = this.getSwaggerMeta();
    Object.entries(swaggerMeta.dtoSchemas).forEach(([name, schema]) => {
      if (!swagger.components.schemas[name]) {
        swagger.components.schemas[name] = schema;
      }
    });
    // 添加组件
    function addComponentSchemas(data) {
      if (_.isEmpty(data.name)) return;
      const schema = {
        type: 'object',
        properties: {},
        required: [],
      };

      data.columns.forEach(column => {
        const swaggerType = mapTypeToSwagger(column.type);
        schema.properties[column.propertyName] = {
          type: swaggerType,
          description: column.comment,
        };

        if (!column.nullable) {
          schema.required.push(column.propertyName);
        }
      });

      swagger.components.schemas[data.name] = schema;
      return data.name;
    }
    // 转换类型
    function mapTypeToSwagger(type) {
      const typeMapping = {
        string: 'string',
        number: 'number',
        bigint: 'integer',
        datetime: 'string', // assuming datetime is formatted as ISO8601 string
      };
      return typeMapping[type] || 'string';
    }
    // 添加请求体
    function addRequest(path, fullPath, schemas, data, method) {
      const routeKey = `${method} ${normalizeRoute(fullPath)}`;
      const requestMeta = swaggerMeta.requestByRoute.get(routeKey);
      const responseMeta = swaggerMeta.responseByRoute.get(routeKey);

      if (path == '/login') {
        const loginSchemaName = 'LoginDTO';
        const loginResponseName = 'LoginResponse';
        if (!swagger.components.schemas[loginSchemaName]) {
          swagger.components.schemas[loginSchemaName] = {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: '用户名',
              },
              password: {
                type: 'string',
                description: '密码',
              },
              captchaId: {
                type: 'string',
                description: '验证码ID',
              },
              verifyCode: {
                type: 'number',
                description: '验证码数字',
              },
            },
            required: ['username', 'password', 'captchaId', 'verifyCode'],
          };
        }

        if (!swagger.components.schemas[loginResponseName]) {
          swagger.components.schemas[loginResponseName] = {
            type: 'object',
            properties: {
              expire: {
                type: 'number',
                description: '过期时间(秒)',
              },
              token: {
                type: 'string',
                description: '访问token',
              },
              refreshExpire: {
                type: 'number',
                description: '刷新token过期时间(秒)',
              },
              refreshToken: {
                type: 'string',
                description: '刷新token',
              },
            },
            required: ['expire', 'token', 'refreshExpire', 'refreshToken'],
          };
        }

        data.requestBody = {
          description: '登录请求体',
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${loginSchemaName}`,
              },
            },
          },
        };
        data.responses = {
          '200': {
            description: '成功响应',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'integer',
                      description: '状态码',
                    },
                    message: {
                      type: 'string',
                      description: '响应消息',
                    },
                    data: {
                      $ref: `#/components/schemas/${loginResponseName}`,
                    },
                  },
                },
              },
            },
          },
        };
        return;
      }
      if (path == '/info' || path == '/list' || path == '/page') {
        if (path == '/info') {
          data.parameters = [
            {
              name: 'id',
              in: 'query',
              description: 'ID',
              required: true,
              schema: {
                type: 'integer',
              },
            },
          ];
        } else {
          data.requestBody = {
            description: '动态请求体',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties:
                    path == '/page'
                      ? {
                          page: {
                            type: 'integer',
                            description: '第几页',
                            default: 1,
                          },
                          size: {
                            type: 'integer',
                            description: '每页大小',
                            default: 20,
                          },
                        }
                      : {},
                },
              },
            },
          };
        }
        data.responses = {
          '200': {
            description: '成功响应',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'integer',
                      description: '状态码',
                    },
                    message: {
                      type: 'string',
                      description: '响应消息',
                    },
                    data: {
                      $ref: `#/components/schemas/${schemas}`,
                    },
                  },
                },
              },
            },
          },
        };
      }
      if (path == '/add' || path == '/update') {
        data.requestBody = {
          description: schemas,
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${schemas}`,
              },
            },
          },
        };
        data.responses = {
          '200': {
            description: '成功响应',
            content: {
              'application/json': {
                example: {
                  code: 1000,
                  message: 'success',
                  data: {
                    id: 6,
                  },
                },
              },
            },
          },
        };
      }
      if (path == '/delete') {
        data.requestBody = {
          description: schemas,
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ids: {
                    type: 'array',
                    description: 'ID数组',
                    items: {
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
        };
        data.responses = {
          '200': {
            description: '成功响应',
            content: {
              'application/json': {
                example: {
                  code: 1000,
                  message: 'success',
                },
              },
            },
          },
        };
      }

      if (requestMeta && shouldOverrideRequestBody(data.requestBody)) {
        data.requestBody = {
          description: requestMeta.schemaName,
          required: true,
          content: {
            'application/json': {
              schema: requestMeta.isArray
                ? {
                    type: 'array',
                    items: {
                      $ref: `#/components/schemas/${requestMeta.schemaName}`,
                    },
                  }
                : {
                    $ref: `#/components/schemas/${requestMeta.schemaName}`,
                  },
            },
          },
        };
      }

      const needsBody = ['post', 'put', 'patch'].includes(method);
      if (needsBody && _.isEmpty(data.requestBody)) {
        data.requestBody = {
          description: '请求体',
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {},
              },
            },
          },
        };
      }

      if (_.isEmpty(data.responses)) {
        // Fallback response for missing return type
        const responseDataSchema = {
          type: 'object',
          description: '响应数据',
        };
        
        data.responses = {
          '200': {
            description: '成功响应',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'integer',
                      description: '状态码',
                    },
                    message: {
                      type: 'string',
                      description: '响应消息',
                    },
                    data: responseDataSchema,
                  },
                },
              },
            },
          },
        };
      }
    }
    // 处理每个模块下的API接口
    function processModuleApis(moduleApis, moduleName) {
      moduleApis.forEach(module => {
        const schemas = addComponentSchemas({
          name: module.name,
          columns: module.columns,
        });
        if (Array.isArray(module.api)) {
          module.api.forEach(api => {
            const fullPath = `${api.prefix == '/' ? '' : api.prefix}${
              api.path
            }`;
            const method = api.method.toLowerCase();

            if (!swagger.paths[fullPath]) {
              swagger.paths[fullPath] = {};
            }

            swagger.paths[fullPath][method] = {
              summary:
                `【${module.info.type.description || module.info.type.name}】` +
                  api.summary || '',
              security: api.ignoreToken
                ? []
                : [
                    {
                      ApiKeyAuth: [],
                    },
                  ],
              tags: [moduleName || '其他'],
              requestBody:
                method == 'post'
                  ? {
                      description: '请求体',
                      required: true,
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {},
                          },
                        },
                      },
                    }
                  : {},
              responses: schemas
                ? {
                    '200': {
                      description: 'Success response',
                      content: {
                        'application/json': {
                          schema: {
                            $ref: `#/components/schemas/${schemas}`,
                          },
                        },
                      },
                    },
                  }
                : {},
            };
            addRequest(
              api.path,
              fullPath,
              schemas,
              swagger.paths[fullPath][method],
              method
            );
          });
        }
      });
    }

    // 遍历app和admin中的所有模块
    Object.keys(dataJson.app).forEach(moduleKey => {
      if (Array.isArray(dataJson.app[moduleKey])) {
        processModuleApis(
          dataJson.app[moduleKey],
          dataJson.module[moduleKey]?.name
        );
      }
    });
    Object.keys(dataJson.admin).forEach(moduleKey => {
      if (Array.isArray(dataJson.admin[moduleKey])) {
        processModuleApis(
          dataJson.admin[moduleKey],
          dataJson.module[moduleKey]?.name
        );
      }
    });

    return swagger;
  }

  private getSwaggerMeta() {
    if (this.swaggerMetaCache) return this.swaggerMetaCache;
    const dtoSchemas = this.loadDtoSchemas();
    const { requestByRoute, responseByRoute } = this.loadControllerRouteMeta(
      dtoSchemas
    );
    this.swaggerMetaCache = { dtoSchemas, requestByRoute, responseByRoute };
    return this.swaggerMetaCache;
  }

  private loadDtoSchemas() {
    const dtoSchemas: Record<string, any> = {};
    const srcRoot = path.join(process.cwd(), 'src');
    if (!fs.existsSync(srcRoot)) return dtoSchemas;
    const dtoFiles = this.collectFiles(srcRoot, filePath => {
      return (
        filePath.endsWith('.ts') &&
        !filePath.endsWith('.d.ts') &&
        filePath.includes(`${path.sep}dto${path.sep}`)
      );
    });

    dtoFiles.forEach(filePath => {
      const source = fs.readFileSync(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true
      );

      sourceFile.forEachChild(node => {
        if (!ts.isClassDeclaration(node) || !node.name) return;
        const className = node.name.text;
        const schema = {
          type: 'object',
          properties: {},
          required: [],
        };

        node.members.forEach(member => {
          if (!ts.isPropertyDeclaration(member) || !member.name) return;
          const propName = member.name.getText(sourceFile);
          const ruleInfo = this.getRuleInfo(member);
          const typeInfo = this.getTypeInfo(member);
          const swaggerSchema = this.inferSwaggerSchema(ruleInfo, typeInfo);
          const description = this.getJsDocComment(member) || '';

          schema.properties[propName] = {
            ...swaggerSchema,
            description,
          };

          if (ruleInfo.required) {
            schema.required.push(propName);
          }
        });

        if (!_.isEmpty(schema.properties)) {
          dtoSchemas[className] = schema;
        }
      });
    });

    return dtoSchemas;
  }

  private loadControllerRouteMeta(dtoSchemas: Record<string, any>) {
    const requestByRoute = new Map<
      string,
      { schemaName: string; isArray: boolean }
    >();
    const responseByRoute = new Map<
      string,
      { schemaName: string; isArray: boolean }
    >();
    const srcRoot = path.join(process.cwd(), 'src');
    if (!fs.existsSync(srcRoot)) {
      return { requestByRoute, responseByRoute };
    }

    const controllerFiles = this.collectFiles(srcRoot, filePath => {
      return (
        filePath.endsWith('.ts') &&
        !filePath.endsWith('.d.ts') &&
        filePath.includes(`${path.sep}controller${path.sep}`)
      );
    });

    controllerFiles.forEach(filePath => {
      const source = fs.readFileSync(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true
      );

      sourceFile.forEachChild(node => {
        if (!ts.isClassDeclaration(node)) return;
        const prefix =
          this.getControllerPrefix(node, sourceFile) ||
          this.inferPrefixFromPath(filePath);
        if (!prefix) return;
        const className = node.name ? node.name.text : '';

        node.members.forEach(member => {
          if (!ts.isMethodDeclaration(member) || !member.name) return;
          const methodDecorator = this.getHttpDecorator(member);
          if (!methodDecorator) return;

          const routePath = this.getDecoratorPath(methodDecorator, sourceFile);
          const httpMethod = methodDecorator.method;
          const fullPath = normalizeRoute(`${prefix}${routePath}`);
          const routeKey = `${httpMethod} ${fullPath}`;

          const bodyMeta = this.getBodyParamMeta(member, sourceFile);
          if (bodyMeta && dtoSchemas[bodyMeta.schemaName]) {
            requestByRoute.set(routeKey, bodyMeta);
          } else {
            const inlineMeta = this.getInlineBodyMeta(
              member,
              sourceFile,
              dtoSchemas,
              routeKey,
              className
            );
            if (inlineMeta) {
              requestByRoute.set(routeKey, inlineMeta);
            }
          }

          const returnMeta = this.getReturnTypeMeta(member, sourceFile);
          if (returnMeta && dtoSchemas[returnMeta.schemaName]) {
            responseByRoute.set(routeKey, returnMeta);
          }
        });
      });
    });

    return { requestByRoute, responseByRoute };
  }

  private getInlineBodyMeta(
    member: ts.MethodDeclaration,
    sourceFile: ts.SourceFile,
    dtoSchemas: Record<string, any>,
    routeKey: string,
    className: string
  ) {
    if (!member.parameters || member.parameters.length === 0) return null;
    const schema = {
      type: 'object',
      properties: {},
      required: [],
    };

    member.parameters.forEach(param => {
      const decorators = this.getDecorators(param);
      const bodyDecorator = decorators.find(decorator => {
        if (!ts.isCallExpression(decorator.expression)) return false;
        return decorator.expression.expression.getText(sourceFile) === 'Body';
      });
      if (!bodyDecorator || !ts.isCallExpression(bodyDecorator.expression)) {
        return;
      }
      const arg = bodyDecorator.expression.arguments[0];
      if (!arg || !ts.isStringLiteral(arg)) return;
      if (!param.type) return;

      const fieldName = arg.text;
      const typeInfo = this.getParamTypeInfo(param);
      if (!typeInfo) return;

      const swaggerType = this.mapTypeToSwagger(typeInfo.type);
      schema.properties[fieldName] = typeInfo.isArray
        ? {
            type: 'array',
            items: {
              type: swaggerType,
            },
          }
        : {
            type: swaggerType,
          };

      const isRequired = !param.questionToken && !param.initializer;
      if (isRequired) {
        schema.required.push(fieldName);
      }
    });

    if (_.isEmpty(schema.properties)) return null;
    if (_.isEmpty(schema.required)) {
      delete schema.required;
    }

    const safeKey = routeKey.replace(/[^a-zA-Z0-9]/g, '_');
    const nameParts = ['InlineBody', className, safeKey].filter(Boolean);
    const schemaName = nameParts.join('_').slice(0, 120);
    if (!dtoSchemas[schemaName]) {
      dtoSchemas[schemaName] = schema;
    }
    return { schemaName, isArray: false };
  }

  private getParamTypeInfo(param: ts.ParameterDeclaration) {
    const typeNode = param.type;
    if (!typeNode) return null;
    if (ts.isArrayTypeNode(typeNode)) {
      return {
        type: this.getTypeFromNode(typeNode.elementType),
        isArray: true,
      };
    }
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText();
      if (typeName === 'Array' && typeNode.typeArguments?.length) {
        return {
          type: this.getTypeFromNode(typeNode.typeArguments[0]),
          isArray: true,
        };
      }
      return { type: typeName, isArray: false };
    }
    return { type: this.getTypeFromNode(typeNode), isArray: false };
  }

  private collectFiles(dir: string, predicate: (filePath: string) => boolean) {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...this.collectFiles(fullPath, predicate));
        return;
      }
      if (predicate(fullPath)) {
        results.push(fullPath);
      }
    });
    return results;
  }

  private getDecorators(node: ts.Node) {
    if (ts.canHaveDecorators(node)) {
      return ts.getDecorators(node) || [];
    }
    return [];
  }

  private getRuleInfo(member: ts.PropertyDeclaration) {
    const decorators = this.getDecorators(member);
    const ruleDecorator = decorators.find(decorator => {
      return (
        ts.isCallExpression(decorator.expression) &&
        decorator.expression.expression.getText().startsWith('Rule')
      );
    });

    let ruleText = '';
    if (ruleDecorator && ts.isCallExpression(ruleDecorator.expression)) {
      ruleText = ruleDecorator.expression.arguments[0]?.getText() || '';
    }

    const required = /required\s*\(\s*\)/.test(ruleText);
    const match = ruleText.match(/RuleType\.(\w+)/);
    let ruleType = match ? match[1] : '';
    if (ruleType === 'required') {
      ruleType = '';
    }
    return { required, ruleType };
  }

  private getTypeInfo(member: ts.PropertyDeclaration) {
    const typeNode = member.type;
    if (!typeNode) return { type: 'string', isArray: false };

    if (ts.isArrayTypeNode(typeNode)) {
      return {
        type: this.getTypeFromNode(typeNode.elementType),
        isArray: true,
      };
    }

    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText();
      if (typeName === 'Array' && typeNode.typeArguments?.length) {
        return {
          type: this.getTypeFromNode(typeNode.typeArguments[0]),
          isArray: true,
        };
      }
      return { type: typeName, isArray: false };
    }

    return { type: this.getTypeFromNode(typeNode), isArray: false };
  }

  private getTypeFromNode(typeNode: ts.TypeNode) {
    switch (typeNode.kind) {
      case ts.SyntaxKind.StringKeyword:
        return 'string';
      case ts.SyntaxKind.NumberKeyword:
        return 'number';
      case ts.SyntaxKind.BooleanKeyword:
        return 'boolean';
      default:
        return typeNode.getText();
    }
  }

  private inferSwaggerSchema(
    ruleInfo: { required: boolean; ruleType: string },
    typeInfo: { type: string; isArray: boolean }
  ) {
    const ruleTypeMap = {
      string: 'string',
      number: 'number',
      integer: 'integer',
      bigint: 'integer',
      boolean: 'boolean',
      array: 'array',
    };
    const baseType = ruleInfo.ruleType
      ? ruleTypeMap[ruleInfo.ruleType] || this.mapTypeToSwagger(typeInfo.type)
      : this.mapTypeToSwagger(typeInfo.type);

    if (typeInfo.isArray || baseType === 'array') {
      const itemType = this.mapTypeToSwagger(typeInfo.type);
      return {
        type: 'array',
        items: { type: itemType },
      };
    }

    return { type: baseType };
  }

  private mapTypeToSwagger(type: string) {
    const typeMapping = {
      string: 'string',
      number: 'number',
      bigint: 'integer',
      integer: 'integer',
      boolean: 'boolean',
      datetime: 'string',
    };
    return typeMapping[type] || 'string';
  }

  private getJsDocComment(member: ts.PropertyDeclaration) {
    const jsDoc = (member as any).jsDoc as ts.JSDoc[] | undefined;
    if (!jsDoc || jsDoc.length === 0) return '';
    const comment = jsDoc[0].comment;
    return typeof comment === 'string' ? comment : '';
  }

  private getControllerPrefix(node: ts.ClassDeclaration, sourceFile: ts.SourceFile) {
    const decorators = this.getDecorators(node);
    for (const decorator of decorators) {
      if (!ts.isCallExpression(decorator.expression)) continue;
      const name = decorator.expression.expression.getText(sourceFile);
      if (!['CoolController', 'Controller'].includes(name)) continue;
      const arg = decorator.expression.arguments[0];
      if (!arg) return '';
      if (ts.isStringLiteral(arg)) return arg.text;
      if (ts.isObjectLiteralExpression(arg)) {
        const prefixProp = arg.properties.find(prop => {
          return (
            ts.isPropertyAssignment(prop) &&
            prop.name.getText(sourceFile) === 'prefix'
          );
        }) as ts.PropertyAssignment | undefined;
        if (prefixProp && ts.isStringLiteral(prefixProp.initializer)) {
          return prefixProp.initializer.text;
        }
      }
    }
    return '';
  }

  private getHttpDecorator(member: ts.MethodDeclaration) {
    const decorators = this.getDecorators(member);
    for (const decorator of decorators) {
      if (!ts.isCallExpression(decorator.expression)) continue;
      const name = decorator.expression.expression.getText();
      const methodMap = {
        Post: 'post',
        Get: 'get',
        Put: 'put',
        Patch: 'patch',
        Del: 'delete',
        Delete: 'delete',
        Options: 'options',
      };
      if (methodMap[name]) {
        return { decorator, method: methodMap[name] };
      }
    }
    return null;
  }

  private getDecoratorPath(
    decoratorInfo: { decorator: ts.Decorator; method: string },
    sourceFile: ts.SourceFile
  ) {
    if (!ts.isCallExpression(decoratorInfo.decorator.expression)) return '';
    const arg = decoratorInfo.decorator.expression.arguments[0];
    if (arg && ts.isStringLiteral(arg)) return arg.text;
    return '';
  }

  private getBodyParamMeta(member: ts.MethodDeclaration, sourceFile: ts.SourceFile) {
    if (!member.parameters) return null;
    for (const param of member.parameters) {
      const decorators = this.getDecorators(param);
      const hasBody = decorators.some(decorator => {
        if (!ts.isCallExpression(decorator.expression)) return false;
        return decorator.expression.expression.getText(sourceFile) === 'Body';
      });
      if (!hasBody || !param.type) continue;

      const typeMeta = this.getReturnTypeMeta({ type: param.type } as any, sourceFile);
      if (typeMeta) return typeMeta;
    }
    return null;
  }

  private getReturnTypeMeta(member: { type?: ts.TypeNode }, sourceFile: ts.SourceFile) {
    if (!member.type) return null;
    return this.resolveTypeMeta(member.type, sourceFile);
  }

  private resolveTypeMeta(typeNode: ts.TypeNode, sourceFile: ts.SourceFile) {
    if (ts.isTypeReferenceNode(typeNode)) {
      const typeName = typeNode.typeName.getText(sourceFile);
      if (typeName === 'Promise' && typeNode.typeArguments?.length) {
        return this.resolveTypeMeta(typeNode.typeArguments[0], sourceFile);
      }
      if (typeName === 'Array' && typeNode.typeArguments?.length) {
        const inner = this.resolveTypeMeta(typeNode.typeArguments[0], sourceFile);
        return inner ? { ...inner, isArray: true } : null;
      }
      return { schemaName: typeName, isArray: false };
    }

    if (ts.isArrayTypeNode(typeNode)) {
      const inner = this.resolveTypeMeta(typeNode.elementType, sourceFile);
      return inner ? { ...inner, isArray: true } : null;
    }

    return null;
  }

  private inferPrefixFromPath(filePath: string) {
    const normalized = filePath.split(path.sep).join('/');
    const match = normalized.match(/\/src\/modules\/([^/]+)\/controller\/(.+)$/);
    if (!match) return '';
    const moduleName = match[1];
    const controllerPath = match[2].replace(/\.ts$/, '');
    const [scope, ...rest] = controllerPath.split('/');
    if (!scope) return '';
    const suffix = rest.length ? `/${rest.join('/')}` : '';
    return `/${scope}/${moduleName}${suffix}`;
  }
}

function normalizeRoute(route: string) {
  if (!route) return '/';
  const withSlash = route.startsWith('/') ? route : `/${route}`;
  return withSlash.replace(/\/+/g, '/');
}

function shouldOverrideRequestBody(requestBody: any) {
  if (!requestBody || _.isEmpty(requestBody)) return true;
  const schema = requestBody?.content?.['application/json']?.schema;
  if (!schema) return true;
  if (schema.$ref) return false;
  return _.isEmpty(schema.properties);
}
