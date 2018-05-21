"use strict";

var hashItem = function(text) {  //定义hash信息结构体
	if (text) {
		var obj = JSON.parse(text);
		this.hashvalue = obj.hashvalue;
		this.submitter = obj.submitter;
		this.type = obj.type;
		this.decoded_value = obj.decoded_value;
		this.crack_flag = obj.crack_flag;
		this.nasvalue =  new BigNumber(obj.nasvalue); //悬赏金额
		this.gflag = obj.gflag; //求助列表的唯一序号
	} else {
	    this.hashvalue = ""; //hash值
	    this.submitter = ""; //提交者
	    this.type = ""; //md5,sha1,unknown
		this.decoded_value = ""; //明文
		this.crack_flag = "";//0 表示未被破解，1 表示已被破解
		this.nasvalue = new BigNumber(0);
		this.gflag = 0;
	}
};

hashItem.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

var HashCrack = function () {
    LocalContractStorage.defineMapProperty(this, "repo", {
        parse: function (text) {
            return new hashItem(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
	LocalContractStorage.defineProperty(this,"flag_ask"); //请求的总条数
	LocalContractStorage.defineProperty(this,"flag_con"); //贡献的总条数
};


HashCrack.prototype = {
	
    init: function () {
		this.flag_ask = 0;
		this.flag_con = 0;
    },
	
	search: function(hashvalue){ //查看该hash是否已存在，存在则返回内容
		var hashItem1 = this.repo.get(hashvalue);
		if (hashItem1){
			return hashItem1;
		}
		else{
			return 0;
		}
	},
	
	getasklist: function(){ //返回待破解的列表
		var result = new Array();
		for (var i = 0;i<this.flag_ask;i++){
			//var onr = new Array();
			var hashit = this.repo.get("asklist_"+String(i));
			if (hashit){
				var onr = new Array();
				onr.push(hashit.hashvalue);
				onr.push(hashit.type);
				onr.push(hashit.nasvalue);
				result.push(onr);
			}
			
		}
		return result;
	},
	getcontributionlist: function(){ //返回已破解的列表
		var result = new Array();
		for (var i = 0;i<this.flag_con;i++){
			var onr = new Array();
			var hashit = this.repo.get("conlist_"+String(i));
			onr.push(hashit.hashvalue);
			onr.push(hashit.type);
			onr.push(hashit.nasvalue);
			result.push(onr);
		}
		return result;
	},
	
    contribution: function (hashvalue, type, decoded_value) { //贡献一个hash的解密结果
        hashvalue = hashvalue.trim();
		type = type.trim();
        decoded_value = decoded_value.trim();
        var from = Blockchain.transaction.from;
        var hashItem2 = new hashItem();
        hashItem2.submitter = from;
        hashItem2.hashvalue = hashvalue;
        hashItem2.type = type;
		hashItem2.decoded_value = decoded_value;
		hashItem2.crack_flag = 1;
		var nasv = new BigNumber(this.repo.get(hashvalue).nasvalue);
		var gf = this.repo.get(hashvalue).gflag;
		hashItem2.nasvalue = nasv;
        this.repo.set(hashvalue, hashItem2);
		this.repo.set("conlist_"+String(this.flag_con),hashItem2);
		this.flag_con +=1;
		this.repo.del("asklist_"+String(gf));
		
		if (nasv !=0)
			var result = Blockchain.transfer(from, nasv);
		if (!result){ //转账失败
			throw new Error("transfer failed.");
		}
		Event.Trigger("transnas", {
		Transfer: {
        from: Blockchain.transaction.to,
        to: from,
        value: nasv.toString()
			}
		});
		//return 1;
    },

    askforhelp: function (hashvalue,type) { //求助破解一个hash值
        hashvalue = hashvalue.trim();
		type = type.trim();
		var truevaule = new BigNumber(Blockchain.transaction.value);
		var hashItem3 = new hashItem();
		var from = Blockchain.transaction.from;
		hashItem3.submitter = from;
		hashItem3.hashvalue = hashvalue;
		hashItem3.type = type;
		hashItem3.decoded_value = "";
		hashItem3.crack_flag = 0;
		hashItem3.nasvalue = truevaule;
		hashItem3.gflag = this.flag_ask;
		this.repo.set(hashvalue, hashItem3);
		this.repo.set("asklist_"+String(this.flag_ask),hashItem3);
		this.flag_ask +=1;
		return 1;
    }
	
};
module.exports = HashCrack;

//addr:n1tCm3djEef9jvD5DZpMHm72qsJTiaZehuj