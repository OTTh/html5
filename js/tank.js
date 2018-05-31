var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
canvas.width = screen.width * 0.75;				//游戏画面宽高
canvas.height = screen.height * 0.75;

var stage;			//物体展现存储器
var unitIndex = 0;	//所有物体的唯一编号
var TANKSIZE = 40;	//坦克尺寸
var MISSSIZE = 10;	//子弹尺寸
var PROPSIZE = 24;	//道具尺寸
var WALLSIZE = 30;	//墙块尺寸
var CMDSIZE  = 50;  //指挥官尺寸
var allUnit = [];	//所有坦克和墙块物体集合
var enemy = [];		//敌军数量
var enemyCount = 10;	//敌军总数量

var wall = [];		//墙块集合
var wallCount = 20;	//墙块数量

var home = [];			//指挥部的墙
var homelife = 100.0;	//指挥部墙的最高生命值

var prop = [];		//道具集合
var propCount = 2;	//道具个数

var dieCount = 0;	//被歼灭的敌军总数量
var relifeCount = 3;//我方可以复活的机会次数

var gameState = 0;	//游戏状态 0-准备，1激战，2暂停，3胜利，4失败，5被冰冻，6冰冻敌军，7我方坦克死亡但可复活，8我方坦克死亡且不能复活
var stat = ["准备战斗", "激战中", "暂停", "胜利", "一败涂地", "被冰冻", "冰冻敌军", "等待复活", "等死"];
var tempState = 0;	//暂停前的状态记录，以便恢复

var gameTime = 359;	//游戏总时间
var gameTimer = null;//倒计时定时器
var pauseTimer = null;//暂停提示定时器
var pauseMsg = false;	//是否显示文字的开关
var startMsg = false;	//是否显示开始游戏的开关

var isOver = false;		//是否结束(以准备播放特效)
var isStopPaintBg = false;//是否停止绘制背景

var bgColor = ["#222", "#020", "#678", "#015"];
var bgIndex = 0;	//背景色索引

var imgdir = "img/";//图片路径

var kill = [15, 17, 20, 23, 26];	//杀伤力
var defense = [0, 2, 5, 7, 10];		//防御等级

var overx = (canvas.width - 350) / 2;//游戏结束时的文字坐标
var overy = canvas.height;

var diex = (canvas.width - 480) / 2;//坦克死亡时提示文字坐标
var diey = canvas.height;

/**
 * 物种存储器
 * @param {Object} ctx
 */
function Stage(ctx) {//画一个舞台
	this.ctx = ctx;
	this.data = [];
}

/**
 * 添加物种到存储器
 * @param {Object} obj
 */
Stage.prototype.add = function(obj) { //画一个舞台
	this.data.push(obj);
};

// 渲染循环
Stage.prototype.render = function() {
	var data = this.data;
	var ctx = this.ctx;

	function loop() {
		if ( !isStopPaintBg ) {
			// 清空画布
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			//绘制背景
			paintBackground(ctx);
			
		}
		
		if ( ! isOver ){
			//绘制信息
			paintInfo(ctx);
		}
		// 重绘每一个Object
		data.forEach(function(obj) {
			obj.update(ctx);
		});
		
		requestAnimationFrame(loop);
	}

	loop();
};

// 从存储器中删除某个元素
Stage.prototype.remove = function(obj) {
	var index = this.data.indexOf(obj);
	if (index > -1) {
		this.data.splice(index, 1);
	}
};

/**
 * 绘制背景
 * @param {Object} ctx
 */
function paintBackground(ctx){
	ctx.fillStyle = bgColor[bgIndex];
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	if ( ! isOver ){ 
		ctx.fillStyle = "#444";
		ctx.font = "80px 华文行楷";
		ctx.fillText("坦克大战之一统江湖", (canvas.width-80*9)/2, canvas.height / 2);
		ctx.font = "12px 宋体";
		ctx.fillText("作者qq:498357779", 10, canvas.height - 8);
		if ( gameState == 0 && enemy.length >= enemyCount && startMsg ){
			ctx.fillStyle = "#ffc";
			ctx.font = "30px 黑体";
			ctx.fillText("请按【Y】键开始游戏", (canvas.width - 300)/2, canvas.height/3);
		} else if ( gameState == 2 && pauseMsg ){
			ctx.fillStyle = "#ffc";
			ctx.font = "30px 黑体";
			ctx.fillText("请按【P】键继续……", (canvas.width - 300)/2, canvas.height/3);
		}
		
		var tx = 10, ty = canvas.height/2;
		ctx.fillStyle = "#555";
		ctx.font = "12px 宋体";
		ctx.fillText("Y    开始游戏", tx, ty);
		ty += 20;
		ctx.fillText("空格 发射子弹", tx, ty);
		ty += 20;
		ctx.fillText("P    暂停｜继续", tx, ty);
		ty += 20;
		ctx.fillText("R    复活生命", tx, ty);
		ty += 20;
		ctx.fillText("B    埋放地雷", tx, ty);
		ty += 20;
		ctx.fillText("K    切换背景", tx, ty);
		ty += 20;
		ctx.fillText("F5   重新开始", tx, ty);
		
		ty += 20;
		ctx.fillText("友情提示：获胜后可看美女画展哦～", tx, ty);
		if ( gameState > 0  ) {
			if ( gameTime >= 0 ) {
				if ( gameState != 3 && gameState != 4 ) {
					ctx.font = "20px 宋体";
					tx = canvas.width - 160;
					ty = canvas.height - 20;
					ctx.fillStyle = gameTime < 30 ? "RED":"#1F0";
					ctx.fillText("剩余时间: " , tx, ty);
					ctx.font = "21px Console";
					tx += 95;
					ctx.fillText(gameTime, tx, ty);
				}
			} else {
				gameState = 4;
				tankme.life = 0;
				command.life = 0;
				clearInterval(gameTimer);
			}
		}
	}
}

