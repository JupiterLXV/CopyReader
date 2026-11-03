# 界面与素材记录

## 界面参考

用户指定的参考项目：[Arisqian/Wenku8_Flutter](https://github.com/Arisqian/Wenku8_Flutter/tree/bc9a0381c3001a823b6f9f993ce4a82dc93452e6)。参考了其界面截图和 archive_design.dart 中的纸色、黑白文字、细线分区、立体书架及悬浮导航；没有复制 Flutter 实现代码、小说内容、书籍封面或项目图标。漫画客户端界面仍由本项目的 HTML、CSS、JavaScript 和 Android Java 宿主独立实现。

## 启动图标

- 项目文件：`app/src/main/res/drawable-nodpi/ic_launcher_art.png`。
- 来源：按用户要求，以拷贝漫画公开蓝底白色星形与环线标识为参考，用内置 image_gen 工具生成圆润改绘版。参考图地址：https://img.downkuai.com/logo/20251211/1e95906441009dad8b0788c5e2b19998.png 。参考原图不打包。
- 生成方式：内置图像编辑，非 CLI，背景不透明。Android 使用 `mipmap-anydpi-v26/ic_launcher.xml` 及 `ic_launcher_round.xml`，前景留白 12dp。外部轮廓由设备启动器的自适应遮罩决定。
- 标识权利归原权利方，本项目是个人第三方客户端，不代表官方关联。

生成提示词：

```text
Use case: precise-object-edit. Asset type: Android launcher icon. Edit the attached original CopyManga app icon into a polished rounded version. Preserve its exact recognizable composition: saturated original sky-blue background (around #1498DB), a large white five-point folded ribbon/star emblem, the small central blue hollow polygon/ring, and the two white sweeping curved orbital strokes surrounding the star. Keep the original orientation and five-point construction. Smooth the star tips and internal corners gently into clean rounded joins, regularize line thickness, remove the low-resolution artifacts. Flat, crisp, high-quality vector-like icon artwork. The entire square canvas must be full-bleed solid blue with no outer white border, no mockup, no text, no gloss, no extra symbols and no drop shadow. Center the white emblem at about 64 percent of the canvas width with generous equal blue safe margins, suitable for Android adaptive icon masks. One square final icon, 1024 by 1024.
```

生成结果经视觉检查后直接作为打包资源使用，没有程序性重绘、滤镜或几何改画。启动器自适应遮罩属于 Android 的正常图标显示。

## 1.5.1 纸质书册与字体

纸书册采用本项目独立实现的SVG仿射投影：顶部纸页、竖排书脊、白色封面板与真实封面内嵌。位置、抽出和提升随手势变化；遮挡顺序按书架物理位置固定，不按选中状态提高层级。参考用户提供的Wenku8截图及其公开项目的陈列方向与比例，没有移植Flutter控件或绘制代码。

循环副本仅引用实际收藏，计数不会重复。界面改用系统无衬线字体，不再打包1.5.0的思源宋体子集。原参考截图、用户上传图片、测试截图和合成封面都不打包到应用或源码。

## 1.5.2 运动与复用

继续参考同一提交中的 archive_wave.dart、archive_motion.dart 与 archive_scroll_simulation.dart：先随松手速度减速，再落到整本位置；手势可中断动画，静止时不运行时钟。交互由本项目 JavaScript 实现，按真实经过时间计算位置，使用单个 requestAnimationFrame 调度和最多31个循环复用的书册节点；附近封面按需加载。没有引入 Flutter 运行时或新的界面框架。启动图标沿用原资源。

## 1.6.0 对照图与界面规则

继续参考同一公开提交中的archive_shelf_geometry.dart与archive_wave.dart，并对照用户本次提供的两张运行截图，调整陈列边界、封面内边距、书脊文字密度、纸面配色、控件比例及页面层次。新增design.css保存当前界面规则；书册仍由本项目的SVG仿射投影与JavaScript控制。新的起伏权重使用本项目的三次平滑函数，原惯性模型保持不变。

素材沿用既有图标及数据源实际封面。验证中使用自绘SVG几何封面和合成账号、长书名、数量；这些封面由测试脚本即时生成。测试截图、中文测试字体、用户上传的对照图及原项目源码不进入APK或交付源码。

## 1.7.0 光照与自选编辑器

阅读同一公开提交archive_wave.dart的底面投影绘制，并参考其统一光向。新的JavaScript材料模块独立计算每册的底面多边形、接触线及抬高后的投影延展；遮挡阴影由程序绘制书册轮廓并缓存为透明图像，纸面使用SVG渐变。投影不含漫画图像或用户信息。

阴影缓存只存在于本机运行内存，不添加外部素材或图片服务。底面统一轻度柔化，书册遮挡图按尺寸与深浅主题复用，动态过程不为每一本书重复运行模糊滤镜。新增编辑器使用现有真实书目与封面，所有测试仍用程序生成的几何封面。原图标及许可沿用前版。
