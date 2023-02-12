const express = require("express")
const app = express()
//用于读取json数据表并且存入mongodb
const fs = require("fs");
//用来做跨域，同源策略（ip和端口一致时是同源，否则跨域）
const cors = require("cors")
//用来解决express 的 post接口，比如req.body，get不依赖任何模块
const bodyParser = require('body-parser')
//模块用于接收post参数
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const { v4: uuidv4 } = require('uuid');
const md5 = require('md5');

let mdb = require("./Mongo");
const {ObjectID, ObjectId} = require("bson");
const {sendRegisterEmail, sendResetPwd} = require("./email/email");
let db

(async () => {
    db = await mdb("Phone") //数据库：phone
    verify(db, 'phonelist', '../models/phonelisting.json')    //用来验证，如果数据库中有这两个表，就不用再次创建，如果不存在就导入
    verify(db, 'userlist', '../models/userlist.json')
})()

function verify(db, colName, filePath) {
    db.listCollections({ name: colName }).next(function (err, collinfo) {
        if (collinfo) {
            console.log(`${colName} collection exists`);
        } else {
            importDB(db, colName, filePath)
        }
    });
}

function importDB(db, colName, filePath) {
    db.createCollection(colName, function (err, res) {
        if (err) throw err;
        var fileContent = fs.readFileSync(filePath);
        if (fileContent) {
            var tbfile = JSON.parse(fileContent);
            for (const i of tbfile) {
                if(colName === 'phonelist'){
                    i.image = `${i.brand}.jpeg`
                }
                // Ensure json has _id and object has '$oid'
                if (i._id) {
                    i._id = ObjectID(i._id['$oid']) //把oid里面的东西转化成objectid
                }
            }
            db.collection(colName).insertMany(tbfile, function (err, res) {    //插入多条数据
                if (err) throw err;
                console.log(`${colName} has been imported`);
            })
        }
    })
}

app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*")      //允许跨域，local是8080，在main.js中8080端口调用了3000端口，所以是跨域
    res.header("Access-Control-Allow-Headers", "X-Requested-With")
    res.header("Access-Control-Allow-Methods", "PUT", "POST", "GET", "DELETE", "OPTIONS")
    res.header("Content-Type", "application/json;charet=utf-8")
    next()
})

app.use(cors())


/**
 * @description get userlist
 * @param { username,password } user name password
 * @abstract 600 601 602 603 604
 * @returns
 */
app.post('/login', (req, res) => {
    let inuser = req.body.email
    let inpwd = md5(req.body.password)
    db.collection('userlist').find({ "email": inuser }).toArray((err, doc) => {  //寻找对应邮箱
        if (err) {
            res.send({ code: 600, data: doc, message: err.message })
        } else {
            if (doc.length) {    //如果找到了
                if (doc[0].verify_key !== undefined && doc[0].verify_key !== null) {
                    res.send({ code: 604, data: doc, message: 'click the link and activate it!' })
                } else if (doc[0].password === inpwd) {
                    const rule = {
                        email: inuser
                    }
                    res.send({ code: 200, data: doc, message: 'success' })
                } else {
                    res.send({ code: 604, data: doc, message: 'password is wrong!' })
                }
            } else {     //没找到对应邮箱
                res.send({ code: 604, data: doc, message: 'username is wrong!' })
            }
        }
    })
})

app.post('/register', (req, res) => {
    let inuser = req.body.email
    req.body.password = md5(req.body.password)
    let first_name = req.body.firstname
    let last_name = req.body.lastname

    db.collection('userlist').find({ "email": inuser }).toArray((err, doc) => {
        if (err) {
            res.send({ code: 600, data: doc, message: err.message })
        } else {
            if (doc.length > 0 && (doc[0].verify_key === undefined || doc[0].verify_key === null)) {
                res.send({ code: 601, message: 'User already register!' });
            } else if (doc.length > 0 && (doc[0].verify_key !== undefined && doc[0].verify_key !== null)) {
                res.send({ code: 601, message: 'User has not click link!' });
            } else {
                const key = uuidv4();

                sendRegisterEmail({ email: inuser, verify_key: key })
                let insertObj = {
                    email: inuser,
                    password: req.body.password,
                    firstname: first_name,
                    lastname: last_name,
                    verify_key: key
                }
                db.collection('userlist').insertOne(insertObj, (err, doc) => {   //插入一条数据
                    if (err) {
                        res.send({ code: 601, data: doc, message: err.message })
                    } else {
                        if (doc.length > 0) {
                            res.send({ code: 200, data: doc, message: 'success' })
                        }
                        res.send({ code: 600, data: doc, message: 'first register, email has been sent' })
                    }
                })
            }
        }
    })
})

