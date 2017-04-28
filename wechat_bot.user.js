// ==UserScript==
// @name         wechat bot
// @namespace    https://github.com/wangyihit/wechat_bot.git
// @version      0.1
// @description  hook wechat api
// @require      https://code.jquery.com/jquery-3.2.1.min.js
// @author       wangyi
// @match        https://wx.qq.com/
// @grant        GM_log
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==


(function($) {
    'use strict';

    var wechat_urls = {
        init: "/cgi-bin/mmwebwx-bin/webwxinit",
        contact: "/cgi-bin/mmwebwx-bin/webwxgetcontact",
        batch_contact: "/cgi-bin/mmwebwx-bin/webwxbatchgetcontact",
        upload_media: "/cgi-bin/mmwebwx-bin/webwxuploadmedia",
        send_video: "/cgi-bin/mmwebwx-bin/webwxsendvideomsg",
    };
    function WechatBot(){
        this.wechat_data = {
            req_header: {},
            media_ids:[],
        };
    }
    WechatBot.prototype.name = "we_bot";
    WechatBot.prototype.wechat_urls = wechat_urls;
    // tool function
    WechatBot.prototype.full_url = function(url_fragment){
        // url_fragment, url without hostname
        var ele=document.createElement('a');
        ele.href = url_fragment;
        return ele.href;
    };
    WechatBot.prototype.gen_client_id = function(){
        var base_str = "" + new Date().getTime();
        return base_str + base_str.substr(-5);
    };
    WechatBot.prototype.my_id = function() {
        return this.wechat_data.Myinfo.UserName;
    };

    WechatBot.prototype.get_all_groups = function(){
        var link = document.createElement("a");
        var groups = [];
        $(".contact_item ").each(function(index, ele){
            var img = ele.querySelector("img");
            var image_path = img.getAttribute("mm-src");
            link.href = image_path;
            var url = new URL(link.href);
            var gid = url.searchParams.get("username");
            if(gid.startsWith("@@")) {
                groups.push(gid);
            }
        });
        return groups;
    };
    // info update function
    WechatBot.prototype.updateInfo_by_req = function(url, data, dic){
        // data is http header, save http req header
        this.wechat_data.req_header = data;
    };
    WechatBot.prototype.updateInfo_by_init = function(url, data, dic){
        GM_log("update info by processing init");
        // data is ajax xmlhttp.responseText
        var obj = JSON.parse(data);
        this.wechat_data.Myinfo = obj.User;
    };
    WechatBot.prototype.updateInfo_by_upload_media = function(url, data, dic){
        GM_log("update info by processing upload_media");
        // data is ajax xmlhttp.responseText
        var update_dic = JSON.parse(data);
        /*
         {
         "BaseResponse": {
         "Ret": 0,
         "ErrMsg": ""
         }
         ,
         "MediaId": "",
         "StartPos": 37077,
         "CDNThumbImgHeight": 410,
         "CDNThumbImgWidth": 352
         }

         */
        if(update_dic.BaseResponse.Ret !== 0){
            GM_log("upload media api error");
            return -1;
        }
        this.wechat_data.media_ids.push(update_dic.MediaId);
    };
    WechatBot.prototype.updateInfo = function(url, data, dic){
        var path_name = url.split("?")[0];
        // some url are /xxx/xxx£¿xxx, but some is https://file.wx2.qq.com/cgi-bin/mmwebwx-bin/webwxuploadmedia?f=json
        // GM_log("update info by ajax req, url=" + url);
        if(path_name === this.wechat_urls.init){
            this.updateInfo_by_init(url, data, dic);
        }else if(path_name.indexOf(this.wechat_urls.upload_media) >= 0){
            this.updateInfo_by_upload_media(url, data, dic);
        }else{
            // GM_log("Unsuport update api: " + path_name);
        }
    };

    WechatBot.prototype.sendVideo = function(media_id, to_user){
        var req_data = {};
        var msg_id = this.gen_client_id();
        var base_req = JSON.parse(this.wechat_data.req_header);
        req_data.BaseRequest = base_req.BaseRequest;
        req_data.Scene = 2;
        req_data.Msg = {
            ClientMsgId: msg_id,
            Content: "",
            FromUserName: this.wechat_data.Myinfo.UserName,
            LocalID: msg_id,
            MediaId: media_id,
            ToUserName: to_user,
            Type: 43,
        };
        var msg = JSON.stringify(req_data);
        var send_video_url = this.wechat_urls.send_video;  // url only contain path
        var full_url = send_video_url + "?fun=async&f=json";
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("POST",full_url,true);
        xmlHttp.send(msg);
    };
    var bot = new WechatBot();
    unsafeWindow.bot = bot;
    function botInit() {
        $(document).ready(function(){

        });
    }

    // hook XMLHttpRequest request to get infomation
    function hookAjax() {
        var _send = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(param){
            var onready= this.onreadystatechange;
            this.onreadystatechange = function(){
                if(onready !== null){
                    onready.call(this);
                }
                var xmlhttp = this;
                if (xmlhttp.readyState==4 && xmlhttp.status==200){
                    //GM_log("data ready: " +  xmlhttp.responseText);
                    bot.updateInfo(this._req_url, xmlhttp.responseText, {});
                }
            };
            bot.updateInfo_by_req(this._req_url, param, {});
            GM_log("param : " + param);
            GM_log("req : " + JSON.stringify(this));
            return _send.call(this, param);
        };


        var _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(methord, url, asys){
            this._req_url = url;
            return _open.call(this, methord, url, asys);
        };
    }
    hookAjax();
    botInit();
})(jQuery);
