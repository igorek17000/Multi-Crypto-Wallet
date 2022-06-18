const mongoose=require('mongoose');

const userSchema= new mongoose.Schema({
    name: {
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    otp:{
        type:Number
    },
    activation:{
        type:Boolean
    },
    accountAddress:{
        type:String
    },
    privateKey:{
        type:String
    }
},{timestamps:true});

module.exports=mongoose.model('user',userSchema);