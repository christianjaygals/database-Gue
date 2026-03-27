const mysql= require("mysql2");

const connection = mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "root1",
    database: "hospitalDATA"
});

connection.connect((err) => {
    if (err) {
        console.error("Connection failed:", err);
        return;
    }
    console.log("connected to mysql!");
});

module.exports = connection;