/** 绘制信息 **/
function paintInfo(ctx){
	var ix = 20, iy = 20;
	ctx.fillStyle = "white";
	ctx.font = "12px 宋体";
	ctx.fillText("敌军总量: " + enemy.length, ix, iy);
	ctx.fillText("歼灭数量: " + dieCount, ix + 100, iy);
	ctx.fillText("我的生命值: " + tankme.life, ix + 220, iy);
	ctx.fillText("复活机会: " + relifeCount, ix + 340, iy);
	if ( gameState == 1 || gameState == 2 || gameState == 5 || gameState == 6 ) {
		ctx.fillText("火力级别: " + tankme.level, ix + 440, iy);
		ctx.fillText("防御级别: " + tankme.protect, ix + 540, iy);
		ctx.fillText("可用地雷: " + tankme.boom, ix + 640, iy);
		ctx.fillText("移动速度:" + tankme.speed, ix + 740, 20);
	}
	ctx.fillText("游戏状态:", ix + 850, iy);
	
	ctx.fillStyle = gameState == 5 ? "RED" : "#4cA";
	ctx.fillText(stat[gameState], ix + 910, iy);
	ctx.fillStyle = "white";
	if ( gameState == 4 ){
		ctx.font = "62px Console";
		ctx.fillStyle = "RED";
		ctx.fillText("Game Over", overx, overy);
		if ( overy > canvas.height/2 - 70 ) {
			overy -= 7;
		}
		ctx.fillStyle = "GREEN";
		ctx.font = "50px 楷体";
		ctx.fillText("全军覆没，F5重新开始", diex, diey);
		if ( diey > canvas.height/2 + 70 ) {
			diey -= 15;
		}
	} else if ( gameState == 3 ){
		ctx.fillStyle = "#2B2";
		ctx.font = "80px 楷体";
		ctx.fillText("晚上吃鸡", overx, overy);
		if ( overy > canvas.height/2 - 65 ) {
			overy -= 7;
		}
	} else if ( gameState == 7 ){
		ctx.fillStyle = "#1BA";
		ctx.font = "42px 楷体";
		ctx.fillText("战死沙场，按【R】键复活", diex, diey);
		if ( diey > canvas.height/2 + 50 ) {
			diey -= 15;
		}
	} else if ( gameState == 8 ){
		ctx.fillStyle = "#F23";
		ctx.font = "50px 楷体";
		ctx.fillText("全军覆没，F5重新开始", diex, diey);
		if ( diey > canvas.height/2 + 70 ) {
			diey -= 15;
		}
	}
}

/** 道具类 **/
function Property(){
	this.x = parseInt(Math.random() * (canvas.width - 300)  ) + 120;
	this.y = parseInt(Math.random() * (canvas.height - 200) ) + 80;
	this.life = 0;
	this.w = PROPSIZE;
	this.h = PROPSIZE;
	this.type = "P";
	this.r = PROPSIZE / 2;
	return this;
}

Property.prototype.update = function(ctx) {
	if ( this.life <= 0 ){
		this.life = 0;
		stage.remove(this);
		return;
	}
	var image = new Image();
	image.src = this.src;
	ctx.drawImage(image, this.x, this.y, this.w, this.h);
};

/** 墙块类 **/
function Wall(x, y, life, type){
	this.x = x
	this.y = y;
	this.life = life;
	this.w = WALLSIZE;
	this.h = WALLSIZE;
	this.type = type;
	this.protect = 0;
	this.r = WALLSIZE / 2;
	this.src = imgdir + "/qiang.gif";
	return this;
}

Wall.prototype.update = function(ctx) {
	if ( this.life > 0 ){
		this.paintBlood(ctx);
		var image = new Image();
		image.src = this.src;
		ctx.drawImage(image, this.x, this.y, this.w, this.h);
	}
};
//血条
Wall.prototype.paintBlood = function (ctx){
	ctx.beginPath();
	var color = "#DDD";					//血条颜色
	if ( this.life < 30 ){
		color = "red";
	} else if ( this.life < 50 ){
		color = "#F28";
	} else if ( this.life < 70 ){
		color = "#F40";
	} else if ( this.life < 85 ){
		color = "orange";
	} else if ( this.life < 95 ){
		color = "cyan";
	}
	ctx.fillStyle = color;
	var d = (this.life / homelife) * this.w;
	ctx.fillRect(this.x, this.y - 3, d, 3);		//填充血条
	ctx.strokeStyle = color;					//边框颜色
	ctx.rect(this.x, this.y - 3, this.w, 2);	//绘制血条的边框
	ctx.stroke();
	ctx.closePath();
}

