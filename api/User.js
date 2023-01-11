const express = require('express');
const router = express.Router();

const User = require('./../models/User');
const UserVerification = require("../models/UserVerification");
const UserRecovery = require("../models/UserRecovery");

const bcrypt = require('bcrypt');

const SibApiV3Sdk = require('sib-api-v3-sdk');
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey =
  process.env.SIB_API_KEY;

const { v4: uuidv4 } = require("uuid");

const development = "http://localhost:2000/";
const production = "https://drab-ruby-crane-belt.cyclic.app/";
// const currentUrl = process.env.NODE_ENV ? production : development;
const currentUrl = production;

const path = require("path");

const sendVerificationEmail = ({ _id, email, fname }, res) => {
    const uniqueString = uuidv4() + _id;
    const saltRoungs = 10;
    bcrypt
      .hash(uniqueString, saltRoungs)
      .then((hashedUniqueString) => {
        const newVerification = new UserVerification({
          _id: _id,
          uniqueString: hashedUniqueString,
          createdAt: Date.now(),
          expireAt: Date.now() + 21600000,
        });
  
        newVerification
          .save()
          .then(() => {
            new SibApiV3Sdk.TransactionalEmailsApi()
              .sendTransacEmail({
                templateId: 1,
                subject: "Confirm your email",
                sender: { email: "api@sendinblue.com", name: "Piscium Labs" },
                replyTo: { email: "api@sendinblue.com", name: "Sendinblue" },
                to: [{ name: fname, email: email }],
                params: {
                  bodyMessage: "Made just for you!",
                  name: fname,
                  link: `${
                    currentUrl + "user/verify/" + _id + "/" + uniqueString
                  }`,
                },
              })
              .then(() => {
                res.json({
                  status: "PENDING",
                  message: "Verification email send",
                  data: {
                    userId: _id,
                    email,
                    fname,
                  },
                });
              })
              .catch((err) => {
                res.json({
                  status: "FAILED",
                  message: "Verification email failed",
                });
              });
          })
          .catch((error) => {
            res.json({
              status: "FAILED",
              message: "Couldn't save Verification email data",
            });
          });
      })
      .catch(() => {
        res.json({
          status: "FAILED",
          message: "An error occored while hashing data",
        });
      });
  };

router.get("/verify/:_id/:uniqueString", (req, res) => {
let { _id, uniqueString } = req.params;

UserVerification.find({ _id })
    .then((result) => {
    if (result.length > 0) {
        const { expireAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;
        if (expireAt < Date.now()) {
        UserVerification.deleteOne({ _id })
            .then((result) => {
            User.deleteOne({ _id: _id })
                .then(() => {
                let message = "Verification link has expired. Sign up again.";
                res.redirect(`/user/verified?error=true&message=${message}`);
                })
                .catch((error) => {
                let message = "Clearing email with expired link failed";
                res.redirect(`/user/verified?error=true&message=${message}`);
                });
            })
            .catch((error) => {
            console.log(error);
            let message =
                "An error occured while clareaing email verification";
            res.redirect(`/user/verified?error=true&message=${message}`);
            });
        } else {
        bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
            if (result) {
                User.updateOne({ _id: _id }, { verified: true })
                .then(() => {
                    UserVerification.deleteOne({ _id })
                    .then(() => {
                        res.sendFile(
                        path.join(__dirname, "./web/verified.html")
                        );
                    })
                    .catch((error) => {
                        console.log(error);
                        let message =
                        "An error occured while finalizing veification";
                        res.redirect(
                        `/user/verified?error=true&message=${message}`
                        );
                    });
                })
                .catch((error) => {
                    console.log(error);
                    let message =
                    "An error occored while updating verified to true";
                    res.redirect(
                    `/user/verified?error=true&message=${message}`
                    );
                });
            } else {
                let message = "Invalid verification details passed";
                res.redirect(`/user/verified?error=true&message=${message}`);
            }
            })
            .catch((error) => {
            let message = "An error occured while comparing strings";
            res.redirect(`/user/verified?error=true&message=${message}`);
            });
        }
    } else {
        let message =
        "Account record does not exist or accout has been verified previously. Please login";
        res.redirect(`/user/verified?error=true&message=${message}`);
    }
    })
    .catch((error) => {
    console.log(error);
    let message = "An error occured";
    res.redirect(`/user/verified?error=true&message=${message}`);
    });
});  



