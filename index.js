const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_PARTS}:${process.env.DB_PASS}@cluster0.8cczehf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.Authorization;
    // console.log('aaaaaaaaa', authHeader);
    if (!authHeader) {
        return res.status(401).send({ meassge: 'unAutorize Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY, function (err, decoded) {
        // console.log(err);
        if (err) {
            console.log(err);
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}


async function run() {
    // equire('crypto').randomBytes(64).toString('hex')
    await client.connect()
    const toolsCollaction = client.db('manufacturer-parts').collection('parts')
    const usersCollaction = client.db('manufacturer-parts').collection('users')
    const reviewCollaction = client.db('manufacturer-parts').collection('reviews')





    app.get('/parts', async (req, res) => {
        const tools = await toolsCollaction.find().toArray()
        res.send(tools)
    })


    app.get('/tool/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const tool = await toolsCollaction.findOne(query)
        res.send(tool)
    })

    // post user review
    app.post('/review', async (req, res) => {
        const review = req.body;
        const result = await reviewCollaction.insertOne(review);
        res.send(result);

    })

    // get all review
    app.get('/review', async (req, res) => {
        const reviews = await reviewCollaction.find().toArray()
        res.send(reviews)
    })



    // post user 

    app.put('/user/:email', async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
            $set: user,
        };
        const result = await usersCollaction.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET_KEY, { expiresIn: '1d' })
        res.send({ result, token });
    });

    // get all user
    app.get('/user', async (req, res) => {
        const users = await usersCollaction.find().toArray();
        res.send(users);
    });

}



run().catch(console.dir())



app.get('/', (req, res) => {
    res.send('Menufacturerr is run')
})

app.listen(port, () => {
    console.log(`Menufacturerr lisining is ${port}`);
})