/** 爆炸效果类 ***/
function Boom(tank){
	this.x = tank.x;
	this.y = tank.y;
	this.w = 5;
	this.h = 5;
	this.index = 0;
	this.src = imgdir + "/6.gif";
	var me = this;
	this.timer = setInterval(function(){
		me.w += 4;
		me.h += 4;
		me.index ++;
	}, 50);
	return this;
}

Boom.prototype.update = function(ctx) {
	if ( this.index >= 10 ){
		clearInterval(this.timer);
		stage.remove(this);
		return;
	}
	var image = new Image();
	image.src = this.src;
	ctx.drawImage(image, this.x, this.y, this.w, this.h);
};

/*** 子弹类 ***/
function Missile(x, y, w, h, img, dir, type, r, speed, level){
	this.life = 1;			//生命值
	this.speed = speed;		//移动速度
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.r = r;				//假如是圆形的，此则r为半径，用于碰撞检验
	this.src = imgdir + "/" + img;
	this.dir = dir;			//朝向0123上下左右
	this.type = type;		//物种类别，敌我
	this.level = level;		//伤害能力
	var me = this;
	this.moveTimer = setInterval(function(){
		missileMove(me);
	}, 16);					//移动定时器
	return this;
}

// display object主要是根据自己的属性知道如何绘制自己
Missile.prototype.update = function(ctx) {
	if ( this.life <= 0 ){
		this.life = 0;
		stage.remove(this);
		return;
	}
	var image = new Image();
	image.src = this.src;
	ctx.drawImage(image, this.x, this.y, this.w, this.h);
};

/**
 * @param {Object} x
 * @param {Object} y
 * @param {Object} w
 * @param {Object} h
 * @param {Object} img
 * @param {Object} dir
 * @param {Object} type
 * @param {Object} r
 */
function Unit(x, y, w, h, img, dir, type, r, speed){
	this.life = 100;						//生命值
	this.speed = speed;						//移动速度
	this.x = x;
	this.y = y;
	this.w = w;
	this.h = h;
	this.r = r;								//假如坦克是圆形的，此则r为半径，用于碰撞检验
	this.src = imgdir + "/" + img;
	this.dir = dir;							//朝向0123上下左右
	this.type = type;						//物种类别，敌我
	this.level = 0;							//火力级别
	this.protect = type == "C" ? 3 : 0;		//防御级别(指挥官的防御为3)
	this.boom = 2;							//可用地雷数量
	this.left = false;
	this.right = false;
	this.up = false;
	this.down = false;
	this.index = unitIndex ++;				//唯一编号，用于区分每个对象
	this.hero = parseInt(Math.random()*100) % 3 == 0;//是否为英雄级别
	if ( this.hero && this.type == "D" ){
		this.speed = 6;
		this.level = 2;
		this.protect = 2;
		this.src = imgdir + "/dD.gif";
	}
	return this;
}

// display object主要是根据自己的属性知道如何绘制自己
Unit.prototype.update = function(ctx) {
	if ( this.life <= 0 ){
		this.life = 0;
		this.left = false;
		this.right = false;
		this.up = false;
		this.down = false;
		stage.remove(this);
		if ( this.type == "D" ){	//每死一辆敌军就出现一个道具
			var p = new Property();
			p.x = this.x + 8;
			p.y = this.y + 7;
			p.life = 1;
			p.img = parseInt(Math.random() * 10 );
			p.src = imgdir + "/x" + p.img + ".gif";
			allUnit.push(p);
			stage.add(p);
		}
		var b = new Boom(this);
		stage.add(b);
		return;
	} else {
		if ( this.type == "D" || this.type == "W" || this.type == "C"){
			this.paintBlood(ctx);
		}
	}
	var image = new Image();
	image.src = this.src;
	ctx.drawImage(image, this.x, this.y, this.w, this.h);
};

/**
 * 为物体unit绘制血条
 * @param {Object} ctx
 */
Unit.prototype.paintBlood = function (ctx){
	ctx.beginPath();
	var color = "springgreen";					//血条颜色
	if ( this.life < 30 ){
		color = "red";
	} else if ( this.life < 60 ){
		color = "orange";
	} else if ( this.life < 90 ){
		color = "cyan";
	}
	ctx.fillStyle = color;
	var d = (this.life / 100.0) * this.w;
	ctx.fillRect(this.x, this.y - 5, d, 4);		//填充血条
	ctx.strokeStyle = color;					//边框颜色
	ctx.rect(this.x, this.y - 5, this.w, 4);	//绘制血条的边框
	ctx.stroke();
	ctx.closePath();
}

/**
 * 物体开火的方法
 */
Unit.prototype.fire = function() {
	var _x = this.x, _y = this.y;
	if ( this.dir == 0 ){				//向上发射
		_x += 15;
		_y -= 8;
	} else if ( this.dir == 1 ){		//向下发射
		_x += 14;
		_y += 39;
	} else if ( this.dir == 2 ){		//向左发射
		_x -= 8;
		_y += 14;
	} else if ( this.dir == 3 ){		//向右发射
		_x += 38;
		_y += 15;
	}
	//构造一颗子弹添加到存储器
	var mis = new Missile(_x, _y, MISSSIZE, MISSSIZE, "m" + this.level + ".gif", this.dir, "M" + this.type, 0, 9, this.level);
	stage.add(mis);
}

