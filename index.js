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
    const authHeader = req.headers.authorization;
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
    const toolsCollection = client.db('manufacturer-parts').collection('parts')
    const usersCollection = client.db('manufacturer-parts').collection('users')
    const reviewCollection = client.db('manufacturer-parts').collection('reviews')
    const orderCollection = client.db('manufacturer-parts').collection('orders')




    app.get('/parts', async (req, res) => {
        const tools = await toolsCollection.find().toArray()
        res.send(tools)
    })



    app.post('/tool', async (req, res) => {
        const tool = req.body;
        const result = await toolsCollection.insertOne(tool);
        res.send(result);

    })

    // order tool
    app.post('/order', async (req, res) => {
        const tools = req.body;
        const result = await orderCollection.insertOne(tools);
        res.send(result);
    })

    // get my orders 
    app.get('/orders', verifyJWT, async (req, res) => {
        const email = req.query.email
        const decodedEmail = req.decoded.email;
        if (email === decodedEmail) {
            const myOrders = await orderCollection.find({ email }).toArray()
            res.send(myOrders)
        }
        else {
            return res.status(403).send({ message: "Forbidden access" })
        }
    })


    //  get all orders 
    app.get('/manageOrders', verifyJWT, async (req, res) => {
        const orders = await orderCollection.find().toArray()
        res.send(orders)
    })




    app.patch('/tool/:id', async (req, res) => {
        const id = req.params.id;
        const newQuantity = req.body;
        console.log(newQuantity);
        const filter = { _id: ObjectId(id) }
        const updateDoc = {
            $set: { availableQuantity: newQuantity.availableQuantity }

        };
        const result = await toolsCollection.updateOne(filter, updateDoc);
        res.send(result);
    });


    // get single tool by id 
    app.get('/tool/:id', async (req, res) => {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const tool = await toolsCollection.findOne(query)
        res.send(tool)
    })

    // post user review
    app.post('/review', async (req, res) => {
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result);
    })

    // get all review
    app.get('/review', async (req, res) => {
        const reviews = await reviewCollection.find().toArray()
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
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET_KEY, { expiresIn: '1d' })
        res.send({ result, token });
    });

    // get all user
    app.get('/user', async (req, res) => {
        const users = await usersCollection.find().toArray();
        res.send(users);
    });

    //
    app.get('/admin/:email', async (req, res) => {

        const email = req.params.email;
        const user = await usersCollection.findOne({ email: email })
        const isAdmin = user.role === "admin"
        console.log(isAdmin);
        res.send({ admin: isAdmin })

    })

    //  make admin
    app.put('/user/admin/:email', async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const updateDoc = {
            $set: { role: 'admin' },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
    })
    app.delete('/deleteOrder/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        console.log('id is', id);
        const filter = { _id: ObjectId(id) }
        const result = await orderCollection.deleteOne(filter)
        res.send(result)
    })







}

run().catch(console.dir())



app.get('/', (req, res) => {
    res.send('Menufacturerr is run')
})

app.listen(port, () => {
    console.log(`Menufacturerr lisining is ${port}`);
})