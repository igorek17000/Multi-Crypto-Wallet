const router= require('express').Router();
const serve=require('../controllers/firstController');
const verify=require('../verifytoken')
//1. Register
router.post('/register',serve.register);

//2. Otp validation
router.patch('/verify',serve.otp_validation);

//3. Resend otp
router.patch('/resend_otp',serve.resend_otp)

//3. Login
router.post('/login',serve.login);

//4. Activate accounts (Address/account creation for BSC and ETH)
router.post('/activate_account',verify,serve.activate_account);

//5. Balance api for both coins (B)
router.get('/balance',verify,serve.balance);

//6. Transfer API  (for trx and BSC ) (B);
router.post('/transfer',verify,serve.transfer);


//7. Address show API (B)
router.get('/address',verify,serve.address);

//8.History API (B)
router.get('/history',verify,serve.history);

//9. User profile API (B)
router.get('/profile',verify,serve.profile);

//10. bearer token implementation for JWT

//11. Dashboard API (B) it will give address, currency Code (ETH, BSC) and balance
router.get('/dashboard',verify,serve.dashboard);


module.exports=router;