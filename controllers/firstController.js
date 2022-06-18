const Web3 = require('web3');
const ethNetwork = "https://ropsten.infura.io/v3/bb6b79a97acd4c78a1513911d0a1d98f";
const web3_ETH = new Web3(new Web3.providers.HttpProvider(ethNetwork));
const web3_BNB = new Web3('https://data-seed-prebsc-1-s1.binance.org:8545');
const user = require('../model/userModel');
const data = require('../model/transactionModel')
const { registerValidation, loginValidation } = require('../validate');
const bcrypt = require('bcryptjs');
var nodemailer = require('nodemailer');
var newOTP = require('otp-generators');
const jwt = require('jsonwebtoken');


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.email,
        pass: process.env.password
    },
    tls: {
        rejectUnauthorized: false
    }
})


exports.register = async (req, res) => {
    const { error } = await registerValidation({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    });
    if (error) return res.status(400).send(error.details[0].message);

    var otp = newOTP.generate(6, { alphabets: false, upperCase: false, specialChar: false });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const found = await user.findOne({ email: req.body.email });
    if (found != null) return res.send('This email is already registered please try with another email');

    try {
        var mailOptions = {
            from: process.env.email,
            to: req.body.email,
            subject: "Otp for registration is: ",
            html: "<h3>OTP for account verification is </h3>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>" // html body
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) return res.status(400).send(error);
            console.log('Message sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            const user_data = new user({
                "name": req.body.name,
                "email": req.body.email,
                "password": hashedPassword,
                "otp": otp,
                "activation": false
            })
            const saved_user = await user_data.save();

            res.status(200).send({ Message: "Otp is sent to your email.. please verify", data: saved_user });
        });

    } catch (err) { res.status(400).send(err); }

}

exports.otp_validation = async (req, res) => {
    const found = await user.findOne({ otp: req.body.otp });
    if (found == null) return res.send('otp is incorrect');

    await found.updateOne({ activation: true });
    res.status(200).send("You has been successfully registered and your account is activated.");
}

exports.resend_otp=async(req,res)=>{
    var otp = newOTP.generate(6, { alphabets: false, upperCase: false, specialChar: false });
    var email=req.body.email;

    var mailOptions = {
        from: process.env.email,
        to: email,
        subject: "Otp for registration is: ",
        html: "<h3>OTP for account verification is </h3>" + "<h1 style='font-weight:bold;'>" + otp + "</h1>" // html body
    };
    transporter.sendMail(mailOptions, async (error, info) => {
        if (error) return res.status(400).send(error);

        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        const found = await user.findOne({ email: email });
        await found.updateOne({ otp: otp,activation:false});
        res.status(200).send("Otp is sent to your email.. please verify");

    });
}

exports.login = async (req, res) => {
    const { error1 } = await loginValidation(req.body);
    if (error1) return res.status(400).send(error1.details[0].message);

    const data = await user.findOne({ email: req.body.email });
    if (data == null) return res.send("user data not found")

    if (!(data.activation)) return res.send('You have not done otp verification');

    const validPass = await bcrypt.compare(req.body.password, data.password);
    if (!validPass) return res.send("Email or password is wrong. data not found");

    const token = jwt.sign({ username: req.body.email, user_id: data._id }, process.env.token_secret, { expiresIn: "24h" })
    res.status(200).send({ token: token });
}



exports.activate_account = async (req, res) => {
    // const user_id = req.params.user_id;
    const tokendata = req.tokendata;
    const data = await user.findOne({ _id: tokendata.user_id });

    try {
        const account = await web3_ETH.eth.accounts.create();
        await web3_ETH.eth.accounts.wallet.add(account);
        await data.updateOne({ accountAddress: account.address, privateKey: account.privateKey })

        res.status(200).json({ Message: "Crypto Wallet account created successfully", data: account })
    } catch (err) {
        res.status(400).send(err);
    }
}


exports.balance = async (req, res) => {
    const tokendata = req.tokendata;
    const data = await user.findOne({ _id: tokendata.user_id });
    if (data == null) return res.send("user is not registered.");

    const accountAddress = data.accountAddress;
    const balance_ETH = await web3_ETH.eth.getBalance(`${accountAddress}`, async (err, result) => {
        if (err) return err;
        console.log(result)
        var balance_eth=await web3_ETH.utils.fromWei(`${result}`, 'ether')
        return balance_eth;
    });
    const balance_BNB = await web3_BNB.eth.getBalance(`${accountAddress}`, async (err, result) => {
        if (err) return err;
        return await result
    });
    res.status(200).send("ETH =  " + balance_ETH + " BNB = " + balance_BNB);
}