/** 移动碰撞检查 ，包括子弹的伤害检查 **/
function checkHit(unit){
	if ( unit.x < 0 || unit.y < 0 || unit.x > canvas.width - unit.w || unit.y > canvas.height - unit.h ){
		return true;
	}
	for ( var i = 0; i < allUnit.length; i ++){
		if ( allUnit[i].life <= 0 ){
			continue;						
		}
		if ( unit.type == "W" && allUnit[i].type == "P" && allUnit[i].img == 10 ) {
			continue;				//我方坦克拒绝与地雷碰撞
		}
		if ( unit.type == "D" || unit.type == "W" ){
			if ( unit.index == allUnit[i].index ){
				continue;			//坦克移动时，自己与自己不考虑碰撞检查
			}
		}
		if ( unit.type == "MD" && allUnit[i].type == "D" || unit.type == "MW" && allUnit[i].type == "W") {
			continue;				//子弹和它的发射者没必要检查碰撞
		}
		if ( ( unit.type == "MD" || unit.type == "MW" ) && allUnit[i].type == "P"){
			continue;				//子弹和道具没必要检查碰撞
		}
		if ( hitForRectangle(unit, allUnit[i])) {
			hited(unit, allUnit[i]);
			return true;
		}
	}
	return false;
}

/**
 * 已经发生碰撞的处理
 * @param {主物体} unit 
 * @param {被碰物体} target
 */
function hited(unit, target){
	if ( unit.type == "MD" || unit.type == "MW") { //如果是子弹与当前物体发生的碰撞就失血(生命值-失血+防御)
		target.life = target.life - kill[unit.level] + defense[target.protect];
		if ( target.type == "D" ){
			if ( target.life <= 0 ){
				dieCount ++;			//歼灭数量+1
				aud_enemyboom.play();
			} else {
				aud_hitenemy.play();
			}
		} else if ( target.type == "C" ){
			if ( target.life <= 0 ) {
				gameState = 4;			//指挥官死了
				tankme.life = 0;
				relifeCount = 0;
				aud_die.play();
				clearInterval(gameTimer);
				setTimeout(function(){
					aud_lost.play();
				}, 100);
			} else {
				aud_hithe.play();
				aud_hitcmd.play();
			}
		} else if ( target.type == "W" ){
			if ( target.life <= 0  ){
				aud_lost.play();
				gameState = relifeCount > 0 ? 7 : 8;		//有活复机会时我方坦克死亡
			} else {
				aud_hitme.play();
			}
		} else if ( target.type == "Q" ){
			aud_hitwall.play();
		}
	} else if ( target.img == 0 ) {
		if ( unit.speed == 8 && unit.type == "D" ){
			buildEnemy(1);
		}
		if (unit.type == "W" ){
			aud_prop.play();
		}
		unit.speed += unit.speed > 7 ? 0 : 1;
	} else if ( target.img == 3 ) {
		if ( unit.level == kill.length - 1 && unit.type == "D" ){
			buildEnemy(1);
		}
		if ( unit.type == "W" ){
			aud_prop.play();
		}
		unit.level += unit.level >= kill.length - 1 ? 0 : 1;
	} else if ( target.img == 4 ) {
		if ( unit.protect == defense.length - 1 && unit.type == "D" ){
			buildEnemy(1);
		}
		if (unit.type == "W" ){
			aud_prop.play();
		}
		unit.protect += unit.protect >= defense.length - 1 ? 0 : 1;
	} else if ( target.img == 6 ) {
		if ( unit.life == 100 && unit.type == "D" ){
			buildEnemy(1);
		}
		if ( unit.type == "W" ){
			aud_daxiao.play();
		}
		unit.life += unit.life > 100 ? 0 : 20;
		unit.life = unit.life > 100 ? 100 : unit.life;
	} else if ( target.img == 7 ) {
		aud_caidilei.play();
		unit.life -= unit.life <= 0 ? 0 : parseInt(Math.random() * 30) + 65;
		unit.life = unit.life < 0 ? 0 : unit.life;
		if ( unit.life <= 0 ){
			if ( unit.type == "W" ) {
				gameState = relifeCount > 0 ? 7 : 8;	//有活复机会时我方坦克死亡(地雷炸死的)
			} else if ( unit.type == "D" ) {
				dieCount ++;							//歼灭数量+1(地雷炸死的)
			}
		}
	} else if ( target.img == 1 ) {
		if ( unit.type == "W" ){
			command.life += command.life > 100 ? 0 : 25;
			command.life = command.life > 100 ? 100 : command.life;
			if (unit.type == "W" ){
				aud_yongbao.play();
			}
		} else {					//敌军拾到拥抱，奖励1辆坦克，也加血15
			buildEnemy(1);
		}
		unit.life += unit.life > 100 ? 0 : 15;
		unit.life = unit.life > 100 ? 100 : unit.life;
	} else if ( target.img == 2 && gameState != 3 && gameState != 4 ) {
		if ( unit.type == "W" ){
			if ( gameState != 6 && gameState != 5){
				aud_stop.play();
				tempState = gameState;
				beginUnice();
				gameState = 6;
			}
		} else {					//敌军拾到猪头
			if ( gameState != 5 && gameState != 6 && gameState != 7 && gameState != 8 ){
				aud_ice.play();
				tempState = gameState;
				beginUnice();
				gameState = 5;
			}
		}
	} else if ( target.img == 5 ) {
		if ( unit.type == "W" ){
			aud_prop.play();
			updateHome(20);
		} else {					//敌军拾到房子
			aud_killhome.play();
			updateHome(-10);
		}
	} else if ( target.img == 8 ) {
		if ( unit.type == "W" ){
			aud_daxiao.play();
			relifeCount += relifeCount > 5 ? 0 : 1;
		} else {					//敌军拾到草莓
			buildEnemy(2);
		}
	} else if ( target.img == 9 ) {
		if ( unit.type == "W" ){
			aud_daxiao.play();
			unit.boom += unit.boom > 7 ? 0 : 2;
		} else {					//敌军拾到笑脸
			buildEnemy(2);
		}
	} else if ( target.img == 10 ) {
		if ( unit.type == "D" ){
			aud_enemyboom.play();
			unit.life -= unit.life <= 0 ? 0 : parseInt(Math.random() * 30) + 65;
			unit.life = unit.life < 0 ? 0 : unit.life;
			if ( unit.life <= 0 ){
				dieCount ++;							//歼灭数量+1(地雷炸死的)
			}
		}
	}
	if ( target.type == "P" ){		//被拾的道具不显示
		target.life = 0;
		stage.remove(target);
	}
}