router.post('/signup', (req, res) => {
    let { fname, lname, email, password, gender } = req.body;
    fname = fname.trim();
    lname = lname.trim();
    email = email.trim();
    password = password.trim();
    gender = gender.trim();
  
    if (
      fname == "" ||
      lname == "" ||
      email == "" ||
      password == "" ||
      gender == "" 
    ) {
      res.json({
        status: "FAILED",
        message: "Empty fields!",
      });
    } else if (!/^[a-zA-Z]*$/.test(fname)) {
      res.json({
        status: "FAILED",
        message: "Invalid name",
      });
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      res.json({
        status: "FAILED",
        message: "Invalid E-mail Address",
      });
    } else if (password.length < 8) {
      res.json({
        status: "FAILED",
        message: "Password must be more than 8 char long",
      });
    } else {
      // if user exist already
      User.find({ email })
        .then((result) => {
          if (result.length) {
            // user already exist
            res.json({
              status: "FAILED",
              message: "Email already exist",
            });
          } else {
            // add user to db
            //password hash
            const saltRoungs = 10;
            bcrypt
              .hash(password, saltRoungs)
              .then((hashedPassword) => {
                const newUser = new User({
                  fname,
                  lname,
                  email,
                  password: hashedPassword,
                  gender,
                  verified: false,
                });
  
                newUser
                  .save()
                  .then((result) => {
                    sendVerificationEmail(result, res);
                  })
                  .catch((err) => {
                    res.json({
                      status: "FAILED",
                      message: "An error occored while saving user",
                    });
                  });
              })
              .catch((err) => {
                res.json({
                  status: "FAILED",
                  message: "An error occored while hashing password",
                });
              });
          }
        })
        .catch((err) => {
          console.log(err);
          res.json({
            status: "FAILED",
            message: "An error occored",
          });
        });
    }
})

router.get("/verified", (req, res) => {
    res.sendFile(path.join(__dirname, "./web/verified.html"));
  });


