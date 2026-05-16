
# 开发提示词

# P1
当前文档并未提到项目该如何本地编译，请你分析该项目，给出本地编译运行的方案。
如果缺少相应的程序依赖，请自行下载。
如果有必须要我配置的问题（比如key，密码等），请停下，让我配置即可。
请新增一个中文说明文档，把环境配置、编译方法、启动方法等等写到该文件中。
尽量不要动当前项目的代码，除非必须更改。
该项目的github地址在：https://github.com/elizaOS/eliza/tree/main。遇到一些问题，可以在Issue中询问查看。

# P2
不要编译源码生成组件，直接下载可用的二进制包。
哪个地方需要sudo输入密码来着，请告诉我，我来操作。

# P3
我看你上面的内容，说要使用conda的g++来编译源码，是哪个组件呢？我的意思是不要使用编译源码的方法，能直接下载二进制包就让我来下载，这个过程可能需要sudo

# P4
能增加对deepseek模型的配置吗？
当前需要配置的模型和API KEY中没有deepseek选项，请增加。
还有就是我到底怎么编译运行整个项目呢？


# P5
这个ELIZA_NO_VISION_DEPS是干什么的？设置为1会有什么后果？补充到LOCAL_DEV_ZH.md文档中。

# P6
我已经安装了fswebcam，直接运行bun run dev,
但启动不了,如图：
![alt text](image.png)

# P7
你提到：
如果你后续确实需要本地 n8n，建议优先确保 WSL 内使用的是 Linux 自己的 node / npm / npx，而不是 /mnt/.../Program Files/nodejs/npx 这种
我需要本地n8n，请在linux中安装 node / npm / npx。

# P8
我使用bun run dev启动失败：
![alt text](image-1.png)
请解决问题

# P9
从Windows端访问：http://172.30.2.220:2138/ 报错：
![alt text](image-2.png)

# P10
点击“本地”后，报错：
![alt text](image-3.png)


# P11
我现在没有从该项目代码编译启动了，使用了官方文档：
https://docs.elizaos.ai/中的bun i -g @elizaos/cli在~目录下创建了eliza-agent。
在使用elizaos create创建后，只能配置特定模型的api key。
现在我能通过如下方式：
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_SMALL_MODEL=deepseek-chat
OPENAI_LARGE_MODEL=deepseek-reasoner
改成使用deepseek模型吗？

# P12
我准备使用硅基流动的上BAAI/bge-m3的EMBEDDING模型，请给我生成配置的信息。
是不是我在终端执行
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_SMALL_MODEL=deepseek-v4-flash
OPENAI_LARGE_MODEL=deepseek-v4-pro
EMBEDDING模型也是如此，
然后elizaos start 后就能使用了？

# P13
elizaos start 后，聊天对话报错
![alt text](image-4.png)

# P14
你拥有~/eliza-agent目录的修改权限，请修改代码和配置文件.env。

# P15
现在能恢复消息，但：
 Error      [HTTP] Error summarizing channel (channelId=5c05444d-4b43-4264-9cce-637441742447, error=[deepseek-compat] DeepSeek returned an empty message content)
 运行过程中报这种错误是什么原因？

 # P15
 我在eliza页面新增了一个agent，对话该agent后怎么又报错了：
 ![alt text](image-5.png)


# P16
我在elize页面中配置了 Twitter Agent X-卫斯理2， 怎么在~/eliza-agent目录下搜索不到？
是存放在PG数据库中去了吗？

说明文档如下：
https://docs.elizaos.ai/plugin-registry/platform/twitter
我现在已经在 "Twitter Agent X-卫斯理2" 中配置了TWITTER_API_KEY、TWITTER_API_SECRET_KEY、TWITTER_ACCESS_TOKEN、TWITTER_ACCESS_TOKEN_SECRET
我现在怎么在eliza中读取X消息，然后回复、发表X消息内容呢？

# P17
下面为页面发送内容：
![alt text](image-8.png)
下面为日志内容：
![alt text](image-7.png)
我的X账号上，为什么没有发送推文呢？

# P18
 App 权限是 Read, Write, and Direct Messages
 用的OAuth 1.0 Keys中的
 Consumer Key填充TWITTER_API_KEY、TWITTER_API_SECRET_KEY
 Access Token填充TWITTER_ACCESS_TOKEN、TWITTER_ACCESS_TOKEN_SECRET
 ![alt text](image-9.png)
为什么现在还是不能发推？
![alt text](image-10.png)

# P19
我是这样映射的：
TWITTER_API_KEY=Consumer Key / API Key
TWITTER_API_SECRET_KEY=Consumer Secret / API Secret
TWITTER_ACCESS_TOKEN=Access Token
TWITTER_ACCESS_TOKEN_SECRET=Access Token Secret
但总是失败，到底哪里出了问题？
请解决为什么总是触发不了POST_TWEET的问题

# P20
我现在不想通过eliza来发送推文了，twitter post开关我已经关闭。
我现在在windows上有个项目，可以支持发推。在D:\MyGithub\x-content目录中。
已经在http://127.0.0.1:8000/启动，可以通过该项目的web api接口发送推文到X。
请在~/github/twitter-x-robot中实现如下功能：
1. 提供一个简单的web前后端，用于接口填充参数和调用接口。
2. 提供一个发送文本内容接口，用于填写文本，发送文本到当前elize-agent中特定agent（比如“Twitter Agent X-卫斯理2”），然后获取该agent的返回内容。
3. 提供一个发送推文接口，调用x-content的接口，发送推文。
请实现上面功能。
需要明确的是，eliza能否提供接口发送问题给它，然后获取它的返回内容。

# P21
windows上有个项目，可以支持发推。在D:\MyGithub\x-content目录中。
已经在http://172.30.0.1:8000启动，可以通过该项目的web api接口发送推文到X。
我已经测试该接口连通，请你修改twitter-x-robot发推的代码，使得返回的结果能够调用172.30.0.1:8000发送推文出去。


TODO:
# P10
你总结下上面所有的启动问题，是哪些原因导致本地编译启动失败，写到文档中。
是不是不是环境配置问题，更多的是某些包缺失、下载失败的原因导致的？
所以没有代码问题、环境问题、配置问题？
那我换个电脑编译，是不是应该也可以正常启动？