/**
 * 启动解冻定时器
 */
function beginUnice(){
	iceTimer = setInterval(function(){
		iceTime --;
		if ( iceTime == 0 ){
			iceTime = 4;
			if ( gameState == 5 || gameState == 6 || gameState == 2 ) {
				gameState = tempState; 
			}
			clearInterval(iceTimer);
		}
	}, 1000);
}

/**
 * 拾到房子时对home中的墙进行更新生命
 * @param {Object} n
 */
function updateHome(n){
	for ( var i = 0; i < home.length; i ++){
		home[i].life += n;
		home[i].life = home[i].life > homelife ? homelife : home[i].life;
		home[i].life = home[i].life < 0 ? 0 : home[i].life;
	}
}

/**
 * 圆形物体碰撞检验
 * @param {Object} o1
 * @param {Object} o2
 */
function hitForCircle(o1,o2){
	var dis = o1.r + o2.r;
	var DISX = (o1.x - o2.x) * (o1.x - o2.x);
	var DISY = (o1.y - o2.y) * (o1.y - o2.y);
	if (dis >= Math.sqrt(DISX + DISY)) {
		return true;
	}
	return false;
}
/**
 * 矩形物体碰撞检验
 * @param {Object} o1
 * @param {Object} o2
 */
function hitForRectangle(o1,o2){
	if ( o1.x < o2.x )
	{
		if ( o2.x - o1.x <= o1.w ){
			if ( o1.y < o2.y ){
				return o2.y - o1.y <= o1.w;
			} else if ( o1.y > o2.y ){
				return o1.y - o2.y <= o2.w;
			} else 
				return o1.y == o2.y;
		}
	} else if ( o1.x > o2.x )
	{
		if ( o1.x - o2.x <= o2.w ){
			if ( o1.y < o2.y ){
				return o2.y - o1.y <= o1.w;
			} else if ( o1.y > o2.y ){
				return o1.y - o2.y <= o2.w;
			} else 
				return o1.y == o2.y;
		}
	} else {
		if ( o1.y < o2.y ){
			return o2.y - o1.y <= o1.w;
		} else if ( o1.y > o2.y ){
			return o1.y - o2.y <= o2.w;
		} else 
			return o1.y == o2.y;
	}
 	return false;
}
//子弹
function missileMove(m){
	var sp = gameState == 2 ? 0 : m.speed;
	if ( m.dir == 0 ){
		m.y -= sp;
	} else if ( m.dir == 1 ){
		m.y += sp;
	} else if ( m.dir == 2 ){
		m.x -= sp;
	} else if ( m.dir == 3 ){
		m.x += sp;
	}
	
	if ( checkHit(m) ){
		stage.remove(m);
		clearInterval(m.moveTimer);
		return;
	}
}

/**
 * 让一个物体移动
 * @param {Object} unit
 */
function doMove(unit){
	if ( unit.life <= 0 ){
		return;
	}
	var ox = unit.x, oy = unit.y;
	if ( unit.left ) {
		unit.x -= unit.speed;
		unit.src = imgdir + "/tL.gif";
		unit.dir = 2;
	} else if ( unit.right ) {
		unit.x += unit.speed;
		unit.src = imgdir + "/tR.gif";
		unit.dir = 3;
	} else if ( unit.up ){
		unit.y -= unit.speed;
		unit.src = imgdir + "/tU.gif";
		unit.dir = 0;
	} else if ( unit.down ){
		unit.y += unit.speed;
		unit.src = imgdir + "/tD.gif";
		unit.dir = 1;
	}
	
	if ( checkHit(unit) )
	{	//如果发生碰撞就还原坐标
		unit.x = ox; unit.y = oy;
	}
}

