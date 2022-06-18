const express=require('express');
const app=express();
const mongoose=require('mongoose');
require('dotenv').config();
const web=require('./routes/router');

app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use('/',web);

mongoose.connect(process.env.db_connect,{useNewUrlParser:true})
.then(()=>console.log("Connected to database.."))
.catch((err)=>console.log(err));


app.listen(3000,()=>console.log("Server is listening at 3000"));