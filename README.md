# 布衣垃圾箱

我自己用的 Firefox 浏览器扩展，工具箱性质，只是我觉得它对一般人来说就是个垃圾。   

## 编译方法 
安装 Firefox 扩展的 ts 定义文件：  `npm install`    
安装 web-ext 工具： [extensionworkshop.com](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)   
在 ./ext 文件夹下执行： `web-ext build`    

使用 Firefox ESR 或者 Developer Version 来安装和运行扩展   
需要在 `about:config` 里设置 `xpinstall.signatures.required` 为 `false`