app.post('/resetpwd', (req, res) => {
    let inuser = req.body.email
    db.collection('userlist').find({ "email": inuser }).toArray((err, doc) => {
        if (err) {
            res.send({ code: 600, data: doc, message: err.message })
        } else {
            if (doc.length > 0 && (doc[0].verify_key === undefined || doc[0].verify_key === null)) {
                sendResetPwd({ email: req.body.email })
                res.send({ code: 200, message: 'reset email sent' })
            } else {
                res.send({ code: 600, message: 'invalid email' })
            }
        }
    })
})
// Reset password - send user 302 request
// res.data structure sample：
// {
//     _id: new ObjectId("627e650e2ca78132e4dd383c"),
//         email: '1525126020@qq.com',
//     password: 'e10adc3949ba59abbe56e057f20f883e',
//     firstname: 'mingcheng',
//     lastname: 'yu',
//     verify_key: null,
//     code: 302
// }

app.get('/toresetpwd', (req, res) => {
    const {email: email} = req.query;
    db.collection('userlist').find({"email": email}).toArray((err, doc) => {
        if (err) {
            res.send({code: 600, data: doc, message: err.message})
        } else {
            if (doc) {
                res.data = doc[0]
                res.data.code = 302
                res.redirect('http://localhost:8080/#/user')

                console.log(res.data)
                console.log(res.data.code)
                console.log("after redirect")
            } else {
                res.send({code: 600, data: doc, message: 'unexpected error'})
            }
        }
    })
});

app.get('/regiter_success', (req, res) => {
    const {email: email, verify_key} = req.query;
    db.collection('userlist').find({"email": email}).toArray((err, doc) => {
        if (err) {
            res.send({code: 600, data: doc, message: err.message})
        } else {
            if (doc.length > 0) {
                if (doc[0].verify_key === verify_key) {
                    db.collection('userlist').updateOne({"email": email}, {$set: {"verify_key": null}})
                }
            }
        }
    })
    res.send({code: 200, message: 'success register!'})
});


// Post Review
app.post('/makeReview', (req, res) => {
    let insertObj = {
        reviewer: req.body.reviewer,
        rating: req.body.rating,
        comment: req.body.comment
    }
    let phoneId = new ObjectId(req.body.id)
    db.collection('phonelist').findOne({_id: phoneId}, function (err, doc) {
        if (err) {
            res.send({code: 602, data: doc, message: err.message})
        }
        if (doc) {
            doc.reviews.push(insertObj)
            let myquery = {"_id": phoneId};
            let newvalues = {$set: {"reviews": doc.reviews, "_id": phoneId}};
            db.collection('phonelist').updateOne(myquery, newvalues, (err, doc) => {
                if (err) {
                    res.send({code: 602, data: doc, message: err.message})
                } else {
                    res.send({code: 200, data: doc, message: "Review success"})
                }
            })
        } else {
            res.send({code: 602, data: doc, message: "No such phone"})
        }
    })

})

// purchase phones
app.post('/paySuccess', (req, res) => {
    let insertObj = {
        stock: req.body.stock
    }
    let phoneId = new ObjectId(req.body.id)
    db.collection('phonelist').findOne({_id: phoneId}, function (err, doc) {
        if (err) {
            res.send({code: 602, data: doc, message: err.message})
        }
        if (doc) {
            doc.stock = insertObj.stock
            let myquery = {"_id": phoneId}
            let newvalues = {$set: {"stock": doc.stock}}
            db.collection('phonelist').updateOne(myquery, newvalues, (err, doc) => {
                if (err) {
                    res.send({code: 602, data: doc, message: err.message})
                } else {
                    res.send({code: 200, data: doc, message: "Pay success"})
                }
            })
        } else {
            res.send({code: 602, data: doc, message: "No such phone"})
        }
    })

})


app.post('/user/update/:id', (req, res) => {
    db.collection('userlist').updateOne({ _id: req.params.id }, { $set: req.body }, (err, doc) => {   //更新数据
        if (err) {
            res.send({ code: 602, data: doc, message: err.message })
        } else {
            res.send({ code: 200, data: doc, message: 'success' })
        }
    })
})

//更新数据的时候重新校验密码是否正确
app.post('/user/verify/:password', (req, res) => {
    db.collection('userlist').find(req.body).toArray((err, doc) => {
        if (err) {
            res.send({ code: 604, data: doc, message: err.message })
        } else {
            if (doc[0].password === md5(req.params.password)) {  //密码正确，和加密后的密码匹配
                res.send({ code: 200, data: doc, message: 'success' })
            } else {
                res.send({ code: 600, data: [], message: 'password incorrect！' })
            }
        }
    })
})

