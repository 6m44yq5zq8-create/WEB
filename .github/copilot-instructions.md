## 快速目标

为 AI 编码代理提供立即可用的、与本仓库紧密相关的上下文与约定：架构要点、常用开发/运行命令、特有模式与注意事项、以及修改时常用的代码位置示例。

## 大体架构（为什么这么划分）

- 后端：FastAPI（目录 `backend/`），负责文件系统访问、JWT 认证、以及音视频的分片流（range 支持）。关键文件：`backend/main.py`、`backend/auth.py`、`backend/config.py`。后端以文件系统为存储（`ROOT_DIRECTORY`），不是数据库。
- 前端：Next.js 应用（目录 `frontend/`），静态导出/SSR 可用，使用 Axios 调用后端并通过本地存储保存 JWT。关键文件：`frontend/src/lib/api.ts`、`frontend/src/lib/auth.tsx`、`frontend/src/lib/config.ts`、`frontend/package.json`。
- 交互：认证流程为“密码登录 -> 后端返回 JWT -> 前端把 token 存 localStorage（键名见 `config.ts`） -> axios 拦截器自动附加 Authorization 头 -> 401 时前端清 token 并跳转登录”。

## 关键开发/运行命令（可直接复制到终端）

- 后端（开发）：
  - 在 `WEB/backend` 下创建并激活虚拟环境（Windows）：
    - `python -m venv venv`  
    - `venv\Scripts\activate`  
    - `pip install -r requirements.txt`
  - 启动（有两种等效方式）：
    - `python -m backend.main`（在仓库根目录运行）
    - 或 `uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000`

- 前端（开发）：
  - 进入 `WEB/frontend`，安装依赖并启动：
    - `npm install`  
    - `npm run dev`  
  - 默认访问 `http://49.232.185.68:3000`，通过 `NEXT_PUBLIC_API_URL` 指向后端。

## 项目特有约定与模式（请严格遵守）

- 配置：后端使用 `.env`（示例见 `backend/.env`），运行时通过 `backend/config.py` 加载。常改项：`ROOT_DIRECTORY`、`ACCESS_PASSWORD`、`JWT_SECRET_KEY`、`FRONTEND_URL`（CORS）。
- 身份验证：使用 `backend/auth.py` 的 `create_access_token` / `verify_token`，并在受保护的路由使用 `verify_jwt_token` 依赖（见 `backend/main.py`）。添加新的受保护路由时，保持该依赖。
- 登录限流：`/api/auth/login` 已用 slowapi 限制为 `5/minute`（见 `main.py` 装饰器）。修改时注意不要无意取消限流。
- 文件路径安全：所有基于用户输入的文件路径都应经 `safe_path_join(base, user_path)` 验证以防目录遍历（实现位于 `main.py`）。直接操作文件必须使用该辅助函数。
- 媒体流与 Range：音视频流端点实现了对 Range 的解析与分块读取（`/api/stream/audio`, `/api/stream/video`），如需改变 chunk 大小或缓存逻辑，请在这些函数中调整。
- 响应/模型：后端使用 Pydantic 模型（`FileInfo`, `DirectoryListing` 等）来定义返回结构，若改变结构需同步更新前端 types（`frontend/src/types/index.ts`）。

## 前后端集成要点（示例）

- Token 键名：`frontend/src/lib/config.ts` 导出 `TOKEN_KEY = 'cloud_storage_token'`；前端使用该键保存 JWT，axios 拦截器在 `api.ts` 自动加头。
- 登录 API：`POST /api/auth/login`，请求 `{ "password": "..." }`，响应 `{ token, message }`。登录失败会返回 401 与 `detail` 错误信息。
- 列表 API：`GET /api/files/list?path=&sort_by=&search=` 需要 Authorization header，可用作 token 验证探测。

## 代码修改建议与常见任务快速指南

- 新增受保护路由：在 FastAPI 路由函数签名中加入 `payload: dict = Depends(verify_jwt_token)`。示例：`async def my_route(..., payload: dict = Depends(verify_jwt_token))`。
- 处理文件路径：使用 `safe_path_join(settings.ROOT_DIRECTORY, user_path)`，不要用字符串拼接。
- 修改认证逻辑：编辑 `backend/auth.py`，保留 `pwd_context`、`create_access_token`、`verify_token` 的接口，前端期望 `token` 字段字符串。
- 前端改字段/类型：同步更新 `frontend/src/types/index.ts` 和 `frontend/src/lib/api.ts` 拦截器逻辑。

## 常见陷阱与调试提示

- CORS 问题：后端 CORS 白名单来源于 `FRONTEND_URL`（`backend/config.py`），若前端在不同端口或远程部署需更新。  
- JWT 过期/401：前端拦截器会在 401 时删除 token 并跳转 `/login`（`api.ts`），因此调试时先查看浏览器 localStorage 的 `cloud_storage_token`。
- 本地测试文件：后端默认 `ROOT_DIRECTORY=./files`（可在 `.env` 修改）。确保该目录有音视频文件以测试流媒体。

## 代码位置速查（最常打开的文件）

- 后端： `backend/main.py`（路由与核心逻辑）  
- 后端配置： `backend/config.py`, `backend/.env`  
- 后端认证： `backend/auth.py`  
- 前端 API 客户端： `frontend/src/lib/api.ts`  
- 前端认证/上下文： `frontend/src/lib/auth.tsx`  
- 前端配置常量： `frontend/src/lib/config.ts`  

## 额外说明

- 本仓库当前没有自动化测试（unit/integration tests）目录；在添加公共接口或复杂逻辑时，建议为后端路由添加 pytest 测试，并为前端添加简单的集成测试。  
- 如果你需要我把这份说明调整为英文版、扩充为开发者入门脚本（bash/ps1），或把某些部分展开成 PR 模板/issue 模板，请告诉我要点。

---

请检查此文件是否覆盖了你最需要的上下文或是否有遗漏（例如部署 URL、私有托管策略或 CI/CD 流程）。我会根据你的反馈迭代。 
