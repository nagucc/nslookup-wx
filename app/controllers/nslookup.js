/**
 * Created by 文琪 on 2015/2/10.
 */
var express = require('express'),
    router = express.Router();
var wx = require('wechat-enterprise');
var array = require('array');
var EventProxy = require('eventproxy');

var config = require('../../config/config');

var serverList = require('chinese-dns-server-list')();

var dns = require('native-dns');

module.exports = function (app) {
    app.use(express.query());
    app.use('/nslookup', router);
};

/**
 * 解析域名
 * @param domain
 * @param callback
 * 处理解析结果的回调方法 function(list);
 * list 是一个数组，包含各个DNS服务器的返回结果
 */
var resolve_domain = function(domain, callback){
    var q = dns.Question({
        name: domain
    });

    var ep = new EventProxy();
    ep.after('dns_done', serverList.length, callback);
    serverList.forEach(function(server){
        var dnsReq = dns.Request({
            question: q,
            server: {
                address: server.A
            }
        });
        dnsReq.on('timeout', function () {
            ep.emit('dns_done', {
                ret: -2, // 超时
                msg: '查询超时',
                server: server
            });
        });

        dnsReq.on('message', function (err, answer) {
            ep.emit('dns_done', {
                ret: 0, // 解析成功
                data: answer.answer[0],
                answer: answer.answer,
                server: server
            });
        });
        dnsReq.send();
    });
};

/**
 * 分析解析结果
 * @param list
 * @returns {{timeout: (*|Array|null), success: (*|Array|null)}}
 */
var analyse_reslut = function(list){
    var result = array(list);

    // 超时的结果
    var timeoutResult = result.select(function(timeout){
        return timeout.ret === -2;
    });

    // 完成
    var doneResult = result.select(function(done){
        return done.ret === 0;
    });

    // 未查询到结果
    var emptyResult = result.select(function(done){
        return done.ret === 0 && done.answer.length === 0;
    });

    // 已查询到结果
    var notEmptyResult = result.select(function(done){
        return done.ret === 0 && done.answer.length;
    });
    var addresses = [];
    notEmptyResult.forEach(function(result){
        result.answer.forEach(function(ans){
            var addr = ans.address;
            if(addr) {
                if (addresses[addr] === undefined) {
                    addresses[addr] = [];
                }
                addresses[addr].push(result);
            }
        });
    });
    return {
        timeout: timeoutResult.toArray(),
        success: doneResult.toArray(),
        empty: emptyResult.toArray(),
        // 根据地址索引的返回结果 => addresses['119.23.45.33'] = ...
        addresses: addresses
    };
};


var replyResovleResult = function(domain, req, res){
    resolve_domain(domain, function(list){
        var result = analyse_reslut(list);
        var resultList = [];
        resultList.push(['已完成对' + domain + '的检测，共检测了' + serverList.length + '个DNS服务器，其中：', function(){}]);
        resultList.push(['\n{1}. 查询超时' + result.timeout.length + '个；', function(msg, req, res){
            var str = '查询超时的服务器包括：\n';
            result.timeout.forEach(function(timeout){
                console.log(JSON.stringify(timeout));
                str += timeout.server.text + '(' + (timeout.server.name || timeout.server.A) + ')\n';
            });
            res.reply(str);
        }]);
        resultList.push([ '\n{2}. 查询成功，但未查到结果的有' + result.empty.length + '个。', function(msg, req, res){
            var str = '查询成功，但未查到结果的服务器包括：\n';
            result.empty.forEach(function(success){
                str += success.server.text + '(' + (success.server.name || success.server.A) + ')\n';
            });
            res.reply(str);
        }]);
        // 按解析到的地址加入回复队列中
        var index = 3;
        var addrs = [0,0,0];
        for(var addr in result.addresses){
            addrs[index] = addr;
            resultList.push(['\n{' + index++ + '}. 查询结果为' + addr + '的结果有' + result.addresses[addr].length + '个。', function(msg, req, res){
                var addr = addrs[parseInt(msg.Content)];
                var str = '查询结果为' + addr + '的服务器包括：\n';
                result.addresses[addr].forEach(function (success) {
                    str += success.server.text + '(' + (success.server.name || success.server.A) + ')\n';
                });
                res.reply(str);

            }]);
        }
        resultList.push(['\n回复序号获取详细信息', function(){}]);
        wx.List.add('result', resultList);
        res.wait('result');
    });
};

var EventHandlers = {
    'dns_test': function(msg, req, res, next){
        replyResovleResult('www.baidu.com', req, res);
    }
};


/*
 微信事件消息处理程序。
    - 返回 function(msg, req, res, next)
        - 接收到正确消息时，返回消息处理结果；
        - 接收到不能处理的消息时，返回“正在建设中”提示
        - 出错时返回错误提示
    - 参数 eventHandlers
    {
        key: function (msg, req, res, next) {
            // 消息处理代码
        }
    }

*/
var handleEvent = function (eventHandlers) {
    return function (msg, req, res, next) {
        try {
            if (eventHandlers[msg.EventKey]) {
                eventHandlers[msg.EventKey](msg, req, res, next);
            } else {
                res.reply('正在建设中：' + msg.EventKey);
            }
        } catch(err){
            res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + err.toString());
        }
    }
};

var handleText = function (textHandlers, sessionName) {
    return function (msg, req, res, next) {
        try {
            if (req.wxsession[sessionName]) {
                textHandlers[req.wxsession[sessionName]](msg, req, res, next);
            } else {
                res.reply('正在建设中~');
            }
        } catch(err){
            res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + err.toString());
        }
    };
};


var wxcfg = {
    token: config.nslookup.token,
    encodingAESKey: config.nslookup.aesKey,
    corpId: config.qyh.corpId,
    secret: config.qyh.secret,
    agentId: config.nslookup.agentId
};

/*
 DNS解析查询
*/
router.use('/', wx(wxcfg, wx.text(function(msg, req, res, next){
    var domain = msg.Content;
    if(domain.indexOf('.ynu.edu.cn') < 0){
        domain += '.ynu.edu.cn';
    }
    replyResovleResult(domain, req, res);
}).event(function(msg, req, res, next){
    try {
        if (EventHandlers[msg.EventKey]) {
            EventHandlers[msg.EventKey](msg, req, res, next);
        } else {
            res.reply('正在建设中：' + msg.EventKey);
        }
    } catch(err){
        res.reply('出现错误，请截图并与管理员联系。\n错误信息：' + err.toString());
    }
})));