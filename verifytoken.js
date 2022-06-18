const jwt = require('jsonwebtoken');


function verifytoken(req, res, next) {
    
    var token = req.headers['x-access-token'] || req.headers['authorization'];
    if (token===undefined) return res.status(400).send({"Error": "Token is not present"});

    if (token.startsWith("Bearer ")){
        token =token.slice(7,token.length);
    }
    if (!token) return res.status(401).send("Access Denied..")

    verified = jwt.verify(token, process.env.token_secret, (err, tokendata) => {
        if (err) return res.send({ message: "Authentication error.." })
        req.tokendata = tokendata;
        next()
    })

}

module.exports = verifytoken;



