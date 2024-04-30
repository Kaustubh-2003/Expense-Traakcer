import express from "express";
import { fileURLToPath } from 'url'; // Import fileURLToPath function to convert URL to file path
import { dirname, join } from 'path'; // Import dirname and join functions to work with file paths
import pg from 'pg'; // Import Pool from pg module
import bodyParser from 'body-parser'; // Import bodyParser

import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg; // Access the Pool class from pg

const port = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Get the directory name of the current module file
const __dirname = dirname(fileURLToPath(import.meta.url));

// Set the directory for your views
app.set("views", join(__dirname, "views"));

// Set the view engine to render HTML files
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static(join(__dirname, "public")));

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database', err);
    } else {
        console.log('Connected to the database successfully');
    }
});



// Define routes to render login and signup pages
app.get("/", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/dashboard", (req, res) => {
    res.render("dashboard")
})



//app.post for signup reques

app.post("/signup", (req, res) => {
    const { newUsername, newemai, newPassword, confirmPassword } = req.body;

    // Check if passwords match
    if (newPassword !== confirmPassword) {
        return res.status(400).send("Passwords do not match");
    }

    // Insert the user's details into the database
    pool.query('INSERT INTO customer (name, email, pass) VALUES ($1, $2, $3) RETURNING id', [newUsername, newemai, newPassword], (err, result) => {
        if (err) {
            console.error('Error inserting user details into the database', err);
            return res.status(500).send("Internal Server Error");
        }

        console.log('User signed up successfully');
        console.log(newemai);
        const userId = result.rows[0].id;

        // Create a new table with the user's name
        const tableName = `transactions_${newUsername}`;
        const createTableQuery = `CREATE TABLE ${tableName} (
            id SERIAL PRIMARY KEY,
            Dateday DATE NOT NULL,
            type VARCHAR(100) NOT NULL,
            account VARCHAR(100) NOT NULL,
            sum NUMERIC NOT NULL
        )`;

        pool.query(createTableQuery, (err, result) => {
            if (err) {
                console.error('Error creating new table', err);
                return res.status(500).send("Internal Server Error");
            }

            console.log(`Table ${tableName} created successfully`);
            res.redirect("/"); // Redirect to login page after successful signup
        });
    });
});

let globalUsername = "";

// post request for login request

app.post("/login", (req, res) => {
    const { username, email, password } = req.body;
    globalUsername = username;
    console.log("Global username set to:", globalUsername);

    // Query to fetch the user from the database based on the email
    pool.query('SELECT * FROM customer WHERE email = $1', [email], (err, result) => {
        if (err) {
            console.error('Error querying database for user', err);
            return res.status(500).send("Internal Server Error");
        }

        // Check if a user with the provided email exists
        if (result.rows.length === 0) {
            return res.status(401).send("Invalid email or password");
        }

        // Get the user's details from the query result
        const user = result.rows[0];

        // Check if the password matches
        if (user.pass !== password) {
            return res.status(401).send("Invalid email or password");
        }

        // Fetch additional user details such as username, cash, saving, and card amounts
        const { id, name } = user;

        // Query to fetch cash, saving, and card amounts based on the user's ID
        pool.query('SELECT cash, savings, card FROM financial_details WHERE id = $1', [id], (err, result) => {
            if (err) {
                console.error('Error fetching user account details', err);
                return res.status(500).send("Internal Server Error");
            }

            // If user account details are fetched successfully, redirect to the dashboard
            const { cash, saving, card } = result.rows[0];
            res.render('dashboard', {
                name: username,
                cash: cash,
                saving: saving,
                card: card
            });


        });
    });
});



// to add transactions
app.post("/add-transaction", (req, res) => {
    const { name, transactionCategory, type_of_transact, transactionAmount, transactionAccount } = req.body;

    // Extract the username from the session or token
    const username = name; // Assuming you're using sessions for authentication

    // Check if the transactionCategory, transactionAmount, and transactionAccount are valid
    // Perform any necessary validation here

    // Calculate the change based on the transactionCategory
    let change = 0;
    if (transactionCategory === 'income') {
        change = transactionAmount;
    } else if (transactionCategory === 'expense') {
        change = -transactionAmount;
    }

    // Query to insert the transaction data into the corresponding table for the user
    const transactionQueryString = `INSERT INTO transactions_${username} (dateday, type, account, sum) VALUES (CURRENT_TIMESTAMP, $1, $2, $3)`;
    const transactionValues = [type_of_transact, transactionAccount, transactionAmount];

    // Execute the query to insert transaction data
    pool.query(transactionQueryString, transactionValues, (err, result) => {
        if (err) {
            console.error('Error inserting transaction data into the database', err);
            return res.status(500).send("Internal Server Error");
        }

        console.log('Transaction data inserted successfully');

        // Query to update financial_details table
        const financialQueryString = `
            UPDATE financial_details 
            SET 
                ${transactionCategory} = ${transactionCategory} + $1,
                ${transactionAccount} = ${transactionAccount} + $2,
                balance = balance + $3
            WHERE name = $4
        `;
        const financialValues = [transactionAmount, change, change, username];

        // Execute the query to update financial_details table
        pool.query(financialQueryString, financialValues, (err, result) => {
            if (err) {
                console.error('Error updating financial details in the database', err);
                return res.status(500).send("Internal Server Error");
            }

            console.log('Financial details updated successfully');

            // Redirect to the dashboard after successful insertion and updates
            
        });

        
    });
    pool.query('SELECT cash, savings, card FROM financial_details WHERE name = $1', [username], (err, result) => {
        if (err) {
            console.error('Error fetching user account details', err);
            return res.status(500).send("Internal Server Error");
        }

        // If user account details are fetched successfully, redirect to the dashboard
        const { cash, saving, card } = result.rows[0];
        res.render('dashboard', { 
            name:username,
            cash: cash,
            saving: saving,
            card: card
        });
        

    });
});



// Start the server
app.listen(port, () => {
    console.log(`App is listening on ${port}`);
});
