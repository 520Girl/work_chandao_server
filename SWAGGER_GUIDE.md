# Cool-Admin Swagger 文档自动生成机制

## 工作原理概述

Cool-Admin 通过 **EPS（Entity Parameter Schema）** 系统自动生成 Swagger 文档。核心流程如下：

```
Entity 实体 → DTO 数据传输对象 → Controller 控制器 → EPS 收集系统 → Swagger Builder → API 文档
```

## 1. EPS（Entity Parameter Schema）系统

### 启用 EPS

在 `src/config/config.local.ts` 中配置：

```typescript
cool: {
  // 启用 EPS，自动收集所有 API 元数据
  eps: true,
  // 自动导入数据库表结构
  initDB: true,
  // 自动导入菜单
  initMenu: true,
}
```

### EPS 收集的信息

EPS 系统会自动收集每个模块的：
- **Entity 实体**：数据库表结构
- **Controller 控制器**：API 路由、HTTP 方法、参数
- **DTO**：请求/响应数据模型

## 2. 两种接口类型

### ① 自动生成接口（使用 @CoolController 的 api 配置）

```typescript
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: UserInfoEntity,
})
export class AdminUserInfoController extends BaseController {
  // 自动生成 6 个接口，无需编写代码
}
```

**优点**：
- 自动生成标准 CRUD 接口
- Swagger 自动生成请求/响应示例
- Entity 直接映射为 DTO

**对应路由**：
- `POST /admin/user/info/add` - 新增
- `POST /admin/user/info/delete` - 删除
- `POST /admin/user/info/update` - 更新
- `GET /admin/user/info/info?id=1` - 详情
- `POST /admin/user/info/list` - 列表
- `POST /admin/user/info/page` - 分页

### ② 自定义接口（手写 @Post/@Get 等）

```typescript
@CoolController({
  prefix: '/app/post',
  api: [],  // 禁用自动生成
})
export class AppPostInfoController extends BaseController {
  @Post('/share', { summary: '分享报告' })
  @Validate()
  async share(@Body() body: PostShareDTO) {
    // 自定义逻辑
  }
}
```

**相关接口**：
- `POST /app/post/share` - 分享
- `POST /app/post/manual` - 手动发布
- `PUT /app/post/update` - 编辑
- `POST /app/post/like` - 点赞

## 3. DTO 定义与 Swagger 集成

### DTO 的作用

```typescript
import { Rule, RuleType } from '@midwayjs/validate';

export class PostShareDTO {
  @Rule(RuleType.number().required())
  reportId: number; // Swagger 会识别这个字段
}
```

### Swagger 如何识别 DTO 字段

Cool-Admin 的 **SwaggerBuilder** 在 `src/modules/swagger/builder.ts` 中：

1. **遍历 DTO 属性**：通过反射读取 @Rule 装饰器
2. **转换类型**：`string` → string、`number` → integer、`boolean` → boolean
3. **标记必选**：`RuleType.string().required()` → 必填字段
4. **生成 Schema**：自动创建 JSON Schema 用于 Swagger

```typescript
// DTO 
export class PostShareDTO {
  @Rule(RuleType.number().required())
  reportId: number;
}

// 自动转换为 Swagger Schema
{
  "type": "object",
  "properties": {
    "reportId": {
      "type": "integer",
      "description": "报告ID"
    }
  },
  "required": ["reportId"]
}
```

## 4. @Validate 装饰器的作用

### 参数验证

```typescript
@Post('/share')
@Validate()  // 启用参数验证
async share(@Body() body: PostShareDTO) {
  // body 会自动验证是否符合 PostShareDTO 的规则
}
```

### 为什么需要 @Validate

1. **参数校验**：运行时检查请求数据是否合法
2. **Swagger 识别**：告诉 EPS 系统这个方法有明确的 DTO
3. **错误提示**：如果参数不符合规则，自动返回 400 Bad Request

## 5. Swagger Builder 构建过程

### 文件位置
`src/modules/swagger/builder.ts`

### 构建步骤

```typescript
async build() {
  // 1. 从 EPS 获取所有 API 元数据
  const epsData = {
    app: this.eps.app || [],      // 应用层 API
    admin: this.eps.admin || [],  // 管理后台 API
    module: this.eps.module || {} // 模块信息
  };
  
  // 2. 转换为 Swagger 3.0 格式
  this.json = this.convertToSwagger(epsData);
}

convertToSwagger(dataJson) {
  // 遍历所有 API
  dataJson.app.forEach(api => {
    // 为每个 API 添加：
    // - 请求体 (requestBody)
    // - 响应体 (responses)
    // - 参数说明 (parameters)
  });
}
```

### 自动请求/响应体规则

SwaggerBuilder 根据 **API 路径** 自动添加请求响应：

