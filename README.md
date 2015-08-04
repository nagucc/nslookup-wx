# DNS查询微信接口
程序提供国内大量DNS服务器的域名解析查询，可以以此来判断域名解析是否生效。

## 如何使用

### 1. 在docker中使用

#### 1.1 编译Docker镜像

1. 下载程序代码
	`git clone https://github.com/nagucc/nslookup-wx.git`
	
2. 执行`build`命令：
	`docker build -t ynuae/nslookup-wx .`
	
#### 1.2 运行Docker容器

由于此镜像已发布到DockerHub上，因此，最终用户可以不用`build`镜像，直接运行容器即可。

1. 打开程序中的`docker/docker-compose.yml`文件
2. 填入必要的参数
	- `QYH_CORPID=my_corpId` 微信企业号的corpId
    - `QYH_SECRET=my_secret` 管理组的secret
    - `NSLOOKUP_TOKEN=app_token` 应用的Token
    - `NSLOOKUP_AESKEY=app_aeskey` 应用的AESKEY
    - `NSLOOKUP_AGENTID=4` 应用的ID
3. 保存并关闭文件
4. 使用`docker-compose`运行容器：`docker-compose up`

### 2. 在微信企业号端的设置

按要求设置`token`和`AESKEY`，URL的地方填写`http://yourdomain/nslookup` 