/**敌军移动和开火函数**/
function enemyMove(unit){
	var ox = unit.x, oy = unit.y;
	var n = parseInt(Math.random() * 100);
	if ( n % 37 == 0 ){
		n = parseInt(Math.random() * 6);
		if ( (n == 4 || n == 5 ) ){
			if ( tankme.life > 0 ){
				if ( unit.x < tankme.x && tankme.x - unit.x > 60 ){
					n = 3;
				} else if ( unit.x > tankme.x && unit.x - tankme.x > 60 ){
					n = 2;
				} else if ( unit.y < tankme.y && tankme.y - unit.y > 100 ){
					n = 1;
				} else if (unit.y > tankme.y && unit.y - tankme.y > 100 ){
					n = 0;
				} else {
					n = parseInt(Math.random() * 4);
				}
			} else {
				n = parseInt(Math.random() * 4);
			}
		}
		unit.dir = n;
	}
	n = parseInt(Math.random() * 100);
	var m = enemy.length - dieCount < 8 ? 20 : 37;
	if ( n % m == 0 ){
		unit.fire();
	}
	//unit.speed = 0; unit.dir = 1;
	if ( unit.dir == 2 ) {
		unit.x -= unit.speed;
		unit.src = imgdir + (unit.hero ? "/dL.gif" : "/tankL.gif");
	} else if ( unit.dir == 3 ) {
		unit.x += unit.speed;
		unit.src = imgdir + (unit.hero ? "/dR.gif" : "/tankR.gif");
	} else if ( unit.dir == 0 ){
		unit.y -= unit.speed;
		unit.src = imgdir + (unit.hero ? "/dU.gif" : "/tankU.gif");
	} else if ( unit.dir == 1 ){
		unit.y += unit.speed;
		unit.src = imgdir + (unit.hero ? "/dD.gif" : "/tankD.gif");
	}
	if ( checkHit(unit) )
	{	//如果发生碰撞就还原坐标
		unit.x = ox; unit.y = oy;
	}
}

/**
 * 在界面上创建count辆敌军坦克
 * @param {Object} count
 */
function buildEnemy(count){
	if ( enemy.length - dieCount > 24 ) return;
	for ( var i = 0; i < count; i ++){
		var ex = parseInt(Math.random() * (canvas.width - 100) );
		var	ey = parseInt(Math.random() * (canvas.height - 80) );
		var e = new Unit(ex, ey, TANKSIZE, TANKSIZE, "dD.gif", 2, "D", TANKSIZE/2, 2);
		while ( checkHit(e) ) {
			ex = parseInt(Math.random() * (canvas.width - 100) );
			ey = parseInt(Math.random() * (canvas.height - 80) );
			e.x = ex;
			e.y = ey;
		}
		stage.add(e);
		enemy.push(e);
		allUnit.push(e);
	}
	aud_newenemy.play();
}

/**
 * 我方坦克复活操作
 */
function tankmeRelife(){
	relifeCount --;
	diey = canvas.height;
	tankme.life = 100;
	tankme.left = false;
	tankme.right = false;
	tankme.up = false;
	tankme.down = false;
	tankme.speed = 5;
	tankme.level = 0;
	tankme.protect = 0;
	tankme.boom = 2;
	var _x = 5, _y = 5;
	while ( checkHit(tankme) ){	//避免复活时与其他物体碰撞重叠
		tankme.x += _x;
		tankme.y += _y;
		if ( tankme.x > canvas.width || tankme.x < 0 ) {
			_x = - _x;
		}
		if ( tankme.y > canvas.height || tankme.y < 0 ){
			_y = - _y;
		}
	}
	stage.add(tankme);
}

// 启动倒计时道具随机显示定时器
function beginTimer(){
	gameTimer = setInterval(function(){
		if ( gameState == 3 || gameState == 4 ){
			clearInterval(gameTimer); return;
		}
		if ( gameState != 2 && gameState != 7 ){
			gameTime --;
			if ( gameTime > 0 && gameTime % 50 == 0 ){
				buildEnemy(3);
			}
		}
	}, 1000);
	propTimer = setInterval(function(){
		if ( gameState == 3 || gameState == 4 ) {
			clearInterval(propTimer);
			return;
		}
		if ( gameState == 2 ){	//游戏暂停，道具也暂停
			return;
		}
		for ( var i = 0; i < prop.length; i ++){
			if ( prop[i].life == 0 ){
				var _x = parseInt(Math.random() * (canvas.width - 300)  ) + 120;
				var _y = parseInt(Math.random() * (canvas.height - 200) ) + 80;
				prop[i].x = _x;
				prop[i].y = _y;
				prop[i].img = parseInt(Math.random() * 10 );
//					prop[i].img = 5;
				prop[i].src = imgdir + "/x" + prop[i].img + ".gif";
				prop[i].life = 1;
				stage.add(prop[i]);
			} else {
				prop[i].life = 0;
				stage.remove(prop[i]);
			}
		}
	}, parseInt(Math.random() * 5000) + 9000);
}

function Photo(x, y, life, index){
	this.x = x
	this.y = y;
	this.life = life;
	this.w = 380;
	if ( index == 5 || index == 7 ){
		this.w = 450;
	} else if ( index == 9 || index == 11 ) {
		this.w = 550;
	}
	this.h = 540;
	this.src = imgdir + "/p" + index + ".gif";
	return this;
}