//user page中update password
app.post('/user/change', (req, res) => {
    const { email, oldPassword, newPassword, firstName, lastName } = req.body
    db.collection('userlist').find({ email }).toArray((err, doc) => {   //根据传入的邮箱去找有没有这个用户
        if (err) {
            res.send({ code: 604, data: doc, message: err.message })
        } else {
            if (doc[0].password === md5(oldPassword)) {  //如果有这个用户并且密码正确
                db.collection('userlist').updateOne({ email }, {
                    $set: {
                        password: md5(newPassword),  //更新密码
                        firstName,
                        lastName
                    }
                }, (err2, doc2) => {
                    if (err2) {
                        res.send({ code: 604, data: doc2, message: err2.message })
                    } else {
                        res.send({ code: 200, data: doc2, message: 'user info has been changed!' })
                    }
                })
            } else {
                res.send({ code: 600, data: [], message: 'password incorrect！' })
            }
        }
    })
})

//查询用户列表
app.get('/userlist', (req, res) => {
    db.collection('userlist').find({}).toArray((err, doc) => {
        if (!err) {
            res.send(doc)
        }
    })
})

app.post('/getName', (req, res) => {
    let userId = new ObjectId(req.body.id)
    db.collection('userlist').findOne({_id: userId}, function (err, doc) {
        if (err) {
            res.send({code: 602, data: doc, message: err.message})
        }
        if (doc) {
            let firstName = doc.firstname
            let lastName = doc.lastname
            let userName = firstName + " " + lastName
            res.send({code: 200, data: userName, message: "success"})
        } else {
            res.send({code: 602, data: doc, message: "No such user"})
        }
    })
})



app.post('/user/updatepsd', (req, res) => {
    const { email, newPassword } = req.body
    db.collection('userlist').updateOne({ "email": email }, { $set: { "password": md5(newPassword) } }, (err, doc) => {
        if (err) {
            res.send({ code: 602, data: [], message: 'update failed' })
        } else {
            res.send({ code: 200, data: doc, message: 'success' })
        }
    })
})

/**
 * @description get phonelist
 * @abstract
 * @returns
 */

//home page 中显示phone对应的data
app.get('/phonelist', async (req, res) => {
    const { title, brand, highPrice, lowPrice } = req.query   //get 请求 通过req.query 传递参数
    const options = {}
    if (title) options.title = new RegExp(title, 'i');
    if (brand) options.brand = brand
    if (highPrice && lowPrice) options.price = { $gte: Number(lowPrice), $lte: Number(highPrice) }
    try {
        const phonelist = await db.collection('phonelist').find(options).toArray()
        if (phonelist.length) {
            for (const phone of phonelist) {
                if (phone.reviews&&phone.reviews.length) {
                    for (const review of phone.reviews) {
                        const user = await db.collection('userlist').findOne({ _id: ObjectID(review.reviewer) })
                        review.reviewer = user ? `${user.firstname} ${user.lastname}` : '未知用户'
                    }
                }
            }
            res.send({ code: 200, data: phonelist, message: 'success' })
        } else {
            res.send({ code: 200, data: [], message: 'success' })
        }
    } catch (error) {
        console.log(error);
        res.send({ code: 600, data: [], message: 'find failed' })
    }
})


app.post('/phonelist/add', (req, res) => {
    db.collection('phonelist').insertOne(req.body, (err, doc) => {
        if (err) {
            res.send({ code: 601, data: doc, message: err.message })
        } else {
            res.send({ code: 200, data: doc, message: 'new phone info has been added' })
        }
    })
})

app.post('/phonelist/delete/:id', (req, res) => {
    db.collection('phonelist').deleteOne({ _id: ObjectID(req.params.id) }, (err, doc) => {
        if (err) {
            res.send({ code: 603, data: doc, message: 'delete failed' })
        } else {
            res.send({ code: 200, data: doc, message: 'delete success' })
        }
    })
})

//从json数据中只寻找brand并且是不重复的
app.get('/phonelist/distinct', (req, res) => {
    db.collection('phonelist').distinct('brand', {}, (err, doc) => {
        if (err) {
            res.send({ code: 600, data: doc, message: 'find failed' })
        } else {
            res.send({ code: 200, data: doc, message: 'find success' })
        }
    })
})

//监听3000端口
app.listen(3000, () => {
    console.log("server starting at port:3000");
})






