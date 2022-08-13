# 布衣垃圾箱

我自己用的 Firefox 浏览器扩展，工具箱性质，只是我觉得它对一般人来说就是个垃圾。   

## 编译方法 
```bash
# 安装 Firefox 扩展的 ts 定义文件
npm install
# 安装 Typescript 并编译
npm install -g typescript
tsc --build
# 安装 Mozilla 的 web-ext
npm install --g web-ext
cd ./ext/
web-ext build --overwrite-dest
```

使用 Firefox ESR 或者 Developer Version 来安装和运行扩展   
需要在 `about:config` 里设置 `xpinstall.signatures.required` 为 `false`    

也可以直接在 [gitlab CI](https://gitlab.com/4559392/buyitools/-/jobs) 里面下载编译好的成品，只是它被二次打包过了。   
在 Firefox 选择从文件安装的时候，要选的是 `artifacts.zip` 里面的 `_-1.0.zip` 这个文件才对。  

## 截图
![](https://s1.ax1x.com/2022/08/13/vtex2j.png)   
![](https://s1.ax1x.com/2022/08/13/vtmnMR.png)   
![](https://s1.ax1x.com/2022/08/13/vtm8iD.png)   