Photo.prototype.update = function(ctx) {
	if ( this.life > 0 ){
		var image = new Image();
		image.src = this.src;
		ctx.drawImage(image, this.x, this.y, this.w, this.h);
	}
};

function animatBegin() {
	isOver = true;
	stage.data.length = 0;
	var px = canvas.width;
	var i = 0;
	var lastPhoto = null;
	while ( i < 12 ){
		var p = new Photo(px, (canvas.height - 540)/2, 1, i);
		stage.add(p);
		i++;
		px += p.w;
		lastPhoto = p;
	}
	aud_photo.play();
	
	photoTimer = setInterval(function(){
		if ( lastPhoto.x + lastPhoto.w < ( screen.width - canvas.width ) / 2 ) {
			clearInterval(photoTimer);
			isStopPaintBg = true;
			ctx.fillStyle = "chartreuse";
			ctx.font = "80px Broadway";
			ctx.fillText("The End", (canvas.width - 300 ) / 2, (canvas.height - 50) / 2 + 50  );
			stage.data.length = 0;
			aud_photo.pause();
		} else {
			photoMove();
		}
	}, 30);
}

function photoMove(){
	for ( var i = 0; i < stage.data.length; i ++){
		var p = stage.data[i];
		p.x -= 2;
	}
}
// 创建两个display object
var tankme = new Unit(canvas.width*0.35, canvas.height*0.7, TANKSIZE, TANKSIZE, "tU.gif", 0, "W", TANKSIZE/2, 5);
var command = new Unit((canvas.width-CMDSIZE)/2, canvas.height - CMDSIZE, CMDSIZE, CMDSIZE, "cmd.gif", 0, "C", CMDSIZE/2, 0);
var mainTimer = null;	//主界面显示定时器
var iceTimer = null;	//解冻定时器
var iceTime = 4;		//冰冻时间4秒
var tankCreatTimer = null;//创建坦克定时器
var photoTimer = null;	//图片播放定时器

var propTimer = null;	//道具定时器

