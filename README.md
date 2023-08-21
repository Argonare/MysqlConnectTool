

```shell
pnpm run start
```

main.py 里面主要是依靠 webview.create_window 和 webview.start 这两个 API 来构建客户端。其他的一些 API，我也会在后面的教程中详细介绍。或者可以直接查看 [pywebview 官网](https://pywebview.flowrl.com/guide/api.html) 了解详情。

##### webview.create_window

```
webview.create_window(title, url='', html='', js_api=None, width=800, height=600, \
                      x=None, y=None, resizable=True, fullscreen=False, \
                      min_size=(200, 100), hidden=False, frameless=False, \
                      minimized=False, on_top=False, confirm_close=False, \
                      background_color='#FFF')
```

创建一个新的 pywebview 窗口，并返回其实例。在开始 GUI 循环之前，窗口不会显示。

- **title** 窗口标题
- **url** 要加载的 URL。如果 URL 没有协议前缀，则将其解析为相对于应用程序入口点的路径。或者，可以传递 WSGI 服务器对象来启动本地 Web 服务器。
- **html** 要加载的 HTML 代码。如果同时指定了 URL 和 HTML，HTML 优先。
- **js_api** 将 python 对象暴露到当前 pywebview 窗口的 DOM 中。js_api 对象的方法可以通过调用 window.pywebview.api.<methodname>(<parameters>)从 Javascript 执行。请注意，调用 Javascript 函数会收到一个包含 python 函数的返回值。只有基本的 Python 对象（如 int、str、dict......）才能返回 Javascript。
- **width** 窗户宽度。默认值为 800px。
- **height** 窗户高度。默认值为 600px。
- **x** 窗口 x 坐标。默认值居中。
- **y** 窗口 y 坐标。默认值居中。
- **resizable** 是否可以调整窗口大小。默认值为 True
- **fullscreen** 从全屏模式开始。默认为 False
- **min_size** 指定最小窗口大小的（宽度、高度）元组。默认值为 200x100
- **hidden** 默认情况下创建一个隐藏的窗口。默认为 False
- **frameless** 创建一个无框窗口。默认值为 False。
- **minimized** 以最小化模式启动
- **on_top** 将窗口设置为始终位于其他窗口的顶部。默认值为 False。
- **confirm_close** 是否显示窗口关闭确认对话框。默认为 False
- **background_color** 加载 WebView 之前显示的窗口的背景颜色。指定为十六进制颜色。默认值为白色。
- **transparent** 创建一个透明的窗口。Windows 不支持。默认值为 False。请注意，此设置不会隐藏或使窗口铬透明。将窗口 chrome setframeless 隐藏为 True。

##### webview.start

```
webview.start(func=None, args=None, localization={}, gui=None, debug=False, http_server=False)
```

启动 GUI 循环并显示之前创建的窗口。此函数必须从主线程调用。

- **func** 启动 GUI 循环时调用的函数。
- **args** 函数参数。可以是单个值，也可以是元组值。
- **localization** 带有本地化字符串的词典。默认字符串及其键在 localization.py 中定义
- **gui** 强制使用特定的 GUI。允许的值是 cef、qt 或 gtk，具体取决于平台。
- **debug** 启用调试模式。
- **http_server** 启用内置 HTTP 服务器。如果启用，本地文件将使用随机端口上的本地 HTTP 服务器提供服务。对于每个窗口，都会生成一个单独的 HTTP 服务器。对于非本地 URL，此选项将被忽略。

#### 域间通信

##### 从 Python 调用 Javascript

window.evaluate_js(code, callback=None)允许您使用同步返回的最后一个值执行任意 Javascript 代码。如果提供了回调函数，则解析 promise，并调用回调函数，结果作为参数。Javascript 类型转换为 Python 类型，例如 JS 对象到 Python 字典，数组到列表，未定义为 None。由于实现限制，字符串“null”将被计算为 None。另外，evaluate_js 返回的值限制为 900 个字符内。

##### 从 Javascript 调用 Python

从 Javascript 调用 Python 函数可以通过两种不同的方法完成。

- 通过将 Python 类的实例暴露给 create_window 的 js_api。该类的所有可调用方法都将以 pywebview.api.method_name 的形式公开到 JS 域中。方法名称不得以下划线开头。
- 通过将函数传递给窗口对象的 expose(func)这将以 pywebview.api.func_name 的形式将一个或多个函数公开到 JS 域。与 JS API 不同，expose 也允许在运行时公开函数。如果 JS API 和以这种方式公开的函数之间存在名称冲突，则后者优先。

#### 打包客户端

pywebview 建议 macOS 用 [py2app](https://py2app.readthedocs.io/en/latest/) 打包，Windows 用 [pyinstaller](https://pyinstaller.readthedocs.io/en/stable/) 打包。但是我发现 pyinstaller 也可以很顺畅得打包 macOS 应用，虽然移植有点问题。

我就不介绍 pyinstaller 的打包方法了，后面我会出这个框架详细的打包介绍。这里我将打包方法封装在应用中，只需要按命令打包即可。

```
###########
# 简单用法 #
###########

# 初始化
pnpm run init

# 开发模式
pnpm run start

# 正式打包
pnpm run build

# 预打包，带console，方便输出日志信息
pnpm run pre


###########
# 进阶用法 #
###########

# 初始化，cef兼容模式
pnpm run init:cef

# 开发模式，cef兼容模式【仅win系统】
pnpm run start:cef

# 预打包，带console，cef兼容模式【仅win系统】
pnpm run pre:cef

# 预打包，带console，生成文件夹【仅win系统】
pnpm run pre:folder

# 预打包，带console，生成文件夹，cef兼容模式【仅win系统】
pnpm run pre:folder:cef

# 正式打包，cef兼容模式【仅win系统】
pnpm run build:cef

# 正式打包，生成文件夹【仅win系统】
pnpm run build:folder

# 正式打包，生成文件夹，cef兼容模式【仅win系统】
pnpm run build:folder:cef
```