router.post('/confirmVerification', (req, res) => {
    let { _id, email, fname } = req.body;
  
    if (_id == "" || fname == ""|| email == "") {
      res.json({
        status: "FAILED",
        message: "Empty fileds",
      });
    } else {
      User.find({ email })
        .then((data) => {
          if (data.length) {
            if (!data[0].verified) {
              res.json({
                status: "PENDING",
                message: "Email has not be verified",
                state: {data : data[0], isAuthenticated: true },
              });
            } else {
                res.json({
                  status: "SUCCESS",
                  message: "Sign in successful",
                  state: {data : data[0], isAuthenticated: true },
                });              
            }
          } else {
            res.json({
              status: "FAILED",
              message: "Invalid credentials entered",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: "FAILED",
            message: "An error occord while checking for Email",
          });
        });
    }
})

router.post('/resetAccount', (req, res) => {
    let { email } = req.body;
    let expireAt =  Date.now() + 21600000;
  
    if (email == "") {
      res.json({
        status: "FAILED",
        message: "Empty fileds",
      });
    } else {
      User.find({ email })
        .then((data) => {
          if (data.length) {
            code = Math.floor(Math.random()*90000) + 10000;;
            const newRecovery = new UserRecovery({
            email: email,
            code: code,
            expireAt: expireAt,
            });
    
        newRecovery
          .save()
          .then(() => {
             new SibApiV3Sdk.TransactionalEmailsApi()
              .sendTransacEmail({
                templateId: 5,
                subject: ` ${code} is your verification code`,
                sender: { email: "api@sendinblue.com", name: "Piscium Labs" },
                replyTo: { email: "api@sendinblue.com", name: "Sendinblue" },
                to: [{ email: email }],
                params: {
                  bodyMessage: "Made just for you!",
                  code: code,
                },
              })
              .then(() => {
                res.json({
                  status: "PENDING",
                  message: "Verification email send",
                  data: {
                    email,
                    code,
                    expireAt,
                  },
                });
              })
              .catch((err) => {
                res.json({
                  status: "FAILED",
                  message: "Verification email failed",
                });
              });
           })
          .catch((error) => {
            res.json({
              status: "FAILED",
              message: "Couldn't save Verification email data",
            });
          });  

          } else {
            res.json({
              status: "FAILED",
              message: "Invalid credentials entered",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: "FAILED",
            message: "An error occord while checking for Email",
          });
        });
    }
})

router.post('/changePassword', (req, res) => {
  let { email, expireAt, code, newPassword } = req.body;
    email = email.trim();
    newPassword = newPassword.trim();

    if (email == "" || expireAt == "" || code == "", newPassword == "") {
        res.json({
          status: "FAILED",
          message: "Empty fileds",
        });
    }
        else {
      UserRecovery.find({ email })
        .then((data) => {
          if (data.length) {
            if (data[0].code != code) {
              res.json({
                status: "FAILED",
                message: "Verification code is invalid",
                data: data,
              })
            } else {
              UserRecovery.deleteOne({ email })
                    .then(() => {
                        User.find({ email })
                          .then((data) => {
                            if (data.length) {
                              const saltRoungs = 10;
                                  bcrypt
                                    .hash(newPassword, saltRoungs)
                                    .then((hashedPassword) => {
                                      User.updateOne({ email: email }, { password: hashedPassword })
                                      .then(() => {
                                        res.json({
                                          status: "SUCCESS",
                                          message: "Password changed successfully",
                                          data: data,
                                        });
                                      })
                                      .catch((error) => {
                                           res.json({
                                              status: "FAILED",
                                              message: "Error changing password",
                                            });                                        
                                      })
                                    })
                                    .catch((error) => {
                                          res.json({
                                            status: "FAILED",
                                            message: "Error hashing password",
                                          });
                                    })
                            }
                          })
                          .catch((error) => {
                               res.json({
                                status: "FAILED",
                                message: "Email does not exist",
                              });
                          })
                    })
                    .catch((error) => {
                         res.json({
                            status: "FAILED",
                            message: "Error deleting code",
                          });
                    });
            }
          } else {
            res.json({
              status: "FAILED",
              message: "Invalid credentials entered",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: "FAILED",
            message: "An error occord while checking for Email",
          });
        });
    }
})


router.post('/signin', (req, res) => {
    let { email, password } = req.body;
    email = email.trim();
    password = password.trim();
  
    if (email == "" || password == "") {
      res.json({
        status: "FAILED",
        message: "Empty fileds",
      });
    } else {
      User.find({ email })
        .then((data) => {
          if (data.length) {
            if (!data[0].verified) {
              res.json({
                status: "PENDING",
                message: "Email has not be verified",
                state: {data: data, isAuthenticated: false },
              })
            } else {
              const hashedPassword = data[0].password;
              bcrypt
                .compare(password, hashedPassword)
                .then((result) => {
                  if (result) {
                    res.json({
                      status: "SUCCESS",
                      message: "Sign in successful",
                      state: {data : data[0], isAuthenticated: true },
                    });
                  } else {
                    res.json({
                      status: "FAILED",
                      message: "Invalid password",
                    });
                  }
                })
                .catch((err) => {
                  res.json({
                    status: "FAILED",
                    message: "An error occored while comparing password",
                  });
                });
            }
          } else {
            res.json({
              status: "FAILED",
              message: "Invalid credentials entered",
            });
          }
        })
        .catch((err) => {
          res.json({
            status: "FAILED",
            message: "An error occord while checking for Email",
          });
        });
    }
})


module.exports = router;