var aud_caidilei	= new Audio();
var aud_hitcmd 		= new Audio();
var aud_enemyboom	= new Audio();
var aud_die 		= new Audio();
var aud_hithe 		= new Audio();
var aud_hitwall		= new Audio();
var aud_letsmove	= new Audio();
var aud_daxiao 		= new Audio();
var aud_stop 		= new Audio();
var aud_yongbao		= new Audio();
var aud_ice 		= new Audio();
var aud_blei 		= new Audio();
var aud_newenemy	= new Audio();
var aud_hitenemy	= new Audio();
var aud_hitme 		= new Audio();
var aud_prop 		= new Audio();
var aud_killhome	= new Audio();
var aud_winend		= new Audio();
var aud_lost		= new Audio();
var aud_move		= new Audio();
var aud_photo 		= new Audio();
function init() {
	
	aud_caidilei.src 	= "sounds/zeg.wav";
	aud_hitcmd.src 		= "sounds/hitcmd.wav";
	aud_enemyboom.src	= "sounds/bomb2.wav";
	aud_die.src 		= "sounds/die.wav";
	aud_hithe.src 		= "sounds/hithe.wav";
	aud_hitwall.src 	= "sounds/di.wav";
	aud_hitme.src 		= "sounds/hitme.wav";
	aud_hitenemy.src	= "sounds/fire.wav";
	aud_newenemy.src 	= "sounds/newenemy.wav";
	aud_letsmove.src 	= "sounds/letsmove.wav";
	aud_daxiao.src 		= "sounds/daxiao.wav";
	aud_stop.src 		= "sounds/stop.wav";
	aud_yongbao.src 	= "sounds/yongbao.wav";
	aud_ice.src 		= "sounds/ice.wav";
	aud_blei.src 		= "sounds/bready.wav";
	aud_prop.src		= "sounds/prop.wav";
	aud_killhome.src	= "sounds/killhome.wav";
	aud_winend.src		= "sounds/winend.wav";
	aud_lost.src		= "sounds/lost.wav";
	aud_move.src		= "sounds/move.wav";
	
	aud_photo.src 		= "sounds/bgm.wav";
	aud_photo.loop = -1;
	
	aud_move.play();
	
	stage = new Stage(ctx);

	// 放入stage并开始渲染循环
	stage.add(tankme);
	
	/** 敌军的初始化 **/
	var ex = (canvas.width - enemyCount * (TANKSIZE+2)) / 2, ey = 50;
	tankCreatTimer = setInterval(function(){
		if ( enemy.length < enemyCount ){
			var tankEnemy = new Unit(ex, ey, TANKSIZE, TANKSIZE, "tankD.gif", 2, "D", TANKSIZE/2, 5);
			ex += tankEnemy.w + 5;
			stage.add(tankEnemy);
			enemy.push(tankEnemy);
			allUnit.push(tankEnemy);
		} else {
			clearInterval(tankCreatTimer);
			pauseTimer = setInterval(function(){
				startMsg = !startMsg;
			}, 400);
		}
	}, 70);
	
	/** 墙块的初始化 **/
	var wx = (canvas.width - (wallCount + 4) * (WALLSIZE)) / 2, wy = 110;
	for ( var i = 0; i < wallCount; i ++ ){
		var w = new Wall(wx, wy, 100, "Q");
		wx += w.w;
		if ( i == 4 || i == 9 || i == 14 ){
			wx += w.w;
		}
		if ( i == 9 ){
			wx += w.w;
		}
		stage.add(w);
		wall.push(w);
		allUnit.push(w);
	}
	var wx =148 , wy = 40;
    	for ( var i = 0; i <13; i ++ ){
    		var w = new Wall(wx, wy, 100, "Q");
    		wy += w.w;
    		stage.add(w);
    		wall.push(w);
    		allUnit.push(w);
    	}
    var wx =905 , wy = 40;
        	for ( var i = 0; i <13; i ++ ){
        		var w = new Wall(wx, wy, 100, "Q");
        		wy += w.w;
        		stage.add(w);
        		wall.push(w);
        		allUnit.push(w);
        	}


	
	/** 道具的初始化 **/
	for ( var i = 0; i < propCount; i ++ ){
		var p = new Property();
		prop.push(p);
		allUnit.push(p);
	}
	/** 指挥y


	总部的初始化 **/
	wx = command.x - WALLSIZE - 5;
	wy = command.y + (CMDSIZE - WALLSIZE) - WALLSIZE * 2;
	for ( var i = 0; i < 8; i ++ ){
		var w = new Wall(wx, wy, homelife, "Q");
		w.protect = 3;
		home.push(w);
		stage.add(w);
		allUnit.push(w);
		if ( i < 3 ){
			wx += WALLSIZE;
		} else if ( i == 3 || i == 4 ){
			wy += WALLSIZE;
		} else if ( i == 5 ) {
			wx = command.x - WALLSIZE - 5;
			wy -= WALLSIZE;
		} else if ( i >= 6 ) {
			wy += WALLSIZE;
		}
	}
	
	stage.add(command);
	allUnit.push(tankme);
	allUnit.push(command);
	
	stage.render();
	// 这里不断改变一个display object的显示属性
	mainTimer = setInterval(function(){
		if ( gameState > 0 ) {
			if ( gameState == 2 ){
				return;
			}
			if ( gameState != 5 ) {
				doMove(tankme);
			}
			if ( dieCount == enemy.length ){
				if ( gameState != 4 ){
					gameState = 3;
					setTimeout("animatBegin();", 4000);
					aud_winend.play();
					clearInterval(gameTimer);
					clearInterval(mainTimer);
				}
				return;
			}
			if ( gameState != 6 ){
				for ( var i = 0; i < enemy.length; i ++){
					if ( enemy[i].life > 0 ) {
						enemyMove(enemy[i]);
					}
				}
			}
		}
	}, 17)
}
//监听器
addEventListener("keydown", function(e){
	if ( e.keyCode == 37 ){
		tankme.left = true;
	} else if ( e.keyCode == 38 ){
		tankme.up = true;
	} else if ( e.keyCode == 39 ){
		tankme.right = true;
	} else if ( e.keyCode == 40 ){
		tankme.down = true;
	} else if ( e.keyCode == 89 && gameState == 0 && enemy.length >= enemyCount ){ //按y键开始游戏
		aud_letsmove.play();
		setTimeout(function(){
			aud_letsmove.src = "sounds/go.wav";
			aud_letsmove.play();
		}, 1500);
		gameState = 1;
		clearInterval(pauseTimer);
		beginTimer();
	} else if ( e.keyCode == 75 ){
		if ( bgIndex == bgColor.length - 1 ){
			bgIndex = 0;
		} else { 
			bgIndex ++;
		}
	}
});
//监听器
addEventListener("keyup", function(e){
	if ( e.keyCode == 80 && gameState == 1 ){
		tempState = gameState;
		gameState = 2;
		pauseTimer = setInterval(function(){
			pauseMsg = !pauseMsg;
		}, 500);
		return;
	} else if ( e.keyCode == 80 && gameState == 2 ){
		gameState = tempState;
		clearInterval(pauseTimer);
		pauseMsg = false;
	}
	if ( tankme.life > 0 ){
		if ( e.keyCode == 37 ){
			tankme.left = false;
		} else if ( e.keyCode == 38 ){
			tankme.up = false;
		} else if ( e.keyCode == 39 ){
			tankme.right = false;
		} else if ( e.keyCode == 40 ){
			tankme.down = false;
		} else if ( e.keyCode == 32 ){
			if ( gameState == 1 || gameState == 6 ) {
				tankme.fire();
			}
		} else if ( e.keyCode == 66 ){
			if ( gameState == 1 || gameState == 6 ){
				if ( tankme.boom > 0 ){
					aud_blei.play();
					var p = new Property();
					p.x = tankme.x + 8;
					p.y = tankme.y + 7;
					p.life = 1;
					p.img = 10;
					p.src = imgdir + "/x" + p.img + ".gif";
					allUnit.push(p);
					stage.add(p);
					tankme.boom --;
				}
			}
		}
	} else {
		if ( e.keyCode == 82 && relifeCount > 0 && gameState == 7 ){
			gameState = 1;
			tankmeRelife();					//复活r
		}
	}
});