| 路径 | 请求体 | 响应体 |
|------|--------|--------|
| `/add` | Entity Schema | 单条数据 + code + message |
| `/update` | Entity Schema | 单条数据 + code + message |
| `/delete` | { ids: [] } | code + message |
| `/list` | 动态条件 | Entity[] + code + message |
| `/page` | 分页条件 | Entity[] + 分页信息 |
| `/info` | 查询参数 | 单条数据 + code + message |
| 自定义接口 | DTO Schema | 返回值类型 |

## 6. 完整示例：Post 动态模块

### 1️⃣ 定义 DTO

```typescript
// src/modules/post/dto/info.ts
import { Rule, RuleType } from '@midwayjs/validate';

export class PostShareDTO {
  @Rule(RuleType.number().required())
  reportId: number; // Swagger 识别为必填的整数
}

export class PostManualDTO {
  @Rule(RuleType.string().required())
  content: string; // 必填字符串

  @Rule(RuleType.array())
  images?: string[]; // 可选数组
}
```

### 2️⃣ 在 Controller 使用 DTO + @Validate

```typescript
// src/modules/post/controller/app/info.ts
@CoolController({
  prefix: '/app/post',
  api: [],
})
export class AppPostInfoController extends BaseController {
  @Post('/share', { summary: '分享报告动态' })
  @Validate()  // ← 关键：启用参数验证
  async share(@Body() body: PostShareDTO) {  // ← 关键：指定 DTO 类型
    return this.ok(await this.postInfoService.share(
      this.ctx.user.id,
      body.reportId
    ));
  }

  @Post('/manual', { summary: '管理员手动发布' })
  @Validate()
  async manual(@Body() body: PostManualDTO) {
    const { content, images } = body;
    return this.ok(
      await this.postInfoService.manual(this.ctx.user.id, content, images)
    );
  }
}
```

### 3️⃣ Swagger 自动生成文档

```json
{
  "paths": {
    "/app/post/share": {
      "post": {
        "summary": "分享报告动态",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "reportId": {
                    "type": "integer",
                    "description": "报告ID"
                  }
                },
                "required": ["reportId"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Success response",
            "content": {
              "application/json": {
                "schema": { "type": "object" }
              }
            }
          }
        }
      }
    }
  }
}
```

### 4️⃣ 在 Swagger UI 中显示

- **Request Body** 自动显示 `{ "reportId": 0 }` 示例
- **Parameters** 自动标记 `reportId` 为必填
- **Responses** 自动显示 `{ code: 1000, message: "success", data: {} }` 示例

## 7. 常见问题排查

### ❌ 问题：接口没有请求体示例
**原因**：没有 DTO 或没有 @Validate
```typescript
// ❌ 错误
@Post('/share')
async share(@Body() body) { }

// ✅ 正确
@Post('/share')
@Validate()
async share(@Body() body: PostShareDTO) { }
```

### ❌ 问题：参数类型显示错误
**原因**：DTO 中的 @Rule 类型错误
```typescript
// ❌ 错误
@Rule(RuleType.string())  // 字符串，但实际需要数字
reportId: number;

// ✅ 正确
@Rule(RuleType.number())  // 数字
reportId: number;
```

### ❌ 问题：Swagger JSON 不更新
**原因**：EPS 被禁用或缓存问题
```typescript
// 检查 config.local.ts
cool: {
  eps: true,  // ← 必须为 true
}

// 解决：重启服务器或清除缓存
```

## 8. 最佳实践

### ✅ DTO 命名规范

```typescript
// 请求 DTO：动词 + DTO
export class UserLoginDTO { }
export class PostShareDTO { }
export class ActivityJoinDTO { }

// 响应 DTO：名词 + Response（可选）
export class UserLoginResponse { }
```

### ✅ DTO 位置规范

```
src/modules/
  └─ post/
      ├─ dto/
      │   └─ info.ts          ← DTO 存放位置
      ├─ entity/
      │   └─ info.ts
      └─ controller/
          └─ app/
              └─ info.ts      ← 使用 DTO 的地方
```

### ✅ @Validate 使用规范

- **自传输对象的接口**：必须加 @Validate
- **仅查询接口**（@Get）：可以不加（但推荐加）
- **自动生成接口**：无需加（已内置）

## 9. 访问 Swagger 文档

启动服务器后，访问：

```
http://localhost:8001/swagger/
```

将显示所有自动生成的 API 文档，包括：
- ✅ 请求体示例
- ✅ 响应体示例
- ✅ 参数说明
- ✅ 是否需要认证
- ✅ 错误说明

## 总结

| 组件 | 职责 |
|------|------|
| **Entity** | 数据库表结构 |
| **DTO** | 请求/响应数据模型 |
| **@Validate** | 参数验证 + Swagger 识别 |
| **@CoolController** | API 路由配置 |
| **SwaggerBuilder** | 收集元数据，生成文档 |
| **EPS 系统** | 扫描所有装饰器，生成 API 元数据 |

通过正确使用 DTO + @Validate，Cool-Admin 能够**自动生成完整的 Swagger 文档**，无需手动编写任何文档代码！
