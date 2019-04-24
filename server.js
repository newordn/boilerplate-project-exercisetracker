const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const multer = require("multer");
const upload = multer();
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

let userSchema = new mongoose.Schema({
  username: String
})
userSchema.statics.getUsers = function() {
  return new Promise((resolve, reject) => {
    this.find((err, docs) => {
      if(err) {
        console.error(err)
        return reject(err)
      }
      resolve(docs)
    })
  })
}
let userModel =mongoose.model('user', userSchema);

let exerciseSchema = new mongoose.Schema({
  userId : Object,
  description: String,
  duration : Number,
  date : Date
})
let exerciseModel = mongoose.model('exercise', exerciseSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/exercise/users', (req,res)=>{
   userModel.getUsers().then(doc => 
   { 
     console.log(doc);
     res.json(doc);
 
   }).catch(err=>{
     console.log(err);
     res.json(err);
   })
 });
 
app.post('/api/exercise/new-user', upload.none(), (req,res) => {
let user = new userModel({
  username : req.body.username
})
user.save()
   .then(doc => {
     console.log(doc)
     res.json(doc);
   })
   .catch(err => {
     console.error(err)
     res.json(doc);
   })
})


app.post('/api/exercise/add', upload.none(), (req,res) => {
  let exercise = new exerciseModel({
    userId : req.body.userId,
    description : req.body.description,
    duration : req.body.duration,
    date: req.body.date==""? new Date() : req.body.date,
  })
  exercise.save()
     .then(doc => {
       console.log(doc)
       userModel.find({_id: req.body.userId}).then(doc1=>
        {
          let user = {...doc1,exercise: doc}
          res.json(user);
          console.log(user)

        }).catch(err=>
          {
            res.json(err);
            console.log(err)});
     })
     .catch(err => {
       console.error(err)
       res.json(doc);
     })
  })

  app.get('/api/exercise/log', upload.none(), (req,res) => {
    const userId = req.query["userId"];
    const limit = req.query["limit"]==null?0:req.query["limit"];
    const to = Date.parse(req.query["to"]==null?"":req.query["to"]);
    console.log(req.query["from"]);
    const from = Date.parse(req.query["from"]==null?"":req.query["from"]);
    console.log(to);
    console.log(from);
    exerciseModel.find({userId}).limit(parseInt(limit)).then(exercises=>
      {
       exercises = exercises.filter(d=>{
            if( req.query["from"]==null) return true;
            else if(d.date.getTime()>=from) return true;
            else return false;
        })
        
       exercises = exercises.filter(d=>{
        if( req.query["to"]==null) return true;
        else if(d.date.getTime()<=to ) return true;
        else return false;
    })
        userModel.find({_id : userId}).then(doc=>{
          console.log(doc);
          res.json({...doc,log: exercises, count: exercises.length});
        }).catch(doc=>{
          console.log(doc);
          res.json(doc);
        })
  }
    ).catch(doc=>
      {
        console.log(doc);
        res.json(doc);
      }
      );
  })
  

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
