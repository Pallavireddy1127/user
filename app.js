const express = require("express");
const bcrypt = require("bcrypt");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;
module.exports = app;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();
//create user API

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);

  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //create user in user table
    const createUserQuery = `
  INSERT INTO
    user (username, name, password, gender, location)
  VALUES
    (
      '${username}',
      '${name}',
      '${hashedPassword}',
      '${gender}',
      '${location}'  
    );`;
    await db.run(createUserQuery);

    response.send("User created successfully");
    response.status(200);
  } else {
    const lengthOfPassword = password.length;

    if (lengthOfPassword < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      response.status(400);
      response.send("User already exists");
    }
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.params;
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}'`;

  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //user doesn't exist
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.send("Invalid password");
      response.status(400);
    }
  }
});

app.put("/change-password", async (request, response) => {
  try {
    const { username, oldPassword, newPassword } = request.body;
    const checkForUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}'`;
    const dbUser = await db.get(checkForUserQuery);
    if (dbUser === undefined) {
      response.status(400);
      response.send("User  not registered");
    } else {
      const isValidPassword = await bcrypt.compare(
        oldPassword,
        dbUser.password
      );
      if (isValidPassword === true) {
        const lengthOfNewPassword = newPassword.length;

        if (lengthOfNewPassword < 5) {
          response.status(400);
          response.send("Password is too short");
        } else {
          const encryptedPassword = await bcrypt.hash(newPassword, 10);
          const updatePasswordQuery = `
            update user
            set password='${encryptedPassword}'
            where username='${username}'`;
          await db.run(updatePasswordQuery);
          response.send("Password updated");
        }
      } else {
        response.status(400);
        response.send("Invalid current password");
      }
    }
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
});
