const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    host: 'smtp.qq.com', //QQ mail service
    port: 465, // port number 
    secure: true, // 465 is true, otherwise false
    auth: {
        user: '916049678@qq.com', // my email
        pass: 'pfyinmeecktzbaij', // 
    },
});

/**
 * Send email at registar
 */
exports.sendRegisterEmail = ({email, verify_key}) => {
    const url = `http://localhost:3000/regiter_success?email=${email}&verify_key=${verify_key}`;
    const params = {
        from: 'WebDev16<916049678@qq.com>', // Sender info
        to: email, // Target email address
        subject: 'User register',
        html: `Click the link to register:<a style="color:red" href="${url}">${url}</a>`,
    };
    return sendMsg(params);
};

exports.sendResetPwd = ({email}) => {
    const url = `http://localhost:8080/#/user?email=${email}`;
    const params = {
        from: 'WebDev16<916049678@qq.com>', // Sender info
        to: email, // Target email address
        subject: 'Reset password',
        html: `Click the link to reset password:<a style="color:red" href="${url}">${url}</a>`,
    };
    return sendMsg(params);
};

/**
 * Send Verification Code
 * @param {*} params
 */
exports.sendCode = ({email, verify_key}) => {
    const params = {
        from: '<xxxxxxxx@qq.com>', // Sender info
        to: email, // Target email address
        subject: 'Reset Password',
        html: `Email Verification Code:${verify_key}`,
    };
    return sendMsg(params);
};


/**
 * Send Message
 */
const sendMsg = (params) => {
    return new Promise((resolve) => {
        transporter.sendMail(params, (err, data) => {
            resolve(null);
            transporter.close(); // Close after finishing
        });
    });
};