exports.transfer = async (req, res) => {
    const { addressFrom, addressTo, value, currency } = req.body
    const tokendata = req.tokendata;

    const user_data = await user.findOne({ _id: tokendata.user_id });
    const private_key = user_data.privateKey;

    if (currency == "ETH") {
        var hash = await transfer_ETH(addressFrom, addressTo, value, private_key);
    } else if (currency == "BNB") {
        var hash = await transfer_BNB(addressFrom, addressTo, value, private_key);
    }
    console.log(hash);
    const transaction_data = new data({
        "transaction_from": addressFrom,
        "transaction_to": addressTo,
        "transaction_value": value,
        "currency": currency,
        "transaction_hash": hash
    })
    const saved_transaction = await transaction_data.save()
    res.json({ message: `Transaction successful with hash:${hash}`, data: saved_transaction });
}

exports.address = async (req, res) => {
    try {
        const tokendata = req.tokendata;

        const data = await user.findOne({ _id: tokendata.user_id });
        const accountAddress = data.accountAddress;
        res.status(200).send({ accountAddress: accountAddress });
    } catch (err) {
        res.status(400).send(err);
    }
}


exports.history =async (req, res) => {
    try {
        const tokendata = req.tokendata;
        const user_data = await user.findOne({ _id: tokendata.user_id });
        const accountAddress = user_data.accountAddress;
        // const accountAddress = req.params.accountAddress;
        const transactions = await data.find({
            $or: [
                {
                    transaction_from: accountAddress
                },
                {
                    transaction_to: accountAddress
                }
            ]
        })
        res.status(200).send(transactions);

    } catch (err) {
        res.status(400).send(err);
    }

}

exports.profile = async (req, res) => {
    try {
        const tokendata = req.tokendata;
        const data = await user.findOne({ _id: tokendata.user_id });
        res.status(200).send(data)
    } catch (err) {
        res.status(400).send(err);
    }

}


exports.dashboard = async (req, res) => {
    const tokendata = req.tokendata;
    const user_data = await user.findOne({ _id: tokendata.user_id });

    try {
        const accountAddress = user_data.accountAddress;
        const balance_ETH = await web3_ETH.eth.getBalance(`${accountAddress}`, async (err, result) => {
            if (err) return err;
            var result1 = await result / 1000000000000000000;
            return await result1;
        });
        const balance_BNB = await web3_BNB.eth.getBalance(`${accountAddress}`, async (err, result) => {
            if (err) return err;
            return await result
        });

        const dashboard_data = [{
            currency: "ETH",
            Address: user_data.accountAddress,
            Balance: balance_ETH
        }, {
            currency: "BNB",
            Address: user_data.accountAddress,
            Balance: balance_BNB
        }]

        res.status(200).send(dashboard_data);

    } catch (err) {
        res.status(400).send(err);
    }

}







const transfer_ETH = async (addressFrom, addressTo, value, private_key) => {

    console.log(`Attempting to make transaction from ${addressFrom} to ${addressTo}`);
    const createTransaction = await web3_ETH.eth.accounts.signTransaction({
        from: addressFrom,
        to: addressTo,
        value: web3_ETH.utils.toWei(`${value}`, 'ether'),
        gas: '21000',
    }, private_key)
    const createReceipt = await web3_ETH.eth.sendSignedTransaction(
        createTransaction.rawTransaction
    );

    return createReceipt.transactionHash

};

const transfer_BNB = async (addressFrom, addressTo, value, private_key) => {

    console.log(`Attempting to make transaction from ${addressFrom} to ${addressTo}`);
    const createTransaction = await web3_BNB.eth.accounts.signTransaction({
        from: addressFrom,
        to: addressTo,
        value: web3_BNB.utils.toWei(`${value}`, 'ether'),
        gas: '21000',
    }, private_key)
    const createReceipt = await web3_BNB.eth.sendSignedTransaction(
        createTransaction.rawTransaction
    );
    return createReceipt.transactionHash

};

//fetching balance
// const apikey = process.env.ether_scan_apikey;
// // console.log(apikey, accountAddress);
// try {
//     var response = await axios.get(`https://api-ropsten.etherscan.io/api
//     ?module=account
//     &action=balance
//     &address=${accountAddress}
//     &tag=latest
//     &apikey=${apikey}`);
//     if (response) {
//         res.send(response);
//     }
// } catch (err) {
//     res.status(400).send(err);
// }