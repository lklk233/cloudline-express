# 云间列车 3D · Cloudline Express

一列由车头和两节客车厢组成的列车，在夕照中的高架桥上运行。远处的绘画云带、中景的立体云团和桥下的流动薄雾均由程序生成。打开首页即可观看，右侧面板可调整画面和行车状态。

## 本地启动

需要支持 WebGL 2 的浏览器，以及符合 Vite 7 要求的 Node.js（20.19+ 或 22.12+）。本次使用 Node.js 25.5.0、npm 11.8.0 和 Windows Edge 验收。从含 package.json 的项目根目录执行：

```powershell
Set-Location 'F:\university\cloud express'
npm.cmd ci
npm.cmd run dev
```

打开终端输出的 Local 地址（默认 http://localhost:5173/）。已有依赖并与锁文件一致时可直接运行第二条 npm 命令。macOS、Linux 或 Windows 命令提示符可使用 `npm`。安装依赖后，运行所需的三份模型均从项目本地加载，无需 Blender 或素材服务账号。

### 检查与生产预览

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run preview
```

构建产物位于 `dist/`，打开预览命令输出的 Local 地址（默认 http://localhost:4173/）。开发及预览服务可用 Ctrl+C 结束。需在同一 Wi-Fi 的手机上复验时，使用 `npm.cmd run preview -- --host 0.0.0.0`，在手机浏览器打开终端输出的 Network 地址。

## 操作

| 目标 | 操作 |
|---|---|
| 行车 | “车速”范围 0–12 模型单位/秒。“暂停列车”保留当前位置。“回到起点”停在起点，再按“继续运行”发车。列车在终点减速停车。 |
| 取景 | 远景看整座桥，环绕支持拖动及滚轮或双指缩放，车外跟随以列车为主体，电影巡航自动运镜。“显示与声音”中可减少动效。 |
| 云与天气 | 展开“云海”调整远景层数、云量、大小、高度、风向及质量。云速控制远中景漂移，薄雾速度和雾强分别控制近景的运动与浓淡。可独立暂停云动画或隐藏整片云海。 |
| 调色与重置 | “珊瑚晚霞”“橘色暮光”“紫夜航线”同步改变云、天空、雾和光照。“重置当前预设”恢复该套视觉参数，保留行车和镜头选择。“恢复珊瑚晚霞初始状态”同时恢复默认车速、起点发车和远景。 |
| 窄屏与取图 | 手机宽度下点“场景控制”展开底部面板，可收起面板继续观看。“隐藏界面”可拍摄干净画面，“显示界面”恢复控件。 |

首页使用渐变天空。全景素材自带固定云层，保留在素材目录；界面解释禁用原因。景深和音效入口也标有当前状态。开发时可展开“场景校准”检查模型，或访问 `/?view=assets` 查看资产预览。

## 验收与资料

[最终验收报告及 50 秒演示顺序](docs/ACCEPTANCE_REPORT.md) · [性能测试条件与原始结果](docs/M5_PERFORMANCE.md)。桌面高低档已有实测；手机真机低档 30 FPS 目标仍待验证。

[项目计划书](项目计划书.md) · [资产清单](docs/ASSET_INVENTORY.md) · [轨道与模型校准](docs/ASSET_CALIBRATION.md) · [云海实现记录](docs/CLOUD_REBUILD_LOG.md) · [M0–M6 实施记录](docs/IMPLEMENTATION_LOG.md)
