var express = require("express");
var app = express();
var http = require("http");
var server = http.Server(app);
var io = require("socket.io")(server);
var body = require("body-parser");
var formidable = require("formidable");
var session = require("express-session");
var fs = require("fs");
var path = require("path");
var gm = require("gm");
var mongo = require("mongodb");
var mongoClient = mongo.MongoClient;
var connect_str = "mongodb://localhost:27017/liaotian";
app.use(session({
	secret:"qwertyuioasdffffafdsgfdgas",
	resave:false,
	saveUninitialized:true,
}))
app.use(body.urlencoded({extended:false}));
app.use(express.static("./static"))
app.use(express.static("./uploads"))
app.get("/regist",function(req,res){
	res.render("./regist.ejs");
})
app.get("/checkusername",function(req,res){
	var username = req.query.username;
	mongoClient.connect(connect_str,function(err,db){
		if(err){
			res.send({
				error:1,
				data:"连接数据库失败"
			});
			return;
		}
		var obj = {username:username};
		db.collection("liaotianshi").findOne(obj,function(err,data){
			if(err){
				res.send({
					error:2,
					data:"查询数据库失败"
				})
				db.close();
				return;
			}
			if(data===null){
				res.send({error:0,data:"可以注册"})
			}else{
				res.send({error:3,data:"不可以注册"})

			}
			db.close();
		})
	})
})
app.post("/regist",function(req,res){
	var formid = new formidable.IncomingForm();
	formid.uploadDir = "./uploads";
	formid.parse(req,function(err,fields,files){
		if(err){
			res.send("解析上传数据出错了");
			return;
		}
		var username = fields.username;
		var password = fields.password;
		var newPath = "./uploads/"+username+path.parse(files.head_pic.name).ext;
		var newPath1 = username+path.parse(files.head_pic.name).ext;

		fs.rename(files.head_pic.path,newPath,function(err){
			if(err){
				res.send("头像文件改名失败");
				return;
			}
			mongoClient.connect(connect_str,function(err,db){
				if(err){
					res.send("连接数据库失败");
					return;
				}
				db.collection("liaotianshi").insertOne({username:username,password:password,head_pic:newPath1},function(err,data){
					if(err){
						res.send("插入数据库失败");
						db.close();
						return;
					}
					db.close();
					req.session.username = username;
					req.session.head_pic = newPath1;
					res.redirect("/main.ejs");  
				})
			})
		})
	})
})
app.post("/login",function(req,res){
	var username = req.body.username;
	var password = req.body.username;
	mongoClient.connect(connect_str,function(err,db){
		if(err){
			res.send("连接数据库失败");
			return;
		}
		var obj={
			username:username,
			password:password
		}
		db.collection("liaotianshi").findOne(obj,function(err,data){
			if(err){
				res.send("查询数据库失败");
				db.close();
				return
			}
			if(data===null){
				res.send("没有注册，请先注册吧！");
			}else{
				req.session.username = username;
				req.session.head_pic = data.head_pic;
				console.log(req.session.head_pic)
				res.redirect("/main.ejs") 
			}
		})

	})

})
app.get("/main.ejs",function(req,res){
	res.render("./main.ejs",{
		head_pic:req.session.head_pic,
		username:req.session.username
	})
})
// app.get("/uploads/:aaa",function(req,res){
// 	console.log(req.url);
// 	res.sendFile(__dirname+req.url);
// 	console.log(__dirname+req.url)
// })
var collection ={ 
}
io.on("connection",function(socket){
 var aaa ="";
  // 注册sendSelfInfo事件
  socket.on("sendSelfInfo",function(data){
   		// 前端向后端发送自己的信息的时候执行的函数 与此同时 更改aaa的值。  
   		var username = data.username;
   		// 更改aaa的值 用于保存用户名
   		aaa= username;
   		// 向collection全局变量中注册用户。
   		collection[username] = data;
  		// 当连接成功的时候 就自动触发前端的getUser事件 将所有的用户信息都传递过去 更新用户列表
   		io.sockets.emit("user",collection);
   		io.sockets.emit("welcome",data)
	})
	socket.on("sendMessage",function(data){
		io.sockets.emit("renderMessage",data)
	})
	socket.on("wolaile",function(data){
		io.sockets.emit("renderUser",data)
	})
	socket.on('disconnect',function(data){
		io.sockets.emit("someonego",{username:aaa})
		delete collection[aaa];
		io.sockets.emit("user",collection)
	})
})
server.listen(3000);