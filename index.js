const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://stellar-malasada-952ea2.netlify.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//TODO - Change URI to Server URI
// const uri = "mongodb://127.0.0.1:27017";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ydmxw3q.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// get all rooms
async function run() {
  try {
    const roomsCollection = client
      .db("apartmentDB")
      .collection("apartmentRooms");
    const agreementCollection = client
      .db("apartmentDB")
      .collection("agreementData");
    const userCollection = client.db("apartmentDB").collection("usersData");
    const paymentCollection = client
      .db("apartmentDB")
      .collection("paymentData");
    const announceCollection = client
      .db("apartmentDB")
      .collection("announcementsData");
    const couponCollection = client
      .db("apartmentDB")
      .collection("couponCollection");

    //!SECTION JWT api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //midleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        console.log("there is no token on you");
        return res.status(401).send({ message: "Unauthorized" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // jwt.verify(token, process.env.ACCESS_TOKEN_);
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          // res error
          return res.status(401).send({ message: "Unauthorized" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //user veri
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden" });
      }
      next();
    };

    //user api
    //!SECTION creat api 1
    app.post("/api/createUser", async (req, res) => {
      try {
        let user = req.body;

        user = {
          name: user.name,
          email: user.email,
          role: "user",
        };

        const query = { email: user.email };
        const existingUser = await userCollection.findOne(query);
        if (existingUser) {
          return res.send({ mess: "user already exists", insertedId: null });
        }
        const result = await userCollection.insertOne(user);
        res.send(result);
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // make member api
    //!SECTION creat api 2
    app.patch(
      "/api/makeMember/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const query = { _id: new ObjectId(id) };
          const updatedDoc = {
            $set: {
              role: "member",
            },
          };
          const result = await userCollection.updateOne(query, updatedDoc);
          res.send(result);
        } catch (error) {
          console.error("Error fetching rooms:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );

    app.get("/api/user/userRole/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "Forbidden  access" });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let userRole = false;
        if (user) {
          if (user?.role === "admin") {
            userRole = "admin";
            return res.send({ userRole });
          } else if (user?.role === "member") {
            userRole = "member";
            return res.send({ userRole });
          } else if (user?.role === "user") {
            userRole = "user";
            return res.send({ userRole });
          }
        }
        res.send({ userRole });
      } catch (error) {
        console.error("Error fetching user role:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "Forbidden" });
        }
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        res.send({ admin });
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    //api

    app.get("/api/apartmentRooms", async (req, res) => {
      try {
        const page = Number(req.query?.page);
        const limit = Number(req.query?.limit);
        const skip = (page - 1) * limit;
        let sortObj = {};
        let filter = {};
        const result = await roomsCollection
          .find(filter)
          .skip(skip)
          .limit(limit)
          .toArray();
        const count = await roomsCollection.countDocuments(filter);
        res.send({ result, count });
      } catch (error) {
        console.error("Error fetching rooms:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    //agreementCollection
    //!SECTION 1111
    //TODO -  Uncoment
    // app.post("/api/user/createAgreement", verifyToken, async (req, res) => {
    //   try {
    //     const data = req.body;
    //     console.log(data);

    //     const result = await agreementCollection.insertOne(data);
    //     res.send(result);
    //   } catch (error) {
    //     console.error("Error fetching rooms:", error);
    //     res.status(500).send("Internal Server Error");
    //   }
    // });

    // test work start
    app.post("/api/user/createAgreement", verifyToken, async (req, res) => {
      try {
        const data = req.body;
        console.log(data);

        const agreementReqEmail = req.body.agreementReqEmail;

        const filter = { agreementReqEmail: agreementReqEmail };
        const existingAgreement = await agreementCollection
          .find(filter)
          .toArray();

        const hasAcceptedAgreement = existingAgreement.some(
          (existing) => existing.isBooked === true
        );

        if (hasAcceptedAgreement) {
          // If an agreement with the provided email already exists and has been accepted
          return res
            .status(406)
            .send(
              "Agreement already exists and has been accepted for this email"
            );
        }

        const result = await agreementCollection.insertOne(data);
        res.send(result);
      } catch (error) {
        console.error("Error creating agreement:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // test work End

    ///  database info
    app.get(
      "/api/admin/dataInfo",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          //total rooms
          const totalRooms = await roomsCollection.countDocuments({});
          //total users

          const totalUsers = await userCollection.countDocuments({
            role: "user",
          });
          const totalMember = await userCollection.countDocuments({
            role: "member",
          });
          //total members
          const bookedRooms2 = await agreementCollection.countDocuments({
            isBooked: true,
          });
          console.log(bookedRooms2);
          //total booked  rooms  and percent od abialble rooms
          // const bookedRooms = await agreementCollection.countDocuments({
          //   Status: "checked",
          // });
          // Calculate percentage of available rooms
          const percentBooked = ((bookedRooms2 / totalRooms) * 100).toFixed(2);

          // available rooms
          const percentavailable = 100 - percentBooked;

          res.send({
            totalRooms,
            totalUsers,
            totalMember,
            bookedRooms2,
            percentBooked,
            percentavailable,
          });
        } catch (error) {
          console.error("Error fetching Data Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );

    //members

    app.get(
      "/api/admin/memberInfo",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const membersInfo = await userCollection
            .find({
              role: "member",
            })
            .toArray();
          res.send(membersInfo);
        } catch (error) {
          console.error("Error fetching Member Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );
    //detelte member
    app.patch(
      "/api/admin/deleteMember/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;

          const query = { _id: new ObjectId(id) };
          const updatedDoc = {
            $set: {
              role: "user",
            },
          };

          const result = await userCollection.updateOne(query, updatedDoc);

          if (result.modifiedCount > 0) {
            res
              .status(200)
              .send({ message: "User role updated successfully." });
          } else {
            res.status(404).send({ message: "User not found." });
          }
        } catch (error) {
          console.error("Error fetching Member Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );
    // get announce data
    app.get("/api/announce", verifyToken, async (req, res) => {
      try {
        const result = await announceCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching announce Info:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    // make announce api
    app.post(
      "/api/makeAnnounce",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const data = req.body;
          const result = await announceCollection.insertOne(data);
          res.send(result);
        } catch (error) {
          console.error("Error create announce Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );

    // get all argument request
    app.get("/api/argumentRequest", verifyToken, async (req, res) => {
      try {
        const query = { Status: "pending" };

        const result = await agreementCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error get argument Info:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    //update status
    app.put("/api/admin/handleAcptreq/:id", async (req, res) => {
      try {
        let id = req.params.id;
        // console.log(req.body);
        const email = req.body.email;
        const agreementAcceptDate = req.body.agreementAcceptDate;
        const isBooked = req.body.isBooked;
        // console.log(agreementAcceptDate);
        console.log(id, email, agreementAcceptDate);
        const filerArgreement = { _id: new ObjectId(id) };
        const filterUser = { email: email };
        const updateUser = {
          $set: {
            role: "member",
          },
        };
        const userUpdate = await userCollection.updateOne(
          filterUser,
          updateUser
        );
        const updatedArgeement = {
          $set: {
            Status: "checked",
            agreementAcceptDate: agreementAcceptDate,
            isBooked: isBooked,
          },
        };
        const options = { upsert: true };
        const agreenmUpdate = await agreementCollection.updateOne(
          filerArgreement,
          updatedArgeement,
          options
        );
        res.status(200).send({ userUpdate, agreenmUpdate });
      } catch (error) {
        console.error("Error get update Info:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    // handle reject
    app.put(
      "/api/admin/handleReject/:id",
      verifyToken,
      verifyAdmin,

      async (req, res) => {
        try {
          let id = req.params.id;

          const filerArgreement = { _id: new ObjectId(id) };

          const updatedArgeement = {
            $set: {
              Status: "checked",
              isBooked: false,
            },
          };
          const agreenmUpdate = await agreementCollection.updateOne(
            filerArgreement,
            updatedArgeement
          );
          res.status(200).send(agreenmUpdate);
        } catch (error) {
          console.error("Error get update Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );
    app.get(
      "/api/user/getUserBasedArgument/:email",
      verifyToken,
      async (req, res) => {
        try {
          const email = req.params?.email;
          // console.log(email);
          const filter = { agreementReqEmail: email };
          const result = await agreementCollection.find(filter).toArray();
          res.send(result);
        } catch (error) {
          console.error("Error get argument Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );
    app.get(
      "/api/user/getMembersArgument/:email",
      verifyToken,
      async (req, res) => {
        try {
          const email = req.params?.email;
          // console.log(email);
          const filter = { agreementReqEmail: email, isBooked: true };
          const result = await agreementCollection.find(filter).toArray();
          res.send(result);
        } catch (error) {
          console.error("Error get argument Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );

    // copon api
    app.get("/api/coupon", async (req, res) => {
      try {
        const result = await couponCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error get argument Info:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    app.post(
      "/api/admin/makeCopun",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const cuponData = req.body;
          const result = await couponCollection.insertOne(cuponData);
          res.send(result);
        } catch (error) {
          console.error("Error post copon Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );
    // detelet API
    // deleted cupon
    app.delete(
      "/api/admin/deleteCopun/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params?.id;
          const filter = { _id: new ObjectId(id) };
          const result = await couponCollection.deleteOne(filter);
          res.send(result);
        } catch (error) {
          console.error("Error post copon Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );
    //update copun
    app.put(
      "/api/updateCopun/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params?.id;
          const filter = { _id: new ObjectId(id) };
          const cuponData = req.body;
          const updateDoc = {
            $set: {
              couponCode: cuponData.couponCode,
              description: cuponData.description,
              discountPercentage: cuponData.discountPercentage,
            },
          };

          const result = await couponCollection.updateOne(filter, updateDoc);
          res.send(result);
        } catch (error) {
          console.error("Error post copon Info:", error);
          res.status(500).send("Internal Server Error");
        }
      }
    );

    // payment API
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      // console.log(paymentIntent);
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment api
    app.post("/payments", verifyToken, async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      res.send(paymentResult);
    });
    app.get("/getPaymentsData/:email", verifyToken, async (req, res) => {
      const email = req.params?.email;
      const query = { userEmail: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });
    //search by mount name payment data
    app.get("/PaymentByMounth/:email", verifyToken, async (req, res) => {
      try {
        const monthName = req.query?.monthname;
        const email = req.params?.email;
        console.log(monthName, email);
        const filter = {
          payForMunth: {
            $regex: new RegExp(monthName, "i"),
          },
          userEmail: email,
        };

        const payments = await paymentCollection.find(filter).toArray();
        res.send(payments);

        // let filter = {};
      } catch (error) {
        console.error("Error post copon Info:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // Send a ping to confirm a successful connection

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("building is running");
});

app.listen(port, () => {
  console.log(`server is running on port: ${port}`);
});
