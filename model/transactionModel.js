const mongoose=require('mongoose');

const transactionSchema= new mongoose.Schema({
    "transaction_from":{
        type:String,
        required:true
    },
    "transaction_to":{
        type:String,
        required:true
    }, 
    "transaction_value":{
        type:Number,
        required:true
    },
    "currency":{
        type:String,
        required:true
    },
    "transaction_hash":{
        type:String,
        required:true
    }
},{timestamps:true});

module.exports=mongoose.model('data',transactionSchema);